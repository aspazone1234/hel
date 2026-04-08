from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, Request, HTTPException, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from pathlib import Path
from fpdf import FPDF
import os
import logging
import jwt
import csv
import io
import uuid
import math
import random

ROOT_DIR = Path(__file__).parent
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")
JWT_ALGORITHM = "HS256"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# V2: Hardcoded admin accounts — role "admin" becomes "swamsevak", superadmin stays
ADMIN_ACCOUNTS = {
    "arunpanchariya": {"password": "arunlondon123", "name": "Arun Panchariya", "city": "London", "role": "swamsevak"},
    "ashokpanchariya": {"password": "ashokahmedabad123", "name": "Ashok Panchariya", "city": "Ahmedabad", "role": "swamsevak"},
    "satishpanchariya": {"password": "satishmumbai123", "name": "Satish Panchariya", "city": "Mumbai", "role": "swamsevak"},
    "basantmalpani": {"password": "basantjaipur123", "name": "Basant Malpani", "city": "Jaipur", "role": "swamsevak"},
    "superashwini": {"password": "supersebhiupper123", "name": "Super Admin Ashwini", "city": "", "role": "superadmin"},
}

REGISTRATION_CUTOFF = "2026-05-19"
FINALIZATION_DATE = "2026-05-21"
EVENT_START = "2026-05-28"
EVENT_END = "2026-06-03"
STAY_WINDOW_START = "2026-05-27"
STAY_WINDOW_END = "2026-06-04"

# ─── Auth Helpers ───
def get_jwt_secret():
    return os.environ["JWT_SECRET"]

def create_access_token(username: str, name: str, role: str = "swamsevak") -> str:
    payload = {"sub": username, "name": name, "role": role, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header[7:]
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        username = payload.get("sub")
        if username not in ADMIN_ACCOUNTS:
            custom = await db.custom_admins.find_one({"username": username})
            if not custom:
                raise HTTPException(status_code=401, detail="User not found")
            return {"username": username, "name": custom.get("name", ""), "role": custom.get("role", "swamsevak")}
        role = ADMIN_ACCOUNTS[username].get("role", "swamsevak")
        return {"username": username, "name": payload.get("name", ""), "role": role}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_superadmin(request: Request):
    user = await get_current_user(request)
    if user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Super Admin access required")
    return user

# ─── Audit Helper ───
async def log_audit(action_type: str, target_type: str, target_id: str, target_name: str, details: str, performed_by: str):
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action_type": action_type,
        "target_type": target_type,
        "target_id": target_id,
        "target_name": target_name,
        "details": details,
        "performed_by": performed_by,
        "performed_at": datetime.now(timezone.utc).isoformat(),
    })

# ─── V2 Models ───
class LoginRequest(BaseModel):
    username: str
    password: str

class OTPSendRequest(BaseModel):
    mobile: str

class OTPVerifyRequest(BaseModel):
    mobile: str
    otp: str

class AttendeeItem(BaseModel):
    id: str = ""
    name: str = ""
    age: str = ""
    special_needs: str = ""

class AddressInfo(BaseModel):
    full_address: str = ""
    city: str = ""
    state: str = ""
    country: str = ""

class RegistrationCreateV2(BaseModel):
    primary_mobile: str
    additional_phone: str = ""
    email: str = ""
    preferred_language: str = "hi"
    address: AddressInfo = AddressInfo()
    num_people: int = 1
    attendees: List[AttendeeItem] = []
    group_head_id: str = ""
    family_special_request: str = ""
    attendance_intent: str = "Yes"
    selected_days: List[str] = []
    expected_arrival_time: str = ""
    expected_departure_time: str = ""
    reference_person_id: str = ""
    relation_category: str = ""
    message: str = ""
    consent: bool = False

class RegistrationUpdateV2(BaseModel):
    additional_phone: Optional[str] = None
    email: Optional[str] = None
    preferred_language: Optional[str] = None
    address: Optional[AddressInfo] = None
    num_people: Optional[int] = None
    attendees: Optional[List[AttendeeItem]] = None
    group_head_id: Optional[str] = None
    family_special_request: Optional[str] = None
    attendance_intent: Optional[str] = None
    selected_days: Optional[List[str]] = None
    expected_arrival_time: Optional[str] = None
    expected_departure_time: Optional[str] = None
    reference_person_id: Optional[str] = None
    relation_category: Optional[str] = None
    message: Optional[str] = None
    admin_notes: Optional[str] = None
    arrival_status: Optional[str] = None
    room_assignments: Optional[List[str]] = None

class ManualEntryCreateV2(BaseModel):
    primary_mobile: str = ""
    additional_phone: str = ""
    email: str = ""
    preferred_language: str = "hi"
    address: AddressInfo = AddressInfo()
    num_people: int = 1
    attendees: List[AttendeeItem] = []
    group_head_id: str = ""
    family_special_request: str = ""
    attendance_intent: str = "Yes"
    selected_days: List[str] = []
    expected_arrival_time: str = ""
    expected_departure_time: str = ""
    reference_person_id: str = ""
    relation_category: str = ""
    message: str = ""
    admin_notes: str = ""
    target_bucket: str = "expected"

class StatusUpdate(BaseModel):
    status: str

class RoomCreate(BaseModel):
    room_code: str
    floor: str = ""
    capacity: int = 2
    ac_type: str = "Non-AC"
    notes: str = ""

class RoomBulkCreate(BaseModel):
    rooms: List[RoomCreate]

class RoomAssign(BaseModel):
    registration_id: str

class RoomShift(BaseModel):
    new_room_code: str

class ReferencePersonCreate(BaseModel):
    name: str
    description: str = ""

class ReferencePersonUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class RelationCategoryCreate(BaseModel):
    name: str
    description: str = ""

class AdminCreate(BaseModel):
    username: str
    password: str
    name: str
    city: str = ""
    mobile: str = ""
    role: str = "swamsevak"

class AdminUpdate(BaseModel):
    password: Optional[str] = None
    name: Optional[str] = None
    city: Optional[str] = None
    mobile: Optional[str] = None

