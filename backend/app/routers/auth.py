import time
import secrets
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Header, Depends
from app.database import db_manager
from app.models.schemas import (
    SignUpRequest, LoginRequest, AuthResponse, 
    ForgotPasswordRequest, ResetPasswordRequest,
    UpdateSettingsRequest, UserProfileResponse, NotificationItem
)
from app.services.auth_service import auth_service
from app.services.email_service import email_service

router = APIRouter(prefix="/api/auth", tags=["authentication"])

def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    if not authorization:
        return None
    try:
        scheme, token = authorization.split(" ")
        if scheme.lower() != "bearer":
            return None
        payload = auth_service.decode_jwt_token(token)
        if not payload:
            return None
        user = db_manager.db.users.find_one({"user_id": payload["sub"]})
        return user
    except Exception:
        return None

def require_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    user = get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user

@router.post("/signup", response_model=AuthResponse)
def signup(payload: SignUpRequest):
    email = payload.email.strip().lower()
    name = payload.name.strip()
    
    if not name or not email or not payload.password:
        raise HTTPException(status_code=400, detail="All fields are required")
        
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
        
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    existing_user = db_manager.db.users.find_one({"email": email})
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    user_id = f"usr_{secrets.token_hex(8)}"
    password_hash = auth_service.hash_password(payload.password)
    verification_token = auth_service.generate_random_token()
    now_str = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    user_doc = {
        "user_id": user_id,
        "name": name,
        "email": email,
        "password_hash": password_hash,
        "email_verified": False,
        "verification_token": verification_token,
        "verification_expires": time.time() + 1800,  # 30 mins
        "created_at": now_str,
        "last_login": now_str,
        "alert_preferences": {
            "browser_notifications": True,
            "realtime_protection": True,
            "email_alerts": True,
            "email_high_risk": True,
            "email_critical": True
        }
    }
    
    db_manager.db.users.insert_one(user_doc)
    
    # Send verification email asynchronously / in background
    email_service.send_verification_email(email, name, verification_token)
    
    token = auth_service.create_jwt_token(user_id, email)
    return {
        "token": token,
        "user_id": user_id,
        "name": name,
        "email": email,
        "email_verified": False
    }

@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest):
    email = payload.email.strip().lower()
    user = db_manager.db.users.find_one({"email": email})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not auth_service.verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    now_str = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    db_manager.db.users.update_one({"user_id": user["user_id"]}, {"$set": {"last_login": now_str}})
    
    token = auth_service.create_jwt_token(user["user_id"], email)
    return {
        "token": token,
        "user_id": user["user_id"],
        "name": user.get("name", "User"),
        "email": email,
        "email_verified": user.get("email_verified", False)
    }

@router.get("/me", response_model=UserProfileResponse)
def get_me(user: Dict[str, Any] = Depends(require_user)):
    return {
        "user_id": user["user_id"],
        "name": user.get("name", "User"),
        "email": user.get("email", ""),
        "email_verified": user.get("email_verified", False),
        "created_at": user.get("created_at", ""),
        "last_login": user.get("last_login", ""),
        "alert_preferences": user.get("alert_preferences", {})
    }

@router.put("/settings")
def update_settings(payload: UpdateSettingsRequest, user: Dict[str, Any] = Depends(require_user)):
    updates = {}
    if payload.name:
        updates["name"] = payload.name.strip()
    if payload.alert_preferences:
        updates["alert_preferences"] = payload.alert_preferences.dict()

    if updates:
        db_manager.db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})

    return {"status": "success", "message": "Settings updated successfully"}

@router.get("/verify-email")
def verify_email(token: str):
    user = db_manager.db.users.find_one({"verification_token": token})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    if user.get("verification_expires", 0) < time.time():
        raise HTTPException(status_code=400, detail="Verification token has expired")

    db_manager.db.users.update_one(
        {"user_id": user["user_id"]}, 
        {"$set": {"email_verified": True}, "$unset": {"verification_token": "", "verification_expires": ""}}
    )
    return {"status": "success", "message": "Email verified successfully!"}

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest):
    email = payload.email.strip().lower()
    user = db_manager.db.users.find_one({"email": email})
    
    # Generic success response to avoid email enumeration
    if user:
        reset_token = auth_service.generate_random_token()
        db_manager.db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"reset_token": reset_token, "reset_expires": time.time() + 1800}}
        )
        email_service.send_password_reset_email(email, user.get("name", "User"), reset_token)

    return {"status": "success", "message": "If an account with that email exists, a password reset link has been sent."}

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest):
    user = db_manager.db.users.find_one({"reset_token": payload.token})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    if user.get("reset_expires", 0) < time.time():
        raise HTTPException(status_code=400, detail="Reset token has expired")

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    new_hash = auth_service.hash_password(payload.new_password)
    db_manager.db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"password_hash": new_hash}, "$unset": {"reset_token": "", "reset_expires": ""}}
    )
    return {"status": "success", "message": "Password reset successfully. You can now login with your new password."}
