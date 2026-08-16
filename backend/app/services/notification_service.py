import asyncio
from datetime import timedelta
from typing import Dict, Any, Optional, Set
from app.database import db_manager, utc_now
from app.services.email_service import email_service

class NotificationService:
    def __init__(self):
        self.subscribers: Set[asyncio.Queue] = set()

    async def subscribe(self) -> asyncio.Queue:
        queue = asyncio.Queue()
        self.subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue):
        if queue in self.subscribers:
            self.subscribers.remove(queue)

    async def broadcast_event(self, event_type: str, data: Dict[str, Any]):
        message = {
            "event": event_type,
            "data": data,
            "timestamp": utc_now().isoformat()
        }
        for q in list(self.subscribers):
            try:
                await q.put(message)
            except Exception:
                pass

    def process_scan_alert(self, scan_data: Dict[str, Any], user_id: Optional[str] = None):
        classification = scan_data.get("classification", "SAFE")
        risk_level = scan_data.get("risk_level") or classification.lower().replace(" ", "_")
        risk_score = scan_data.get("risk_score", 0)
        url = scan_data.get("url", "")
        scan_id = scan_data.get("scan_id", "")
        now = utc_now()
        
        # 1. Store Notification doc if HIGH RISK or CRITICAL
        if classification in ["HIGH RISK", "CRITICAL"]:
            notif_doc = {
                "user_id": user_id,
                "scan_id": scan_id,
                "type": f"{risk_level}_threat",
                "url": url,
                "classification": classification,
                "risk_level": risk_level,
                "risk_score": risk_score,
                "title": f"{classification} threat detected",
                "message": f"URL {url} classified as {classification} (Risk: {risk_score}/100)",
                "severity": risk_level,
                "read": False,
                "created_at": now
            }
            db_manager.collection("notifications").insert_one(notif_doc)
            for channel in ("dashboard", "extension"):
                db_manager.collection("alert_events").insert_one({
                    "user_id": user_id,
                    "scan_id": scan_id,
                    "url": url,
                    "risk_level": risk_level,
                    "classification": classification,
                    "channel": channel,
                    "alert_type": f"{risk_level}_threat",
                    "status": "sent",
                    "created_at": now,
                    "error_message": None,
                })

        # 2. Email Dispatch & Deduplication (for HIGH RISK / CRITICAL)
        if classification in ["HIGH RISK", "CRITICAL"]:
            # Check user preferences if user_id is provided
            send_email = True
            user = None
            if user_id:
                user = db_manager.collection("users").find_one({"user_id": user_id})
                if user:
                    prefs = user.get("alert_preferences", {})
                    if not prefs.get("email_alerts", True):
                        send_email = False
                    if classification == "CRITICAL" and not prefs.get("email_critical", prefs.get("critical_email", True)):
                        send_email = False
                    if classification == "HIGH RISK" and not prefs.get("email_high_risk", prefs.get("high_risk_email", True)):
                        send_email = False

            # Alert Deduplication (check if email was sent for same user/url/classification in last 15 minutes)
            cooldown_seconds = 900  # 15 minutes
            query = {
                "url": url,
                "risk_level": risk_level,
                "channel": "email",
                "created_at": {"$gt": now - timedelta(seconds=cooldown_seconds)}
            }
            if user_id:
                query["user_id"] = user_id
                
            recent_alert = db_manager.collection("alert_events").find_one(query)
            
            if recent_alert:
                print(f"[NotificationService] Skipping email dispatch for '{url}' (Alert deduplication active)")
            elif send_email and user and user.get("email"):
                recipient_email = user.get("email")
                recipient_name = user.get("name", "User")

                alert_event = {
                    "user_id": user_id,
                    "scan_id": scan_id,
                    "url": url,
                    "risk_level": risk_level,
                    "classification": classification,
                    "channel": "email",
                    "alert_type": f"{risk_level}_threat",
                    "status": "pending",
                    "created_at": utc_now(),
                    "error_message": None,
                }
                event_id = db_manager.collection("alert_events").insert_one(alert_event).inserted_id

                try:
                    success = email_service.send_threat_alert_email(recipient_email, recipient_name, scan_data)
                    db_manager.collection("alert_events").update_one(
                        {"_id": event_id},
                        {"$set": {"status": "sent" if success else "failed", "updated_at": utc_now(), "error_message": None if success else "Email service returned failure"}},
                    )
                except Exception as exc:
                    db_manager.collection("alert_events").update_one(
                        {"_id": event_id},
                        {"$set": {"status": "failed", "updated_at": utc_now(), "error_message": str(exc)[:500]}},
                    )

notification_service = NotificationService()