# ─── Auth Endpoints ───
@api_router.post("/auth/login")
async def login(req: LoginRequest):
    username = req.username.lower().strip()
    account = ADMIN_ACCOUNTS.get(username)
    if account:
        if req.password != account["password"]:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        role = account.get("role", "swamsevak")
        access_token = create_access_token(username, account["name"], role)
        return {"token": access_token, "username": username, "name": account["name"], "city": account["city"], "role": role}
    custom = await db.custom_admins.find_one({"username": username})
    if custom and req.password == custom.get("password", ""):
        role = custom.get("role", "swamsevak")
        access_token = create_access_token(username, custom.get("name", username), role)
        return {"token": access_token, "username": username, "name": custom.get("name", username), "city": custom.get("city", ""), "role": role}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    account = ADMIN_ACCOUNTS.get(user["username"], {})
    if not account:
        custom = await db.custom_admins.find_one({"username": user["username"]})
        return {"username": user["username"], "name": user["name"], "city": custom.get("city", "") if custom else "", "role": user.get("role", "swamsevak")}
    return {"username": user["username"], "name": user["name"], "city": account.get("city", ""), "role": account.get("role", "swamsevak")}

@api_router.post("/auth/logout")
async def logout():
    return {"message": "Logged out"}

# ─── OTP Endpoints (Mocked) ───
@api_router.post("/otp/send")
async def send_otp(body: OTPSendRequest):
    mobile = body.mobile.strip()
    if not mobile or len(mobile) < 10:
        raise HTTPException(status_code=400, detail="Invalid mobile number")
    otp_code = str(random.randint(1000, 9999))
    await db.otp_sessions.update_one(
        {"mobile": mobile},
        {"$set": {"mobile": mobile, "otp": otp_code, "created_at": datetime.now(timezone.utc).isoformat(), "verified": False, "attempts": 0}},
        upsert=True
    )
    logger.info(f"[MOCK OTP] Sent OTP {otp_code} to {mobile}")
    return {"message": "OTP sent successfully", "mock_otp": otp_code}

@api_router.post("/otp/verify")
async def verify_otp(body: OTPVerifyRequest):
    mobile = body.mobile.strip()
    session = await db.otp_sessions.find_one({"mobile": mobile})
    if not session:
        raise HTTPException(status_code=400, detail="No OTP sent for this number. Please request a new OTP.")
    if session.get("attempts", 0) >= 5:
        raise HTTPException(status_code=429, detail="Too many attempts. Please request a new OTP.")
    if session.get("otp") != body.otp.strip():
        await db.otp_sessions.update_one({"mobile": mobile}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail="Invalid OTP. Please try again.")
    await db.otp_sessions.update_one({"mobile": mobile}, {"$set": {"verified": True}})
    existing_reg = await db.registrations.find_one(
        {"primary_mobile": mobile, "approval_status": {"$nin": ["deleted"]}},
        {"_id": 0}
    )
    return {
        "message": "OTP verified successfully",
        "verified": True,
        "has_existing_registration": existing_reg is not None,
        "existing_registration": existing_reg
    }

# ─── Public: Reference Persons & Relation Categories ───
@api_router.get("/reference-persons/public")
async def get_reference_persons_public():
    persons = await db.reference_persons.find({}, {"_id": 0}).sort("name", 1).to_list(100)
    return persons

@api_router.get("/relation-categories/public")
async def get_relation_categories_public():
    cats = await db.relation_categories.find({}, {"_id": 0}).sort("name", 1).to_list(100)
    return cats

# ─── Public: Registration ───
@api_router.get("/registrations/count")
async def get_registration_count():
    total = await db.registrations.count_documents({"approval_status": {"$nin": ["deleted"]}})
    return {"total": total}

@api_router.get("/registration/by-mobile")
async def get_registration_by_mobile(mobile: str = ""):
    if not mobile:
        raise HTTPException(status_code=400, detail="Mobile number required")
    reg = await db.registrations.find_one(
        {"primary_mobile": mobile.strip(), "approval_status": {"$nin": ["deleted"]}},
        {"_id": 0}
    )
    if not reg:
        return {"found": False, "registration": None}
    return {"found": True, "registration": reg}

