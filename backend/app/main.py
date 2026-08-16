import os
import time
import asyncio
from datetime import datetime, timezone
from typing import Optional, List

# Load .env file FIRST before any service/config modules are imported
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

from fastapi import FastAPI, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware

from app.models.schemas import (
    ScanRequest, ScanResponse, KPIResponse, 
    ExtensionScanActivityItem, ExtensionStatusResponse,
    ThreatNetworkResponse, GraphNode, GraphEdge
)
from app.engine.risk_scorer import calculate_risk
from app.database import db_manager
from app.services.ml_service import ml_service
from app.services.auth_service import auth_service
from app.services.notification_service import notification_service
from app.routers.auth import router as auth_router, get_current_user
from app.routers.notifications import router as notifications_router

app = FastAPI(
    title="PhishGuard AI Backend API",
    description="Intelligent Real-Time Phishing Detection & Threat Analysis Platform",
    version="2.0.0"
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

def seed_initial_demo_scans():
    if db_manager.db.scans.count_documents({}) == 0:
        print("Seeding initial demonstration scan data into database...")
        demo_urls = [
            ("https://example.com", "dashboard", "chrome"),
            ("http://paypal-security-update-fix-account.com-secure.net/login", "browser_extension", "chrome"),
            ("https://github.com", "dashboard", "chrome"),
            ("http://verify-bankofamerica-account-alert.xyz/auth", "browser_extension", "chrome"),
            ("http://192.168.1.105/login.html", "browser_extension", "edge"),
            ("https://apple.com", "api", "chrome"),
            ("http://chase-bank-credential-update-portal.top/index.php", "browser_extension", "chrome"),
            ("https://google.com", "demo", "chrome"),
        ]
        for url, src, br in demo_urls:
            res = calculate_risk(url)
            dt_str = datetime.now(timezone.utc).isoformat()
            scan_doc = {
                "url": url,
                "domain": res["domain"],
                "risk_score": res["risk_score"],
                "classification": res["classification"],
                "ml_prediction": res["ml_prediction"],
                "ml_confidence": res["ml_confidence"],
                "risk_factors": res["risk_factors"],
                "recommendation": res["recommendation"],
                "source": src,
                "browser": br,
                "timestamp": dt_str,
                "created_at": time.time(),
                "features": res["features"]
            }
            db_manager.insert_scan(scan_doc)

@app.on_event("startup")
def startup_event():
    seed_initial_demo_scans()

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "version": "2.0.0",
        "service": "PhishGuard AI Real-Time Protection Engine",
        "database": "mongodb" if db_manager.is_real_mongo else "in-memory-mongodb-fallback",
        "ml_model_loaded": ml_service.is_loaded,
        "ml_device": str(ml_service.device),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.post("/api/scan", response_model=ScanResponse)
def execute_scan(payload: ScanRequest, authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    user_id = user["user_id"] if user else None
    return perform_scan_internal(payload.url, payload.source or "dashboard", payload.browser or "chrome", user_id=user_id)

@app.post("/api/extension/scan", response_model=ScanResponse)
def execute_extension_scan(payload: ScanRequest, authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    user_id = user["user_id"] if user else None
    return perform_scan_internal(payload.url, "browser_extension", payload.browser or "chrome", user_id=user_id)

def perform_scan_internal(url: str, source: str, browser: str, user_id: Optional[str] = None) -> dict:
    if not url or not url.strip():
        raise HTTPException(status_code=400, detail="URL cannot be empty")
    
    clean_url = url.strip()
    res = calculate_risk(clean_url)
    timestamp_str = datetime.now(timezone.utc).isoformat()

    scan_doc = {
        "user_id": user_id,
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
        "timestamp": timestamp_str,
        "created_at": time.time(),
        "features": res["features"]
    }

    scan_id = db_manager.insert_scan(scan_doc)
    scan_doc["scan_id"] = scan_id

    # Trigger alerts and broadcast to notification service & SSE feed
    notification_service.process_scan_alert(scan_doc, user_id=user_id)
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(notification_service.broadcast_event("scan_result", scan_doc))
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
        "timestamp": timestamp_str,
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
    # If user is authenticated, filter scans for this user (or general system scans)
    return db_manager.list_scans(limit=limit, source=source, classification=classification)

@app.get("/api/scans/{scan_id}")
def get_scan_by_id(scan_id: str):
    scan = db_manager.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail=f"Scan with ID '{scan_id}' not found")
    return scan

@app.get("/api/dashboard/stats", response_model=KPIResponse)
@app.get("/api/analytics/kpis", response_model=KPIResponse)
def get_kpi_stats():
    return db_manager.get_kpis()

@app.get("/api/dashboard/activity")
@app.get("/api/analytics/live-extension-activity")
def get_extension_activity():
    return db_manager.get_live_extension_activity()

@app.get("/api/dashboard/threat-distribution")
def get_threat_distribution():
    return db_manager.get_threat_distribution()

@app.get("/api/dashboard/sources")
def get_sources_distribution():
    return db_manager.get_source_distribution()

@app.get("/api/extension/status", response_model=ExtensionStatusResponse)
def get_extension_status():
    ext_scans = db_manager.list_scans(limit=100, source="browser_extension")
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
def get_threat_network():
    recent_scans = db_manager.list_scans(limit=15)
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
