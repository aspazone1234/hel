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
import pycountry

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
    token = ""
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    elif request.query_params.get("token"):
        token = request.query_params.get("token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
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
    pin_code: str = ""

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
    travel_mode: str = ""
    travel_details: str = ""

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
    travel_mode: Optional[str] = None
    travel_details: Optional[str] = None
    assigned_swamsevak: Optional[str] = None

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
    travel_mode: str = ""
    travel_details: str = ""

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

@api_router.get("/registration/by-mobile/{mobile}")
async def get_registration_by_mobile(mobile: str):
    if not mobile:
        raise HTTPException(status_code=400, detail="Mobile number required")
    reg = await db.registrations.find_one(
        {"primary_mobile": mobile.strip(), "approval_status": {"$nin": ["deleted"]}},
        {"_id": 0}
    )
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    # Resolve reference person name
    if reg.get("reference_person_id"):
        rp = await db.reference_persons.find_one({"id": reg["reference_person_id"]}, {"_id": 0, "name": 1})
        reg["reference_person_name"] = rp.get("name", "") if rp else ""
    return reg

@api_router.post("/registrations")
async def create_registration(reg: RegistrationCreateV2):
    # Cutoff enforcement
    now_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if now_date > REGISTRATION_CUTOFF:
        raise HTTPException(status_code=403, detail=f"Registration closed on {REGISTRATION_CUTOFF}. Please contact admin for changes.")

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
        "travel_mode": reg.travel_mode,
        "travel_details": reg.travel_details,
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

    # Mock WhatsApp confirmation after form submission
    logger.info(f"[MOCK WHATSAPP] Sending registration confirmation to {reg.primary_mobile}")
    whatsapp_conf = {
        "type": "registration_confirmation",
        "to": reg.primary_mobile,
        "message": "Thank you for registering for Shrimad Bhagavat Katha Mahotsav 2026! Your form has been received. You can update it until 19 May 2026. Final details will be sent on 21 May 2026.",
        "status": "sent_mock",
        "sent_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.message_deliveries.insert_one({**whatsapp_conf, "id": str(uuid.uuid4())})

    return doc

@api_router.put("/registrations/{reg_id}/public")
async def update_registration_public(reg_id: str, body: RegistrationUpdateV2):
    # Cutoff enforcement
    now_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if now_date > REGISTRATION_CUTOFF:
        raise HTTPException(status_code=403, detail=f"Registration updates closed on {REGISTRATION_CUTOFF}. Please contact admin for changes.")

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

    # Audit log for user self-edits with previous/new values
    changed_fields = [k for k in updates.keys() if k not in ("last_updated_by", "last_updated_at")]
    changes_detail = []
    for field in changed_fields:
        old_val = reg.get(field, "")
        new_val = updates.get(field, "")
        # Truncate long values for readability
        old_str = str(old_val)[:100] if old_val else "(empty)"
        new_str = str(new_val)[:100] if new_val else "(empty)"
        changes_detail.append(f"{field}: '{old_str}' → '{new_str}'")
    head_name = ""
    for att in reg.get("attendees", []):
        if att.get("id") == reg.get("group_head_id"):
            head_name = att.get("name", "")
    detail_str = "; ".join(changes_detail) if changes_detail else "No changes"
    await log_audit("user_self_edit", "registration", reg_id, head_name or reg.get("primary_mobile", ""),
                    f"User updated: {detail_str}", f"Self ({reg.get('primary_mobile', '')})")

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
    await log_audit("create", "reference_person", doc["id"], body.name, "Reference person created", user["name"])
    return doc

@api_router.put("/admin/reference-persons/{ref_id}")
async def update_reference_person(ref_id: str, body: ReferencePersonUpdate, request: Request):
    user = await require_superadmin(request)
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.reference_persons.update_one({"id": ref_id}, {"$set": updates})
    await log_audit("update", "reference_person", ref_id, updates.get("name", ""), "Reference person updated", user["name"])
    return {"message": "Updated"}

@api_router.delete("/admin/reference-persons/{ref_id}")
async def delete_reference_person(ref_id: str, request: Request):
    user = await require_superadmin(request)
    result = await db.reference_persons.delete_one({"id": ref_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    await log_audit("delete", "reference_person", ref_id, "", "Reference person deleted", user["name"])
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
    await log_audit("create", "relation_category", doc["id"], body.name, "Relation category created", user["name"])
    return doc

@api_router.delete("/admin/relation-categories/{cat_id}")
async def delete_relation_category(cat_id: str, request: Request):
    user = await require_superadmin(request)
    await db.relation_categories.delete_one({"id": cat_id})
    await log_audit("delete", "relation_category", cat_id, "", "Relation category deleted", user["name"])
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

@api_router.get("/admin/registrations/rejected")
async def get_rejected_registrations_main(request: Request, page: int = 1, per_page: int = 20, search: str = ""):
    """Get rejected registrations - must be before {reg_id} route"""
    await get_current_user(request)
    query = {"approval_status": "rejected"}
    if search:
        query["$or"] = [
            {"attendees.name": {"$regex": search, "$options": "i"}},
            {"primary_mobile": {"$regex": search, "$options": "i"}},
        ]
    total = await db.registrations.count_documents(query)
    skip = (page - 1) * per_page
    regs = await db.registrations.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(per_page).to_list(per_page)
    return {"data": regs, "total": total, "page": page, "total_pages": max(1, math.ceil(total / per_page))}

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
        raise HTTPException(status_code=400, detail="Invalid arrival status")

    # 3-condition block for marking as arrived
    if body.arrival_status in ("arrived", "partially_arrived"):
        if not reg.get("assigned_swamsevak"):
            raise HTTPException(status_code=400, detail="Cannot mark arrival: No contact person (Swamsevak) assigned. Please assign one first.")
        if not reg.get("room_assignments") or len(reg.get("room_assignments", [])) == 0:
            raise HTTPException(status_code=400, detail="Cannot mark arrival: No room assigned. Please assign a room first.")
        if not reg.get("qr_active") or not reg.get("qr_token"):
            raise HTTPException(status_code=400, detail="Cannot mark arrival: No QR code generated. Please generate a QR first.")
        # No double marking
        if reg.get("arrival_status") == "arrived" and body.arrival_status == "arrived":
            raise HTTPException(status_code=400, detail="Already marked as arrived. Cannot double-mark.")

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

# ─── Admin: Mark Not Coming ───
@api_router.post("/admin/registrations/{reg_id}/not-coming")
async def mark_not_coming(reg_id: str, request: Request):
    user = await require_superadmin(request)
    reg = await db.registrations.find_one({"id": reg_id})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    old_status = reg.get("arrival_status", "not_arrived")
    updates = {
        "arrival_status": "not_coming",
        "last_updated_by": user["name"],
        "last_updated_at": datetime.now(timezone.utc).isoformat(),
    }
    # Release room
    old_rooms = reg.get("room_assignments", [])
    if old_rooms:
        updates["room_assignments"] = []
        for room_code in old_rooms:
            room = await db.rooms.find_one({"room_code": room_code})
            if room:
                occ = [n for n in room.get("occupant_names", []) if n]
                head_name_for_room = ""
                for att in reg.get("attendees", []):
                    if att.get("id") == reg.get("group_head_id"):
                        head_name_for_room = att.get("name", "")
                occ = [n for n in occ if n != head_name_for_room]
                await db.rooms.update_one({"room_code": room_code}, {"$set": {"occupant_names": occ, "status": "available" if not occ else "occupied"}})
    # Release sevak
    if reg.get("assigned_swamsevak"):
        updates["assigned_swamsevak"] = ""
    await db.registrations.update_one({"id": reg_id}, {"$set": updates})
    head_name = ""
    for att in reg.get("attendees", []):
        if att.get("id") == reg.get("group_head_id"):
            head_name = att.get("name", "")
    await log_audit("not_coming", "registration", reg_id, head_name or reg.get("primary_mobile", ""),
                    f"Status: {old_status} → not_coming. Released rooms: {old_rooms}", user["name"])
    return {"message": "Marked as Not Coming", "id": reg_id}

@api_router.post("/admin/registrations/{reg_id}/undo-not-coming")
async def undo_not_coming(reg_id: str, request: Request):
    user = await require_superadmin(request)
    reg = await db.registrations.find_one({"id": reg_id})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    if reg.get("arrival_status") != "not_coming":
        raise HTTPException(status_code=400, detail="Registration is not in 'Not Coming' status")
    await db.registrations.update_one({"id": reg_id}, {"$set": {
        "arrival_status": "not_arrived",
        "last_updated_by": user["name"],
        "last_updated_at": datetime.now(timezone.utc).isoformat(),
    }})
    head_name = ""
    for att in reg.get("attendees", []):
        if att.get("id") == reg.get("group_head_id"):
            head_name = att.get("name", "")
    await log_audit("undo_not_coming", "registration", reg_id, head_name or reg.get("primary_mobile", ""),
                    "Restored from Not Coming to Expected", user["name"])
    return {"message": "Restored to Expected", "id": reg_id}

# ─── Public: Country/State Data ───
@api_router.get("/geo/countries")
async def get_countries():
    countries = sorted([{"code": c.alpha_2, "name": c.name} for c in pycountry.countries], key=lambda x: x["name"])
    return countries

@api_router.get("/geo/states/{country_code}")
async def get_states(country_code: str):
    try:
        subdivisions = pycountry.subdivisions.get(country_code=country_code.upper())
        states = sorted([{"code": s.code, "name": s.name} for s in subdivisions], key=lambda x: x["name"])
        return states
    except Exception:
        return []

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
        "travel_mode": entry.travel_mode,
        "travel_details": entry.travel_details,
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
        await log_audit("room_create", "room", doc["id"], room.room_code, "Bulk room created", user["name"])
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
    await log_audit("room_delete", "room", room.get("id", ""), room_code, "Room deleted", user["name"])
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

    await log_audit("room_unassign", "room", room_code, room_code, "Unassigned from room", user["name"])
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

    # Daily schedule — exclude not_coming from arrival/departure counts
    dates = ["2026-05-27", "2026-05-28", "2026-05-29", "2026-05-30", "2026-05-31", "2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04"]
    daily = []
    for d in dates:
        arr_fam = await db.registrations.count_documents({"approval_status": "approved", "arrival_date": d, "arrival_status": {"$nin": ["not_coming"]}})
        arr_p = (await db.registrations.aggregate([{"$match": {"approval_status": "approved", "arrival_date": d, "arrival_status": {"$nin": ["not_coming"]}}}, {"$group": {"_id": None, "total": {"$sum": "$num_people"}}}]).to_list(1) or [{"total": 0}])[0]["total"]
        dep_fam = await db.registrations.count_documents({"approval_status": "approved", "departure_date": d, "arrival_status": {"$nin": ["not_coming"]}})
        dep_p = (await db.registrations.aggregate([{"$match": {"approval_status": "approved", "departure_date": d, "arrival_status": {"$nin": ["not_coming"]}}}, {"$group": {"_id": None, "total": {"$sum": "$num_people"}}}]).to_list(1) or [{"total": 0}])[0]["total"]
        daily.append({"date": d, "arrivals_families": arr_fam, "arrivals_people": arr_p, "departures_families": dep_fam, "departures_people": dep_p})

    # Room stats
    total_rooms = await db.rooms.count_documents({})
    occupied_rooms = await db.rooms.count_documents({"status": "occupied"})
    available_rooms = total_rooms - occupied_rooms

    # Help tickets active
    active_tickets = await db.tickets.count_documents({"status": {"$in": ["open", "in_progress"]}})

    # Not arrived count
    not_arrived_fam = await db.registrations.count_documents({"approval_status": "approved", "arrival_status": "not_arrived"})

    # Reference person stats with nested relation breakdown
    ref_rel_pipeline = [
        {"$match": {"approval_status": "approved", "reference_person_name": {"$exists": True, "$ne": ""}}},
        {"$group": {
            "_id": {"ref": "$reference_person_name", "rel": "$relation_category"},
            "families": {"$sum": 1}, "people": {"$sum": "$num_people"}
        }},
        {"$sort": {"_id.ref": 1, "_id.rel": 1}},
    ]
    ref_rel_data = await db.registrations.aggregate(ref_rel_pipeline).to_list(500)
    from collections import defaultdict
    ref_map = defaultdict(lambda: {"total_families": 0, "total_people": 0, "relations": {}})
    for item in ref_rel_data:
        rn = item["_id"]["ref"] or ""
        rl = item["_id"]["rel"] or "Unknown"
        if rn:
            ref_map[rn]["total_families"] += item["families"]
            ref_map[rn]["total_people"] += item["people"]
            ref_map[rn]["relations"][rl] = {"families": item["families"], "people": item["people"]}
    nested_ref_stats = [
        {"name": k, "total_families": v["total_families"], "total_people": v["total_people"],
         "relations": [{"name": rn, "families": rv["families"], "people": rv["people"]} for rn, rv in sorted(v["relations"].items())]}
        for k, v in sorted(ref_map.items(), key=lambda x: -x[1]["total_families"])
    ]

    # Reference person stats (flat, for top cards)
    ref_stats = [{"name": s["name"], "families": s["total_families"], "people": s["total_people"]} for s in nested_ref_stats]

    # Relation category stats
    relation_pipeline = [
        {"$match": {"approval_status": "approved", "relation_category": {"$exists": True, "$ne": ""}}},
        {"$group": {"_id": "$relation_category", "families": {"$sum": 1}, "people": {"$sum": "$num_people"}}},
        {"$sort": {"families": -1}},
    ]
    relation_stats = await db.registrations.aggregate(relation_pipeline).to_list(100)
    relation_stats = [{"name": r["_id"], "families": r["families"], "people": r["people"]} for r in relation_stats if r["_id"]]

    # Top 5 states by families
    geo_pipeline = [
        {"$match": {"approval_status": "approved", "address.state": {"$exists": True, "$ne": ""}}},
        {"$group": {"_id": "$address.state", "families": {"$sum": 1}, "people": {"$sum": "$num_people"}}},
        {"$sort": {"families": -1}}, {"$limit": 5}
    ]
    top_states = [{"name": g["_id"], "families": g["families"], "people": g["people"]} for g in await db.registrations.aggregate(geo_pipeline).to_list(5) if g["_id"]]

    # Top 5 countries
    country_pipeline = [
        {"$match": {"approval_status": "approved", "address.country": {"$exists": True, "$ne": ""}}},
        {"$group": {"_id": "$address.country", "families": {"$sum": 1}, "people": {"$sum": "$num_people"}}},
        {"$sort": {"families": -1}}, {"$limit": 5}
    ]
    top_countries = [{"name": g["_id"], "families": g["families"], "people": g["people"]} for g in await db.registrations.aggregate(country_pipeline).to_list(5) if g["_id"]]

    # Top 5 cities
    city_pipeline = [
        {"$match": {"approval_status": "approved", "address.city": {"$exists": True, "$ne": ""}}},
        {"$group": {"_id": "$address.city", "families": {"$sum": 1}, "people": {"$sum": "$num_people"}}},
        {"$sort": {"families": -1}}, {"$limit": 5}
    ]
    top_cities = [{"name": g["_id"], "families": g["families"], "people": g["people"]} for g in await db.registrations.aggregate(city_pipeline).to_list(5) if g["_id"]]

    return {
        "pending_count": pending_count,
        "approved_count": approved_count,
        "rejected_count": rejected_count,
        "total_people": total_people,
        "active_tickets": active_tickets,
        "arrival_summary": {
            "expected": {"families": expected_fam, "people": expected_p},
            "arrived": {"families": arrived_fam, "people": arrived_p},
            "not_coming": {"families": not_coming_fam, "people": not_coming_p},
            "departed": {"families": departed_fam, "people": departed_p},
            "not_arrived": {"families": not_arrived_fam, "people": expected_p},
        },
        "daily_schedule": daily,
        "total_rooms": total_rooms,
        "occupied_rooms": occupied_rooms,
        "available_rooms": available_rooms,
        "reference_person_stats": ref_stats,
        "relation_stats": relation_stats,
        "nested_ref_stats": nested_ref_stats,
        "top_states": top_states,
        "top_countries": top_countries,
        "top_cities": top_cities,
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
async def export_csv(request: Request, bucket: str = "expected", search: str = "", status_filter: str = "all"):
    await get_current_user(request)
    if bucket == "pending":
        query = {"approval_status": "pending"}
        filename = "pending_registrations.csv"
    elif bucket == "arrived":
        if status_filter == "arrived":
            query = {"approval_status": "approved", "arrival_status": {"$in": ["arrived", "partially_arrived"]}}
        elif status_filter == "departed":
            query = {"approval_status": "approved", "arrival_status": "departed"}
        else:
            query = {"approval_status": "approved", "arrival_status": {"$in": ["arrived", "partially_arrived", "departed"]}}
        filename = "arrived_guests.csv"
    elif bucket == "rooms":
        rooms = await db.rooms.find({}, {"_id": 0}).sort("floor", 1).sort("room_code", 1).to_list(500)
        # Build occupant data from registrations
        room_reg_map = {}
        all_reg = await db.registrations.find(
            {"approval_status": "approved", "arrival_status": {"$nin": ["not_coming", "departed"]}, "room_assignments": {"$exists": True, "$ne": []}},
            {"_id": 0, "room_assignments": 1, "attendees": 1, "group_head_id": 1, "num_people": 1, "assigned_swamsevak": 1, "primary_mobile": 1}
        ).to_list(5000)
        for r in all_reg:
            head = next((a["name"] for a in r.get("attendees", []) if a.get("id") == r.get("group_head_id")), r.get("primary_mobile", ""))
            for code in r.get("room_assignments", []):
                if code not in room_reg_map:
                    room_reg_map[code] = []
                room_reg_map[code].append({"head": head, "people": r.get("num_people", 1), "swamsevak": r.get("assigned_swamsevak", "")})

        output = io.StringIO()
        fields = ["floor", "room_code", "capacity", "ac_type", "status", "occupied_people", "family_head", "people_count", "contact_person", "notes"]
        writer = csv.DictWriter(output, fieldnames=fields, extrasaction='ignore')
        writer.writeheader()
        for room in rooms:
            occupants = room_reg_map.get(room.get("room_code", ""), [])
            total_people = sum(o["people"] for o in occupants)
            heads = "; ".join(o["head"] for o in occupants) if occupants else ""
            swamsevaks = "; ".join(set(o["swamsevak"] for o in occupants if o["swamsevak"])) if occupants else ""
            row = {
                "floor": room.get("floor", ""),
                "room_code": room.get("room_code", ""),
                "capacity": room.get("capacity", ""),
                "ac_type": room.get("ac_type", ""),
                "status": room.get("status", ""),
                "occupied_people": total_people if occupants else 0,
                "family_head": heads,
                "people_count": len(occupants),
                "contact_person": swamsevaks,
                "notes": room.get("notes", ""),
            }
            writer.writerow(row)
        output.seek(0)
        return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=rooms.csv"})
    else:
        if status_filter == "not_coming":
            query = {"approval_status": "approved", "arrival_status": "not_coming"}
        else:
            query = {"approval_status": "approved", "arrival_status": {"$in": ["not_arrived", "not_coming"]}}
        filename = "expected_guests.csv"
    if search:
        query["$or"] = [
            {"attendees.name": {"$regex": search, "$options": "i"}},
            {"primary_mobile": {"$regex": search, "$options": "i"}},
        ]
    regs = await db.registrations.find(query, {"_id": 0}).to_list(5000)
    output = io.StringIO()
    fields = ["id", "primary_mobile", "additional_phone", "email", "num_people", "arrival_date", "departure_date", "arrival_status", "attendance_intent", "assigned_swamsevak", "admin_notes", "created_at"]
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction='ignore')
    writer.writeheader()
    for reg in regs:
        head_name = ""
        for att in reg.get("attendees", []):
            if att.get("id") == reg.get("group_head_id"):
                head_name = att.get("name", "")
        row = {k: reg.get(k, "") for k in fields}
        row["group_head"] = head_name
        row["rooms"] = ", ".join(reg.get("room_assignments", []))
        writer.writerow(row)
    output.seek(0)
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}"})

@api_router.get("/admin/export-pdf")
async def export_pdf(request: Request, report_type: str = "guestlist", bucket: str = "expected", search: str = "", status_filter: str = "all"):
    await get_current_user(request)
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page("L")
    pdf.set_font("Helvetica", "B", 16)
    if report_type == "rooms":
        pdf.cell(0, 10, "Room Allocation Report — Katha 2026", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.set_font("Helvetica", "", 8)
        pdf.cell(0, 6, f"Generated: {datetime.now(timezone.utc).strftime('%d %b %Y %H:%M UTC')}", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(5)

        rooms = await db.rooms.find({}, {"_id": 0}).sort("floor", 1).to_list(500)
        # Build occupant data
        room_reg_map = {}
        all_reg = await db.registrations.find(
            {"approval_status": "approved", "arrival_status": {"$nin": ["not_coming", "departed"]}, "room_assignments": {"$exists": True, "$ne": []}},
            {"_id": 0, "room_assignments": 1, "attendees": 1, "group_head_id": 1, "num_people": 1, "assigned_swamsevak": 1, "primary_mobile": 1}
        ).to_list(5000)
        for r in all_reg:
            head = next((a["name"] for a in r.get("attendees", []) if a.get("id") == r.get("group_head_id")), r.get("primary_mobile", ""))
            for code in r.get("room_assignments", []):
                if code not in room_reg_map:
                    room_reg_map[code] = []
                room_reg_map[code].append({"head": head, "people": r.get("num_people", 1), "swamsevak": r.get("assigned_swamsevak", "")})

        # Group by floor
        floor_groups = {}
        for room in rooms:
            floor_key = f"Floor: {room.get('floor', 'Unknown')}" if room.get('floor') else "Floor: Unassigned"
            if floor_key not in floor_groups:
                floor_groups[floor_key] = []
            floor_groups[floor_key].append(room)

        for floor_name, floor_rooms in floor_groups.items():
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_fill_color(11, 28, 61)
            pdf.set_text_color(255, 255, 255)
            pdf.cell(0, 8, floor_name, new_x="LMARGIN", new_y="NEXT", fill=True)
            pdf.set_text_color(0, 0, 0)
            pdf.ln(2)

            headers = ["Room", "Type", "Beds", "Occup.", "Status", "Family Head", "People", "Contact Person"]
            col_w = [25, 25, 20, 20, 28, 55, 22, 50]
            pdf.set_font("Helvetica", "B", 8)
            pdf.set_fill_color(230, 230, 230)
            for i, h in enumerate(headers):
                pdf.cell(col_w[i], 7, h, border=1, align="C", fill=True)
            pdf.ln()
            pdf.set_font("Helvetica", "", 8)
            for room in floor_rooms:
                occupants = room_reg_map.get(room.get("room_code", ""), [])
                total_occ_people = sum(o["people"] for o in occupants)
                heads = "; ".join(o["head"] for o in occupants)[:30] if occupants else "-"
                swamsevaks = "; ".join(set(o["swamsevak"] for o in occupants if o["swamsevak"]))[:25] if occupants else "-"
                fams = str(len(occupants)) if occupants else "0"
                status_label = "Occupied" if room.get("status") == "occupied" else "Available"
                vals = [room.get("room_code", ""), room.get("ac_type", ""), str(room.get("capacity", "")), str(total_occ_people), status_label, heads, fams, swamsevaks]
                for i, v in enumerate(vals):
                    pdf.cell(col_w[i], 7, str(v), border=1, align="C")
                pdf.ln()
            pdf.ln(3)
    else:
        if bucket == "pending":
            query = {"approval_status": "pending"}
            title = "Pending Registrations"
            fname_base = "pending_registrations"
        elif bucket == "arrived":
            if status_filter == "arrived":
                query = {"approval_status": "approved", "arrival_status": {"$in": ["arrived", "partially_arrived"]}}
            elif status_filter == "departed":
                query = {"approval_status": "approved", "arrival_status": "departed"}
            else:
                query = {"approval_status": "approved", "arrival_status": {"$in": ["arrived", "partially_arrived", "departed"]}}
            title = "Arrived Guests"
            fname_base = "arrived_guests"
        else:
            if status_filter == "not_coming":
                query = {"approval_status": "approved", "arrival_status": "not_coming"}
            else:
                query = {"approval_status": "approved", "arrival_status": {"$in": ["not_arrived", "not_coming"]}}
            title = "Expected Guest List"
            fname_base = "expected_guests"
        if search:
            query["$or"] = [
                {"attendees.name": {"$regex": search, "$options": "i"}},
                {"primary_mobile": {"$regex": search, "$options": "i"}},
            ]
        pdf.cell(0, 10, f"{title} - Katha 2026", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.set_font("Helvetica", "", 8)
        pdf.cell(0, 6, f"Generated: {datetime.now(timezone.utc).strftime('%d %b %Y %H:%M UTC')}", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(5)
        regs = await db.registrations.find(query, {"_id": 0}).sort("created_at", -1).to_list(5000)
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
    if report_type == "rooms":
        fname = "room_allocation.pdf"
    else:
        fname = f"{fname_base}.pdf"
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

# ─── QR CODE SYSTEM ───
import qrcode
import base64

@api_router.post("/admin/qr/generate/{reg_id}")
async def generate_qr(reg_id: str, request: Request):
    user = await require_superadmin(request)
    reg = await db.registrations.find_one({"id": reg_id}, {"_id": 0})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    if reg.get("approval_status") != "approved":
        raise HTTPException(status_code=400, detail="QR can only be generated for approved registrations in Expected list")
    # QR is permanently bound to the mobile number. Use existing token if one was already generated.
    existing_token = reg.get("qr_token")
    qr_token = existing_token or str(uuid.uuid4())[:12].upper()
    version = (reg.get("qr_version", 0) or 0) + 1
    # Dynamic data: encode mobile for permanent binding
    qr_data = f"KATHA2026:{reg_id}:{qr_token}:v{version}:{reg.get('primary_mobile', '')}"
    qr_img = qrcode.make(qr_data)
    buf = io.BytesIO()
    qr_img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()
    await db.registrations.update_one({"id": reg_id}, {"$set": {
        "qr_token": qr_token, "qr_version": version, "qr_data": qr_data,
        "qr_image_b64": qr_b64, "qr_generated_at": datetime.now(timezone.utc).isoformat(),
        "qr_active": True, "last_updated_by": user["name"],
    }})
    head_name = ""
    for a in reg.get("attendees", []):
        if a.get("id") == reg.get("group_head_id"):
            head_name = a.get("name", "")
    await log_audit("qr_generate", "registration", reg_id, head_name or reg.get("primary_mobile", ""), f"QR v{version} generated", user["name"])
    return {"qr_data": qr_data, "qr_token": qr_token, "qr_version": version, "qr_image_b64": qr_b64}

@api_router.post("/admin/qr/generate-bulk")
async def generate_qr_bulk(request: Request):
    user = await require_superadmin(request)
    regs = await db.registrations.find({"approval_status": "approved", "arrival_status": {"$ne": "not_coming"}}, {"_id": 0, "id": 1, "qr_active": 1}).to_list(5000)
    count = 0
    for r in regs:
        if r.get("qr_active"):
            continue
        qr_token = str(uuid.uuid4())[:12].upper()
        qr_data = f"KATHA2026:{r['id']}:{qr_token}:v1"
        qr_img = qrcode.make(qr_data)
        buf = io.BytesIO()
        qr_img.save(buf, format="PNG")
        qr_b64 = base64.b64encode(buf.getvalue()).decode()
        await db.registrations.update_one({"id": r["id"]}, {"$set": {
            "qr_token": qr_token, "qr_version": 1, "qr_data": qr_data,
            "qr_image_b64": qr_b64, "qr_generated_at": datetime.now(timezone.utc).isoformat(),
            "qr_active": True,
        }})
        count += 1
    await log_audit("qr_bulk_generate", "system", "", "", f"Bulk generated {count} QR codes", user["name"])
    return {"generated": count, "skipped": len(regs) - count}

@api_router.post("/admin/qr/scan")
async def scan_qr(request: Request):
    await get_current_user(request)
    body = await request.json()
    qr_raw = body.get("qr_data", "").strip() or body.get("qr_token", "").strip()
    if not qr_raw:
        raise HTTPException(status_code=400, detail="No QR data provided")
    # Support both full QR string and plain token
    if qr_raw.startswith("KATHA2026:"):
        parts = qr_raw.split(":")
        if len(parts) < 3:
            raise HTTPException(status_code=400, detail="Invalid QR code format")
        reg_id = parts[1]
        qr_token = parts[2]
        reg = await db.registrations.find_one({"id": reg_id}, {"_id": 0})
    else:
        # Plain token lookup
        qr_token = qr_raw
        reg = await db.registrations.find_one({"qr_token": qr_token}, {"_id": 0})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    if reg.get("qr_token") != qr_token:
        raise HTTPException(status_code=410, detail="This QR code has been invalidated. A newer version was issued.")
    if not reg.get("qr_active", False):
        raise HTTPException(status_code=410, detail="This QR code is no longer active.")
    # Validate attendance conditions
    if not reg.get("assigned_swamsevak"):
        raise HTTPException(status_code=400, detail="Cannot process: No contact person assigned for this registration.")
    if not reg.get("room_assignments") or len(reg.get("room_assignments", [])) == 0:
        raise HTTPException(status_code=400, detail="Cannot process: No room assigned for this registration.")
    # Check if already arrived
    already_arrived = reg.get("arrival_status") == "arrived"
    ref_name = ""
    if reg.get("reference_person_id"):
        rp = await db.reference_persons.find_one({"id": reg["reference_person_id"]}, {"_id": 0, "name": 1})
        ref_name = rp.get("name", "") if rp else ""
    reg["reference_person_name"] = ref_name
    return {"registration": reg, "already_arrived": already_arrived}

@api_router.put("/admin/qr/invalidate/{reg_id}")
async def invalidate_qr(reg_id: str, request: Request):
    user = await require_superadmin(request)
    await db.registrations.update_one({"id": reg_id}, {"$set": {"qr_active": False, "last_updated_by": user["name"]}})
    await log_audit("qr_invalidate", "registration", reg_id, "", "QR invalidated", user["name"])
    return {"message": "QR invalidated"}

# ─── HELP CENTRE / TICKETING ───
class TicketCreate(BaseModel):
    title: str
    description: str = ""
    category: str = "other"
    priority: str = "low"
    source_type: str = "admin"
    source_registration_id: str = ""
    assigned_to: str = ""
    resolution_time_minutes: int = 30

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    status: Optional[str] = None
    resolution_time_minutes: Optional[int] = None
    notes: Optional[str] = None

class TicketResolve(BaseModel):
    closing_note: str

TICKET_CATEGORIES = [
    {"id": "water", "label": "Water / Beverages", "priority": "low", "sla_minutes": 30},
    {"id": "wheelchair", "label": "Wheelchair Arrangement", "priority": "medium", "sla_minutes": 20},
    {"id": "medical", "label": "Medical Help", "priority": "high", "sla_minutes": 10},
    {"id": "medical_emergency", "label": "Medical Emergency", "priority": "high", "sla_minutes": 5},
    {"id": "lost_found", "label": "Lost & Found", "priority": "medium", "sla_minutes": 60},
    {"id": "support", "label": "Support Services", "priority": "low", "sla_minutes": 45},
    {"id": "report", "label": "Report Something", "priority": "medium", "sla_minutes": 30},
    {"id": "room_issue", "label": "Room Issue", "priority": "medium", "sla_minutes": 30},
    {"id": "food", "label": "Food / Dining", "priority": "low", "sla_minutes": 30},
    {"id": "transport", "label": "Transport Assistance", "priority": "low", "sla_minutes": 45},
    {"id": "other", "label": "Other Assistance", "priority": "low", "sla_minutes": 30},
]

@api_router.get("/admin/tickets/categories")
async def get_ticket_categories(request: Request):
    await get_current_user(request)
    return TICKET_CATEGORIES

@api_router.get("/admin/tickets/stats")
async def get_ticket_stats(request: Request):
    await get_current_user(request)
    total = await db.tickets.count_documents({})
    active = await db.tickets.count_documents({"status": {"$in": ["open", "in_progress"]}})
    resolved = await db.tickets.count_documents({"status": "resolved"})
    high = await db.tickets.count_documents({"status": {"$in": ["open", "in_progress"]}, "priority": "high"})
    medium = await db.tickets.count_documents({"status": {"$in": ["open", "in_progress"]}, "priority": "medium"})
    low = await db.tickets.count_documents({"status": {"$in": ["open", "in_progress"]}, "priority": "low"})
    # Check escalated (past SLA)
    now = datetime.now(timezone.utc)
    escalated = 0
    open_tickets = await db.tickets.find({"status": {"$in": ["open", "in_progress"]}}, {"_id": 0, "created_at": 1, "resolution_time_minutes": 1}).to_list(500)
    for t in open_tickets:
        try:
            created = datetime.fromisoformat(t["created_at"].replace("Z", "+00:00"))
            sla = timedelta(minutes=t.get("resolution_time_minutes", 30))
            if now > created + sla:
                escalated += 1
        except:
            pass
    return {"total": total, "active": active, "resolved": resolved, "escalated": escalated, "by_priority": {"high": high, "medium": medium, "low": low}}

@api_router.get("/admin/tickets")
async def get_tickets(request: Request, status: Optional[str] = None, priority: Optional[str] = None, assigned_to: Optional[str] = None, page: int = 1, per_page: int = 50):
    await get_current_user(request)
    query = {}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if assigned_to:
        query["assigned_to"] = assigned_to
    total = await db.tickets.count_documents(query)
    skip = (page - 1) * per_page
    tickets = await db.tickets.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(per_page).to_list(per_page)
    return {"data": tickets, "total": total, "page": page, "total_pages": max(1, math.ceil(total / per_page))}

@api_router.get("/admin/tickets/{ticket_id}")
async def get_ticket_detail(ticket_id: str, request: Request):
    await get_current_user(request)
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket

@api_router.post("/admin/tickets")
async def create_ticket(body: TicketCreate, request: Request):
    user = await get_current_user(request)
    cat = next((c for c in TICKET_CATEGORIES if c["id"] == body.category), None)
    sla = body.resolution_time_minutes or (cat["sla_minutes"] if cat else 30)
    doc = {
        "id": str(uuid.uuid4()),
        "title": body.title,
        "description": body.description,
        "category": body.category,
        "category_label": cat["label"] if cat else body.category,
        "priority": body.priority or (cat["priority"] if cat else "low"),
        "status": "open",
        "source_type": body.source_type,
        "source_registration_id": body.source_registration_id,
        "created_by": user["username"],
        "created_by_name": user["name"],
        "assigned_to": body.assigned_to or user["username"],
        "assigned_to_name": "",
        "resolution_time_minutes": sla,
        "notes": "",
        "closing_note": "",
        "resolved_at": "",
        "resolved_by": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.tickets.insert_one(doc)
    doc.pop("_id", None)
    await log_audit("ticket_create", "ticket", doc["id"], body.title, f"Ticket created: {body.category} ({body.priority})", user["name"])
    return doc

@api_router.put("/admin/tickets/{ticket_id}")
async def update_ticket(ticket_id: str, body: TicketUpdate, request: Request):
    user = await get_current_user(request)
    ticket = await db.tickets.find_one({"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.tickets.update_one({"id": ticket_id}, {"$set": updates})
    await log_audit("ticket_update", "ticket", ticket_id, ticket.get("title", ""), f"Updated: {', '.join(updates.keys())}", user["name"])
    return {"message": "Ticket updated"}

@api_router.put("/admin/tickets/{ticket_id}/assign")
async def assign_ticket(ticket_id: str, request: Request):
    user = await get_current_user(request)
    body = await request.json()
    assigned_to = body.get("assigned_to", "")
    if not assigned_to:
        raise HTTPException(status_code=400, detail="assigned_to required")
    await db.tickets.update_one({"id": ticket_id}, {"$set": {"assigned_to": assigned_to, "updated_at": datetime.now(timezone.utc).isoformat()}})
    await log_audit("ticket_assign", "ticket", ticket_id, "", f"Assigned to {assigned_to}", user["name"])
    return {"message": "Ticket assigned"}

@api_router.put("/admin/tickets/{ticket_id}/resolve")
async def resolve_ticket(ticket_id: str, body: TicketResolve, request: Request):
    user = await get_current_user(request)
    ticket = await db.tickets.find_one({"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.get("assigned_to") != user["username"] and user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Only the assigned Swamsevak or Super Admin can resolve this ticket")
    if not body.closing_note.strip():
        raise HTTPException(status_code=400, detail="Closing note is required")
    await db.tickets.update_one({"id": ticket_id}, {"$set": {
        "status": "resolved", "closing_note": body.closing_note,
        "resolved_at": datetime.now(timezone.utc).isoformat(),
        "resolved_by": user["username"], "resolved_by_name": user["name"],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }})
    await log_audit("ticket_resolve", "ticket", ticket_id, ticket.get("title", ""), f"Resolved by {user['name']}", user["name"])
    return {"message": "Ticket resolved"}

# ─── TO-DO MODULE ───
class TodoCreate(BaseModel):
    title: str
    description: str = ""
    assigned_to: str = ""
    due_date: str = ""
    priority: str = "medium"
    todo_type: str = "manual"
    related_registration_id: str = ""
    is_recurring: bool = False
    recurring_time: str = ""

class TodoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None
    completed: Optional[bool] = None
    last_completed_date: Optional[str] = None
    completion_history: Optional[List[dict]] = None

@api_router.get("/admin/todos")
async def get_todos(request: Request, assigned_to: Optional[str] = None, completed: Optional[str] = None, due_date: Optional[str] = None, page: int = 1, per_page: int = 50):
    user = await get_current_user(request)
    query = {}
    if assigned_to:
        query["assigned_to"] = assigned_to
    elif user.get("role") != "superadmin":
        query["assigned_to"] = user["username"]
    if completed == "true":
        query["completed"] = True
    elif completed == "false":
        query["completed"] = False
    if due_date:
        query["due_date"] = due_date
    total = await db.todos.count_documents(query)
    skip = (page - 1) * per_page
    todos = await db.todos.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(per_page).to_list(per_page)
    return {"data": todos, "total": total, "page": page, "total_pages": max(1, math.ceil(total / per_page))}

@api_router.post("/admin/todos")
async def create_todo(body: TodoCreate, request: Request):
    user = await get_current_user(request)
    # Volunteers can only create tasks for themselves; superadmin can assign to others
    if user.get("role") != "superadmin":
        assigned_to = user["username"]
    else:
        assigned_to = body.assigned_to or user["username"]
    doc = {
        "id": str(uuid.uuid4()),
        "title": body.title,
        "description": body.description,
        "assigned_to": assigned_to,
        "due_date": body.due_date,
        "priority": body.priority,
        "todo_type": body.todo_type,
        "related_registration_id": body.related_registration_id,
        "is_recurring": body.is_recurring if user.get("role") == "superadmin" else False,
        "recurring_time": body.recurring_time if user.get("role") == "superadmin" else "",
        "completed": False,
        "completed_at": "",
        "last_completed_date": "",
        "completion_history": [],
        "created_by": user["username"],
        "created_by_role": user.get("role", "swamsevak"),
        "created_by_name": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.todos.insert_one(doc)
    doc.pop("_id", None)
    await log_audit("todo_create", "todo", doc["id"], body.title, f"To-do created for {assigned_to}", user["name"])
    return doc

@api_router.put("/admin/todos/{todo_id}")
async def update_todo(todo_id: str, body: TodoUpdate, request: Request):
    user = await get_current_user(request)
    todo = await db.todos.find_one({"id": todo_id}, {"_id": 0})
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    # Handle recurring task completion differently
    if "completed" in updates and updates["completed"] and todo.get("is_recurring"):
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        history_entry = {"date": today, "completed_at": datetime.now(timezone.utc).isoformat(), "completed_by": user["name"]}
        completion_history = todo.get("completion_history", [])
        completion_history.append(history_entry)
        updates["completion_history"] = completion_history
        updates["last_completed_date"] = today
        # Don't mark as permanently completed for recurring tasks
        del updates["completed"]
        updates["completed"] = False
    elif "completed" in updates and updates["completed"]:
        updates["completed_at"] = datetime.now(timezone.utc).isoformat()
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.todos.update_one({"id": todo_id}, {"$set": updates})
    return {"message": "To-do updated"}

@api_router.delete("/admin/todos/{todo_id}")
async def delete_todo(todo_id: str, request: Request):
    user = await get_current_user(request)
    todo = await db.todos.find_one({"id": todo_id}, {"_id": 0})
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    is_super = user.get("role") == "superadmin"
    if not is_super:
        # Volunteers cannot delete recurring tasks
        if todo.get("is_recurring"):
            raise HTTPException(status_code=403, detail="Cannot delete recurring tasks")
        # Volunteers cannot delete tasks created by super admin
        creator = await db.admins.find_one({"username": todo.get("created_by", "")}, {"_id": 0, "role": 1})
        if creator and creator.get("role") == "superadmin":
            raise HTTPException(status_code=403, detail="Cannot delete tasks created by Super Admin")
        # Volunteers can only delete their own tasks
        if todo.get("created_by") != user["username"]:
            raise HTTPException(status_code=403, detail="Only creator or Super Admin can delete this task")
    await db.todos.delete_one({"id": todo_id})
    await log_audit("todo_delete", "todo", todo_id, "", "To-do deleted", user["name"])
    return {"message": "Deleted"}

# ─── MESSAGE CENTER ───
class MessageTemplateCreate(BaseModel):
    name: str
    content_en: str = ""
    content_hi: str = ""
    category: str = "shraddhalu"
    trigger_type: str = "manual"
    enabled: bool = True

class MessageTemplateUpdate(BaseModel):
    name: Optional[str] = None
    content_en: Optional[str] = None
    content_hi: Optional[str] = None
    category: Optional[str] = None
    trigger_type: Optional[str] = None
    enabled: Optional[bool] = None

class MessageSend(BaseModel):
    template_id: str = ""
    custom_message_en: str = ""
    custom_message_hi: str = ""
    target_type: str = "all_expected"
    target_ids: List[str] = []

DEFAULT_TEMPLATES = [
    {"name": "OTP Message", "content_en": "Your OTP for Katha 2026 registration is: {otp}. Valid for 10 minutes.", "content_hi": "\u0915\u0925\u093E 2026 \u092A\u0902\u091C\u0940\u0915\u0930\u0923 \u0915\u093E OTP: {otp}\u0964 10 \u092E\u093F\u0928\u091F \u0915\u0947 \u0932\u093F\u090F \u0935\u0948\u0927\u0964", "category": "system", "trigger_type": "auto"},
    {"name": "Registration Confirmation", "content_en": "Thank you for registering for Shrimad Bhagavat Katha 2026! You can update your details until 19 May 2026.", "content_hi": "\u0936\u094D\u0930\u0940\u092E\u0926\u094D\u092D\u093E\u0917\u0935\u0924 \u0915\u0925\u093E 2026 \u0915\u0947 \u0932\u093F\u090F \u092A\u0902\u091C\u0940\u0915\u0930\u0923 \u0915\u0947 \u0932\u093F\u090F \u0927\u0928\u094D\u092F\u0935\u093E\u0926! \u0906\u092A 19 \u092E\u0908 2026 \u0924\u0915 \u0905\u092A\u0928\u093E \u0935\u093F\u0935\u0930\u0923 \u0905\u092A\u0921\u0947\u091F \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964", "category": "shraddhalu", "trigger_type": "auto"},
    {"name": "Form Closed", "content_en": "Registration for Katha 2026 closed on 19 May 2026. For changes, contact admin.", "content_hi": "\u0915\u0925\u093E 2026 \u0915\u093E \u092A\u0902\u091C\u0940\u0915\u0930\u0923 19 \u092E\u0908 2026 \u0915\u094B \u092C\u0902\u0926 \u0939\u094B \u0917\u092F\u093E\u0964 \u092A\u0930\u093F\u0935\u0930\u094D\u0924\u0928 \u0915\u0947 \u0932\u093F\u090F \u0938\u0902\u092A\u0930\u094D\u0915 \u0915\u0930\u0947\u0902\u0964", "category": "shraddhalu", "trigger_type": "auto"},
    {"name": "Welcome + Room Allocation", "content_en": "Welcome to Shrimad Bhagavat Katha 2026! Your room: {room}. QR attached. Contact: {swamsevak_name} ({swamsevak_phone})", "content_hi": "\u0936\u094D\u0930\u0940\u092E\u0926\u094D\u092D\u093E\u0917\u0935\u0924 \u0915\u0925\u093E 2026 \u092E\u0947\u0902 \u0938\u094D\u0935\u093E\u0917\u0924! \u0906\u092A\u0915\u093E \u0915\u092E\u0930\u093E: {room}\u0964 QR \u0938\u0902\u0932\u0917\u094D\u0928\u0964 \u0938\u0902\u092A\u0930\u094D\u0915: {swamsevak_name} ({swamsevak_phone})", "category": "shraddhalu", "trigger_type": "manual"},
    {"name": "Food Timing", "content_en": "Prasad timings today: Breakfast 7-9 AM, Lunch 12-2 PM, Dinner 7-9 PM. Please carry your ID card.", "content_hi": "\u0906\u091C \u0915\u093E \u092A\u094D\u0930\u0938\u093E\u0926 \u0938\u092E\u092F: \u0938\u0941\u092C\u0939 7-9, \u0926\u094B\u092A\u0939\u0930 12-2, \u0930\u093E\u0924\u094D\u0930\u093F 7-9\u0964 \u0915\u0943\u092A\u092F\u093E ID \u0915\u093E\u0930\u094D\u0921 \u0938\u093E\u0925 \u0930\u0916\u0947\u0902\u0964", "category": "shraddhalu", "trigger_type": "scheduled"},
    {"name": "Katha Timing", "content_en": "Today's Katha: Morning session 9-12 AM, Evening session 4-7 PM. Venue: Main Hall.", "content_hi": "\u0906\u091C \u0915\u0940 \u0915\u0925\u093E: \u0938\u0941\u092C\u0939 9-12, \u0936\u093E\u092E 4-7\u0964 \u0938\u094D\u0925\u093E\u0928: \u092E\u0941\u0916\u094D\u092F \u0939\u0949\u0932\u0964", "category": "shraddhalu", "trigger_type": "scheduled"},
    {"name": "Wear ID Card Reminder", "content_en": "Reminder: Please wear your ID card at all times within the premises.", "content_hi": "\u0905\u0928\u0941\u0938\u094D\u092E\u093E\u0930\u0915: \u0915\u0943\u092A\u092F\u093E \u092A\u0930\u093F\u0938\u0930 \u092E\u0947\u0902 \u0939\u0930 \u0938\u092E\u092F ID \u0915\u093E\u0930\u094D\u0921 \u092A\u0939\u0928\u0947\u0902\u0964", "category": "shraddhalu", "trigger_type": "scheduled"},
    {"name": "Swamsevak Daily Briefing", "content_en": "Good morning! Today's departures: {departures}. Special needs: {special_needs}. Open tickets: {tickets}.", "content_hi": "\u0938\u0941\u092A\u094D\u0930\u092D\u093E\u0924! \u0906\u091C \u0915\u0947 \u092A\u094D\u0930\u0938\u094D\u0925\u093E\u0928: {departures}\u0964 \u0935\u093F\u0936\u0947\u0937 \u0906\u0935\u0936\u094D\u092F\u0915\u0924\u093E: {special_needs}\u0964 \u0916\u0941\u0932\u0947 \u091F\u093F\u0915\u091F: {tickets}\u0964", "category": "swamsevak", "trigger_type": "scheduled"},
    {"name": "Revised QR", "content_en": "Your details have been updated. Please use the new QR code attached. Previous QR is no longer valid.", "content_hi": "\u0906\u092A\u0915\u0947 \u0935\u093F\u0935\u0930\u0923 \u0905\u092A\u0921\u0947\u091F \u0939\u094B \u0917\u090F \u0939\u0948\u0902\u0964 \u0915\u0943\u092A\u092F\u093E \u0928\u092F\u093E QR \u0915\u094B\u0921 \u0909\u092A\u092F\u094B\u0917 \u0915\u0930\u0947\u0902\u0964 \u092A\u0941\u0930\u093E\u0928\u093E QR \u0905\u092E\u093E\u0928\u094D\u092F \u0939\u0948\u0964", "category": "shraddhalu", "trigger_type": "manual"},
    {"name": "Pre-Registration Invite", "content_en": "Namaste! You are invited to Shrimad Bhagavat Katha 2026 in Pushkar (28 May - 3 Jun). Interested? Reply YES.", "content_hi": "\u0928\u092E\u0938\u094D\u0924\u0947! \u0906\u092A\u0915\u094B \u092A\u0941\u0937\u094D\u0915\u0930 \u092E\u0947\u0902 \u0936\u094D\u0930\u0940\u092E\u0926\u094D\u092D\u093E\u0917\u0935\u0924 \u0915\u0925\u093E 2026 (28 \u092E\u0908 - 3 \u091C\u0942\u0928) \u0915\u093E \u0928\u093F\u092E\u0902\u0924\u094D\u0930\u0923\u0964 \u0930\u0941\u091A\u093F \u0939\u0948? YES \u0932\u093F\u0916\u0947\u0902\u0964", "category": "shraddhalu", "trigger_type": "manual"},
]

@api_router.get("/admin/messages/templates")
async def get_message_templates(request: Request):
    user = await require_superadmin(request)
    templates = await db.message_templates.find({}, {"_id": 0}).sort("name", 1).to_list(100)
    return templates

@api_router.post("/admin/messages/templates")
async def create_message_template(body: MessageTemplateCreate, request: Request):
    user = await require_superadmin(request)
    doc = {
        "id": str(uuid.uuid4()),
        "name": body.name, "content_en": body.content_en, "content_hi": body.content_hi,
        "category": body.category, "trigger_type": body.trigger_type, "enabled": body.enabled,
        "created_at": datetime.now(timezone.utc).isoformat(), "created_by": user["name"],
    }
    await db.message_templates.insert_one(doc)
    doc.pop("_id", None)
    await log_audit("template_create", "message_template", doc["id"], body.name, "Message template created", user["name"])
    return doc

@api_router.put("/admin/messages/templates/{tmpl_id}")
async def update_message_template(tmpl_id: str, body: MessageTemplateUpdate, request: Request):
    user = await require_superadmin(request)
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.message_templates.update_one({"id": tmpl_id}, {"$set": updates})
    await log_audit("template_update", "message_template", tmpl_id, "", "Template updated", user["name"])
    return {"message": "Updated"}

@api_router.delete("/admin/messages/templates/{tmpl_id}")
async def delete_message_template(tmpl_id: str, request: Request):
    user = await require_superadmin(request)
    await db.message_templates.delete_one({"id": tmpl_id})
    await log_audit("template_delete", "message_template", tmpl_id, "", "Template deleted", user["name"])
    return {"message": "Deleted"}

@api_router.post("/admin/messages/send")
async def send_message(body: MessageSend, request: Request):
    user = await require_superadmin(request)
    targets = []
    if body.target_type == "all_expected":
        targets = await db.registrations.find({"approval_status": "approved", "arrival_status": "not_arrived"}, {"_id": 0, "id": 1, "primary_mobile": 1, "preferred_language": 1}).to_list(5000)
    elif body.target_type == "all_arrived":
        targets = await db.registrations.find({"approval_status": "approved", "arrival_status": {"$in": ["arrived", "partially_arrived"]}}, {"_id": 0, "id": 1, "primary_mobile": 1, "preferred_language": 1}).to_list(5000)
    elif body.target_type == "all_approved":
        targets = await db.registrations.find({"approval_status": "approved"}, {"_id": 0, "id": 1, "primary_mobile": 1, "preferred_language": 1}).to_list(5000)
    elif body.target_type == "selected" and body.target_ids:
        targets = await db.registrations.find({"id": {"$in": body.target_ids}}, {"_id": 0, "id": 1, "primary_mobile": 1, "preferred_language": 1}).to_list(5000)
    elif body.target_type == "all_swamsevaks":
        swamsevaks = []
        for uname, acc in ADMIN_ACCOUNTS.items():
            if acc.get("role") != "superadmin":
                swamsevaks.append({"id": uname, "primary_mobile": "", "preferred_language": "en"})
        custom = await db.custom_admins.find({}, {"_id": 0}).to_list(100)
        for c in custom:
            swamsevaks.append({"id": c["username"], "primary_mobile": c.get("mobile", ""), "preferred_language": "en"})
        targets = swamsevaks

    # Simulate sending - log each delivery
    campaign_id = str(uuid.uuid4())
    sent = 0
    for t in targets:
        await db.message_deliveries.insert_one({
            "id": str(uuid.uuid4()),
            "campaign_id": campaign_id,
            "template_id": body.template_id,
            "target_id": t.get("id", ""),
            "mobile": t.get("primary_mobile", ""),
            "language": t.get("preferred_language", "en"),
            "status": "sent",  # simulated
            "sent_at": datetime.now(timezone.utc).isoformat(),
        })
        sent += 1
    campaign = {
        "id": campaign_id, "template_id": body.template_id,
        "target_type": body.target_type, "total_targets": len(targets),
        "sent": sent, "failed": 0,
        "custom_message_en": body.custom_message_en, "custom_message_hi": body.custom_message_hi,
        "sent_by": user["name"], "sent_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.message_campaigns.insert_one(campaign)
    campaign.pop("_id", None)
    await log_audit("message_send", "campaign", campaign_id, "", f"Sent to {sent} recipients ({body.target_type})", user["name"])
    return {"campaign_id": campaign_id, "sent": sent, "total": len(targets)}

@api_router.get("/admin/messages/campaigns")
async def get_campaigns(request: Request, page: int = 1, per_page: int = 20):
    user = await require_superadmin(request)
    total = await db.message_campaigns.count_documents({})
    skip = (page - 1) * per_page
    campaigns = await db.message_campaigns.find({}, {"_id": 0}).sort("sent_at", -1).skip(skip).limit(per_page).to_list(per_page)
    return {"data": campaigns, "total": total, "page": page, "total_pages": max(1, math.ceil(total / per_page))}

# ─── CUSTOM FIELDS ───
class CustomFieldCreate(BaseModel):
    name: str
    field_type: str = "text"
    default_value: str = ""
    options: List[str] = []
    target_scope: str = "all"  # "expected", "arrived", "all"
    applies_to: List[str] = []  # list of registration IDs this field applies to

@api_router.get("/admin/custom-fields")
async def get_custom_fields(request: Request):
    await get_current_user(request)
    fields = await db.custom_fields.find({}, {"_id": 0}).sort("name", 1).to_list(100)
    # Backward compatibility: add defaults for old fields without new fields
    for f in fields:
        f.setdefault("target_scope", "all")
        f.setdefault("applies_to", [])
    return fields

@api_router.post("/admin/custom-fields")
async def create_custom_field(body: CustomFieldCreate, request: Request):
    user = await require_superadmin(request)
    doc = {
        "id": str(uuid.uuid4()), "name": body.name, "field_type": body.field_type,
        "default_value": body.default_value, "options": body.options,
        "target_scope": body.target_scope, "visibility": "admin_only",
        "applies_to": body.applies_to,
        "created_at": datetime.now(timezone.utc).isoformat(), "created_by": user["name"],
    }
    await db.custom_fields.insert_one(doc)
    doc.pop("_id", None)
    await log_audit("custom_field_create", "custom_field", doc["id"], body.name, f"Custom field created: {body.field_type}", user["name"])
    return doc

@api_router.put("/admin/custom-fields/{field_id}")
async def update_custom_field(field_id: str, request: Request):
    user = await require_superadmin(request)
    body = await request.json()
    updates = {k: v for k, v in body.items() if k not in ("id", "created_at", "created_by")}
    await db.custom_fields.update_one({"id": field_id}, {"$set": updates})
    await log_audit("custom_field_update", "custom_field", field_id, "", "Custom field updated", user["name"])
    return {"message": "Updated"}

@api_router.delete("/admin/custom-fields/{field_id}")
async def delete_custom_field(field_id: str, request: Request):
    user = await require_superadmin(request)
    await db.custom_fields.delete_one({"id": field_id})
    await log_audit("custom_field_delete", "custom_field", field_id, "", "Custom field deleted", user["name"])
    return {"message": "Deleted"}

@api_router.put("/admin/registrations/{reg_id}/custom-fields")
async def update_reg_custom_fields(reg_id: str, request: Request):
    user = await get_current_user(request)
    body = await request.json()
    fields = body.get("custom_field_values", {})
    await db.registrations.update_one({"id": reg_id}, {"$set": {"custom_field_values": fields, "last_updated_by": user["name"], "last_updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"message": "Custom fields updated"}

# ─── DEPARTURE MANAGEMENT ───
@api_router.get("/admin/departures/today")
async def get_todays_departures(request: Request):
    await get_current_user(request)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    regs = await db.registrations.find({
        "approval_status": "approved",
        "departure_date": today,
        "arrival_status": {"$in": ["arrived", "partially_arrived"]},
    }, {"_id": 0}).to_list(500)
    return regs

@api_router.post("/admin/registrations/{reg_id}/confirm-departure")
async def confirm_departure(reg_id: str, request: Request):
    user = await get_current_user(request)
    reg = await db.registrations.find_one({"id": reg_id})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    updates = {
        "arrival_status": "departed",
        "departed_at": datetime.now(timezone.utc).isoformat(),
        "departed_confirmed_by": user["name"],
        "last_updated_by": user["name"],
        "last_updated_at": datetime.now(timezone.utc).isoformat(),
    }
    # Update all attendees
    attendees = reg.get("attendees", [])
    for att in attendees:
        att["arrival_status"] = "departed"
    updates["attendees"] = attendees
    await db.registrations.update_one({"id": reg_id}, {"$set": updates})
    # Free rooms
    for rc in reg.get("room_assignments", []):
        room = await db.rooms.find_one({"room_code": rc})
        if room:
            occ_ids = [x for x in room.get("occupant_ids", []) if x != reg_id]
            occ_names = [n for n in room.get("occupant_names", []) if n != ""]
            status = "occupied" if occ_ids else "available"
            await db.rooms.update_one({"room_code": rc}, {"$set": {"occupant_ids": occ_ids, "occupant_names": occ_names if occ_ids else [], "status": status}})
    head_name = ""
    for a in reg.get("attendees", []):
        if a.get("id") == reg.get("group_head_id"):
            head_name = a.get("name", "")
    await log_audit("departure_confirm", "registration", reg_id, head_name or reg.get("primary_mobile", ""), "Departure confirmed, rooms freed", user["name"])
    return {"message": "Departure confirmed, rooms freed"}

# ─── SWAMSEVAK ASSIGNMENT ───
@api_router.put("/admin/registrations/{reg_id}/assign-swamsevak")
async def assign_swamsevak(reg_id: str, request: Request):
    user = await get_current_user(request)
    body = await request.json()
    swamsevak_username = body.get("swamsevak_username", "")
    if not swamsevak_username:
        raise HTTPException(status_code=400, detail="swamsevak_username required")
    reg = await db.registrations.find_one({"id": reg_id})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    assignments = reg.get("swamsevak_assignments", [])
    if swamsevak_username not in assignments:
        assignments.append(swamsevak_username)
    await db.registrations.update_one({"id": reg_id}, {"$set": {"swamsevak_assignments": assignments, "last_updated_by": user["name"], "last_updated_at": datetime.now(timezone.utc).isoformat()}})
    await log_audit("swamsevak_assign", "registration", reg_id, "", f"Swamsevak {swamsevak_username} assigned", user["name"])
    return {"message": f"Swamsevak {swamsevak_username} assigned"}

# ─── HELP CHATBOT (PUBLIC) ───
CHATBOT_FAQ = [
    {"keywords": ["water", "pani", "\u092A\u093E\u0928\u0940"], "response_en": "A water request has been raised. Someone will assist you shortly.", "response_hi": "\u092A\u093E\u0928\u0940 \u0915\u093E \u0905\u0928\u0941\u0930\u094B\u0927 \u0926\u0930\u094D\u091C \u0915\u093F\u092F\u093E \u0917\u092F\u093E \u0939\u0948\u0964 \u091C\u0932\u094D\u0926 \u0939\u0940 \u0938\u0939\u093E\u092F\u0924\u093E \u092E\u093F\u0932\u0947\u0917\u0940\u0964", "category": "water"},
    {"keywords": ["wheelchair", "\u0935\u094D\u0939\u0940\u0932\u091A\u0947\u092F\u0930"], "response_en": "A wheelchair has been requested. Our team will arrange it.", "response_hi": "\u0935\u094D\u0939\u0940\u0932\u091A\u0947\u092F\u0930 \u0915\u093E \u0905\u0928\u0941\u0930\u094B\u0927 \u0915\u093F\u092F\u093E \u0917\u092F\u093E\u0964 \u0939\u092E\u093E\u0930\u0940 \u091F\u0940\u092E \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E \u0915\u0930\u0947\u0917\u0940\u0964", "category": "wheelchair"},
    {"keywords": ["medical", "doctor", "\u0921\u0949\u0915\u094D\u091F\u0930", "health"], "response_en": "Medical help is on the way. If this is an emergency, please call the front desk.", "response_hi": "\u091A\u093F\u0915\u093F\u0924\u094D\u0938\u093E \u0938\u0939\u093E\u092F\u0924\u093E \u092D\u0947\u091C\u0940 \u091C\u093E \u0930\u0939\u0940 \u0939\u0948\u0964 \u0906\u092A\u093E\u0924\u0915\u093E\u0932 \u092E\u0947\u0902 \u092B\u094D\u0930\u0902\u091F \u0921\u0947\u0938\u094D\u0915 \u092A\u0930 \u0915\u0949\u0932 \u0915\u0930\u0947\u0902\u0964", "category": "medical"},
    {"keywords": ["lost", "found", "\u0916\u094B\u092F\u093E"], "response_en": "Please describe the lost item. We'll check our lost & found.", "response_hi": "\u0915\u0943\u092A\u092F\u093E \u0916\u094B\u0908 \u0935\u0938\u094D\u0924\u0941 \u0915\u093E \u0935\u0930\u094D\u0923\u0928 \u0915\u0930\u0947\u0902\u0964 \u0939\u092E \u091C\u093E\u0901\u091A \u0915\u0930\u0947\u0902\u0917\u0947\u0964", "category": "lost_found"},
    {"keywords": ["food", "khana", "\u0916\u093E\u0928\u093E", "prasad"], "response_en": "Prasad timings: Breakfast 7-9 AM, Lunch 12-2 PM, Dinner 7-9 PM. Main dining hall.", "response_hi": "\u092A\u094D\u0930\u0938\u093E\u0926 \u0938\u092E\u092F: \u0938\u0941\u092C\u0939 7-9, \u0926\u094B\u092A\u0939\u0930 12-2, \u0930\u093E\u0924\u094D\u0930\u093F 7-9\u0964 \u092E\u0941\u0916\u094D\u092F \u092D\u094B\u091C\u0928 \u0915\u0915\u094D\u0937\u0964", "category": "food"},
    {"keywords": ["room", "kamra", "\u0915\u092E\u0930\u093E"], "response_en": "For room issues, a ticket has been raised. Your assigned Swamsevak will contact you.", "response_hi": "\u0915\u092E\u0930\u0947 \u0915\u0940 \u0938\u092E\u0938\u094D\u092F\u093E \u0915\u0947 \u0932\u093F\u090F \u091F\u093F\u0915\u091F \u092C\u0928\u093E\u092F\u093E \u0917\u092F\u093E\u0964 \u0906\u092A\u0915\u0947 \u0938\u094D\u0935\u093E\u092E\u0938\u0947\u0935\u0915 \u0938\u0902\u092A\u0930\u094D\u0915 \u0915\u0930\u0947\u0902\u0917\u0947\u0964", "category": "room_issue"},
    {"keywords": ["transport", "\u092F\u093E\u0924\u093E\u092F\u093E\u0924", "taxi", "car"], "response_en": "For transport assistance, please contact the front desk or your assigned Swamsevak.", "response_hi": "\u092F\u093E\u0924\u093E\u092F\u093E\u0924 \u0938\u0939\u093E\u092F\u0924\u093E \u0915\u0947 \u0932\u093F\u090F \u092B\u094D\u0930\u0902\u091F \u0921\u0947\u0938\u094D\u0915 \u092F\u093E \u0938\u094D\u0935\u093E\u092E\u0938\u0947\u0935\u0915 \u0938\u0947 \u0938\u0902\u092A\u0930\u094D\u0915 \u0915\u0930\u0947\u0902\u0964", "category": "transport"},
    {"keywords": ["schedule", "timing", "\u0938\u092E\u092F", "katha"], "response_en": "Katha Schedule: Morning 9-12 AM, Evening 4-7 PM daily. Check notice board for updates.", "response_hi": "\u0915\u0925\u093E \u0938\u092E\u092F: \u0938\u0941\u092C\u0939 9-12, \u0936\u093E\u092E 4-7 \u092A\u094D\u0930\u0924\u093F\u0926\u093F\u0928\u0964 \u0905\u092A\u0921\u0947\u091F \u0915\u0947 \u0932\u093F\u090F \u0928\u094B\u091F\u093F\u0938 \u092C\u094B\u0930\u094D\u0921 \u0926\u0947\u0916\u0947\u0902\u0964", "category": "other"},
]

@api_router.post("/chatbot/message")
async def chatbot_message(request: Request):
    body = await request.json()
    message = body.get("message", "").lower().strip()
    mobile = body.get("mobile", "").strip()
    lang = body.get("language", "en")
    # Check if user is in arrived list
    if mobile:
        reg = await db.registrations.find_one({"primary_mobile": mobile, "approval_status": "approved", "arrival_status": {"$in": ["arrived", "partially_arrived"]}}, {"_id": 0, "id": 1})
        if not reg:
            resp = "This help service is available only for arrived guests. For other queries, please contact the registration desk." if lang == "en" else "\u092F\u0939 \u0938\u0939\u093E\u092F\u0924\u093E \u0938\u0947\u0935\u093E \u0915\u0947\u0935\u0932 \u0906\u090F \u0939\u0941\u090F \u0905\u0924\u093F\u0925\u093F\u092F\u094B\u0902 \u0915\u0947 \u0932\u093F\u090F \u0939\u0948\u0964 \u0905\u0928\u094D\u092F \u092A\u094D\u0930\u0936\u094D\u0928\u094B\u0902 \u0915\u0947 \u0932\u093F\u090F \u092A\u0902\u091C\u0940\u0915\u0930\u0923 \u0921\u0947\u0938\u094D\u0915 \u0938\u0947 \u0938\u0902\u092A\u0930\u094D\u0915 \u0915\u0930\u0947\u0902\u0964"
            return {"response": resp, "ticket_created": False}
    # Match FAQ
    for faq in CHATBOT_FAQ:
        if any(kw in message for kw in faq["keywords"]):
            resp = faq["response_hi"] if lang == "hi" else faq["response_en"]
            # Auto-create ticket for actionable requests
            if faq["category"] in ("water", "wheelchair", "medical", "medical_emergency", "lost_found", "room_issue", "transport"):
                cat = next((c for c in TICKET_CATEGORIES if c["id"] == faq["category"]), TICKET_CATEGORIES[-1])
                await db.tickets.insert_one({
                    "id": str(uuid.uuid4()), "title": f"[Chatbot] {cat['label']}", "description": message,
                    "category": faq["category"], "category_label": cat["label"],
                    "priority": cat["priority"], "status": "open",
                    "source_type": "chatbot", "source_registration_id": "",
                    "created_by": "Panchariya AI Bot", "created_by_name": "Panchariya AI - Shrimad Bhagavat 2026",
                    "assigned_to": "", "assigned_to_name": "", "resolution_time_minutes": cat["sla_minutes"],
                    "notes": f"Mobile: {mobile}", "closing_note": "", "resolved_at": "", "resolved_by": "",
                    "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat(),
                })
                return {"response": resp, "ticket_created": True, "category": faq["category"]}
            return {"response": resp, "ticket_created": False}
    # Default response
    default_en = "I'm Panchariya AI, your Help Desk for Shrimad Bhagavat Katha 2026. I can help with: water, wheelchair, medical help, lost & found, food timings, room issues, transport, and schedule info. Please describe your need."
    default_hi = "\u092E\u0948\u0902 \u092E\u093E\u0927\u0935 \u0939\u0942\u0901, \u0915\u0925\u093E 2026 \u0915\u093E AI \u0939\u0947\u0932\u094D\u092A \u0921\u0947\u0938\u094D\u0915\u0964 \u092E\u0948\u0902 \u092E\u0926\u0926 \u0915\u0930 \u0938\u0915\u0924\u093E \u0939\u0942\u0901: \u092A\u093E\u0928\u0940, \u0935\u094D\u0939\u0940\u0932\u091A\u0947\u092F\u0930, \u091A\u093F\u0915\u093F\u0924\u094D\u0938\u093E, \u0916\u094B\u092F\u093E-\u092A\u093E\u092F\u093E, \u092D\u094B\u091C\u0928, \u0915\u092E\u0930\u093E, \u092F\u093E\u0924\u093E\u092F\u093E\u0924, \u0938\u092E\u092F\u0938\u0942\u091A\u0940\u0964 \u0905\u092A\u0928\u0940 \u0906\u0935\u0936\u094D\u092F\u0915\u0924\u093E \u092C\u0924\u093E\u090F\u0902\u0964"
    return {"response": default_hi if lang == "hi" else default_en, "ticket_created": False}

app.include_router(api_router)

# ─── ADDITIONAL V2.5 ENDPOINTS ───
extra_router = APIRouter(prefix="/api")

@extra_router.get("/admin/registration-cutoff-status")
async def get_cutoff_status():
    now_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return {
        "cutoff_date": REGISTRATION_CUTOFF,
        "finalization_date": FINALIZATION_DATE,
        "is_open": now_date <= REGISTRATION_CUTOFF,
        "is_finalization_window": REGISTRATION_CUTOFF < now_date <= FINALIZATION_DATE,
        "is_post_finalization": now_date > FINALIZATION_DATE,
        "current_date": now_date,
    }

@extra_router.get("/admin/dashboard/drill-down")
async def dashboard_drill_down(request: Request, field: str = "", value: str = ""):
    await get_current_user(request)
    query = {"approval_status": "approved"}
    if field == "arrival_date":
        query["arrival_date"] = value
        query["arrival_status"] = {"$nin": ["not_coming"]}
    elif field == "departure_date":
        query["departure_date"] = value
        query["arrival_status"] = {"$nin": ["not_coming"]}
    elif field == "arrival_status":
        if value == "arrived":
            query["arrival_status"] = {"$in": ["arrived", "partially_arrived"]}
        else:
            query["arrival_status"] = value
    elif field == "pending":
        query = {"approval_status": "pending"}
    elif field == "reference_person":
        query["reference_person_name"] = value
    elif field == "relation_category":
        query["relation_category"] = value
    regs = await db.registrations.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    results = []
    for r in regs:
        head_name = ""
        for a in r.get("attendees", []):
            if a.get("id") == r.get("group_head_id"):
                head_name = a.get("name", "")
        results.append({
            "id": r.get("id"), "head_name": head_name or r.get("primary_mobile", ""),
            "num_people": r.get("num_people", 1), "rooms": r.get("room_assignments", []),
            "arrival_status": r.get("arrival_status", ""), "arrival_date": r.get("arrival_date", ""),
            "departure_date": r.get("departure_date", ""), "primary_mobile": r.get("primary_mobile", ""),
        })
    return results

@extra_router.get("/admin/registrations/rejected")
async def get_rejected_registrations(request: Request, page: int = 1, per_page: int = 20, search: str = ""):
    await get_current_user(request)
    query = {"approval_status": "rejected"}
    if search:
        query["$or"] = [
            {"attendees.name": {"$regex": search, "$options": "i"}},
            {"primary_mobile": {"$regex": search, "$options": "i"}},
        ]
    total = await db.registrations.count_documents(query)
    skip = (page - 1) * per_page
    regs = await db.registrations.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(per_page).to_list(per_page)
    return {"data": regs, "total": total, "page": page, "total_pages": max(1, math.ceil(total / per_page))}

@extra_router.put("/admin/registrations/{reg_id}/undo-arrival")
async def undo_arrival(reg_id: str, request: Request):
    user = await require_superadmin(request)
    reg = await db.registrations.find_one({"id": reg_id})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    attendees = reg.get("attendees", [])
    for att in attendees:
        att["arrival_status"] = "not_arrived"
    await db.registrations.update_one({"id": reg_id}, {"$set": {
        "arrival_status": "not_arrived", "attendees": attendees,
        "last_updated_by": user["name"], "last_updated_at": datetime.now(timezone.utc).isoformat(),
    }})
    await log_audit("undo_arrival", "registration", reg_id, "", "Moved back to Expected by Super Admin", user["name"])
    return {"message": "Moved back to Expected Guest List"}

@extra_router.put("/admin/registrations/{reg_id}/undo-departure")
async def undo_departure(reg_id: str, request: Request):
    user = await require_superadmin(request)
    reg = await db.registrations.find_one({"id": reg_id})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    attendees = reg.get("attendees", [])
    for att in attendees:
        att["arrival_status"] = "arrived"
    await db.registrations.update_one({"id": reg_id}, {"$set": {
        "arrival_status": "arrived", "attendees": attendees,
        "departed_at": "", "departed_confirmed_by": "",
        "last_updated_by": user["name"], "last_updated_at": datetime.now(timezone.utc).isoformat(),
    }})
    await log_audit("undo_departure", "registration", reg_id, "", "Departure undone by Super Admin", user["name"])
    return {"message": "Departure undone, guest is back in Arrived"}

@extra_router.get("/admin/sla-config")
async def get_sla_config(request: Request):
    await get_current_user(request)
    config = await db.sla_config.find({}, {"_id": 0}).to_list(50)
    if not config:
        return TICKET_CATEGORIES
    return config

@extra_router.put("/admin/sla-config")
async def update_sla_config(request: Request):
    user = await require_superadmin(request)
    body = await request.json()
    categories = body.get("categories", [])
    await db.sla_config.delete_many({})
    for cat in categories:
        await db.sla_config.insert_one(cat)
    await log_audit("sla_config_update", "system", "", "", "SLA configuration updated", user["name"])
    return {"message": "SLA configuration updated"}

@extra_router.get("/admin/qr-management")
async def get_qr_management(request: Request):
    await require_superadmin(request)
    regs = await db.registrations.find(
        {"qr_active": {"$exists": True}},
        {"_id": 0, "id": 1, "primary_mobile": 1, "attendees": 1, "group_head_id": 1,
         "qr_token": 1, "qr_version": 1, "qr_data": 1, "qr_active": 1, "qr_generated_at": 1,
         "room_assignments": 1, "arrival_status": 1}
    ).sort("qr_generated_at", -1).to_list(5000)
    results = []
    for r in regs:
        head_name = ""
        for a in r.get("attendees", []):
            if a.get("id") == r.get("group_head_id"):
                head_name = a.get("name", "")
        results.append({
            "id": r["id"], "head_name": head_name or r.get("primary_mobile", ""),
            "qr_token": r.get("qr_token", ""), "qr_version": r.get("qr_version", 0),
            "qr_active": r.get("qr_active", False), "qr_generated_at": r.get("qr_generated_at", ""),
            "rooms": r.get("room_assignments", []), "arrival_status": r.get("arrival_status", ""),
        })
    return results

# ─── GUEST LIST ENDPOINTS (Aliases for frontend) ───
@extra_router.get("/admin/guests/pending")
async def get_pending_guests(request: Request, search: str = "", page: int = 1, per_page: int = 50):
    """Get pending approval registrations"""
    await get_current_user(request)
    query = {"approval_status": "pending"}
    if search:
        query["$or"] = [
            {"attendees.name": {"$regex": search, "$options": "i"}},
            {"primary_mobile": {"$regex": search, "$options": "i"}},
        ]
    total = await db.registrations.count_documents(query)
    skip = (page - 1) * per_page
    regs = await db.registrations.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(per_page).to_list(per_page)
    return {"data": regs, "total": total, "page": page, "total_pages": max(1, math.ceil(total / per_page))}

@extra_router.get("/admin/guests/expected")
async def get_expected_guests(request: Request, search: str = "", page: int = 1, per_page: int = 50, status_filter: str = "all"):
    """Get expected guests (approved, not yet arrived)"""
    await get_current_user(request)
    if status_filter == "not_coming":
        query = {"approval_status": "approved", "arrival_status": "not_coming"}
    elif status_filter == "expected":
        query = {"approval_status": "approved", "arrival_status": "not_arrived"}
    else:
        query = {"approval_status": "approved", "arrival_status": {"$in": ["not_arrived", "not_coming"]}}
    if search:
        query["$or"] = [
            {"attendees.name": {"$regex": search, "$options": "i"}},
            {"primary_mobile": {"$regex": search, "$options": "i"}},
        ]
    total = await db.registrations.count_documents(query)
    skip = (page - 1) * per_page
    regs = await db.registrations.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(per_page).to_list(per_page)
    # Enrich with reference person name
    for r in regs:
        if r.get("reference_person_id"):
            rp = await db.reference_persons.find_one({"id": r["reference_person_id"]}, {"_id": 0, "name": 1})
            r["reference_person_name"] = rp.get("name", "") if rp else ""
    return {"data": regs, "total": total, "page": page, "total_pages": max(1, math.ceil(total / per_page))}

@extra_router.get("/admin/guests/arrived")
async def get_arrived_guests(request: Request, search: str = "", page: int = 1, per_page: int = 50, status_filter: str = "all"):
    """Get arrived guests (arrived, partially_arrived, departed)"""
    await get_current_user(request)
    if status_filter == "arrived":
        query = {"approval_status": "approved", "arrival_status": {"$in": ["arrived", "partially_arrived"]}}
    elif status_filter == "departed":
        query = {"approval_status": "approved", "arrival_status": "departed"}
    else:
        query = {"approval_status": "approved", "arrival_status": {"$in": ["arrived", "partially_arrived", "departed"]}}
    if search:
        query["$or"] = [
            {"attendees.name": {"$regex": search, "$options": "i"}},
            {"primary_mobile": {"$regex": search, "$options": "i"}},
        ]
    total = await db.registrations.count_documents(query)
    skip = (page - 1) * per_page
    regs = await db.registrations.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(per_page).to_list(per_page)
    return {"data": regs, "total": total, "page": page, "total_pages": max(1, math.ceil(total / per_page))}

app.include_router(extra_router)

# ─── PHASE C/D/E ENDPOINTS ───
phase_router = APIRouter(prefix="/api")

@phase_router.get("/admin/swamsevak-dashboard")
async def swamsevak_dashboard(request: Request):
    """Consolidated operational view for a specific Swamsevak"""
    user = await get_current_user(request)
    name = user["name"]
    username = user["username"]
    is_super = user.get("role") == "superadmin"
    # Match by full name OR username (backward compatibility for old assignments stored as username)
    swamsevak_query = {"$or": [{"assigned_swamsevak": name}, {"assigned_swamsevak": username}]}
    # For superadmin, special_needs and other global views show ALL guests
    global_query: dict = {}
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    # My assigned guests
    assigned = await db.registrations.count_documents({**swamsevak_query, "approval_status": "approved"})
    # Departures today for my assigned
    departures_today = await db.registrations.find(
        {**swamsevak_query, "departure_date": now, "arrival_status": {"$in": ["arrived", "partially_arrived"]}},
        {"_id": 0, "id": 1, "attendees": 1, "group_head_id": 1, "departure_date": 1, "expected_departure_time": 1, "room_assignments": 1}
    ).to_list(50)
    dep_list = []
    for r in departures_today:
        head = ""
        for a in r.get("attendees", []):
            if a.get("id") == r.get("group_head_id"):
                head = a.get("name", "")
        dep_list.append({"id": r["id"], "head_name": head, "departure_time": r.get("expected_departure_time", ""),
                         "rooms": r.get("room_assignments", [])})
    # Special needs — superadmin sees ALL, volunteers see only their assigned guests
    if is_super:
        special_filter = {
            "approval_status": "approved",
            "$or": [{"family_special_request": {"$ne": ""}}, {"attendees.special_needs": {"$ne": ""}}]
        }
    else:
        # Use $and to combine swamsevak filter + special_needs filter without $or collision
        special_filter = {
            "approval_status": "approved",
            "$and": [
                swamsevak_query,
                {"$or": [{"family_special_request": {"$ne": ""}}, {"attendees.special_needs": {"$ne": ""}}]}
            ]
        }
    special = await db.registrations.find(
        special_filter,
        {"_id": 0, "id": 1, "attendees": 1, "group_head_id": 1, "family_special_request": 1, "room_assignments": 1}
    ).to_list(50)
    special_list = []
    for r in special:
        head = ""
        needs = []
        rooms_str = ", ".join(r.get("room_assignments", [])) or ""
        for a in r.get("attendees", []):
            if a.get("id") == r.get("group_head_id"):
                head = a.get("name", "")
            if a.get("special_needs"):
                needs.append({"person": a["name"], "need": a["special_needs"], "is_family": False, "room": rooms_str, "family_head": ""})
        if r.get("family_special_request"):
            needs.append({"person": head, "need": r["family_special_request"], "is_family": True, "room": rooms_str, "family_head": head})
        # Set family_head on individual needs
        for n in needs:
            if not n["is_family"]:
                n["family_head"] = head
        if needs:
            special_list.append({"id": r["id"], "head_name": head, "needs": needs, "rooms": r.get("room_assignments", [])})
    # My tickets (match by name or username)
    my_tickets = await db.tickets.count_documents({"$or": [{"assigned_to": name}, {"assigned_to": username}], "status": {"$in": ["open", "in_progress"]}})
    # My todos (match by name or username)
    my_todos = await db.todos.count_documents({"$or": [{"assigned_to": name}, {"assigned_to": username}, {"created_by": name}, {"created_by": username}], "completed": False})

    # Assigned guests list for popup
    assigned_guests_raw = await db.registrations.find(
        {**swamsevak_query, "approval_status": "approved"},
        {"_id": 0, "attendees": 1, "group_head_id": 1, "num_people": 1, "room_assignments": 1, "arrival_status": 1, "primary_mobile": 1, "id": 1}
    ).to_list(200)
    assigned_list = []
    for r in assigned_guests_raw:
        head = next((a["name"] for a in r.get("attendees", []) if a.get("id") == r.get("group_head_id")), r.get("primary_mobile", ""))
        assigned_list.append({"id": r["id"], "head_name": head, "num_people": r.get("num_people", 1), "rooms": r.get("room_assignments", []), "arrival_status": r.get("arrival_status", "")})

    # Todos list for popup
    todos_raw = await db.todos.find(
        {"$or": [{"assigned_to": name}, {"assigned_to": username}, {"created_by": name}, {"created_by": username}], "completed": False},
        {"_id": 0, "id": 1, "title": 1, "priority": 1, "due_date": 1, "assigned_to": 1}
    ).sort("created_at", -1).to_list(50)
    todos_list = [{"id": t.get("id", ""), "title": t.get("title", ""), "priority": t.get("priority", ""), "due_date": t.get("due_date", "")} for t in todos_raw]

    # Tickets list for popup
    tickets_raw = await db.tickets.find(
        {"$or": [{"assigned_to": name}, {"assigned_to": username}], "status": {"$in": ["open", "in_progress"]}},
        {"_id": 0, "id": 1, "description": 1, "priority": 1, "category": 1, "guest_name": 1, "status": 1}
    ).sort("created_at", -1).to_list(50)
    tickets_list = [{"id": t.get("id", ""), "description": t.get("description", ""), "priority": t.get("priority", ""), "category": t.get("category", ""), "guest": t.get("guest_name", ""), "status": t.get("status", "")} for t in tickets_raw]

    return {
        "assigned_guests": assigned,
        "assigned_guests_list": assigned_list,
        "departures_today": dep_list,
        "special_needs": special_list,
        "active_tickets": my_tickets,
        "tickets_list": tickets_list,
        "pending_todos": my_todos,
        "todos_list": todos_list,
    }

@phase_router.get("/admin/room-vacancy-forecast")
async def room_vacancy_forecast(request: Request):
    """Show near-future room vacancies based on departures"""
    await get_current_user(request)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    # Find upcoming departures in next 3 days
    upcoming = []
    for day_offset in range(0, 4):
        from datetime import timedelta as td
        target = (datetime.now(timezone.utc) + td(days=day_offset)).strftime("%Y-%m-%d")
        deps = await db.registrations.find(
            {"departure_date": target, "arrival_status": {"$in": ["arrived", "partially_arrived"]}, "room_assignments": {"$ne": []}},
            {"_id": 0, "id": 1, "room_assignments": 1, "group_head_id": 1, "attendees": 1, "departure_date": 1}
        ).to_list(100)
        for d in deps:
            head = ""
            for a in d.get("attendees", []):
                if a.get("id") == d.get("group_head_id"):
                    head = a.get("name", "")
            upcoming.append({"date": target, "rooms": d.get("room_assignments", []),
                             "head_name": head, "reg_id": d["id"]})
    return {"upcoming_vacancies": upcoming}

app.include_router(phase_router)

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
    await db.tickets.create_index("id", unique=True, sparse=True)
    await db.todos.create_index("id", unique=True, sparse=True)
    await db.message_templates.create_index("id", unique=True, sparse=True)
    await db.custom_fields.create_index("id", unique=True, sparse=True)

    # Seed default relation categories if empty
    cat_count = await db.relation_categories.count_documents({})
    if cat_count == 0:
        defaults = ["Friends", "In-laws Side", "Other Relatives", "Neighbors", "Business Associates", "Other"]
        for name in defaults:
            await db.relation_categories.insert_one({"id": str(uuid.uuid4()), "name": name, "description": "", "created_at": datetime.now(timezone.utc).isoformat()})
        logger.info(f"Seeded {len(defaults)} default relation categories")

    # Seed default message templates if empty
    tmpl_count = await db.message_templates.count_documents({})
    if tmpl_count == 0:
        for t in DEFAULT_TEMPLATES:
            await db.message_templates.insert_one({"id": str(uuid.uuid4()), **t, "enabled": True, "created_at": datetime.now(timezone.utc).isoformat(), "created_by": "System"})
        logger.info(f"Seeded {len(DEFAULT_TEMPLATES)} default message templates")

    logger.info("V2 startup complete")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
