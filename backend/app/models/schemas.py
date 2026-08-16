from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any

class ScanRequest(BaseModel):
    url: str
    source: Optional[str] = "browser_extension"  # manual_scanner, browser_extension, dashboard, api
    browser: Optional[str] = "chrome"

    @validator("url")
    def validate_url(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("URL cannot be empty")
        if not value.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return value

    @validator("source")
    def validate_source(cls, value: Optional[str]) -> str:
        allowed = {"manual_scanner", "browser_extension", "dashboard", "api"}
        if not value:
            return "api"
        if value == "demo":
            return "manual_scanner"
        if value not in allowed:
            raise ValueError("Invalid scan source")
        return value

class FeatureBreakdown(BaseModel):
    url_length: int
    hostname_length: int
    num_subdomains: int
    has_ip_host: bool
    num_dots: int
    num_hyphens: int
    num_at: int
    num_digits: int
    entropy: float
    is_https: bool
    suspicious_tld: bool
    suspicious_keywords_count: int

class ScanResponse(BaseModel):
    scan_id: str
    url: str
    domain: str
    risk_score: int
    classification: str  # SAFE, SUSPICIOUS, HIGH RISK, CRITICAL
    ml_prediction: str   # PHISHING, LEGITIMATE
    ml_confidence: float # e.g. 0.964 -> 96.4%
    risk_factors: List[str]
    recommendation: str
    source: str          # manual_scanner, browser_extension, dashboard, api
    browser: Optional[str] = "chrome"
    timestamp: str
    features: Optional[Dict[str, Any]] = None

class KPIResponse(BaseModel):
    total_scans: int
    threats_detected: int
    critical_threats: int
    extension_scans: int
    high_risk_threats: int = 0
    safe_scans: int = 0

class ExtensionScanActivityItem(BaseModel):
    scan_id: str
    timestamp: str
    browser: str
    url: str
    domain: str
    classification: str
    risk_score: int

class ExtensionStatusResponse(BaseModel):
    status: str
    version: str
    last_scan_timestamp: Optional[str] = None
    total_extension_scans: int
    threats_detected: int
    critical_threats: int

class GraphNode(BaseModel):
    id: str
    label: str
    type: str  # url, domain, risk_factor, source, threat_level
    risk_score: Optional[int] = None

class GraphEdge(BaseModel):
    source: str
    target: str
    relationship: str

class ThreatNetworkResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

# --- Authentication & User Schemas ---
class SignUpRequest(BaseModel):
    name: str
    email: str
    password: str
    confirm_password: str

    @validator("name")
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Name must be at least 2 characters")
        return value

    @validator("email")
    def validate_email(cls, value: str) -> str:
        value = value.strip().lower()
        if "@" not in value or "." not in value.rsplit("@", 1)[-1]:
            raise ValueError("Invalid email address")
        return value

class LoginRequest(BaseModel):
    email: str
    password: str

    @validator("email")
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

class AuthResponse(BaseModel):
    token: str
    user_id: str
    name: str
    email: str
    role: Optional[str] = "user"
    email_verified: bool

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class AlertPreferences(BaseModel):
    browser_notifications: bool = True
    realtime_protection: bool = True
    email_alerts: bool = True
    email_high_risk: bool = True
    email_critical: bool = True

class UpdateSettingsRequest(BaseModel):
    name: Optional[str] = None
    alert_preferences: Optional[AlertPreferences] = None

class UserProfileResponse(BaseModel):
    user_id: str
    name: str
    email: str
    email_verified: bool
    created_at: str
    last_login: str
    alert_preferences: Dict[str, bool]
    role: Optional[str] = "user"

class NotificationItem(BaseModel):
    notification_id: str
    scan_id: Optional[str] = None
    url: str
    classification: str
    risk_score: int
    title: str
    message: str
    read: bool
    created_at: str
