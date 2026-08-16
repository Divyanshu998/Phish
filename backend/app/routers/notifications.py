import json
import asyncio
from typing import List, Optional
from fastapi import APIRouter, Query, Header, HTTPException
from fastapi.responses import StreamingResponse
from app.database import db_manager, object_id_or_none, utc_now
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
    query = {"user_id": None}
    if user:
        query = {"user_id": user["user_id"]}
    
    cursor = db_manager.collection("notifications").find(query).sort("created_at", -1).limit(limit)
    results = []
    for doc in cursor:
        created_at = doc.get("created_at")
        created_at_value = db_manager.serialize_doc({"value": created_at})["value"] if created_at else ""
        results.append({
            "notification_id": str(doc.get("_id")),
            "scan_id": doc.get("scan_id"),
            "url": doc.get("url", ""),
            "classification": doc.get("classification", "SAFE"),
            "risk_score": doc.get("risk_score", 0),
            "title": doc.get("title", "Threat Alert"),
            "message": doc.get("message", ""),
            "read": doc.get("read", False),
            "created_at": created_at_value
        })
    return results

@router.post("/{notification_id}/read")
def mark_notification_read(notification_id: str, authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    query = {"_id": object_id_or_none(notification_id), "user_id": user["user_id"] if user else None}
    if query["_id"] is None:
        raise HTTPException(status_code=400, detail="Invalid notification id")
    result = db_manager.collection("notifications").update_one(query, {"$set": {"read": True, "updated_at": utc_now()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
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
