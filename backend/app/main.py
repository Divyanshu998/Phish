import os
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

# Load .env file FIRST before any service/config modules are imported
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

from fastapi import FastAPI, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from pymongo.errors import PyMongoError

from app.models.schemas import (
    ScanRequest, ScanResponse, KPIResponse, 
    ExtensionScanActivityItem, ExtensionStatusResponse,
    ThreatNetworkResponse, GraphNode, GraphEdge
)
from app.engine.risk_scorer import calculate_risk
from app.database import db_manager, utc_now
from app.services.ml_service import ml_service
from app.services.notification_service import notification_service
from app.routers.auth import router as auth_router, get_current_user
from app.routers.notifications import router as notifications_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    db_manager.connect()
    try:
        yield
    finally:
        db_manager.close()


app = FastAPI(
    title="PhishGuard AI Backend API",
    description="Intelligent Real-Time Phishing Detection & Threat Analysis Platform",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows browser extension and dashboard access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)
app.include_router(notifications_router)
# Admin router
from app.routers.admin import router as admin_router
app.include_router(admin_router)

@app.get("/api/health")
def health_check():
    db_health = db_manager.health()
    return {
        "status": db_health["status"],
        "version": "2.0.0",
        "service": "PhishGuard AI Real-Time Protection Engine",
        "database": db_health["database"],
        "ml_model_loaded": ml_service.is_loaded,
        "ml_device": str(ml_service.device),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.post("/api/scans/analyze", response_model=ScanResponse)
def analyze_scan(payload: ScanRequest, authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    user_id = user["_id"] if user else None
    return perform_scan_internal(payload.url, payload.source or "api", payload.browser or "chrome", user_id=user_id)

@app.post("/api/scan", response_model=ScanResponse)
def execute_scan(payload: ScanRequest, authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    user_id = user["_id"] if user else None
    return perform_scan_internal(payload.url, payload.source or "dashboard", payload.browser or "chrome", user_id=user_id)

@app.post("/api/extension/scan", response_model=ScanResponse)
def execute_extension_scan(payload: ScanRequest, authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    user_id = user["_id"] if user else None
    return perform_scan_internal(payload.url, "browser_extension", payload.browser or "chrome", user_id=user_id)

def perform_scan_internal(url: str, source: str, browser: str, user_id: Optional[str] = None) -> dict:
    if not url or not url.strip():
        raise HTTPException(status_code=400, detail="URL cannot be empty")

    allowed_sources = {"manual_scanner", "browser_extension", "dashboard", "api"}
    if source not in allowed_sources:
        source = "api"
    
    clean_url = url.strip()
    res = calculate_risk(clean_url)
    created_at = utc_now()
    risk_level = res["classification"].lower().replace(" ", "_")

    scan_doc = {
        "user_id": user_id,
        "url": clean_url,
        "domain": res["domain"],
        "risk_score": res["risk_score"],
        "classification": res["classification"],
        "risk_level": risk_level,
        "ml_prediction": res["ml_prediction"],
        "ml_confidence": res["ml_confidence"],
        "risk_factors": res["risk_factors"],
        "recommendation": res["recommendation"],
        "source": source,
        "browser": browser,
        "created_at": created_at,
        "updated_at": created_at,
        "features": res["features"]
    }

    try:
        scan_id = db_manager.insert_scan(scan_doc)
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Database unavailable")

    scan_doc["scan_id"] = scan_id
    scan_doc["timestamp"] = created_at.isoformat()

    # Trigger alerts and broadcast to notification service & SSE feed
    notification_service.process_scan_alert(scan_doc, user_id=user_id)
    try:
        loop = asyncio.get_running_loop()
        # Broadcast event to the specific user (if available) and to anonymous listeners
        loop.create_task(notification_service.broadcast_event("scan_result", db_manager.serialize_doc(scan_doc), user_id=user_id))
    except RuntimeError:
        pass

    return {
        "scan_id": scan_id,
        "url": clean_url,
        "domain": res["domain"],
        "risk_score": res["risk_score"],
        "classification": res["classification"],
        "ml_prediction": res["ml_prediction"],
        "ml_confidence": res["ml_confidence"],
        "risk_factors": res["risk_factors"],
        "recommendation": res["recommendation"],
        "source": source,
        "browser": browser,
        "timestamp": created_at.isoformat(),
        "features": res["features"]
    }

@app.get("/api/scans")
def get_scans_list(
    limit: int = Query(50, ge=1, le=200),
    source: Optional[str] = None,
    classification: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    user = get_current_user(authorization)
    user_id = user["_id"] if user else None
    return db_manager.list_scans(limit=limit, source=source, classification=classification, user_id=user_id)

@app.get("/api/scans/recent")
def get_recent_scans(
    limit: int = Query(20, ge=1, le=100),
    authorization: Optional[str] = Header(None),
):
    user = get_current_user(authorization)
    user_id = user["_id"] if user else None
    return db_manager.list_scans(limit=limit, user_id=user_id)

@app.get("/api/scans/{scan_id}")
def get_scan_by_id(scan_id: str, authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    user_id = user["_id"] if user else None
    scan = db_manager.get_scan(scan_id, user_id=user_id)
    if not scan:
        raise HTTPException(status_code=404, detail=f"Scan with ID '{scan_id}' not found")
    return scan

@app.get("/api/dashboard/stats", response_model=KPIResponse)
@app.get("/api/analytics/kpis", response_model=KPIResponse)
def get_kpi_stats(authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    user_id = user["_id"] if user else None
    return db_manager.get_kpis(user_id=user_id)

@app.get("/api/dashboard/activity")
@app.get("/api/analytics/live-extension-activity")
def get_extension_activity(authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    user_id = user["_id"] if user else None
    return db_manager.get_live_extension_activity(user_id=user_id)

@app.get("/api/dashboard/threat-distribution")
def get_threat_distribution(authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    user_id = user["_id"] if user else None
    return db_manager.get_threat_distribution(user_id=user_id)

@app.get("/api/dashboard/sources")
def get_sources_distribution(authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    user_id = user["_id"] if user else None
    return db_manager.get_source_distribution(user_id=user_id)

@app.get("/api/extension/status", response_model=ExtensionStatusResponse)
def get_extension_status(authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    user_id = user["_id"] if user else None
    ext_scans = db_manager.list_scans(limit=100, source="browser_extension", user_id=user_id)
    threats = sum(1 for s in ext_scans if s.get("classification") in ["HIGH RISK", "CRITICAL", "SUSPICIOUS"])
    critical = sum(1 for s in ext_scans if s.get("classification") == "CRITICAL")
    last_ts = ext_scans[0].get("timestamp") if ext_scans else None

    return {
        "status": "connected",
        "version": "2.0.0",
        "last_scan_timestamp": last_ts,
        "total_extension_scans": len(ext_scans),
        "threats_detected": threats,
        "critical_threats": critical
    }

@app.get("/api/analytics/threat-network", response_model=ThreatNetworkResponse)
def get_threat_network(authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    user_id = user["user_id"] if user else None
    recent_scans = db_manager.list_scans(limit=15, user_id=user_id)
    nodes = []
    edges = []
    node_ids = set()

    for s in recent_scans:
        s_id = s.get("scan_id", "scan_1")
        domain = s.get("domain", "domain")
        cls = s.get("classification", "SAFE")
        score = s.get("risk_score", 0)
        source = s.get("source", "dashboard")

        # Scan node
        if s_id not in node_ids:
            nodes.append(GraphNode(id=s_id, label=domain or s.get("url", ""), type="url", risk_score=score))
            node_ids.add(s_id)

        # Source node
        src_id = f"src_{source}"
        if src_id not in node_ids:
            nodes.append(GraphNode(id=src_id, label=source.upper(), type="source"))
            node_ids.add(src_id)

        edges.append(GraphEdge(source=src_id, target=s_id, relationship="DISCOVERED_BY"))

        # Risk Factors nodes
        for factor in s.get("risk_factors", [])[:2]:
            f_id = f"factor_{hash(factor)}"
            if f_id not in node_ids:
                nodes.append(GraphNode(id=f_id, label=factor[:30], type="risk_factor"))
                node_ids.add(f_id)
            edges.append(GraphEdge(source=s_id, target=f_id, relationship="TRIGGERED"))

    return ThreatNetworkResponse(nodes=nodes, edges=edges)
