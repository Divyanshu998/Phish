import os
import time
import secrets
import jwt
from typing import Dict, Any, Optional
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "phishguard_spider_ai_secret_key_2026_xdr")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_SECONDS = 86400 * 7  # 7 days

ph = PasswordHasher()

class AuthService:
    def hash_password(self, password: str) -> str:
        return ph.hash(password)

    def verify_password(self, password: str, password_hash: str) -> bool:
        try:
            return ph.verify(password_hash, password)
        except VerifyMismatchError:
            return False
        except Exception:
            return False

    def create_jwt_token(self, user_id: str, email: str) -> str:
        payload = {
            "sub": user_id,
            "email": email,
            "iat": int(time.time()),
            "exp": int(time.time()) + ACCESS_TOKEN_EXPIRE_SECONDS
        }
        return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    def decode_jwt_token(self, token: str) -> Optional[Dict[str, Any]]:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except jwt.PyJWTError:
            return None

    def generate_random_token(self) -> str:
        return secrets.token_urlsafe(32)

auth_service = AuthService()
