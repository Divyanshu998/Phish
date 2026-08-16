import hashlib
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.collection import Collection
from pymongo.database import Database
from pymongo.errors import PyMongoError

logger = logging.getLogger(__name__)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "phishguard")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def object_id_or_none(value: Optional[str]) -> Optional[ObjectId]:
    if not value:
        return None
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        return None


class DatabaseManager:
    def __init__(self) -> None:
        self.client: Optional[MongoClient] = None
        self.db: Optional[Database] = None
        self.database_name = DATABASE_NAME

    @property
    def is_connected(self) -> bool:
        if self.client is None:
            return False
        try:
            self.client.admin.command("ping")
            return True
        except PyMongoError:
            return False

    def connect(self) -> None:
        if self.client is not None:
            return

        try:
            self.client = MongoClient(
                MONGO_URI,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                retryWrites=True,
                tz_aware=True,
            )
            self.client.admin.command("ping")
            self.db = self.client[self.database_name]
            self.create_indexes()
            logger.info("MongoDB connected successfully: %s", self.database_name)
            print(f"MongoDB connected successfully: {self.database_name}")
        except PyMongoError:
            self.client = None
            self.db = None
            logger.exception("MongoDB connection failed")
            print("MongoDB connection failed")
            raise

    def close(self) -> None:
        if self.client is not None:
            self.client.close()
        self.client = None
        self.db = None

    def require_db(self) -> Database:
        if self.db is None:
            raise RuntimeError("MongoDB is not connected")
        return self.db

    def collection(self, name: str) -> Collection:
        return self.require_db()[name]

    def create_indexes(self) -> None:
        db = self.require_db()
        db.users.create_index([("email", ASCENDING)], unique=True)
        db.users.create_index([("user_id", ASCENDING)], unique=True, sparse=True)
        db.users.create_index([("verification_token_hash", ASCENDING)], sparse=True)
        db.users.create_index([("reset_token_hash", ASCENDING)], sparse=True)

        db.scans.create_index([("user_id", ASCENDING)])
        db.scans.create_index([("created_at", DESCENDING)])
        db.scans.create_index([("classification", ASCENDING)])
        db.scans.create_index([("risk_level", ASCENDING)])
        db.scans.create_index([("source", ASCENDING)])
        db.scans.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])

        db.notifications.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
        db.notifications.create_index([("scan_id", ASCENDING)])
        db.notifications.create_index([("read", ASCENDING)])

        db.alert_events.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
        db.alert_events.create_index([("scan_id", ASCENDING)])
        db.alert_events.create_index([("channel", ASCENDING), ("status", ASCENDING)])
        db.alert_events.create_index([("user_id", ASCENDING), ("url", ASCENDING), ("risk_level", ASCENDING), ("created_at", DESCENDING)])

    def health(self) -> Dict[str, str]:
        return {
            "status": "healthy" if self.is_connected else "unhealthy",
            "database": "connected" if self.is_connected else "disconnected",
        }

    def serialize_doc(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        result: Dict[str, Any] = {}
        for key, value in doc.items():
            if isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.astimezone(timezone.utc).isoformat()
            elif isinstance(value, list):
                result[key] = [
                    self.serialize_doc(item) if isinstance(item, dict) else item
                    for item in value
                ]
            elif isinstance(value, dict):
                result[key] = self.serialize_doc(value)
            else:
                result[key] = value
        return result

    def insert_scan(self, scan_data: Dict[str, Any]) -> str:
        record = dict(scan_data)
        record.setdefault("created_at", utc_now())
        record.setdefault("updated_at", record["created_at"])
        result = self.collection("scans").insert_one(record)
        return str(result.inserted_id)

    def get_scan(self, scan_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        query: Dict[str, Any] = {"_id": object_id_or_none(scan_id)}
        if query["_id"] is None:
            return None
        if user_id is not None:
            query["user_id"] = user_id
        doc = self.collection("scans").find_one(query)
        return self.scan_to_api(doc) if doc else None

    def list_scans(
        self,
        limit: int = 50,
        source: Optional[str] = None,
        classification: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}
        if source:
            query["source"] = source
        if classification:
            query["classification"] = classification.upper()
        if user_id is not None:
            query["user_id"] = user_id

        cursor = self.collection("scans").find(query).sort("created_at", DESCENDING).limit(limit)
        return [self.scan_to_api(doc) for doc in cursor]

    def scan_to_api(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        data = self.serialize_doc(doc)
        data["scan_id"] = str(doc["_id"])
        data.setdefault("timestamp", data.get("created_at"))
        data.setdefault("risk_level", data.get("classification", "SAFE").lower().replace(" ", "_"))
        return data

    def get_kpis(self, user_id: Optional[str] = None) -> Dict[str, int]:
        base_query: Dict[str, Any] = {"user_id": user_id} if user_id is not None else {}
        scans = self.collection("scans")
        threat_query = {**base_query, "classification": {"$in": ["SUSPICIOUS", "HIGH RISK", "CRITICAL"]}}

        return {
            "total_scans": scans.count_documents(base_query),
            "threats_detected": scans.count_documents(threat_query),
            "critical_threats": scans.count_documents({**base_query, "classification": "CRITICAL"}),
            "extension_scans": scans.count_documents({**base_query, "source": "browser_extension"}),
            "high_risk_threats": scans.count_documents({**base_query, "classification": "HIGH RISK"}),
            "safe_scans": scans.count_documents({**base_query, "classification": "SAFE"}),
        }

    def get_live_extension_activity(self, limit: int = 10, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {"source": "browser_extension"}
        if user_id is not None:
            query["user_id"] = user_id
        cursor = self.collection("scans").find(query).sort("created_at", DESCENDING).limit(limit)
        return [self.scan_to_api(doc) for doc in cursor]

    def get_threat_distribution(self, user_id: Optional[str] = None) -> Dict[str, int]:
        base_query: Dict[str, Any] = {"user_id": user_id} if user_id is not None else {}
        scans = self.collection("scans")
        return {
            key: scans.count_documents({**base_query, "classification": key})
            for key in ["SAFE", "SUSPICIOUS", "HIGH RISK", "CRITICAL"]
        }

    def get_source_distribution(self, user_id: Optional[str] = None) -> Dict[str, int]:
        base_query: Dict[str, Any] = {"user_id": user_id} if user_id is not None else {}
        scans = self.collection("scans")
        return {
            key: scans.count_documents({**base_query, "source": key})
            for key in ["dashboard", "browser_extension", "api", "manual_scanner"]
        }


db_manager = DatabaseManager()
