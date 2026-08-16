import os
import time
from typing import List, Dict, Any, Optional
import pymongo
from pymongo import MongoClient
import mongomock

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "phishguard")

class DatabaseManager:
    def __init__(self):
        self.is_real_mongo = False
        self.db = None
        self._connect()

    def _connect(self):
        try:
            client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=1500)
            # Test connection
            client.admin.command('ping')
            self.db = client[DATABASE_NAME]
            self.is_real_mongo = True
            print("Successfully connected to MongoDB server at", MONGO_URI)
        except Exception as e:
            print(f"MongoDB connection unavailable ({e}). Falling back to in-memory mongomock database.")
            client = mongomock.MongoClient()
            self.db = client[DATABASE_NAME]
            self.is_real_mongo = False

    def insert_scan(self, scan_data: Dict[str, Any]) -> str:
        record = dict(scan_data)
        if "created_at" not in record:
            record["created_at"] = time.time()
        res = self.db.scans.insert_one(record)
        scan_id = str(res.inserted_id)
        self.db.scans.update_one({"_id": res.inserted_id}, {"$set": {"scan_id": scan_id}})
        return scan_id

    def get_scan(self, scan_id: str) -> Optional[Dict[str, Any]]:
        record = self.db.scans.find_one({"scan_id": scan_id})
        if record and "_id" in record:
            record["_id"] = str(record["_id"])
        return record

    def list_scans(self, limit: int = 50, source: Optional[str] = None, classification: Optional[str] = None) -> List[Dict[str, Any]]:
        query = {}
        if source:
            query["source"] = source
        if classification:
            query["classification"] = classification.upper()
            
        cursor = self.db.scans.find(query).sort("created_at", -1).limit(limit)
        results = []
        for doc in cursor:
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
            results.append(doc)
        return results

    def get_kpis(self) -> Dict[str, int]:
        total_scans = self.db.scans.count_documents({})
        threats_detected = self.db.scans.count_documents({"classification": {"$in": ["HIGH RISK", "CRITICAL", "SUSPICIOUS"]}})
        critical_threats = self.db.scans.count_documents({"classification": "CRITICAL"})
        extension_scans = self.db.scans.count_documents({"source": "browser_extension"})

        return {
            "total_scans": total_scans,
            "threats_detected": threats_detected,
            "critical_threats": critical_threats,
            "extension_scans": extension_scans
        }

    def get_live_extension_activity(self, limit: int = 10) -> List[Dict[str, Any]]:
        cursor = self.db.scans.find({"source": "browser_extension"}).sort("created_at", -1).limit(limit)
        results = []
        for doc in cursor:
            results.append({
                "scan_id": doc.get("scan_id", str(doc.get("_id"))),
                "timestamp": doc.get("timestamp", ""),
                "browser": doc.get("browser", "chrome"),
                "url": doc.get("url", ""),
                "domain": doc.get("domain", ""),
                "classification": doc.get("classification", "SAFE"),
                "risk_score": doc.get("risk_score", 0)
            })
        return results

    def get_threat_distribution(self) -> Dict[str, int]:
        dist = {"SAFE": 0, "SUSPICIOUS": 0, "HIGH RISK": 0, "CRITICAL": 0}
        for key in dist.keys():
            dist[key] = self.db.scans.count_documents({"classification": key})
        return dist

    def get_source_distribution(self) -> Dict[str, int]:
        dist = {"dashboard": 0, "browser_extension": 0, "api": 0, "demo": 0}
        for key in dist.keys():
            dist[key] = self.db.scans.count_documents({"source": key})
        return dist

db_manager = DatabaseManager()
