import time
import asyncio
from typing import Dict, Any, List, Optional, Set
from app.database import db_manager
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
            "timestamp": time.time()
        }
        for q in list(self.subscribers):
            try:
                await q.put(message)
            except Exception:
                pass

    def process_scan_alert(self, scan_data: Dict[str, Any], user_id: Optional[str] = None):
        classification = scan_data.get("classification", "SAFE")
        risk_score = scan_data.get("risk_score", 0)
        url = scan_data.get("url", "")
        scan_id = scan_data.get("scan_id", "")
        
        # 1. Store Notification doc if HIGH RISK or CRITICAL
        if classification in ["HIGH RISK", "CRITICAL"]:
            notif_doc = {
                "user_id": user_id,
                "scan_id": scan_id,
                "url": url,
                "classification": classification,
                "risk_score": risk_score,
                "title": f"🚨 {classification} Threat Detected" if classification == "CRITICAL" else f"⚠ {classification} Website",
                "message": f"URL {url} classified as {classification} (Risk: {risk_score}/100)",
                "read": False,
                "created_at": time.time()
            }
            db_manager.db.notifications.insert_one(notif_doc)

        # 2. Email Dispatch & Deduplication (for HIGH RISK / CRITICAL)
        if classification in ["HIGH RISK", "CRITICAL"]:
            # Check user preferences if user_id is provided
            send_email = True
            user = None
            if user_id:
                user = db_manager.db.users.find_one({"user_id": user_id})
                if user:
                    prefs = user.get("alert_preferences", {})
                    if classification == "CRITICAL" and not prefs.get("email_critical", True):
                        send_email = False
                    if classification == "HIGH RISK" and not prefs.get("email_high_risk", True):
                        send_email = False

            # Alert Deduplication (check if email was sent for same user/url/classification in last 15 minutes)
            cooldown_seconds = 900  # 15 minutes
            query = {
                "url": url,
                "classification": classification,
                "channel": "email",
                "created_at": {"$gt": time.time() - cooldown_seconds}
            }
            if user_id:
                query["user_id"] = user_id
                
            recent_alert = db_manager.db.alert_events.find_one(query)
            
            if recent_alert:
                print(f"[NotificationService] Skipping email dispatch for '{url}' (Alert deduplication active)")
            elif send_email and user and user.get("email"):
                recipient_email = user.get("email")
                recipient_name = user.get("name", "User")
                
                success = email_service.send_threat_alert_email(recipient_email, recipient_name, scan_data)
                
                db_manager.db.alert_events.insert_one({
                    "user_id": user_id,
                    "scan_id": scan_id,
                    "url": url,
                    "classification": classification,
                    "channel": "email",
                    "status": "sent" if success else "failed",
                    "created_at": time.time()
                })

notification_service = NotificationService()