@api_router.post("/registrations")
async def create_registration(reg: RegistrationCreateV2):
    existing = await db.registrations.find_one(
        {"primary_mobile": reg.primary_mobile, "approval_status": {"$nin": ["deleted"]}}
    )
    if existing:
        raise HTTPException(status_code=409, detail="A registration with this mobile number already exists. Please update instead.")

    attendees_data = []
    for a in reg.attendees:
        att = a.model_dump() if hasattr(a, 'model_dump') else dict(a)
        if not att.get("id"):
            att["id"] = str(uuid.uuid4())
        att["arrival_status"] = "not_arrived"
        attendees_data.append(att)

    sorted_days = sorted(reg.selected_days) if reg.selected_days else []
    arrival_date = sorted_days[0] if sorted_days else ""
    departure_date = sorted_days[-1] if sorted_days else ""

    doc = {
        "id": str(uuid.uuid4()),
        "primary_mobile": reg.primary_mobile,
        "additional_phone": reg.additional_phone,
        "email": reg.email,
        "preferred_language": reg.preferred_language,
        "address": reg.address.model_dump() if hasattr(reg.address, 'model_dump') else dict(reg.address),
        "num_people": reg.num_people,
        "attendees": attendees_data,
        "group_head_id": reg.group_head_id,
        "family_special_request": reg.family_special_request,
        "attendance_intent": reg.attendance_intent,
        "selected_days": sorted_days,
        "arrival_date": arrival_date,
        "departure_date": departure_date,
        "expected_arrival_time": reg.expected_arrival_time,
        "expected_departure_time": reg.expected_departure_time,
        "reference_person_id": reg.reference_person_id,
        "relation_category": reg.relation_category,
        "message": reg.message,
        "consent": reg.consent,
        "approval_status": "pending",
        "arrival_status": "not_arrived",
        "room_assignments": [],
        "admin_notes": "",
        "entry_type": "form",
        "created_by": "Public Form",
        "approved_by": "",
        "last_updated_by": "",
        "last_updated_at": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.registrations.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/registrations/{reg_id}/public")
async def update_registration_public(reg_id: str, body: RegistrationUpdateV2):
    reg = await db.registrations.find_one({"id": reg_id, "approval_status": {"$nin": ["deleted"]}})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")

    updates = {}
    body_dict = body.model_dump(exclude_none=True)

    if "address" in body_dict and body_dict["address"]:
        updates["address"] = body_dict["address"] if isinstance(body_dict["address"], dict) else body_dict["address"].model_dump()
        del body_dict["address"]

    if "attendees" in body_dict and body_dict["attendees"] is not None:
        attendees_data = []
        for a in body_dict["attendees"]:
            att = a if isinstance(a, dict) else a.model_dump()
            if not att.get("id"):
                att["id"] = str(uuid.uuid4())
            if "arrival_status" not in att:
                att["arrival_status"] = "not_arrived"
            attendees_data.append(att)
        updates["attendees"] = attendees_data
        del body_dict["attendees"]

    if "selected_days" in body_dict and body_dict["selected_days"]:
        sorted_days = sorted(body_dict["selected_days"])
        updates["selected_days"] = sorted_days
        updates["arrival_date"] = sorted_days[0] if sorted_days else ""
        updates["departure_date"] = sorted_days[-1] if sorted_days else ""
        del body_dict["selected_days"]

    # Remove admin-only fields from public update
    for field in ["admin_notes", "arrival_status", "room_assignments"]:
        body_dict.pop(field, None)

    updates.update(body_dict)
    updates["last_updated_by"] = "Public Update"
    updates["last_updated_at"] = datetime.now(timezone.utc).isoformat()

    if updates:
        await db.registrations.update_one({"id": reg_id}, {"$set": updates})

    return {"message": "Registration updated", "id": reg_id}

# ─── Admin: Reference Persons CRUD ───
@api_router.get("/admin/reference-persons")
async def list_reference_persons(request: Request):
    await get_current_user(request)
    persons = await db.reference_persons.find({}, {"_id": 0}).sort("name", 1).to_list(100)
    return persons

@api_router.post("/admin/reference-persons")
async def create_reference_person(body: ReferencePersonCreate, request: Request):
    user = await require_superadmin(request)
    doc = {"id": str(uuid.uuid4()), "name": body.name, "description": body.description, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.reference_persons.insert_one(doc)
    doc.pop("_id", None)
    await log_audit("create", "reference_person", doc["id"], body.name, f"Reference person created", user["name"])
    return doc

@api_router.put("/admin/reference-persons/{ref_id}")
async def update_reference_person(ref_id: str, body: ReferencePersonUpdate, request: Request):
    user = await require_superadmin(request)
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.reference_persons.update_one({"id": ref_id}, {"$set": updates})
    await log_audit("update", "reference_person", ref_id, updates.get("name", ""), f"Reference person updated", user["name"])
    return {"message": "Updated"}

@api_router.delete("/admin/reference-persons/{ref_id}")
async def delete_reference_person(ref_id: str, request: Request):
    user = await require_superadmin(request)
    result = await db.reference_persons.delete_one({"id": ref_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    await log_audit("delete", "reference_person", ref_id, "", f"Reference person deleted", user["name"])
    return {"message": "Deleted"}

# ─── Admin: Relation Categories CRUD ───
@api_router.get("/admin/relation-categories")
async def list_relation_categories(request: Request):
    await get_current_user(request)
    cats = await db.relation_categories.find({}, {"_id": 0}).sort("name", 1).to_list(100)
    return cats

@api_router.post("/admin/relation-categories")
async def create_relation_category(body: RelationCategoryCreate, request: Request):
    user = await require_superadmin(request)
    doc = {"id": str(uuid.uuid4()), "name": body.name, "description": body.description, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.relation_categories.insert_one(doc)
    doc.pop("_id", None)
    await log_audit("create", "relation_category", doc["id"], body.name, f"Relation category created", user["name"])
    return doc

@api_router.delete("/admin/relation-categories/{cat_id}")
async def delete_relation_category(cat_id: str, request: Request):
    user = await require_superadmin(request)
    await db.relation_categories.delete_one({"id": cat_id})
    await log_audit("delete", "relation_category", cat_id, "", f"Relation category deleted", user["name"])
    return {"message": "Deleted"}

# ─── Admin: Registrations (3-Bucket System) ───
@api_router.get("/admin/registrations")
async def get_registrations(
    request: Request,
    bucket: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    arrival_status: Optional[str] = None,
    reference_person_id: Optional[str] = None,
    arrival_date: Optional[str] = None,
    departure_date: Optional[str] = None,
    page: int = 1,
    per_page: int = 50,
):
    await get_current_user(request)
    query = {}

    # 3-Bucket filtering
    if bucket == "pending_approval":
        query["approval_status"] = "pending"
    elif bucket == "expected":
        query["approval_status"] = "approved"
        query["arrival_status"] = {"$in": ["not_arrived", "not_coming"]}
    elif bucket == "arrived":
        query["approval_status"] = "approved"
        query["arrival_status"] = {"$in": ["partially_arrived", "arrived", "departed"]}
    else:
        if status:
            query["approval_status"] = status
        if arrival_status:
            query["arrival_status"] = arrival_status

    if search:
        # Search across attendee names, mobile, address
        query["$or"] = [
            {"attendees.name": {"$regex": search, "$options": "i"}},
            {"primary_mobile": {"$regex": search, "$options": "i"}},
            {"additional_phone": {"$regex": search, "$options": "i"}},
            {"address.city": {"$regex": search, "$options": "i"}},
            {"address.full_address": {"$regex": search, "$options": "i"}},
        ]

    if reference_person_id:
        query["reference_person_id"] = reference_person_id
    if arrival_date:
        query["arrival_date"] = arrival_date
    if departure_date:
        query["departure_date"] = departure_date

    total = await db.registrations.count_documents(query)
    skip = (page - 1) * per_page
    regs = await db.registrations.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(per_page).to_list(per_page)
    return {"data": regs, "total": total, "page": page, "per_page": per_page, "total_pages": max(1, math.ceil(total / per_page))}

@api_router.get("/admin/registrations/check-duplicate")
async def check_duplicate(request: Request, mobile: str = ""):
    await get_current_user(request)
    if not mobile:
        return {"duplicates": [], "exists": False}
    dupes = await db.registrations.find(
        {"primary_mobile": mobile, "approval_status": {"$ne": "deleted"}},
        {"_id": 0, "id": 1, "primary_mobile": 1, "attendees": 1, "created_at": 1, "entry_type": 1}
    ).to_list(20)
    return {"duplicates": dupes, "exists": len(dupes) > 0}

@api_router.get("/admin/registrations/{reg_id}")
async def get_registration_detail(reg_id: str, request: Request):
    await get_current_user(request)
    reg = await db.registrations.find_one({"id": reg_id}, {"_id": 0})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    return reg

@api_router.put("/admin/registrations/{reg_id}")
async def update_registration_admin(reg_id: str, body: RegistrationUpdateV2, request: Request):
    user = await get_current_user(request)
    reg = await db.registrations.find_one({"id": reg_id})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")

    updates = {}
    body_dict = body.model_dump(exclude_none=True)

    if "address" in body_dict and body_dict["address"]:
        updates["address"] = body_dict["address"] if isinstance(body_dict["address"], dict) else body_dict["address"]
        del body_dict["address"]

    if "attendees" in body_dict and body_dict["attendees"] is not None:
        attendees_data = []
        for a in body_dict["attendees"]:
            att = a if isinstance(a, dict) else a
            if not att.get("id"):
                att["id"] = str(uuid.uuid4())
            if "arrival_status" not in att:
                att["arrival_status"] = "not_arrived"
            attendees_data.append(att)
        updates["attendees"] = attendees_data
        del body_dict["attendees"]

    if "selected_days" in body_dict and body_dict["selected_days"]:
        sorted_days = sorted(body_dict["selected_days"])
        updates["selected_days"] = sorted_days
        updates["arrival_date"] = sorted_days[0] if sorted_days else ""
        updates["departure_date"] = sorted_days[-1] if sorted_days else ""
        del body_dict["selected_days"]

    updates.update(body_dict)
    updates["last_updated_by"] = user["name"]
    updates["last_updated_at"] = datetime.now(timezone.utc).isoformat()

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    await db.registrations.update_one({"id": reg_id}, {"$set": updates})

    # Get group head name for audit
    head_name = ""
    for att in reg.get("attendees", []):
        if att.get("id") == reg.get("group_head_id"):
            head_name = att.get("name", "")
            break
    changed = ", ".join([k for k in updates.keys() if k not in ("last_updated_by", "last_updated_at")])
    await log_audit("edit", "registration", reg_id, head_name or reg.get("primary_mobile", ""), f"Updated: {changed}", user["name"])
    return {"message": "Updated", "id": reg_id}

# ─── Admin: Approve / Reject / Status Changes ───
@api_router.put("/admin/registrations/{reg_id}/approve")
async def approve_registration(reg_id: str, request: Request):
    user = await get_current_user(request)
    reg = await db.registrations.find_one({"id": reg_id})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    old = reg.get("approval_status", "pending")
    updates = {
        "approval_status": "approved",
        "approved_by": user["name"],
        "last_updated_by": user["name"],
        "last_updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.registrations.update_one({"id": reg_id}, {"$set": updates})
    head_name = ""
    for att in reg.get("attendees", []):
        if att.get("id") == reg.get("group_head_id"):
            head_name = att.get("name", "")
    await log_audit("approve", "registration", reg_id, head_name or reg.get("primary_mobile", ""), f"{old} → approved", user["name"])
    return {"message": "Approved", "id": reg_id}

@api_router.put("/admin/registrations/{reg_id}/reject")
async def reject_registration(reg_id: str, request: Request):
    user = await get_current_user(request)
    reg = await db.registrations.find_one({"id": reg_id})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    old = reg.get("approval_status", "pending")
    updates = {
        "approval_status": "rejected",
        "last_updated_by": user["name"],
        "last_updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.registrations.update_one({"id": reg_id}, {"$set": updates})
    head_name = ""
    for att in reg.get("attendees", []):
        if att.get("id") == reg.get("group_head_id"):
            head_name = att.get("name", "")
    await log_audit("reject", "registration", reg_id, head_name or reg.get("primary_mobile", ""), f"{old} → rejected", user["name"])
    return {"message": "Rejected", "id": reg_id}

@api_router.put("/admin/registrations/{reg_id}/status")
async def update_reg_status(reg_id: str, body: StatusUpdate, request: Request):
    user = await get_current_user(request)
    valid = ["pending", "approved", "rejected", "deleted"]
    if body.status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status: {body.status}")
    reg = await db.registrations.find_one({"id": reg_id})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    old = reg.get("approval_status", "pending")
    updates = {
        "approval_status": body.status,
        "last_updated_by": user["name"],
        "last_updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if body.status == "approved" and not reg.get("approved_by"):
        updates["approved_by"] = user["name"]
    if body.status == "deleted":
        # Free rooms
        for rc in reg.get("room_assignments", []):
            await db.rooms.update_one({"room_code": rc}, {"$set": {"occupant_ids": [], "status": "available"}})
        updates["room_assignments"] = []
    await db.registrations.update_one({"id": reg_id}, {"$set": updates})
    head_name = ""
    for att in reg.get("attendees", []):
        if att.get("id") == reg.get("group_head_id"):
            head_name = att.get("name", "")
    await log_audit(body.status, "registration", reg_id, head_name or reg.get("primary_mobile", ""), f"{old} → {body.status}", user["name"])
    return {"message": f"Status updated to {body.status}", "id": reg_id}

# ─── Admin: Mark Arrival Status ───
@api_router.put("/admin/registrations/{reg_id}/arrival")
async def update_arrival_status(reg_id: str, request: Request, arrival_status: str = "", arrived_attendee_ids: List[str] = Query(default=[])):
    user = await get_current_user(request)
    reg = await db.registrations.find_one({"id": reg_id})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")

    valid_statuses = ["not_arrived", "partially_arrived", "arrived", "not_coming", "departed"]
    if arrival_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid arrival status: {arrival_status}")

    updates = {
        "arrival_status": arrival_status,
        "last_updated_by": user["name"],
        "last_updated_at": datetime.now(timezone.utc).isoformat(),
    }

    # Update individual attendee arrival statuses
    if arrived_attendee_ids:
        attendees = reg.get("attendees", [])
        for att in attendees:
            if att.get("id") in arrived_attendee_ids:
                att["arrival_status"] = "arrived"
        updates["attendees"] = attendees

    await db.registrations.update_one({"id": reg_id}, {"$set": updates})
    old_status = reg.get("arrival_status", "not_arrived")
    head_name = ""
    for att in reg.get("attendees", []):
        if att.get("id") == reg.get("group_head_id"):
            head_name = att.get("name", "")
    await log_audit("arrival_update", "registration", reg_id, head_name or reg.get("primary_mobile", ""), f"Arrival: {old_status} → {arrival_status}", user["name"])
    return {"message": "Arrival status updated", "id": reg_id}

class ArrivalUpdateBody(BaseModel):
    arrival_status: str
    arrived_attendee_ids: List[str] = []

@api_router.post("/admin/registrations/{reg_id}/mark-arrival")
async def mark_arrival(reg_id: str, body: ArrivalUpdateBody, request: Request):
    user = await get_current_user(request)
    reg = await db.registrations.find_one({"id": reg_id})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")

    valid_statuses = ["not_arrived", "partially_arrived", "arrived", "not_coming", "departed"]
    if body.arrival_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid arrival status")

    updates = {
        "arrival_status": body.arrival_status,
        "last_updated_by": user["name"],
        "last_updated_at": datetime.now(timezone.utc).isoformat(),
    }

    if body.arrived_attendee_ids:
        attendees = reg.get("attendees", [])
        for att in attendees:
            if att.get("id") in body.arrived_attendee_ids:
                att["arrival_status"] = "arrived"
            elif body.arrival_status == "arrived":
                att["arrival_status"] = "arrived"
        updates["attendees"] = attendees

    await db.registrations.update_one({"id": reg_id}, {"$set": updates})
    old_status = reg.get("arrival_status", "not_arrived")
    head_name = ""
    for att in reg.get("attendees", []):
        if att.get("id") == reg.get("group_head_id"):
            head_name = att.get("name", "")
    await log_audit("mark_arrival", "registration", reg_id, head_name or reg.get("primary_mobile", ""), f"Arrival: {old_status} → {body.arrival_status}", user["name"])
    return {"message": "Arrival updated", "id": reg_id}

# ─── Admin: Manual Entry (to Expected or Arrived) ───
@api_router.post("/admin/registrations/manual")
async def create_manual_entry(entry: ManualEntryCreateV2, request: Request):
    user = await get_current_user(request)

    attendees_data = []
    for a in entry.attendees:
        att = a.model_dump() if hasattr(a, 'model_dump') else dict(a)
        if not att.get("id"):
            att["id"] = str(uuid.uuid4())
        att["arrival_status"] = "arrived" if entry.target_bucket == "arrived" else "not_arrived"
        attendees_data.append(att)

    sorted_days = sorted(entry.selected_days) if entry.selected_days else []
    arrival_date = sorted_days[0] if sorted_days else ""
    departure_date = sorted_days[-1] if sorted_days else ""

    arrival_status = "arrived" if entry.target_bucket == "arrived" else "not_arrived"

    doc = {
        "id": str(uuid.uuid4()),
        "primary_mobile": entry.primary_mobile,
        "additional_phone": entry.additional_phone,
        "email": entry.email,
        "preferred_language": entry.preferred_language,
        "address": entry.address.model_dump() if hasattr(entry.address, 'model_dump') else dict(entry.address),
        "num_people": entry.num_people,
        "attendees": attendees_data,
        "group_head_id": entry.group_head_id,
        "family_special_request": entry.family_special_request,
        "attendance_intent": entry.attendance_intent,
        "selected_days": sorted_days,
        "arrival_date": arrival_date,
        "departure_date": departure_date,
        "expected_arrival_time": entry.expected_arrival_time,
        "expected_departure_time": entry.expected_departure_time,
        "reference_person_id": entry.reference_person_id,
        "relation_category": entry.relation_category,
        "message": entry.message,
        "consent": True,
        "approval_status": "approved",
        "arrival_status": arrival_status,
        "room_assignments": [],
        "admin_notes": entry.admin_notes,
        "entry_type": "manual",
        "created_by": user["name"],
        "approved_by": user["name"],
        "last_updated_by": user["name"],
        "last_updated_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.registrations.insert_one(doc)
    doc.pop("_id", None)

    head_name = ""
    for att in attendees_data:
        if att.get("id") == entry.group_head_id:
            head_name = att.get("name", "")
    await log_audit("manual_entry", "registration", doc["id"], head_name or entry.primary_mobile, f"Manual entry to {entry.target_bucket} by {user['name']}", user["name"])
    return doc

# ─── Admin: Permanent Delete (Super Admin) ───
@api_router.delete("/admin/registrations/{reg_id}/permanent")
async def permanent_delete(reg_id: str, request: Request):
    await require_superadmin(request)
    reg = await db.registrations.find_one({"id": reg_id})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    for rc in reg.get("room_assignments", []):
        await db.rooms.update_one({"room_code": rc}, {"$set": {"occupant_ids": [], "status": "available"}})
    await db.registrations.delete_one({"id": reg_id})
    return {"message": "Permanently deleted", "id": reg_id}

# ─── Room Management ───
@api_router.get("/admin/rooms")
async def get_rooms(request: Request):
    await get_current_user(request)
    rooms = await db.rooms.find({}, {"_id": 0}).sort("room_code", 1).to_list(500)
    return rooms

@api_router.post("/admin/rooms")
async def create_room(room: RoomCreate, request: Request):
    user = await require_superadmin(request)
    existing = await db.rooms.find_one({"room_code": room.room_code})
    if existing:
        raise HTTPException(status_code=409, detail=f"Room '{room.room_code}' already exists")
    doc = room.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["occupant_ids"] = []
    doc["occupant_names"] = []
    doc["status"] = "available"
    doc["created_by"] = user["name"]
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.rooms.insert_one(doc)
    doc.pop("_id", None)
    await log_audit("room_create", "room", doc["id"], room.room_code, f"Room created: {room.room_code} (Cap: {room.capacity}, {room.ac_type})", user["name"])
    return doc

@api_router.post("/admin/rooms/bulk")
async def bulk_create_rooms(body: RoomBulkCreate, request: Request):
    user = await require_superadmin(request)
    created = 0
    errors = []
    for room in body.rooms:
        existing = await db.rooms.find_one({"room_code": room.room_code})
        if existing:
            errors.append(f"Room '{room.room_code}' already exists")
            continue
        doc = room.model_dump()
        doc["id"] = str(uuid.uuid4())
        doc["occupant_ids"] = []
        doc["occupant_names"] = []
        doc["status"] = "available"
        doc["created_by"] = user["name"]
        doc["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.rooms.insert_one(doc)
        await log_audit("room_create", "room", doc["id"], room.room_code, f"Bulk room created", user["name"])
        created += 1
    return {"created": created, "errors": errors}

@api_router.delete("/admin/rooms/{room_code}")
async def delete_room(room_code: str, request: Request):
    user = await require_superadmin(request)
    room = await db.rooms.find_one({"room_code": room_code})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.get("occupant_ids"):
        raise HTTPException(status_code=400, detail="Cannot delete an occupied room")
    await db.rooms.delete_one({"room_code": room_code})
    await log_audit("room_delete", "room", room.get("id", ""), room_code, f"Room deleted", user["name"])
    return {"message": f"Room {room_code} deleted"}

@api_router.put("/admin/rooms/{room_code}/assign")
async def assign_room(room_code: str, body: RoomAssign, request: Request):
    user = await get_current_user(request)
    room = await db.rooms.find_one({"room_code": room_code})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    reg = await db.registrations.find_one({"id": body.registration_id})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")

    current_occupants = room.get("occupant_ids", [])
    if body.registration_id not in current_occupants:
        current_occupants.append(body.registration_id)
    head_name = ""
    for att in reg.get("attendees", []):
        if att.get("id") == reg.get("group_head_id"):
            head_name = att.get("name", "")

    occupant_names = room.get("occupant_names", [])
    display_name = head_name or reg.get("primary_mobile", "")
    if display_name not in occupant_names:
        occupant_names.append(display_name)

    status = "occupied" if current_occupants else "available"
    await db.rooms.update_one({"room_code": room_code}, {"$set": {"occupant_ids": current_occupants, "occupant_names": occupant_names, "status": status}})

    reg_rooms = reg.get("room_assignments", [])
    if room_code not in reg_rooms:
        reg_rooms.append(room_code)
    await db.registrations.update_one({"id": body.registration_id}, {"$set": {"room_assignments": reg_rooms, "last_updated_by": user["name"], "last_updated_at": datetime.now(timezone.utc).isoformat()}})
    await log_audit("room_assign", "room", room_code, room_code, f"Assigned to {display_name}", user["name"])
    return {"message": f"Room {room_code} assigned to {display_name}"}

@api_router.put("/admin/rooms/{room_code}/unassign")
async def unassign_room(room_code: str, request: Request, registration_id: str = ""):
    user = await get_current_user(request)
    room = await db.rooms.find_one({"room_code": room_code})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if registration_id:
        occ_ids = [x for x in room.get("occupant_ids", []) if x != registration_id]
        occ_names = []
        for oid in occ_ids:
            r = await db.registrations.find_one({"id": oid}, {"attendees": 1, "group_head_id": 1, "primary_mobile": 1})
            if r:
                hn = ""
                for a in r.get("attendees", []):
                    if a.get("id") == r.get("group_head_id"):
                        hn = a.get("name", "")
                occ_names.append(hn or r.get("primary_mobile", ""))
        status = "occupied" if occ_ids else "available"
        await db.rooms.update_one({"room_code": room_code}, {"$set": {"occupant_ids": occ_ids, "occupant_names": occ_names, "status": status}})
        reg = await db.registrations.find_one({"id": registration_id})
        if reg:
            reg_rooms = [r for r in reg.get("room_assignments", []) if r != room_code]
            await db.registrations.update_one({"id": registration_id}, {"$set": {"room_assignments": reg_rooms, "last_updated_by": user["name"], "last_updated_at": datetime.now(timezone.utc).isoformat()}})
    else:
        for oid in room.get("occupant_ids", []):
            reg = await db.registrations.find_one({"id": oid})
            if reg:
                reg_rooms = [r for r in reg.get("room_assignments", []) if r != room_code]
                await db.registrations.update_one({"id": oid}, {"$set": {"room_assignments": reg_rooms}})
        await db.rooms.update_one({"room_code": room_code}, {"$set": {"occupant_ids": [], "occupant_names": [], "status": "available"}})

    await log_audit("room_unassign", "room", room_code, room_code, f"Unassigned from room", user["name"])
    return {"message": f"Room {room_code} unassigned"}

@api_router.put("/admin/rooms/{room_code}/shift")
async def shift_room(room_code: str, body: RoomShift, request: Request):
    user = await get_current_user(request)
    old_room = await db.rooms.find_one({"room_code": room_code})
    if not old_room:
        raise HTTPException(status_code=404, detail="Source room not found")
    if not old_room.get("occupant_ids"):
        raise HTTPException(status_code=400, detail="Source room has no occupants to shift")
    new_room = await db.rooms.find_one({"room_code": body.new_room_code})
    if not new_room:
        raise HTTPException(status_code=404, detail="Target room not found")
    if new_room.get("occupant_ids"):
        raise HTTPException(status_code=409, detail="Target room is already occupied")

    occ_ids = old_room["occupant_ids"]
    occ_names = old_room.get("occupant_names", [])
    await db.rooms.update_one({"room_code": room_code}, {"$set": {"occupant_ids": [], "occupant_names": [], "status": "available"}})
    await db.rooms.update_one({"room_code": body.new_room_code}, {"$set": {"occupant_ids": occ_ids, "occupant_names": occ_names, "status": "occupied"}})
    for oid in occ_ids:
        reg = await db.registrations.find_one({"id": oid})
        if reg:
            reg_rooms = [r for r in reg.get("room_assignments", []) if r != room_code]
            reg_rooms.append(body.new_room_code)
            await db.registrations.update_one({"id": oid}, {"$set": {"room_assignments": reg_rooms, "last_updated_by": user["name"], "last_updated_at": datetime.now(timezone.utc).isoformat()}})
    await log_audit("room_shift", "room", room_code, room_code, f"Shifted occupants from {room_code} to {body.new_room_code}", user["name"])
    return {"message": f"Shifted from {room_code} to {body.new_room_code}"}

# ─── Dashboard / Command Centre ───
@api_router.get("/admin/dashboard")
async def get_dashboard(request: Request):
    await get_current_user(request)

    pending_count = await db.registrations.count_documents({"approval_status": "pending"})
    approved_count = await db.registrations.count_documents({"approval_status": "approved"})
    rejected_count = await db.registrations.count_documents({"approval_status": "rejected"})

    # People counts
    pipeline_total = [{"$match": {"approval_status": "approved"}}, {"$group": {"_id": None, "total": {"$sum": "$num_people"}}}]
    total_people = (await db.registrations.aggregate(pipeline_total).to_list(1) or [{"total": 0}])[0]["total"]

    # Arrival breakdown
    expected_fam = await db.registrations.count_documents({"approval_status": "approved", "arrival_status": {"$in": ["not_arrived"]}})
    expected_p = (await db.registrations.aggregate([{"$match": {"approval_status": "approved", "arrival_status": "not_arrived"}}, {"$group": {"_id": None, "total": {"$sum": "$num_people"}}}]).to_list(1) or [{"total": 0}])[0]["total"]

    arrived_fam = await db.registrations.count_documents({"approval_status": "approved", "arrival_status": {"$in": ["arrived", "partially_arrived"]}})
    arrived_p = (await db.registrations.aggregate([{"$match": {"approval_status": "approved", "arrival_status": {"$in": ["arrived", "partially_arrived"]}}}, {"$group": {"_id": None, "total": {"$sum": "$num_people"}}}]).to_list(1) or [{"total": 0}])[0]["total"]

    not_coming_fam = await db.registrations.count_documents({"approval_status": "approved", "arrival_status": "not_coming"})
    not_coming_p = (await db.registrations.aggregate([{"$match": {"approval_status": "approved", "arrival_status": "not_coming"}}, {"$group": {"_id": None, "total": {"$sum": "$num_people"}}}]).to_list(1) or [{"total": 0}])[0]["total"]

    departed_fam = await db.registrations.count_documents({"approval_status": "approved", "arrival_status": "departed"})
    departed_p = (await db.registrations.aggregate([{"$match": {"approval_status": "approved", "arrival_status": "departed"}}, {"$group": {"_id": None, "total": {"$sum": "$num_people"}}}]).to_list(1) or [{"total": 0}])[0]["total"]

    # Daily schedule
    dates = ["2026-05-27", "2026-05-28", "2026-05-29", "2026-05-30", "2026-05-31", "2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04"]
    daily = []
    for d in dates:
        arr_fam = await db.registrations.count_documents({"approval_status": "approved", "arrival_date": d})
        arr_p = (await db.registrations.aggregate([{"$match": {"approval_status": "approved", "arrival_date": d}}, {"$group": {"_id": None, "total": {"$sum": "$num_people"}}}]).to_list(1) or [{"total": 0}])[0]["total"]
        dep_fam = await db.registrations.count_documents({"approval_status": "approved", "departure_date": d})
        dep_p = (await db.registrations.aggregate([{"$match": {"approval_status": "approved", "departure_date": d}}, {"$group": {"_id": None, "total": {"$sum": "$num_people"}}}]).to_list(1) or [{"total": 0}])[0]["total"]
        daily.append({"date": d, "arrivals_families": arr_fam, "arrivals_people": arr_p, "departures_families": dep_fam, "departures_people": dep_p})

    # Room stats
    total_rooms = await db.rooms.count_documents({})
    occupied_rooms = await db.rooms.count_documents({"status": "occupied"})
    available_rooms = total_rooms - occupied_rooms

    return {
        "pending_count": pending_count,
        "approved_count": approved_count,
        "rejected_count": rejected_count,
        "total_people": total_people,
        "arrival_summary": {
            "expected": {"families": expected_fam, "people": expected_p},
            "arrived": {"families": arrived_fam, "people": arrived_p},
            "not_coming": {"families": not_coming_fam, "people": not_coming_p},
            "departed": {"families": departed_fam, "people": departed_p},
        },
        "daily_schedule": daily,
        "total_rooms": total_rooms,
        "occupied_rooms": occupied_rooms,
        "available_rooms": available_rooms,
    }

# ─── Audit Logs ───
@api_router.get("/admin/audit-logs")
async def get_audit_logs(request: Request, page: int = 1, per_page: int = 50):
    await get_current_user(request)
    total = await db.audit_logs.count_documents({})
    skip = (page - 1) * per_page
    logs = await db.audit_logs.find({}, {"_id": 0}).sort("performed_at", -1).skip(skip).limit(per_page).to_list(per_page)
    return {"data": logs, "total": total, "page": page, "total_pages": max(1, math.ceil(total / per_page))}

@api_router.delete("/admin/audit-logs")
async def clear_audit_logs(request: Request):
    await require_superadmin(request)
    result = await db.audit_logs.delete_many({})
    return {"message": f"Cleared {result.deleted_count} entries"}

# ─── Exports ───
@api_router.get("/admin/export-csv")
async def export_csv(request: Request):
    await get_current_user(request)
    regs = await db.registrations.find({"approval_status": "approved"}, {"_id": 0}).to_list(5000)
    output = io.StringIO()
    fields = ["id", "primary_mobile", "additional_phone", "email", "num_people", "arrival_date", "departure_date", "arrival_status", "attendance_intent", "admin_notes", "created_at"]
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction='ignore')
    writer.writeheader()
    for reg in regs:
        row = {k: reg.get(k, "") for k in fields}
        writer.writerow(row)
    output.seek(0)
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=approved_guests.csv"})

@api_router.get("/admin/export-pdf")
async def export_pdf(request: Request, report_type: str = "guestlist"):
    await get_current_user(request)
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page("L")
    pdf.set_font("Helvetica", "B", 16)
    if report_type == "rooms":
        pdf.cell(0, 10, "Room Allocation Report", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.set_font("Helvetica", "", 8)
        pdf.cell(0, 6, f"Generated: {datetime.now(timezone.utc).strftime('%d %b %Y %H:%M UTC')}", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(5)
        rooms = await db.rooms.find({}, {"_id": 0}).sort("room_code", 1).to_list(500)
        headers = ["Room Code", "Floor", "Capacity", "Type", "Status", "Occupants"]
        col_w = [30, 25, 20, 25, 25, 130]
        pdf.set_font("Helvetica", "B", 9)
        for i, h in enumerate(headers):
            pdf.cell(col_w[i], 8, h, border=1, align="C")
        pdf.ln()
        pdf.set_font("Helvetica", "", 8)
        for room in rooms:
            names = ", ".join(room.get("occupant_names", [])) or "-"
            vals = [room.get("room_code", ""), room.get("floor", ""), str(room.get("capacity", "")), room.get("ac_type", ""), room.get("status", ""), names[:50]]
            for i, v in enumerate(vals):
                pdf.cell(col_w[i], 7, str(v), border=1, align="C")
            pdf.ln()
    else:
        pdf.cell(0, 10, "Guest List - Shrimad Bhagavat Katha 2026", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.set_font("Helvetica", "", 8)
        pdf.cell(0, 6, f"Generated: {datetime.now(timezone.utc).strftime('%d %b %Y %H:%M UTC')}", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(5)
        regs = await db.registrations.find({"approval_status": "approved"}, {"_id": 0}).sort("created_at", -1).to_list(5000)
        headers = ["#", "Group Head", "People", "Arrival", "Departure", "Rooms", "Status", "Mobile"]
        col_w = [12, 60, 20, 32, 32, 40, 30, 40]
        pdf.set_font("Helvetica", "B", 9)
        for i, h in enumerate(headers):
            pdf.cell(col_w[i], 8, h, border=1, align="C")
        pdf.ln()
        pdf.set_font("Helvetica", "", 8)
        for idx, reg in enumerate(regs, 1):
            head_name = ""
            for att in reg.get("attendees", []):
                if att.get("id") == reg.get("group_head_id"):
                    head_name = att.get("name", "")
            rooms_str = ", ".join(reg.get("room_assignments", [])) or "-"
            vals = [str(idx), (head_name or reg.get("primary_mobile", ""))[:25], str(reg.get("num_people", 1)), reg.get("arrival_date", ""), reg.get("departure_date", ""), rooms_str[:15], reg.get("arrival_status", ""), reg.get("primary_mobile", "")]
            for i, v in enumerate(vals):
                pdf.cell(col_w[i], 7, str(v), border=1, align="C")
            pdf.ln()
    buf = io.BytesIO()
    pdf.output(buf)
    buf.seek(0)
    fname = "room_allocation.pdf" if report_type == "rooms" else "guest_list.pdf"
    return StreamingResponse(buf, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={fname}"})

# ─── Super Admin: Admin/Swamsevak Management ───
@api_router.get("/admin/admins")
async def list_admins(request: Request):
    await require_superadmin(request)
    admins = []
    for uname, acc in ADMIN_ACCOUNTS.items():
        if acc.get("role") != "superadmin":
            admins.append({"username": uname, "name": acc["name"], "city": acc["city"], "mobile": "", "role": acc.get("role", "swamsevak"), "source": "system"})
    custom = await db.custom_admins.find({}, {"_id": 0}).to_list(100)
    for c in custom:
        admins.append({**c, "source": "custom"})
    return admins

@api_router.post("/admin/admins")
async def create_admin(body: AdminCreate, request: Request):
    user = await require_superadmin(request)
    username = body.username.lower().strip()
    if username in ADMIN_ACCOUNTS:
        raise HTTPException(status_code=409, detail="Username conflicts with system account")
    existing = await db.custom_admins.find_one({"username": username})
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")
    doc = {"username": username, "password": body.password, "name": body.name, "city": body.city, "mobile": body.mobile, "role": body.role, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.custom_admins.insert_one(doc)
    await log_audit("swamsevak_create", "swamsevak", username, body.name, f"Swamsevak '{username}' created", user["name"])
    return {"message": f"Swamsevak '{username}' created", "username": username}

@api_router.put("/admin/admins/{username}")
async def update_admin(username: str, body: AdminUpdate, request: Request):
    user = await require_superadmin(request)
    username = username.lower().strip()
    if username in ADMIN_ACCOUNTS:
        raise HTTPException(status_code=400, detail="Cannot modify system account")
    custom = await db.custom_admins.find_one({"username": username})
    if not custom:
        raise HTTPException(status_code=404, detail="Swamsevak not found")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await db.custom_admins.update_one({"username": username}, {"$set": updates})
    await log_audit("swamsevak_update", "swamsevak", username, custom.get("name", ""), f"Swamsevak '{username}' updated", user["name"])
    return {"message": f"Swamsevak '{username}' updated"}

@api_router.delete("/admin/admins/{username}")
async def delete_admin(username: str, request: Request):
    user = await require_superadmin(request)
    username = username.lower().strip()
    if username in ADMIN_ACCOUNTS:
        raise HTTPException(status_code=400, detail="Cannot delete system account")
    result = await db.custom_admins.delete_one({"username": username})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Swamsevak not found")
    await log_audit("swamsevak_delete", "swamsevak", username, username, f"Swamsevak '{username}' deleted", user["name"])
    return {"message": f"Swamsevak '{username}' deleted"}

# ─── Root ───
@api_router.get("/")
async def root():
    return {"message": "Shrimad Bhagavat Katha Mahotsav 2026 API V2"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    logger.info("V2 Swamsevak Portal - Accounts: " + ", ".join(ADMIN_ACCOUNTS.keys()))
    # Ensure indexes
    await db.rooms.create_index("room_code", unique=True, sparse=True)
    await db.otp_sessions.create_index("mobile", unique=True, sparse=True)
    await db.reference_persons.create_index("id", unique=True, sparse=True)
    await db.relation_categories.create_index("id", unique=True, sparse=True)

    # Seed default relation categories if empty
    cat_count = await db.relation_categories.count_documents({})
    if cat_count == 0:
        defaults = ["Friends", "In-laws Side", "Other Relatives", "Neighbors", "Business Associates", "Other"]
        for name in defaults:
            await db.relation_categories.insert_one({"id": str(uuid.uuid4()), "name": name, "description": "", "created_at": datetime.now(timezone.utc).isoformat()})
        logger.info(f"Seeded {len(defaults)} default relation categories")

    logger.info("V2 startup complete")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
