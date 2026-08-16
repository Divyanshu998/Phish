from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query
from app.database import db_manager
from app.routers.auth import require_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/dashboard")
def admin_dashboard(_=Depends(require_admin)):
    # Aggregate key metrics
    users_count = db_manager.collection('users').count_documents({})
    total_scans = db_manager.collection('scans').count_documents({})
    threats = db_manager.collection('scans').count_documents({'classification': {'$in': ['SUSPICIOUS', 'HIGH RISK', 'CRITICAL']}})
    critical = db_manager.collection('scans').count_documents({'classification': 'CRITICAL'})
    recent_events = list(db_manager.collection('alert_events').find().sort('created_at', -1).limit(10))

    return {
        'total_users': users_count,
        'total_scans': total_scans,
        'threats_detected': threats,
        'critical_threats': critical,
        'recent_alert_events': [db_manager.serialize_doc(e) for e in recent_events]
    }


@router.get('/users')
def list_users(q: Optional[str] = Query(None), limit: int = Query(50, le=200), _=Depends(require_admin)):
    query: Dict[str, Any] = {}
    if q:
        query['$or'] = [{'name': {'$regex': q, '$options': 'i'}}, {'email': {'$regex': q, '$options': 'i'}}]
    cursor = db_manager.collection('users').find(query).sort('created_at', -1).limit(limit)
    results = []
    for u in cursor:
        results.append({
            'user_id': u.get('user_id'),
            'name': u.get('name'),
            'email': u.get('email'),
            'role': u.get('role', 'user'),
            'email_verified': u.get('email_verified', False),
            'created_at': db_manager.serialize_doc({'value': u.get('created_at')})['value'] if u.get('created_at') else '',
            'last_login': db_manager.serialize_doc({'value': u.get('last_login')})['value'] if u.get('last_login') else '',
            'scan_count': db_manager.collection('scans').count_documents({'user_id': u.get('user_id')})
        })
    return results


@router.get('/scans')
def admin_list_scans(limit: int = Query(50, le=500), _=Depends(require_admin)):
    cursor = db_manager.collection('scans').find({}).sort('created_at', -1).limit(limit)
    return [db_manager.scan_to_api(d) for d in cursor]
