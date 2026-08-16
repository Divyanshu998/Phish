import secrets
from typing import Dict, Any, Optional
from datetime import timedelta
from fastapi import APIRouter, HTTPException, Header, Depends
from pymongo.errors import DuplicateKeyError, PyMongoError
from app.database import db_manager
from app.database import token_hash, utc_now
from app.models.schemas import (
    SignUpRequest, LoginRequest, AuthResponse, 
    ForgotPasswordRequest, ResetPasswordRequest,
    UpdateSettingsRequest, UserProfileResponse
)
from app.services.auth_service import auth_service
from app.services.email_service import email_service
from fastapi import Depends

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
        user = db_manager.collection("users").find_one({"user_id": payload["sub"]})
        return user
    except Exception:
        return None

def require_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    user = get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


def require_admin(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    user = get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    role = user.get("role", "user")
    if role != "admin":
        raise HTTPException(status_code=403, detail="Administrator access required")
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

    existing_user = db_manager.collection("users").find_one({"email": email})
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    user_id = f"usr_{secrets.token_hex(8)}"
    password_hash = auth_service.hash_password(payload.password)
    verification_token = auth_service.generate_random_token()
    now = utc_now()

    user_doc = {
        "user_id": user_id,
        "name": name,
        "email": email,
        "password_hash": password_hash,
        "email_verified": False,
        "verification_token_hash": token_hash(verification_token),
        "verification_expires": now + timedelta(minutes=30),
        "created_at": now,
        "updated_at": now,
        "last_login": None,
        "alert_preferences": {
            "browser_notifications": True,
            "realtime_protection": True,
            "email_alerts": True,
            "email_high_risk": True,
            "email_critical": True,
            "high_risk_email": True,
            "critical_email": True,
        }
    }
    
    try:
        db_manager.collection("users").insert_one(user_doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    # Send verification email asynchronously / in background
    email_service.send_verification_email(email, name, verification_token)
    
    token = auth_service.create_jwt_token(user_id, email, role="user")
    return {
        "token": token,
        "user_id": user_id,
        "name": name,
        "email": email,
        "role": "user",
        "email_verified": False
    }

@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest):
    email = payload.email.strip().lower()
    user = db_manager.collection("users").find_one({"email": email})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not auth_service.verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    now = utc_now()
    db_manager.collection("users").update_one({"user_id": user["user_id"]}, {"$set": {"last_login": now, "updated_at": now}})
    # include role in token payload
    role = user.get("role", "user")
    token = auth_service.create_jwt_token(user["user_id"], email, role=role)
    # Audit admin login
    if role == "admin":
        db_manager.collection("audit_logs").insert_one({
            "actor_user_id": user["user_id"],
            "action": "admin_login",
            "created_at": utc_now(),
            "metadata": {"email": user.get("email")}
        })
    return {
        "token": token,
        "user_id": user["user_id"],
        "name": user.get("name", "User"),
        "email": email,
        "role": role,
        "email_verified": user.get("email_verified", False)
    }

@router.get("/me", response_model=UserProfileResponse)
def get_me(user: Dict[str, Any] = Depends(require_user)):
    return {
        "user_id": user["user_id"],
        "name": user.get("name", "User"),
        "email": user.get("email", ""),
        "email_verified": user.get("email_verified", False),
        "created_at": db_manager.serialize_doc({"value": user.get("created_at")})["value"] if user.get("created_at") else "",
        "last_login": db_manager.serialize_doc({"value": user.get("last_login")})["value"] if user.get("last_login") else "",
        "alert_preferences": user.get("alert_preferences", {}),
        "role": user.get("role", "user")
    }

@router.put("/settings")
def update_settings(payload: UpdateSettingsRequest, user: Dict[str, Any] = Depends(require_user)):
    updates = {}
    if payload.name:
        updates["name"] = payload.name.strip()
    if payload.alert_preferences:
        updates["alert_preferences"] = payload.alert_preferences.dict()
    if updates:
        updates["updated_at"] = utc_now()

    if updates:
        db_manager.collection("users").update_one({"user_id": user["user_id"]}, {"$set": updates})

    return {"status": "success", "message": "Settings updated successfully"}

@router.get("/verify-email")
def verify_email(token: str):
    user = db_manager.collection("users").find_one({"verification_token_hash": token_hash(token)})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    if user.get("verification_expires") and user["verification_expires"] < utc_now():
        raise HTTPException(status_code=400, detail="Verification token has expired")

    db_manager.collection("users").update_one(
        {"user_id": user["user_id"]}, 
        {
            "$set": {"email_verified": True, "updated_at": utc_now()},
            "$unset": {"verification_token_hash": "", "verification_expires": ""},
        }
    )
    return {"status": "success", "message": "Email verified successfully!"}

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest):
    email = payload.email.strip().lower()
    user = db_manager.collection("users").find_one({"email": email})
    
    # Generic success response to avoid email enumeration
    if user:
        reset_token = auth_service.generate_random_token()
        db_manager.collection("users").update_one(
            {"user_id": user["user_id"]},
            {"$set": {"reset_token_hash": token_hash(reset_token), "reset_expires": utc_now() + timedelta(minutes=30), "updated_at": utc_now()}}
        )
        email_service.send_password_reset_email(email, user.get("name", "User"), reset_token)

    return {"status": "success", "message": "If an account with that email exists, a password reset link has been sent."}

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest):
    user = db_manager.collection("users").find_one({"reset_token_hash": token_hash(payload.token)})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    if user.get("reset_expires") and user["reset_expires"] < utc_now():
        raise HTTPException(status_code=400, detail="Reset token has expired")

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    new_hash = auth_service.hash_password(payload.new_password)
    db_manager.collection("users").update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {"password_hash": new_hash, "updated_at": utc_now()},
            "$unset": {"reset_token_hash": "", "reset_expires": ""},
        }
    )
    return {"status": "success", "message": "Password reset successfully. You can now login with your new password."}
