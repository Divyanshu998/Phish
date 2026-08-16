import json
import asyncio
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, Header, HTTPException
from fastapi.responses import StreamingResponse
from app.database import db_manager
from app.models.schemas import NotificationItem
from app.routers.auth import get_current_user
from app.services.notification_service import notification_service

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

@router.get("", response_model=List[NotificationItem])
def get_notifications(
    limit: int = Query(20, ge=1, le=100),
    authorization: Optional[str] = Header(None)
):
    user = get_current_user(authorization)
    query = {}
    if user:
        query = {"$or": [{"user_id": user["user_id"]}, {"user_id": None}]}
    
    cursor = db_manager.db.notifications.find(query).sort("created_at", -1).limit(limit)
    results = []
    for doc in cursor:
        results.append({
            "notification_id": str(doc.get("_id")),
            "scan_id": doc.get("scan_id"),
            "url": doc.get("url", ""),
            "classification": doc.get("classification", "SAFE"),
            "risk_score": doc.get("risk_score", 0),
            "title": doc.get("title", "Threat Alert"),
            "message": doc.get("message", ""),
            "read": doc.get("read", False),
            "created_at": doc.get("created_at", 0)
        })
    return results

@router.post("/{notification_id}/read")
def mark_notification_read(notification_id: str):
    from bson.objectid import ObjectId
    try:
        db_manager.db.notifications.update_one({"_id": ObjectId(notification_id)}, {"$set": {"read": True}})
    except Exception:
        db_manager.db.notifications.update_one({"notification_id": notification_id}, {"$set": {"read": True}})
    return {"status": "success"}

@router.get("/stream")
async def stream_notifications():
    queue = await notification_service.subscribe()
    
    async def event_generator():
        try:
            while True:
                data = await queue.get()
                yield f"data: {json.dumps(data)}\n\n"
        except asyncio.CancelledError:
            notification_service.unsubscribe(queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
