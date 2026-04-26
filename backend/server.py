from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, Request, HTTPException, Query, UploadFile, File, Form
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.responses import StreamingResponse, Response, PlainTextResponse
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
import httpx
import asyncio
import base64
import json
import qrcode
import openpyxl

ROOT_DIR = Path(__file__).parent
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")
JWT_ALGORITHM = "HS256"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# V2: Only system-level super admin. All other admins managed via custom_admins in DB.
ADMIN_ACCOUNTS = {
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

async def require_admin_readable(request: Request):
    """Any authenticated admin (superadmin OR custom admin / swamsevak) can read.
    Use this on GET endpoints that should be visible in view-only mode to normal admins."""
    return await get_current_user(request)

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
    assigned_swamsevak_mobile: Optional[str] = None
    custom_field_values: Optional[dict] = None

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
    relation_categories: List[str] = []  # per-person relation category names
    rank: int = 100  # Lower rank = appears higher in the list (defaults new entries to 100)

class ReferencePersonUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    relation_categories: Optional[List[str]] = None
    rank: Optional[int] = None

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

# ─── WhatsApp Config & Helper (used by OTP + Notification modules) ───
WA_PHONE_ID = os.environ.get("WA_PHONE_NUMBER_ID", "")
WA_TOKEN = os.environ.get("WA_ACCESS_TOKEN", "")
WA_BIZ_ID = os.environ.get("WA_BUSINESS_ACCOUNT_ID", "")
WA_WEBHOOK_VERIFY = os.environ.get("WA_WEBHOOK_VERIFY_TOKEN", "")
WA_API_BASE = "https://graph.facebook.com/v21.0"

def normalize_phone_for_wa(phone: str) -> str:
    """Normalize a phone number for WhatsApp Cloud API (no + prefix, with country code).
    - Strips spaces, dashes, parentheses.
    - If starts with '+', returns the digits after '+' (assumes country code is present).
    - If 10 digits long, assumes India (+91) and prefixes '91'.
    - Otherwise, returns digits as-is (assumes country code is already included).
    This correctly handles UK (+44), US (+1), Indian (+91 or 10-digit), and any international number.
    """
    p = (phone or "").strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if p.startswith("+"):
        return p[1:]
    # Drop any stray leading zeros commonly prefixed (e.g., 07911... should be treated as needing country code)
    # BUT we don't auto-add a country code for unknown shapes — user must include it if not Indian 10-digit.
    if len(p) == 10 and p[:1] in ("6", "7", "8", "9"):
        return "91" + p
    return p

async def send_whatsapp_template(phone: str, template_name: str, language: str, body_params: list = None, header_media_url: str = None, header_type: str = None):
    """Send a WhatsApp template message via Meta Cloud API. Returns (success, wa_message_id_or_error)"""
    if not WA_PHONE_ID or not WA_TOKEN:
        return False, "WhatsApp API not configured"
    clean_phone = normalize_phone_for_wa(phone)

    components = []
    if header_media_url and header_type:
        media_key = header_type.lower()
        if media_key in ("image", "video", "document"):
            components.append({"type": "header", "parameters": [{"type": media_key, media_key: {"link": header_media_url}}]})
    if body_params:
        components.append({"type": "body", "parameters": [{"type": "text", "text": str(v)} for v in body_params]})

    payload = {
        "messaging_product": "whatsapp",
        "to": clean_phone,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": language},
        }
    }
    if components:
        payload["template"]["components"] = components

    try:
        async with httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.post(
                f"{WA_API_BASE}/{WA_PHONE_ID}/messages",
                headers={"Authorization": f"Bearer {WA_TOKEN}", "Content-Type": "application/json"},
                json=payload
            )
            data = resp.json()
            if resp.status_code == 200 and data.get("messages"):
                return True, data["messages"][0]["id"]
            else:
                err = data.get("error", {}).get("message", str(data))
                return False, err
    except Exception as e:
        return False, str(e)

# ─── OTP Endpoints (WhatsApp) ───
@api_router.post("/otp/send")
async def send_otp(body: OTPSendRequest):
    mobile = body.mobile.strip()
    if not mobile or len(mobile) < 10:
        raise HTTPException(status_code=400, detail="Invalid mobile number")
    otp_code = str(random.randint(100000, 999999))
    await db.otp_sessions.update_one(
        {"mobile": mobile},
        {"$set": {"mobile": mobile, "otp": otp_code, "created_at": datetime.now(timezone.utc).isoformat(), "verified": False, "attempts": 0}},
        upsert=True
    )
    # Send OTP via WhatsApp (template has body + URL button that both need the OTP code)
    clean_phone = normalize_phone_for_wa(mobile)

    payload = {
        "messaging_product": "whatsapp",
        "to": clean_phone,
        "type": "template",
        "template": {
            "name": "otp_verification",
            "language": {"code": "en"},
            "components": [
                {"type": "body", "parameters": [{"type": "text", "text": otp_code}]},
                {"type": "button", "sub_type": "url", "index": "0", "parameters": [{"type": "text", "text": otp_code}]}
            ]
        }
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.post(
                f"{WA_API_BASE}/{WA_PHONE_ID}/messages",
                headers={"Authorization": f"Bearer {WA_TOKEN}", "Content-Type": "application/json"},
                json=payload
            )
            data = resp.json()
            if resp.status_code == 200 and data.get("messages"):
                logger.info(f"[WhatsApp OTP] Sent OTP to {mobile}, wa_msg_id={data['messages'][0]['id']}")
                return {"message": "OTP sent successfully via WhatsApp"}
            else:
                err = data.get("error", {}).get("message", str(data))
                logger.error(f"[WhatsApp OTP] Failed to send OTP to {mobile}: {err}")
                raise HTTPException(status_code=500, detail="Failed to send OTP via WhatsApp. Please try again.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[WhatsApp OTP] Exception sending OTP to {mobile}: {e}")
        raise HTTPException(status_code=500, detail="Failed to send OTP via WhatsApp. Please try again.")

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
@api_router.get("/reference-tree/public")
async def get_reference_tree_public():
    """Returns the Panchariya family reference tree (flat node list + fallback)
    used by the public registration form's hierarchical picker."""
    try:
        ft_path = ROOT_DIR / "data" / "family_tree.json"
        with open(ft_path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception as e:
        logger.warning(f"[ReferenceTree] failed to load: {e}")
        raise HTTPException(status_code=500, detail="Reference tree unavailable")


@api_router.get("/reference-persons/public")
async def get_reference_persons_public():
    # Rank ASC (custom order set by super admin), then alphabetical as tiebreaker
    persons = await db.reference_persons.find({}, {"_id": 0}).sort([("rank", 1), ("name", 1)]).to_list(100)
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
    # Resolve volunteer mobile number if not already stored
    if reg.get("assigned_swamsevak") and not reg.get("assigned_swamsevak_mobile"):
        swam_name = reg["assigned_swamsevak"]
        # Check custom_admins by name or username
        swam = await db.custom_admins.find_one(
            {"$or": [{"name": swam_name}, {"username": swam_name}]},
            {"_id": 0, "mobile": 1}
        )
        if swam and swam.get("mobile"):
            reg["assigned_swamsevak_mobile"] = swam["mobile"]
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

    # Resolve group_head_id: if it matches a name (not a UUID), map it to the attendee's generated id
    resolved_head_id = reg.group_head_id
    if resolved_head_id:
        head_found = False
        for att in attendees_data:
            if att["id"] == resolved_head_id:
                head_found = True
                break
        if not head_found:
            # group_head_id is likely a name, resolve to the attendee id
            for att in attendees_data:
                if att.get("name", "").strip() == resolved_head_id.strip():
                    resolved_head_id = att["id"]
                    break

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
        "group_head_id": resolved_head_id,
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

    # ─── System trigger: registration_submitted (fire to guest's registered mobile) ───
    try:
        _group_head_name = ""
        for a in attendees_data:
            if a.get("id") == resolved_head_id:
                _group_head_name = a.get("name", "")
                break
        if not _group_head_name and attendees_data:
            _group_head_name = attendees_data[0].get("name", "")
        _trigger_vars = {
            "name": _group_head_name, "guest_name": _group_head_name,
            "shraddhalu_name": _group_head_name, "full_name": _group_head_name,
            "mobile": reg.primary_mobile, "phone": reg.primary_mobile,
            "num_people": str(reg.num_people), "members": str(reg.num_people),
            "arrival_date": arrival_date, "departure_date": departure_date,
            "registration_id": doc["id"][:8].upper(), "reg_id": doc["id"][:8].upper(),
            "_positional": [_group_head_name, str(reg.num_people), arrival_date],
        }
        await fire_system_trigger("registration_submitted", reg.primary_mobile, _trigger_vars)
    except Exception as e:
        logger.warning(f"[Trigger] registration_submitted failed: {e}")

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
    persons = await db.reference_persons.find({}, {"_id": 0}).sort([("rank", 1), ("name", 1)]).to_list(100)
    return persons

@api_router.post("/admin/reference-persons")
async def create_reference_person(body: ReferencePersonCreate, request: Request):
    user = await require_superadmin(request)
    doc = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "description": body.description,
        "relation_categories": [c.strip() for c in (body.relation_categories or []) if c.strip()],
        "rank": int(body.rank) if body.rank is not None else 100,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
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

    # ─── System triggers on arrival/departure transitions ───
    try:
        _primary_phone = reg.get("primary_mobile", "")
        _room = ""
        ra = reg.get("room_assignments") or []
        if ra:
            _room = (ra[0].get("room_code") if isinstance(ra[0], dict) else str(ra[0])) or ""
        _base_vars = {
            "name": head_name, "guest_name": head_name, "shraddhalu_name": head_name,
            "mobile": _primary_phone, "phone": _primary_phone,
            "room": _room, "room_code": _room, "room_no": _room,
            "_positional": [head_name, _room],
        }
        # arrival transitions → arrival_confirmed + guest_arrived (POC notify)
        if body.arrival_status in ("arrived", "partially_arrived") and old_status not in ("arrived", "partially_arrived"):
            await fire_system_trigger("arrival_confirmed", _primary_phone, _base_vars)
            _assigned_swamsevak_val = reg.get("assigned_swamsevak", "")
            if _assigned_swamsevak_val:
                # assigned_swamsevak may store a name OR username — try both
                _swam = await db.custom_admins.find_one({"username": _assigned_swamsevak_val}, {"_id": 0})
                if not _swam:
                    _swam = await db.custom_admins.find_one({"name": _assigned_swamsevak_val}, {"_id": 0})
                _swam_phone = (_swam.get("phone") or _swam.get("mobile") or "") if _swam else ""
                if _swam and _swam_phone:
                    _admin_vars = {
                        "swamsevak_name": _swam.get("name", ""), "sevak_name": _swam.get("name", ""),
                        "guest_name": head_name, "name": head_name,
                        "room": _room, "room_code": _room,
                        "mobile": _primary_phone, "guest_mobile": _primary_phone,
                        "_positional": [_swam.get("name", ""), head_name, _room],
                    }
                    await fire_system_trigger("guest_arrived", _swam_phone, _admin_vars)
        # departure transition → departure_marked
        if body.arrival_status == "departed" and old_status != "departed":
            await fire_system_trigger("departure_marked", _primary_phone, _base_vars)
    except Exception as e:
        logger.warning(f"[Trigger] arrival/departure trigger failed: {e}")

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

    # Attendee-level split: people physically present (individual arrival_status == "arrived")
    # vs. people absent (attendee.arrival_status in [not_arrived, not_coming] despite family having checked in)
    pipe_present = [
        {"$match": {"approval_status": "approved"}},
        {"$unwind": "$attendees"},
        {"$match": {"attendees.arrival_status": "arrived"}},
        {"$count": "total"},
    ]
    people_present = (await db.registrations.aggregate(pipe_present).to_list(1) or [{"total": 0}])[0].get("total", 0)
    pipe_absent = [
        {"$match": {"approval_status": "approved", "arrival_status": {"$in": ["arrived", "partially_arrived", "departed"]}}},
        {"$unwind": "$attendees"},
        {"$match": {"attendees.arrival_status": {"$in": ["not_arrived", "not_coming"]}}},
        {"$count": "total"},
    ]
    people_absent = (await db.registrations.aggregate(pipe_absent).to_list(1) or [{"total": 0}])[0].get("total", 0)

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
            "arrived": {"families": arrived_fam, "people": arrived_p, "people_present": people_present, "people_absent": people_absent},
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
    is_arrived_bucket = (bucket == "arrived")
    fields = ["id", "group_head", "primary_mobile", "additional_phone", "email", "num_people",
              "family_members", "arrival_date", "departure_date", "arrival_status",
              "attendance_intent", "assigned_swamsevak", "rooms", "admin_notes", "created_at"]
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction='ignore')
    writer.writeheader()
    for reg in regs:
        head_name = ""
        for att in reg.get("attendees", []):
            if att.get("id") == reg.get("group_head_id"):
                head_name = att.get("name", "")
                break
        if is_arrived_bucket:
            arrived_members = []
            not_arrived_members = []
            for att in reg.get("attendees", []):
                name = att.get("name", "")
                age = att.get("age", "")
                special = att.get("special_needs", "")
                is_head = att.get("id") == reg.get("group_head_id")
                att_status = att.get("arrival_status", "")
                parts = [name]
                if age:
                    parts.append(f"(Age:{age})")
                if special:
                    parts.append(f"[Special:{special}]")
                if is_head:
                    parts.append("[Head]")
                member_str = " ".join(parts)
                if att_status == "arrived":
                    arrived_members.append(member_str)
                else:
                    not_arrived_members.append(member_str)
            family_text_parts = []
            if arrived_members:
                family_text_parts.append("PRESENT: " + "; ".join(arrived_members))
            if not_arrived_members:
                family_text_parts.append("NOT PRESENT: " + "; ".join(not_arrived_members))
            family_text = " | ".join(family_text_parts) if family_text_parts else ""
        else:
            member_lines = []
            for att in reg.get("attendees", []):
                name = att.get("name", "")
                age = att.get("age", "")
                special = att.get("special_needs", "")
                is_head = att.get("id") == reg.get("group_head_id")
                parts = [name]
                if age:
                    parts.append(f"(Age:{age})")
                if special:
                    parts.append(f"[Special:{special}]")
                if is_head:
                    parts.append("[Head]")
                member_lines.append(" ".join(parts))
            family_text = "; ".join(member_lines)
        row = {k: reg.get(k, "") for k in fields}
        row["group_head"] = head_name
        row["rooms"] = ", ".join(reg.get("room_assignments", []))
        row["family_members"] = family_text
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
        is_arrived_bucket = (bucket == "arrived")
        pdf.cell(0, 10, f"{title} - Katha 2026", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.set_font("Helvetica", "", 8)
        pdf.cell(0, 6, f"Generated: {datetime.now(timezone.utc).strftime('%d %b %Y %H:%M UTC')}", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(5)
        regs = await db.registrations.find(query, {"_id": 0}).sort("created_at", -1).to_list(5000)
        headers = ["#", "Group Head", "Ppl", "Arrival", "Departure", "Rooms", "Status", "Mobile", "Family Members"]
        col_w = [10, 40, 14, 26, 26, 28, 26, 34, 73]
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_fill_color(230, 230, 230)
        for i, h in enumerate(headers):
            pdf.cell(col_w[i], 8, h, border=1, align="C", fill=True)
        pdf.ln()
        pdf.set_font("Helvetica", "", 7)
        for idx, reg in enumerate(regs, 1):
            head_name = ""
            for att in reg.get("attendees", []):
                if att.get("id") == reg.get("group_head_id"):
                    head_name = att.get("name", "")
                    break
            rooms_str = ", ".join(reg.get("room_assignments", [])) or "-"
            # Build family members text
            if is_arrived_bucket:
                arrived_parts = []
                not_arrived_parts = []
                for att in reg.get("attendees", []):
                    nm = att.get("name", "")
                    age = att.get("age", "")
                    special = att.get("special_needs", "")
                    is_head = att.get("id") == reg.get("group_head_id")
                    desc = nm
                    if age:
                        desc += f"({age})"
                    if special:
                        desc += f"[{special}]"
                    if is_head:
                        desc += "*"
                    if att.get("arrival_status") == "arrived":
                        arrived_parts.append(desc)
                    else:
                        not_arrived_parts.append(desc)
                fam_lines = []
                if arrived_parts:
                    fam_lines.append("Present: " + ", ".join(arrived_parts))
                if not_arrived_parts:
                    fam_lines.append("Not Present: " + ", ".join(not_arrived_parts))
                family_str = " | ".join(fam_lines)
            else:
                member_parts = []
                for att in reg.get("attendees", []):
                    nm = att.get("name", "")
                    age = att.get("age", "")
                    special = att.get("special_needs", "")
                    is_head = att.get("id") == reg.get("group_head_id")
                    desc = nm
                    if age:
                        desc += f"({age})"
                    if special:
                        desc += f"[{special}]"
                    if is_head:
                        desc += "*"
                    member_parts.append(desc)
                family_str = ", ".join(member_parts)
            # Truncate for cell display
            family_display = family_str[:55] + "..." if len(family_str) > 58 else family_str
            vals = [str(idx), (head_name or reg.get("primary_mobile", ""))[:20], str(reg.get("num_people", 1)), reg.get("arrival_date", "")[-5:], reg.get("departure_date", "")[-5:], rooms_str[:12], reg.get("arrival_status", "")[:10], reg.get("primary_mobile", ""), family_display]
            for i, v in enumerate(vals):
                pdf.cell(col_w[i], 7, str(v), border=1, align="C" if i < 8 else "L")
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
    # All admin roles can see the admin list (needed for guest assignment section)
    await get_current_user(request)
    admins = []
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
    title: str = ""
    description: str = ""
    category: str = "other"
    priority: str = "low"
    source_type: str = "admin"
    source_registration_id: str = ""
    assigned_to: str = ""
    resolution_time_minutes: int = 30
    guest_name: str = ""
    guest_mobile: str = ""

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
    # 15 services from the WA Flow JSON — category IDs MUST match Flow's service_type IDs
    {"id": "drinking_water", "label": "Drinking Water", "group": "stay_essentials", "priority": "medium", "sla_minutes": 15},
    {"id": "tea_coffee", "label": "Tea / Coffee (On Availability)", "group": "food_beverages", "priority": "low", "sla_minutes": 30},
    {"id": "daily_items", "label": "Daily Items (Soap, Shampoo)", "group": "stay_essentials", "priority": "low", "sla_minutes": 30},
    {"id": "first_aid", "label": "First Aid Box", "group": "medical", "priority": "high", "sla_minutes": 10},
    {"id": "medicines", "label": "Medicines (Headache / Cold / Fever)", "group": "medical", "priority": "high", "sla_minutes": 15},
    {"id": "medical_emergency", "label": "Medical Emergency", "group": "medical", "priority": "high", "sla_minutes": 5},
    {"id": "extra_meal", "label": "Extra Meal Request", "group": "food_beverages", "priority": "low", "sla_minutes": 45},
    {"id": "room_cleaning", "label": "Room Cleaning", "group": "housekeeping", "priority": "medium", "sla_minutes": 30},
    {"id": "washroom_cleaning", "label": "Washroom Cleaning", "group": "housekeeping", "priority": "medium", "sla_minutes": 30},
    {"id": "garbage_pickup", "label": "Garbage Pickup", "group": "housekeeping", "priority": "low", "sla_minutes": 45},
    {"id": "room_issue", "label": "Room Issue (Electricity / Water)", "group": "housekeeping", "priority": "high", "sla_minutes": 20},
    {"id": "bedding", "label": "Bedding / Blanket / Pillow", "group": "stay_essentials", "priority": "medium", "sla_minutes": 30},
    {"id": "mosquito_pest", "label": "Mosquito / Pest Control", "group": "stay_essentials", "priority": "medium", "sla_minutes": 30},
    {"id": "lost_found", "label": "Lost & Found", "group": "other", "priority": "medium", "sla_minutes": 60},
    {"id": "other_request", "label": "Other Request", "group": "other", "priority": "low", "sla_minutes": 45},
]

async def seed_ticket_categories():
    """Seed default categories on startup if the collection is empty."""
    if await db.ticket_categories.count_documents({}) == 0:
        for c in TICKET_CATEGORIES:
            await db.ticket_categories.insert_one({**c, "is_active": True, "is_default": True})
        logger.info(f"Seeded {len(TICKET_CATEGORIES)} ticket categories")

async def get_categories():
    """Read categories from DB, fall back to hardcoded defaults if empty."""
    rows = await db.ticket_categories.find({"is_active": True}, {"_id": 0}).sort("label", 1).to_list(200)
    return rows or TICKET_CATEGORIES

@api_router.get("/admin/tickets/categories")
async def get_ticket_categories(request: Request):
    await get_current_user(request)
    return await get_categories()

class CategoryCreate(BaseModel):
    id: str
    label: str
    group: Optional[str] = "other"
    priority: str = "low"
    sla_minutes: int = 30
    is_active: Optional[bool] = True

class CategoryUpdate(BaseModel):
    label: Optional[str] = None
    group: Optional[str] = None
    priority: Optional[str] = None
    sla_minutes: Optional[int] = None
    is_active: Optional[bool] = None

@api_router.post("/admin/tickets/categories")
async def create_category(body: CategoryCreate, request: Request):
    user = await require_superadmin(request)
    cid = body.id.strip().lower().replace(" ", "_")
    if not cid:
        raise HTTPException(status_code=400, detail="id is required")
    if body.priority not in ("low", "medium", "high"):
        raise HTTPException(status_code=400, detail="priority must be low/medium/high")
    existing = await db.ticket_categories.find_one({"id": cid})
    if existing:
        raise HTTPException(status_code=400, detail=f"Category '{cid}' already exists")
    doc = {
        "id": cid, "label": body.label.strip(), "group": (body.group or "other").strip() or "other",
        "priority": body.priority, "sla_minutes": max(1, int(body.sla_minutes)),
        "is_active": bool(body.is_active), "is_default": False,
    }
    await db.ticket_categories.insert_one(doc)
    await log_audit("category_create", "ticket_category", cid, body.label, "Category created", user["name"])
    return doc

@api_router.put("/admin/tickets/categories/{cid}")
async def update_category(cid: str, body: CategoryUpdate, request: Request):
    user = await require_superadmin(request)
    updates = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if "priority" in updates and updates["priority"] not in ("low", "medium", "high"):
        raise HTTPException(status_code=400, detail="priority must be low/medium/high")
    if "sla_minutes" in updates:
        updates["sla_minutes"] = max(1, int(updates["sla_minutes"]))
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    result = await db.ticket_categories.update_one({"id": cid}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    await log_audit("category_update", "ticket_category", cid, "", f"Updated: {list(updates.keys())}", user["name"])
    return {"message": "Updated"}

@api_router.delete("/admin/tickets/categories/{cid}")
async def delete_category(cid: str, request: Request):
    user = await require_superadmin(request)
    existing = await db.ticket_categories.find_one({"id": cid})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    if existing.get("is_default"):
        raise HTTPException(status_code=400, detail="Cannot delete a default seeded category. Disable it instead.")
    await db.ticket_categories.delete_one({"id": cid})
    await log_audit("category_delete", "ticket_category", cid, existing.get("label", ""), "Category deleted", user["name"])
    return {"message": "Deleted"}

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
    cats = await get_categories()
    cat = next((c for c in cats if c["id"] == body.category), None)
    sla = body.resolution_time_minutes or (cat["sla_minutes"] if cat else 30)
    # Auto-generate title from guest_name + category if title not provided
    title = body.title.strip() if body.title.strip() else f"{body.guest_name or 'Guest'} — {cat['label'] if cat else body.category}"
    doc = {
        "id": str(uuid.uuid4()),
        "title": title,
        "description": body.description,
        "category": body.category,
        "category_label": cat["label"] if cat else body.category,
        "priority": body.priority or (cat["priority"] if cat else "low"),
        "status": "open",
        "source_type": body.source_type,
        "source_registration_id": body.source_registration_id,
        "guest_name": body.guest_name,
        "guest_mobile": body.guest_mobile,
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
    await log_audit("ticket_create", "ticket", doc["id"], title, f"Ticket created: {body.category} ({body.priority})", user["name"])
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

    # ─── System trigger: help_ticket_response (when a note/response was added) ───
    try:
        _new_notes = (updates.get("notes") or "").strip()
        _old_notes = (ticket.get("notes") or "").strip()
        if _new_notes and _new_notes != _old_notes:
            _phone = ticket.get("guest_mobile", "")
            if _phone:
                _vars = {
                    "name": ticket.get("guest_name", ""), "guest_name": ticket.get("guest_name", ""),
                    "ticket_id": ticket_id[:8].upper(),
                    "response": _new_notes[:300], "reply": _new_notes[:300], "message": _new_notes[:300],
                    "service": ticket.get("category_label") or ticket.get("category", ""),
                    "responder_name": user.get("name", ""), "sevak_name": user.get("name", ""),
                    "_positional": [ticket.get("guest_name", ""), ticket_id[:8].upper(), _new_notes[:300]],
                }
                await fire_system_trigger("help_ticket_response", _phone, _vars)
    except Exception as e:
        logger.warning(f"[Trigger] help_ticket_response failed: {e}")

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
    # Session 4B: fire HC ticket-resolved system trigger (notifies guest)
    try:
        resolved_ticket = {**ticket, "resolved_by_name": user["name"], "closing_note": body.closing_note}
        await fire_hc_ticket_resolved(resolved_ticket)
    except Exception as e:
        logger.warning(f"[HC Trigger] fire_hc_ticket_resolved failed: {e}")
    return {"message": "Ticket resolved"}

@api_router.delete("/admin/tickets/{ticket_id}")
async def delete_ticket(ticket_id: str, request: Request):
    """Super admin only — permanently delete a Help Centre ticket."""
    user = await require_superadmin(request)
    ticket = await db.tickets.find_one({"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    await db.tickets.delete_one({"id": ticket_id})
    await log_audit("ticket_delete", "ticket", ticket_id, ticket.get("title", "") or ticket.get("guest_name", ""),
                    f"Deleted ticket (status={ticket.get('status')}, category={ticket.get('category')})", user["name"])
    return {"message": "Ticket deleted"}

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
        # Non-superadmin cannot delete recurring tasks
        if todo.get("is_recurring"):
            raise HTTPException(status_code=403, detail="Cannot delete recurring tasks")
        # Non-superadmin cannot delete tasks created by super admin
        creator_username = todo.get("created_by", "")
        creator_role = todo.get("created_by_role", "")
        if creator_role == "superadmin":
            raise HTTPException(status_code=403, detail="Cannot delete tasks created by Super Admin")
        # Also check ADMIN_ACCOUNTS and custom_admins for creator role
        if creator_username in ADMIN_ACCOUNTS and ADMIN_ACCOUNTS[creator_username].get("role") == "superadmin":
            raise HTTPException(status_code=403, detail="Cannot delete tasks created by Super Admin")
        creator_custom = await db.custom_admins.find_one({"username": creator_username}, {"_id": 0, "role": 1})
        if creator_custom and creator_custom.get("role") == "superadmin":
            raise HTTPException(status_code=403, detail="Cannot delete tasks created by Super Admin")
        # Non-superadmin can only delete their own tasks
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
    user = await require_admin_readable(request)
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
    user = await require_admin_readable(request)
    total = await db.message_campaigns.count_documents({})
    skip = (page - 1) * per_page
    campaigns = await db.message_campaigns.find({}, {"_id": 0}).sort("sent_at", -1).skip(skip).limit(per_page).to_list(per_page)
    return {"data": campaigns, "total": total, "page": page, "total_pages": max(1, math.ceil(total / per_page))}

# ═══════════════════════════════════════════════════════════════
# NOTIFICATION MANAGEMENT MODULE (Phase 1)
# ═══════════════════════════════════════════════════════════════
# (WA config + send_whatsapp_template moved above OTP section)

# ─── Webhook Endpoints ───
# Meta sends GET to verify, POST for events. Also handle HEAD for infra probes.

async def run_flow_keyword_matcher(from_number: str, text: str):
    """Match incoming WhatsApp text against active wa_flow_configs trigger_keywords.
    If matched, send the configured template (with Flow CTA) to the user, minting a fresh
    flow_token bound to their phone so the Flow submission can resolve who they are."""
    try:
        incoming = (text or "").strip().lower()
        if not incoming:
            return
        flows = await db.wa_flow_configs.find({"is_active": True}, {"_id": 0}).to_list(200)
        matched = None
        matched_kw = ""
        for f in flows:
            keywords = [str(k).strip().lower() for k in (f.get("trigger_keywords") or []) if str(k).strip()]
            for kw in keywords:
                if incoming == kw or kw in incoming.split():
                    matched = f
                    matched_kw = kw
                    break
            if matched:
                break
        if not matched:
            return
        tmpl_name = (matched.get("keyword_template_name") or "").strip()
        if not tmpl_name:
            logger.warning(f"[FlowKeyword] keyword '{matched_kw}' matched flow '{matched.get('flow_name')}' but no keyword_template_name configured — nothing to send")
            return
        lang = (matched.get("keyword_template_language") or "en").strip() or "en"
        flow_id = str(matched.get("flow_id") or "").strip()
        logger.info(f"[FlowKeyword] matched '{matched_kw}' → sending template '{tmpl_name}' with flow CTA to {from_number}")
        ok, result, flow_token = await send_wa_flow_template(
            phone=from_number, template_name=tmpl_name, language=lang,
            flow_id=flow_id, flow_cta_text="Open",
        )
        try:
            await ensure_conversation(from_number, "", "flow_keyword")
            conv_phone = normalize_phone_for_wa(from_number)
            now_iso = datetime.now(timezone.utc).isoformat()
            await db.wa_conversations.update_one({"phone": conv_phone}, {
                "$push": {"messages": {
                    "id": str(uuid.uuid4()), "direction": "outgoing",
                    "text": f"[Flow CTA · keyword='{matched_kw}' · template={tmpl_name}]",
                    "msg_type": "template_flow",
                    "wa_message_id": result if ok else "",
                    "flow_token": flow_token,
                    "timestamp": now_iso, "status": "sent" if ok else "failed",
                    "error_message": "" if ok else str(result),
                }},
                "$set": {"last_message": f"[Flow CTA · {tmpl_name}]", "last_message_at": now_iso}
            })
        except Exception as e:
            logger.warning(f"[FlowKeyword] conv persist failed: {e}")
    except Exception as e:
        logger.exception(f"[FlowKeyword] matcher crashed: {e}")

async def run_auto_response_matcher(from_number: str, text: str):
    """Match incoming WhatsApp text against active auto-response rules and fire the step chain."""
    try:
        incoming = (text or "").strip().lower()
        if not incoming:
            return
        rules = await db.wa_auto_responses.find({"is_active": True}, {"_id": 0}).to_list(200)
        matched = None
        for r in rules:
            phrase = (r.get("trigger_phrase") or "").strip().lower()
            if not phrase:
                continue
            if r.get("match_type", "exact") == "exact":
                if incoming == phrase:
                    matched = r
                    break
            else:  # contains
                if phrase in incoming:
                    matched = r
                    break
        if not matched:
            return

        run_id = str(uuid.uuid4())
        await db.wa_auto_response_runs.insert_one({
            "id": run_id,
            "rule_id": matched["id"],
            "trigger_phrase": matched.get("trigger_phrase", ""),
            "phone": from_number,
            "incoming_text": text,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "steps_results": [],
        })

        logger.info(f"[AutoResponse] Match: phrase='{matched['trigger_phrase']}' phone={from_number} rule={matched['id']}")

        # Fire steps sequentially, honoring per-step delay
        for idx, step in enumerate(matched.get("steps", [])):
            delay = max(0, int(step.get("delay_seconds", 0) or 0))
            if delay > 0:
                await asyncio.sleep(delay)
            tid = step.get("template_id", "")
            tmpl = await db.wa_templates.find_one({"id": tid}, {"_id": 0})
            if not tmpl:
                await db.wa_auto_response_runs.update_one({"id": run_id}, {"$push": {"steps_results": {
                    "step_index": idx, "template_id": tid, "status": "skipped",
                    "error": "template not found", "at": datetime.now(timezone.utc).isoformat(),
                }}})
                continue
            meta_name = tmpl.get("meta_template_name", "")
            language = tmpl.get("language", "en") or "en"
            if not meta_name:
                await db.wa_auto_response_runs.update_one({"id": run_id}, {"$push": {"steps_results": {
                    "step_index": idx, "template_id": tid, "status": "skipped",
                    "error": "template has no meta_template_name", "at": datetime.now(timezone.utc).isoformat(),
                }}})
                continue
            # Session 4B: If this step is marked as a Flow CTA step, mint a flow_token and send flow-template
            step_flow_id = str(step.get("flow_id", "") or tmpl.get("flow_id", "") or "").strip()
            is_flow_step = bool(step.get("is_flow_step") or tmpl.get("is_flow_template") or step_flow_id)
            if is_flow_step:
                ok, result, flow_token = await send_wa_flow_template(
                    phone=from_number,
                    template_name=meta_name,
                    language=language,
                    flow_id=step_flow_id,
                    flow_cta_text=step.get("flow_cta_text", "Open"),
                )
                await db.wa_auto_response_runs.update_one({"id": run_id}, {"$push": {"steps_results": {
                    "step_index": idx, "template_id": tid, "meta_template_name": meta_name,
                    "status": "sent" if ok else "failed",
                    "wa_message_id": result if ok else "",
                    "flow_token": flow_token,
                    "error": "" if ok else str(result),
                    "at": datetime.now(timezone.utc).isoformat(),
                }}})
                if not ok:
                    continue
                # Persist outgoing message in conversation (Flow-CTA)
                try:
                    now_iso = datetime.now(timezone.utc).isoformat()
                    await ensure_conversation(from_number, "", "auto_response")
                    conv_phone = normalize_phone_for_wa(from_number)
                    await db.wa_conversations.update_one({"phone": conv_phone}, {
                        "$push": {"messages": {
                            "id": str(uuid.uuid4()), "direction": "outgoing",
                            "text": f"[Flow CTA sent · template: {meta_name}]",
                            "msg_type": "template_flow", "wa_message_id": result,
                            "flow_token": flow_token,
                            "timestamp": now_iso, "status": "sent",
                        }},
                        "$set": {"last_message": f"[Flow CTA · {meta_name}]", "last_message_at": now_iso}
                    })
                except Exception as e:
                    logger.warning(f"[AutoResponse] conv persist failed for flow step: {e}")
                continue
            ok, result = await send_whatsapp_template(
                phone=from_number,
                template_name=meta_name,
                language=language,
                body_params=None,
                header_media_url=tmpl.get("header_media_url") or None,
                header_type=tmpl.get("header_type") or None,
            )
            await db.wa_auto_response_runs.update_one({"id": run_id}, {"$push": {"steps_results": {
                "step_index": idx, "template_id": tid, "meta_template_name": meta_name,
                "status": "sent" if ok else "failed",
                "wa_message_id": result if ok else "",
                "error": "" if ok else str(result),
                "at": datetime.now(timezone.utc).isoformat(),
            }}})
            if ok:
                # Persist outgoing message in conversation
                try:
                    now_iso = datetime.now(timezone.utc).isoformat()
                    msg_doc = {
                        "id": str(uuid.uuid4()), "direction": "outgoing",
                        "text": f"[template: {meta_name}]", "msg_type": "template",
                        "wa_message_id": result, "timestamp": now_iso,
                        "status": "sent", "sent_by": "AutoResponse",
                    }
                    await db.wa_conversations.update_one({"phone": from_number}, {
                        "$push": {"messages": msg_doc},
                        "$set": {"last_message": f"[auto: {meta_name}]", "last_message_at": now_iso},
                    })
                except Exception as e:
                    logger.warning(f"[AutoResponse] Conversation log failed: {e}")
                logger.info(f"[AutoResponse] Step {idx} sent template='{meta_name}' wa_msg_id={result}")
            else:
                logger.error(f"[AutoResponse] Step {idx} failed template='{meta_name}': {result}")

        await db.wa_auto_response_runs.update_one({"id": run_id}, {"$set": {
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }})
    except Exception as e:
        logger.exception(f"[AutoResponse] Matcher crashed: {e}")

async def _check_auto_response_match(text: str) -> bool:
    """Quick check: does any active auto-response rule match this text? (No side effects.)"""
    incoming = (text or "").strip().lower()
    if not incoming:
        return False
    rules = await db.wa_auto_responses.find({"is_active": True}, {"_id": 0}).to_list(200)
    for r in rules:
        phrase = (r.get("trigger_phrase") or "").strip().lower()
        if not phrase:
            continue
        if r.get("match_type", "exact") == "exact":
            if incoming == phrase:
                return True
        else:
            if phrase in incoming:
                return True
    return False

async def trigger_help_center_flow(from_number: str):
    """Trigger the active Help Center flow for a user whose message didn't match any auto-response.
    Sends the configured flow template so the user gets the WA Flow CTA."""
    try:
        flow = await db.wa_flow_configs.find_one({"is_active": True}, {"_id": 0})
        if not flow:
            logger.info(f"[HCFlow] No active flow config — cannot trigger flow for {from_number}")
            return
        tmpl_name = (flow.get("keyword_template_name") or "").strip()
        if not tmpl_name:
            logger.warning(f"[HCFlow] Active flow '{flow.get('flow_name')}' has no keyword_template_name — cannot send")
            return
        lang = (flow.get("keyword_template_language") or "en").strip() or "en"
        flow_id = str(flow.get("flow_id") or "").strip()
        logger.info(f"[HCFlow] Triggering Help Center flow for {from_number} — template='{tmpl_name}' flow_id={flow_id}")
        ok, result, flow_token = await send_wa_flow_template(
            phone=from_number, template_name=tmpl_name, language=lang,
            flow_id=flow_id, flow_cta_text="Open",
        )
        # Persist outgoing message in conversation
        try:
            await ensure_conversation(from_number, "", "help_center_flow")
            conv_phone = normalize_phone_for_wa(from_number)
            now_iso = datetime.now(timezone.utc).isoformat()
            err_text = "" if ok else str(result)
            await db.wa_conversations.update_one({"phone": conv_phone}, {
                "$push": {"messages": {
                    "id": str(uuid.uuid4()), "direction": "outgoing",
                    "text": (
                        f"[Help Center Flow sent · template: {tmpl_name}]"
                        if ok
                        else f"[Help Center Flow FAILED · template: {tmpl_name} · err: {err_text[:200]}]"
                    ),
                    "msg_type": "template_flow",
                    "wa_message_id": result if ok else "",
                    "flow_token": flow_token,
                    "timestamp": now_iso, "status": "sent" if ok else "failed",
                    "error_message": err_text,
                }},
                "$set": {"last_message": f"[Help Center Flow · {tmpl_name}]", "last_message_at": now_iso}
            })
        except Exception as e:
            logger.warning(f"[HCFlow] conversation persist failed: {e}")
        if ok:
            logger.info(f"[HCFlow] Flow template sent to {from_number}, flow_token={flow_token}")
        else:
            logger.error(f"[HCFlow] Failed to send flow to {from_number}: {result}")
    except Exception as e:
        logger.exception(f"[HCFlow] trigger crashed: {e}")

async def _handle_flow_completion(from_number: str, response_json_str: str, nfm_data: dict):
    """Handle flow completion (nfm_reply) from SUMMARY_SUBMIT's complete action.
    Extracts guest data, creates ticket, fires triggers.

    IMPORTANT: If the submitter is NOT in the arrived-guest list, we REJECT the request
    outright — we fire ONLY the `hc_flow_not_on_premise` template and do NOT create a
    ticket and do NOT notify a swayamsevak.
    """
    try:
        # Parse the response_json (it's a JSON string from Meta)
        if isinstance(response_json_str, str) and response_json_str.strip():
            try:
                flow_payload = json.loads(response_json_str)
            except json.JSONDecodeError:
                flow_payload = nfm_data
        else:
            flow_payload = nfm_data

        logger.info(f"[FlowComplete] Processing flow completion from {from_number}: keys={list(flow_payload.keys())}")

        # Extract fields (new JSON sends category, request_type, additional_details, *_title, flow_name)
        category = (flow_payload.get("category") or "").strip()
        category_title = (flow_payload.get("category_title") or "").strip()
        request_type = (flow_payload.get("request_type") or "").strip()
        request_type_title = (flow_payload.get("request_type_title") or "").strip()
        additional_details = (flow_payload.get("additional_details") or "").strip()

        if not request_type and not category:
            logger.warning(f"[FlowComplete] No category/request_type in payload — skipping ticket creation")
            return

        # ── Arrived-guest gate (HARD REJECT when not on premise) ──
        reg, arrived_status = await _find_arrived_guest_by_phone(from_number)
        if arrived_status != "on_premise":
            logger.info(
                f"[FlowComplete] REJECT ticket — submitter {from_number} is not on premise "
                f"(status={arrived_status}). Firing hc_flow_not_on_premise only, NO ticket created."
            )
            # Fire ONLY the not-on-premise template. No ticket, no swayamsevak ping.
            try:
                guest_name_reject = (reg.get("primary_guest_name") if reg else "") or "Guest"
                _cat_hr = category_title or category or "-"
                _req_hr = request_type_title or request_type or "-"
                await fire_system_trigger(
                    "hc_flow_not_on_premise",
                    from_number,
                    {
                        "guest_name": guest_name_reject,
                        "name": guest_name_reject,
                        "service_type": _req_hr or _cat_hr,
                        "category": _cat_hr,
                        "category_title": _cat_hr,
                        "request_type": _req_hr,
                        "request_type_title": _req_hr,
                        "additional_details": additional_details or "-",
                        "details": additional_details or "-",
                        "description": additional_details or "-",
                        "arrived_status": arrived_status,
                    },
                )
            except Exception as e:
                logger.warning(f"[FlowComplete] hc_flow_not_on_premise fire failed: {e}")
            # Log the rejection in conversation so the admin view has a trace
            try:
                conv_phone = normalize_phone_for_wa(from_number)
                now_iso = datetime.now(timezone.utc).isoformat()
                await db.wa_conversations.update_one({"phone": conv_phone}, {
                    "$push": {"messages": {
                        "id": str(uuid.uuid4()), "direction": "incoming",
                        "text": f"[Flow rejected — not on premise] {category_title or category}: {request_type_title or request_type}",
                        "msg_type": "flow_submission_rejected",
                        "timestamp": now_iso, "status": "received",
                    }},
                    "$set": {"last_message": "[Flow rejected — not on premise]", "last_message_at": now_iso},
                })
            except Exception as e:
                logger.warning(f"[FlowComplete] reject-log persist failed: {e}")
            return

        # ── On-premise path: create the ticket, notify swayamsevak ──
        # service_type is the category id used for SLA/priority lookup in _create_ticket_from_flow.
        service_type = request_type or category or "other_request"
        description = additional_details or ""
        # room_or_location comes from the guest's registration, not from the Flow payload.
        room_location = ""
        if reg:
            ra = reg.get("room_assignments") or []
            if ra:
                first = ra[0]
                room_location = first.get("room_code") if isinstance(first, dict) else str(first)
        guest_name = ""
        if reg:
            guest_name = reg.get("primary_guest_name", "") or reg.get("head_name", "") or ""
            if not guest_name:
                for att in reg.get("attendees", []):
                    if att.get("id") == reg.get("group_head_id"):
                        guest_name = att.get("name", "")
                        break

        ticket, _reg, arrived_status2 = await _create_ticket_from_flow(
            from_number, service_type, category, room_location, description
        )
        logger.info(
            f"[FlowComplete] Ticket created: id={ticket['id']} cat={service_type} "
            f"guest={guest_name} room={room_location or '-'} phone={from_number}"
        )

        # Enrich the ticket object (in-memory only) with the friendly titles so that
        # the confirmation template can show readable labels instead of raw ids.
        ticket["_category_title"] = category_title or category
        ticket["_request_type_title"] = request_type_title or request_type
        ticket["_additional_details"] = additional_details

        # Fire HC system triggers (captured + POC)
        try:
            await fire_hc_flow_outcome(from_number, arrived_status2, ticket)
        except Exception as e:
            logger.warning(f"[FlowComplete] fire_hc_flow_outcome failed: {e}")

        # Log in conversation
        try:
            conv_phone = normalize_phone_for_wa(from_number)
            now_iso = datetime.now(timezone.utc).isoformat()
            msg_doc = {
                "id": str(uuid.uuid4()), "direction": "incoming",
                "text": (
                    f"[Flow Submitted] {guest_name or 'Guest'} — "
                    f"{category_title or category}: {request_type_title or request_type}. "
                    f"Details: {additional_details or '-'}"
                ),
                "msg_type": "flow_submission",
                "timestamp": now_iso, "status": "received",
            }
            await db.wa_conversations.update_one({"phone": conv_phone}, {
                "$push": {"messages": msg_doc},
                "$set": {
                    "last_message": f"[Flow: {request_type_title or request_type}]",
                    "last_message_at": now_iso,
                },
            })
        except Exception as e:
            logger.warning(f"[FlowComplete] conv log failed: {e}")

    except Exception as e:
        logger.exception(f"[FlowComplete] handler crashed: {e}")

@api_router.get("/webhooks/whatsapp")
@api_router.head("/webhooks/whatsapp")
async def whatsapp_webhook_verify(request: Request):
    """Meta webhook verification — returns challenge as plain text"""
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    logger.info(f"[WA Webhook Verify] mode={mode!r} token_received={token!r} expected={WA_WEBHOOK_VERIFY!r} match={token == WA_WEBHOOK_VERIFY} challenge={challenge!r} UA={request.headers.get('user-agent','')[:80]}")
    if mode == "subscribe" and token == WA_WEBHOOK_VERIFY:
        return PlainTextResponse(content=str(challenge), status_code=200)
    # If no verification params, return 200 for health checks
    if not mode and not token:
        return PlainTextResponse(content="ok", status_code=200)
    raise HTTPException(status_code=403, detail="Verification failed")

@api_router.post("/webhooks/whatsapp")
async def whatsapp_webhook_receive(request: Request):
    """Receive status updates AND incoming messages from Meta"""
    try:
        body = await request.json()
    except Exception:
        return {"status": "ok"}
    entries = body.get("entry", [])
    for entry in entries:
        for change in entry.get("changes", []):
            value = change.get("value", {})

            # ─── Handle incoming messages ───
            messages = value.get("messages", [])
            contacts = value.get("contacts", [])
            contact_map = {}
            for c in contacts:
                waid = c.get("wa_id", "")
                profile = c.get("profile", {})
                contact_map[waid] = profile.get("name", "")

            for msg in messages:
                from_number = msg.get("from", "")
                msg_id = msg.get("id", "")
                msg_ts = msg.get("timestamp", "")
                msg_type = msg.get("type", "text")
                text_body = ""
                if msg_type == "text":
                    text_body = msg.get("text", {}).get("body", "")
                elif msg_type == "button":
                    text_body = msg.get("button", {}).get("text", "")
                elif msg_type == "interactive":
                    ir = msg.get("interactive", {})
                    ir_type = ir.get("type", "")
                    # Handle flow completion (nfm_reply)
                    if ir_type == "nfm_reply":
                        nfm_data = ir.get("nfm_reply", {})
                        flow_response = nfm_data.get("response_json", "") or nfm_data.get("body", "")
                        text_body = "[Flow submission received]"
                        # Mark this so the fallback router below does NOT treat a completed
                        # flow as a "user typed something" event and re-send the template.
                        msg_type = "flow_submission"
                        # Process flow completion in background
                        asyncio.create_task(_handle_flow_completion(from_number, flow_response, nfm_data))
                    else:
                        text_body = ir.get("button_reply", {}).get("title", "") or ir.get("list_reply", {}).get("title", "")
                else:
                    text_body = f"[{msg_type} message]"

                contact_name = contact_map.get(from_number, "")
                now_iso = datetime.now(timezone.utc).isoformat()

                # Store in wa_webhook_events
                await db.wa_webhook_events.insert_one({
                    "id": str(uuid.uuid4()), "wa_message_id": msg_id,
                    "event_type": "incoming", "timestamp": msg_ts, "error_message": "",
                    "raw": msg, "received_at": now_iso
                })

                # Upsert conversation
                conv = await db.wa_conversations.find_one({"phone": from_number})
                message_doc = {
                    "id": str(uuid.uuid4()), "direction": "incoming",
                    "text": text_body, "msg_type": msg_type,
                    "wa_message_id": msg_id, "timestamp": now_iso,
                    "status": "received",
                }
                if conv:
                    await db.wa_conversations.update_one({"phone": from_number}, {
                        "$push": {"messages": message_doc},
                        "$set": {"last_message": text_body, "last_message_at": now_iso, "contact_name": contact_name or conv.get("contact_name", "")},
                        "$inc": {"unread_count": 1}
                    })
                else:
                    await db.wa_conversations.insert_one({
                        "id": str(uuid.uuid4()), "phone": from_number,
                        "contact_name": contact_name, "unread_count": 1,
                        "last_message": text_body, "last_message_at": now_iso,
                        "created_at": now_iso, "messages": [message_doc],
                    })

                # ─── Message routing: auto-response first, then Help Center flow fallback ───
                if text_body and msg_type in ("text", "button", "interactive"):
                    matched_auto = await _check_auto_response_match(text_body)
                    if matched_auto:
                        asyncio.create_task(run_auto_response_matcher(from_number, text_body))
                    else:
                        # No auto-response match → trigger Help Center Flow
                        asyncio.create_task(trigger_help_center_flow(from_number))

            # ─── Handle status updates ───
            statuses = value.get("statuses", [])
            for status in statuses:
                wa_id = status.get("id", "")
                st = status.get("status", "")  # sent, delivered, read, failed
                ts = status.get("timestamp", "")
                errors = status.get("errors", [])
                err_msg = errors[0].get("message", "") if errors else ""
                err_code = errors[0].get("code", "") if errors else ""
                err_title = errors[0].get("title", "") if errors else ""
                full_err = " | ".join([x for x in [str(err_code) if err_code else "", err_title, err_msg] if x])
                await db.wa_webhook_events.insert_one({
                    "id": str(uuid.uuid4()), "wa_message_id": wa_id,
                    "event_type": st, "timestamp": ts, "error_message": err_msg,
                    "error_code": err_code, "error_title": err_title,
                    "raw": status, "received_at": datetime.now(timezone.utc).isoformat()
                })
                update_fields = {"status": st}
                if st == "sent":
                    update_fields["sent_at"] = datetime.now(timezone.utc).isoformat()
                elif st == "delivered":
                    update_fields["delivered_at"] = datetime.now(timezone.utc).isoformat()
                elif st == "read":
                    update_fields["read_at"] = datetime.now(timezone.utc).isoformat()
                elif st == "failed":
                    update_fields["error_message"] = err_msg
                    update_fields["error_detail"] = full_err
                await db.wa_campaign_recipients.update_one(
                    {"wa_message_id": wa_id}, {"$set": update_fields}
                )
                await db.wa_message_queue.update_one(
                    {"wa_message_id": wa_id},
                    {"$set": {"status": st, "error_detail": full_err} if st == "failed" else {"status": st}}
                )
                # Update conversation message status + surface the failure reason inline
                conv_set = {"messages.$.status": st}
                if st == "failed" and full_err:
                    conv_set["messages.$.error_message"] = full_err
                    conv_set["messages.$.text"] = f"[UNDELIVERED: {full_err[:140]}]"
                await db.wa_conversations.update_one(
                    {"messages.wa_message_id": wa_id},
                    {"$set": conv_set}
                )
    return {"status": "ok"}

# ─── WhatsApp Template Registry ───
class WATemplateCreate(BaseModel):
    meta_template_name: str
    display_name: str = ""
    language: str = "en"
    category: str = "UTILITY"
    header_type: Optional[str] = None
    header_media_url: str = ""
    body_text: str = ""
    footer_text: str = ""
    buttons: List[Dict] = []
    variable_count: int = 0
    variable_labels: List[str] = []
    sample_values: List[str] = []

class WATemplateUpdate(BaseModel):
    display_name: Optional[str] = None
    language: Optional[str] = None
    category: Optional[str] = None
    header_type: Optional[str] = None
    header_media_url: Optional[str] = None
    body_text: Optional[str] = None
    footer_text: Optional[str] = None
    buttons: Optional[List[Dict]] = None
    variable_count: Optional[int] = None
    variable_labels: Optional[List[str]] = None
    sample_values: Optional[List[str]] = None
    status: Optional[str] = None

@api_router.get("/admin/wa-templates")
async def list_wa_templates(request: Request):
    await require_admin_readable(request)
    templates = await db.wa_templates.find({}, {"_id": 0}).sort("display_name", 1).to_list(200)
    return templates

@api_router.post("/admin/wa-templates")
async def create_wa_template(body: WATemplateCreate, request: Request):
    user = await require_superadmin(request)
    doc = {
        "id": str(uuid.uuid4()),
        "meta_template_name": body.meta_template_name.strip(),
        "display_name": body.display_name.strip() or body.meta_template_name.strip(),
        "language": body.language,
        "category": body.category,
        "status": "approved",
        "header_type": body.header_type,
        "header_media_url": body.header_media_url,
        "body_text": body.body_text,
        "footer_text": body.footer_text,
        "buttons": body.buttons,
        "variable_count": body.variable_count,
        "variable_labels": body.variable_labels,
        "sample_values": body.sample_values,
        "created_by": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.wa_templates.insert_one(doc)
    doc.pop("_id", None)
    await log_audit("wa_template_create", "wa_template", doc["id"], body.meta_template_name, "WA template registered", user["name"])
    return doc

@api_router.put("/admin/wa-templates/{tmpl_id}")
async def update_wa_template(tmpl_id: str, body: WATemplateUpdate, request: Request):
    user = await require_superadmin(request)
    updates = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.wa_templates.update_one({"id": tmpl_id}, {"$set": updates})
    await log_audit("wa_template_update", "wa_template", tmpl_id, "", "WA template updated", user["name"])
    return {"message": "Updated"}

@api_router.delete("/admin/wa-templates/{tmpl_id}")
async def delete_wa_template(tmpl_id: str, request: Request):
    user = await require_superadmin(request)
    await db.wa_templates.delete_one({"id": tmpl_id})
    await log_audit("wa_template_delete", "wa_template", tmpl_id, "", "WA template deleted", user["name"])
    return {"message": "Deleted"}

# ─── Bulk Campaign ───
class CampaignCreate(BaseModel):
    name: str
    template_id: str
    media_url: str = ""

@api_router.get("/admin/wa-campaigns")
async def list_wa_campaigns(request: Request, page: int = 1, per_page: int = 20):
    await require_admin_readable(request)
    total = await db.wa_campaigns.count_documents({})
    skip = (page - 1) * per_page
    campaigns = await db.wa_campaigns.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(per_page).to_list(per_page)
    return {"data": campaigns, "total": total, "page": page, "total_pages": max(1, math.ceil(total / per_page))}

@api_router.get("/admin/wa-campaigns/sample-excel")
async def download_sample_excel(request: Request, template_id: str = ""):
    await require_admin_readable(request)
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Recipients"
    headers = ["phone_number"]
    if template_id:
        tmpl = await db.wa_templates.find_one({"id": template_id}, {"_id": 0})
        if tmpl and tmpl.get("variable_labels"):
            headers.extend(tmpl["variable_labels"])
        elif tmpl and tmpl.get("variable_count"):
            headers.extend([f"var_{i+1}" for i in range(tmpl["variable_count"])])
    else:
        headers.extend(["var_1", "var_2", "var_3"])
    for col, h in enumerate(headers, 1):
        ws.cell(row=1, column=col, value=h)
    sample = ["919876543210"]
    sample.extend(["Sample Value"] * (len(headers) - 1))
    for col, v in enumerate(sample, 1):
        ws.cell(row=2, column=col, value=v)
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                             headers={"Content-Disposition": "attachment; filename=campaign_sample.xlsx"})

@api_router.post("/admin/wa-campaigns/upload-excel")
async def upload_campaign_excel(request: Request, file: UploadFile = File(...)):
    await require_superadmin(request)
    content = await file.read()
    try:
        wb = openpyxl.load_workbook(io.BytesIO(content))
        ws = wb.active
        raw_headers = [str(cell.value or "").strip() for cell in ws[1]]
        headers_lower = [h.lower() for h in raw_headers]
        if not any(h in ("phone_number", "phone", "mobile") for h in headers_lower):
            raise HTTPException(status_code=400, detail="Excel must have a 'phone_number', 'phone', or 'mobile' column")
        phone_col = next((i for i, h in enumerate(headers_lower) if h in ("phone_number", "phone", "mobile")), 0)
        # Identify valid (non-empty header, not phone) column indices to include
        data_col_indices = [i for i, h in enumerate(raw_headers) if h and i != phone_col]
        rows = []
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row or phone_col >= len(row) or not row[phone_col]:
                continue
            phone_val = row[phone_col]
            # Normalize phone: strip, drop trailing ".0" that openpyxl adds for numeric cells
            phone = str(phone_val).strip()
            if phone.endswith(".0"):
                phone = phone[:-2]
            phone = phone.replace(" ", "").replace("-", "").replace("+", "")
            if not phone.isdigit():
                # Skip malformed rows rather than crashing later
                continue
            variables = {}
            for i in data_col_indices:
                if i < len(row):
                    variables[raw_headers[i]] = str(row[i]) if row[i] is not None else ""
            rows.append({"phone_number": phone, "variables": variables})
        non_phone_headers = [raw_headers[i] for i in data_col_indices]
        return {
            "rows": rows, "total": len(rows),
            "headers": non_phone_headers,
            "all_columns": [h for h in raw_headers if h],
            "phone_column": raw_headers[phone_col],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse Excel: {str(e)}")

@api_router.get("/admin/wa-campaigns/{camp_id}")
async def get_wa_campaign(camp_id: str, request: Request):
    await require_admin_readable(request)
    camp = await db.wa_campaigns.find_one({"id": camp_id}, {"_id": 0})
    if not camp:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return camp

@api_router.get("/admin/wa-campaigns/{camp_id}/recipients")
async def get_campaign_recipients(camp_id: str, request: Request, page: int = 1, per_page: int = 50, status_filter: str = ""):
    await require_admin_readable(request)
    query = {"campaign_id": camp_id}
    if status_filter:
        query["status"] = status_filter
    total = await db.wa_campaign_recipients.count_documents(query)
    skip = (page - 1) * per_page
    recs = await db.wa_campaign_recipients.find(query, {"_id": 0}).sort("created_at", 1).skip(skip).limit(per_page).to_list(per_page)
    return {"data": recs, "total": total, "page": page, "total_pages": max(1, math.ceil(total / per_page))}

@api_router.post("/admin/wa-campaigns/launch")
async def launch_campaign(request: Request):
    user = await require_superadmin(request)
    body = await request.json()
    name = body.get("name", "").strip()
    template_id = body.get("template_id", "")
    media_url = body.get("media_url", "")
    recipients = body.get("recipients", [])

    if not name:
        raise HTTPException(status_code=400, detail="Campaign name required")
    if not template_id:
        raise HTTPException(status_code=400, detail="Template required")
    if not recipients:
        raise HTTPException(status_code=400, detail="No recipients")

    tmpl = await db.wa_templates.find_one({"id": template_id}, {"_id": 0})
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")

    campaign_id = str(uuid.uuid4())
    campaign = {
        "id": campaign_id,
        "name": name,
        "template_id": template_id,
        "template_name": tmpl.get("meta_template_name", ""),
        "template_display": tmpl.get("display_name", ""),
        "media_url": media_url,
        "status": "sending",
        "total_recipients": len(recipients),
        "sent_count": 0, "delivered_count": 0, "read_count": 0, "failed_count": 0,
        "created_by": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "started_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": "",
    }
    await db.wa_campaigns.insert_one(campaign)

    # Create recipient records
    recipient_docs = []
    for r in recipients:
        phone = str(r.get("phone_number", "")).strip()
        variables = r.get("variables", {})
        # Build ordered body params from variable labels
        body_params = []
        if tmpl.get("variable_labels"):
            for label in tmpl["variable_labels"]:
                body_params.append(variables.get(label, variables.get(label.lower(), "")))
        elif tmpl.get("variable_count"):
            for i in range(tmpl["variable_count"]):
                key = f"var_{i+1}"
                body_params.append(variables.get(key, ""))

        recipient_docs.append({
            "id": str(uuid.uuid4()),
            "campaign_id": campaign_id,
            "phone_number": phone,
            "variable_values": variables,
            "body_params": body_params,
            "wa_message_id": "",
            "status": "queued",
            "error_code": "", "error_message": "",
            "sent_at": "", "delivered_at": "", "read_at": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    if recipient_docs:
        await db.wa_campaign_recipients.insert_many(recipient_docs)

    # Launch sending in background — use campaign media_url or fall back to template's stored media URL
    effective_media_url = media_url or tmpl.get("header_media_url", "")
    asyncio.create_task(process_campaign(campaign_id, tmpl, effective_media_url))

    await log_audit("campaign_launch", "wa_campaign", campaign_id, name,
                    f"Campaign launched: {len(recipients)} recipients", user["name"])
    campaign.pop("_id", None)
    return {"campaign_id": campaign_id, "total": len(recipients), "status": "sending"}

async def process_campaign(campaign_id: str, tmpl: dict, media_url: str):
    """Background task to send campaign messages"""
    recipients = await db.wa_campaign_recipients.find(
        {"campaign_id": campaign_id, "status": "queued"}, {"_id": 0}
    ).to_list(50000)
    sent = 0
    failed = 0
    for rec in recipients:
        success, result = await send_whatsapp_template(
            phone=rec["phone_number"],
            template_name=tmpl.get("meta_template_name", ""),
            language=tmpl.get("language", "en"),
            body_params=rec.get("body_params", []) or None,
            header_media_url=media_url or None,
            header_type=tmpl.get("header_type") or None,
        )
        if success:
            await db.wa_campaign_recipients.update_one(
                {"id": rec["id"]},
                {"$set": {"status": "sent", "wa_message_id": result, "sent_at": datetime.now(timezone.utc).isoformat()}}
            )
            # Auto-create conversation thread
            contact_name = rec.get("variable_values", {}).get("name", "") or rec.get("variable_values", {}).get("guest_name", "")
            await ensure_conversation(rec["phone_number"], contact_name, "campaign")
            # Add outgoing message to conversation
            conv_phone = rec["phone_number"].strip().replace(" ", "").replace("-", "").lstrip("+")
            if not conv_phone.startswith("91") and len(conv_phone) == 10:
                conv_phone = "91" + conv_phone
            tmpl_text = tmpl.get("body_text", "")
            for idx, p in enumerate(rec.get("body_params", []) or []):
                tmpl_text = tmpl_text.replace(f"{{{{{idx+1}}}}}", str(p))
            await db.wa_conversations.update_one({"phone": conv_phone}, {
                "$push": {"messages": {
                    "id": str(uuid.uuid4()), "direction": "outgoing",
                    "text": tmpl_text or f"[Campaign template: {tmpl.get('meta_template_name', '')}]",
                    "msg_type": "template", "wa_message_id": result,
                    "timestamp": datetime.now(timezone.utc).isoformat(), "status": "sent",
                }},
                "$set": {"last_message": tmpl_text[:100] or f"[Campaign message]", "last_message_at": datetime.now(timezone.utc).isoformat()}
            })
            sent += 1
        else:
            await db.wa_campaign_recipients.update_one(
                {"id": rec["id"]},
                {"$set": {"status": "failed", "error_message": result}}
            )
            failed += 1
        # Rate limit: ~50/sec to stay safe
        await asyncio.sleep(0.02)

    status = "completed" if failed == 0 else ("partially_failed" if sent > 0 else "failed")
    await db.wa_campaigns.update_one({"id": campaign_id}, {"$set": {
        "status": status, "sent_count": sent, "failed_count": failed,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }})

# ─── Campaign Stats (live refresh) ───
@api_router.get("/admin/wa-campaigns/{camp_id}/stats")
async def get_campaign_stats(camp_id: str, request: Request):
    await require_admin_readable(request)
    pipeline = [
        {"$match": {"campaign_id": camp_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    results = await db.wa_campaign_recipients.aggregate(pipeline).to_list(20)
    stats = {r["_id"]: r["count"] for r in results}
    total = sum(stats.values())
    # Update campaign doc with latest counts
    await db.wa_campaigns.update_one({"id": camp_id}, {"$set": {
        "sent_count": stats.get("sent", 0) + stats.get("delivered", 0) + stats.get("read", 0),
        "delivered_count": stats.get("delivered", 0) + stats.get("read", 0),
        "read_count": stats.get("read", 0),
        "failed_count": stats.get("failed", 0),
    }})
    return {"total": total, "queued": stats.get("queued", 0), "sent": stats.get("sent", 0),
            "delivered": stats.get("delivered", 0), "read": stats.get("read", 0),
            "failed": stats.get("failed", 0)}

# ─── Campaign Export (CSV / PDF) ───
async def _load_campaign_for_export(camp_id: str):
    camp = await db.wa_campaigns.find_one({"id": camp_id}, {"_id": 0})
    if not camp:
        raise HTTPException(status_code=404, detail="Campaign not found")
    recs = await db.wa_campaign_recipients.find(
        {"campaign_id": camp_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(100000)
    # Live stats
    pipeline = [
        {"$match": {"campaign_id": camp_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    agg = await db.wa_campaign_recipients.aggregate(pipeline).to_list(20)
    stats = {r["_id"]: r["count"] for r in agg}
    return camp, recs, stats

@api_router.get("/admin/wa-campaigns/{camp_id}/export.csv")
async def export_campaign_csv(camp_id: str, request: Request):
    await require_admin_readable(request)
    camp, recs, stats = await _load_campaign_for_export(camp_id)

    # Collect union of variable keys across all recipients
    var_keys = []
    seen = set()
    for r in recs:
        for k in (r.get("variable_values") or {}).keys():
            if k not in seen:
                seen.add(k)
                var_keys.append(k)

    buf = io.StringIO()
    w = csv.writer(buf)
    # ─── Campaign summary block ───
    w.writerow(["Campaign Export"])
    w.writerow(["Name", camp.get("name", "") or camp.get("campaign_name", "")])
    w.writerow(["Campaign ID", camp.get("id", "")])
    w.writerow(["Template (Meta name)", camp.get("template_name", "")])
    w.writerow(["Template (Display)", camp.get("template_display", "")])
    w.writerow(["Media URL", camp.get("media_url", "")])
    w.writerow(["Status", camp.get("status", "")])
    w.writerow(["Created By", camp.get("created_by", "")])
    w.writerow(["Created At", camp.get("created_at", "")])
    w.writerow(["Started At", camp.get("started_at", "")])
    w.writerow(["Completed At", camp.get("completed_at", "")])
    w.writerow(["Total Recipients", camp.get("total_recipients", len(recs))])
    w.writerow(["Queued", stats.get("queued", 0)])
    w.writerow(["Sent", stats.get("sent", 0)])
    w.writerow(["Delivered", stats.get("delivered", 0)])
    w.writerow(["Read", stats.get("read", 0)])
    w.writerow(["Failed", stats.get("failed", 0)])
    w.writerow([])
    # ─── Recipient header row ───
    headers = [
        "phone_number", "status", "wa_message_id",
        "sent_at", "delivered_at", "read_at",
        "error_code", "error_message", "created_at",
    ] + [f"var: {k}" for k in var_keys]
    w.writerow(headers)
    for r in recs:
        vv = r.get("variable_values") or {}
        row = [
            r.get("phone_number", ""),
            r.get("status", ""),
            r.get("wa_message_id", ""),
            r.get("sent_at", ""),
            r.get("delivered_at", ""),
            r.get("read_at", ""),
            r.get("error_code", ""),
            r.get("error_message", ""),
            r.get("created_at", ""),
        ] + [str(vv.get(k, "")) for k in var_keys]
        w.writerow(row)

    data = buf.getvalue().encode("utf-8-sig")  # BOM for Excel compat
    fname = f"campaign_{(camp.get('name') or camp.get('id') or 'export').replace(' ', '_')}.csv"
    return Response(
        content=data,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'}
    )

@api_router.get("/admin/wa-campaigns/{camp_id}/export.pdf")
async def export_campaign_pdf(camp_id: str, request: Request):
    await require_admin_readable(request)
    camp, recs, stats = await _load_campaign_for_export(camp_id)

    pdf = FPDF(orientation="L", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 8, "WhatsApp Campaign Report", ln=1)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(90, 90, 90)
    pdf.cell(0, 5, f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", ln=1)
    pdf.ln(2)

    # ── Summary box ──
    pdf.set_text_color(11, 28, 61)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 6, camp.get("name", "") or camp.get("campaign_name", "Untitled"), ln=1)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(60, 60, 60)

    def _row(label, value):
        safe = str(value if value not in (None, "") else "-").encode("latin-1", "replace").decode("latin-1")
        # Truncate long values to keep them on one line (avoid multi_cell edge cases)
        if len(safe) > 180:
            safe = safe[:177] + "..."
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(45, 5, label, border=0, ln=0)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(0, 5, safe, border=0, ln=1)

    _row("Campaign ID", camp.get("id", ""))
    _row("Template", f"{camp.get('template_display', '')}  ({camp.get('template_name', '')})")
    if camp.get("media_url"):
        _row("Media URL", camp.get("media_url", ""))
    _row("Status", camp.get("status", ""))
    _row("Created By", camp.get("created_by", ""))
    _row("Created At", camp.get("created_at", ""))
    if camp.get("completed_at"):
        _row("Completed At", camp.get("completed_at", ""))

    pdf.ln(2)
    # ── Stats row ──
    pdf.set_fill_color(240, 244, 255)
    pdf.set_text_color(11, 28, 61)
    pdf.set_font("Helvetica", "B", 9)
    total = sum(stats.values()) or camp.get("total_recipients", len(recs))
    boxes = [
        ("Total", total),
        ("Queued", stats.get("queued", 0)),
        ("Sent", stats.get("sent", 0)),
        ("Delivered", stats.get("delivered", 0)),
        ("Read", stats.get("read", 0)),
        ("Failed", stats.get("failed", 0)),
    ]
    box_w = 45
    for label, val in boxes:
        pdf.cell(box_w, 10, f"{label}: {val}", border=1, fill=True)
    pdf.ln(12)

    # ── Recipient table ──
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(11, 28, 61)
    pdf.set_text_color(255, 255, 255)
    headers = [("Phone", 38), ("Status", 22), ("Sent", 36), ("Delivered", 36), ("Read", 36), ("Error", 109)]
    for h, w in headers:
        pdf.cell(w, 7, h, border=1, fill=True, align="L")
    pdf.ln(7)
    pdf.set_text_color(40, 40, 40)
    pdf.set_font("Helvetica", "", 8)
    fill = False
    for r in recs:
        if pdf.get_y() > 190:
            pdf.add_page()
            pdf.set_font("Helvetica", "B", 9)
            pdf.set_fill_color(11, 28, 61)
            pdf.set_text_color(255, 255, 255)
            for h, w in headers:
                pdf.cell(w, 7, h, border=1, fill=True, align="L")
            pdf.ln(7)
            pdf.set_text_color(40, 40, 40)
            pdf.set_font("Helvetica", "", 8)

        def _fmt_dt(v):
            if not v:
                return "-"
            return str(v).replace("T", " ")[:19]

        pdf.set_fill_color(248, 250, 252) if fill else pdf.set_fill_color(255, 255, 255)
        cells = [
            ("+" + str(r.get("phone_number", "")), 38),
            (str(r.get("status", "")), 22),
            (_fmt_dt(r.get("sent_at", "")), 36),
            (_fmt_dt(r.get("delivered_at", "")), 36),
            (_fmt_dt(r.get("read_at", "")), 36),
            ((str(r.get("error_message") or "") or "-")[:180], 109),
        ]
        for text, w in cells:
            # Safe-encode (latin-1 for FPDF core font)
            safe = str(text).encode("latin-1", "replace").decode("latin-1")
            pdf.cell(w, 6, safe, border=1, fill=True, align="L")
        pdf.ln(6)
        fill = not fill

    out = pdf.output(dest="S")
    if isinstance(out, str):
        out = out.encode("latin-1")
    fname = f"campaign_{(camp.get('name') or camp.get('id') or 'export').replace(' ', '_')}.pdf"
    return Response(
        content=bytes(out),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'}
    )

# ═══════════════════════════════════════════════════════════════
# CONVERSATIONS MODULE
# ═══════════════════════════════════════════════════════════════

@api_router.get("/admin/wa-conversations")
async def list_conversations(request: Request, search: str = "", page: int = 1, per_page: int = 50):
    await require_admin_readable(request)
    query = {}
    if search:
        query["$or"] = [
            {"phone": {"$regex": search, "$options": "i"}},
            {"contact_name": {"$regex": search, "$options": "i"}},
        ]
    total = await db.wa_conversations.count_documents(query)
    skip = (page - 1) * per_page
    # Return conversations WITHOUT full messages array for list view (just metadata)
    convos = await db.wa_conversations.find(query, {
        "_id": 0, "id": 1, "phone": 1, "contact_name": 1,
        "last_message": 1, "last_message_at": 1, "unread_count": 1, "created_at": 1,
    }).sort("last_message_at", -1).skip(skip).limit(per_page).to_list(per_page)
    return {"data": convos, "total": total, "page": page}

@api_router.get("/admin/wa-conversations/{phone}")
async def get_conversation(phone: str, request: Request):
    await require_admin_readable(request)
    conv = await db.wa_conversations.find_one({"phone": phone}, {"_id": 0})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv

@api_router.put("/admin/wa-conversations/{phone}/read")
async def mark_conversation_read(phone: str, request: Request):
    await require_superadmin(request)
    await db.wa_conversations.update_one({"phone": phone}, {"$set": {"unread_count": 0}})
    return {"message": "Marked as read"}

@api_router.post("/admin/wa-conversations/{phone}/send")
async def send_conversation_message(phone: str, request: Request):
    """Send a free-form text message to a contact (uses 24h conversation window)."""
    user = await require_superadmin(request)
    body = await request.json()
    text = body.get("text", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message text required")

    # Send via WhatsApp Cloud API (free-form text, within 24h window)
    clean_phone = normalize_phone_for_wa(phone)

    payload = {
        "messaging_product": "whatsapp",
        "to": clean_phone,
        "type": "text",
        "text": {"body": text}
    }
    wa_msg_id = ""
    try:
        async with httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.post(
                f"{WA_API_BASE}/{WA_PHONE_ID}/messages",
                headers={"Authorization": f"Bearer {WA_TOKEN}", "Content-Type": "application/json"},
                json=payload
            )
            data = resp.json()
            if resp.status_code == 200 and data.get("messages"):
                wa_msg_id = data["messages"][0]["id"]
            else:
                err = data.get("error", {}).get("message", str(data))
                raise HTTPException(status_code=500, detail=f"WhatsApp API error: {err}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send: {str(e)}")

    now_iso = datetime.now(timezone.utc).isoformat()
    msg_doc = {
        "id": str(uuid.uuid4()), "direction": "outgoing",
        "text": text, "msg_type": "text",
        "wa_message_id": wa_msg_id, "timestamp": now_iso,
        "status": "sent", "sent_by": user["name"],
    }

    # Upsert conversation
    conv = await db.wa_conversations.find_one({"phone": phone})
    if conv:
        await db.wa_conversations.update_one({"phone": phone}, {
            "$push": {"messages": msg_doc},
            "$set": {"last_message": text, "last_message_at": now_iso}
        })
    else:
        await db.wa_conversations.insert_one({
            "id": str(uuid.uuid4()), "phone": phone,
            "contact_name": "", "unread_count": 0,
            "last_message": text, "last_message_at": now_iso,
            "created_at": now_iso, "messages": [msg_doc],
        })

    return {"message": "Sent", "wa_message_id": wa_msg_id}

async def ensure_conversation(phone: str, contact_name: str = "", source: str = "campaign"):
    """Helper to auto-create/update conversation when a message is sent via campaign or trigger."""
    phone = phone.strip().replace(" ", "").replace("-", "").lstrip("+")
    if not phone.startswith("91") and len(phone) == 10:
        phone = "91" + phone
    conv = await db.wa_conversations.find_one({"phone": phone})
    now_iso = datetime.now(timezone.utc).isoformat()
    if not conv:
        await db.wa_conversations.insert_one({
            "id": str(uuid.uuid4()), "phone": phone,
            "contact_name": contact_name, "unread_count": 0,
            "last_message": f"[{source} message sent]", "last_message_at": now_iso,
            "created_at": now_iso, "messages": [],
        })
    else:
        updates = {"last_message_at": now_iso}
        if contact_name and not conv.get("contact_name"):
            updates["contact_name"] = contact_name
        await db.wa_conversations.update_one({"phone": phone}, {"$set": updates})

# ─── Room Stats Endpoint ───
@api_router.get("/admin/room-stats")
async def get_room_stats(request: Request):
    await get_current_user(request)
    rooms = await db.rooms.find({}, {"_id": 0}).to_list(2000)
    total = len(rooms)
    occupied = sum(1 for r in rooms if r.get("status") == "occupied")
    available = total - occupied

    ac_total = sum(1 for r in rooms if r.get("ac_type") == "AC")
    ac_occupied = sum(1 for r in rooms if r.get("ac_type") == "AC" and r.get("status") == "occupied")
    nonac_total = sum(1 for r in rooms if r.get("ac_type") != "AC")
    nonac_occupied = sum(1 for r in rooms if r.get("ac_type") != "AC" and r.get("status") == "occupied")

    # Dynamic capacity breakdown
    capacity_map = {}
    for r in rooms:
        cap = r.get("capacity", 0)
        if cap not in capacity_map:
            capacity_map[cap] = {"total": 0, "occupied": 0}
        capacity_map[cap]["total"] += 1
        if r.get("status") == "occupied":
            capacity_map[cap]["occupied"] += 1
    capacity_breakdown = [{"capacity": k, "total": v["total"], "occupied": v["occupied"]} for k, v in sorted(capacity_map.items())]

    return {
        "total": total, "occupied": occupied, "available": available,
        "ac": {"total": ac_total, "occupied": ac_occupied},
        "non_ac": {"total": nonac_total, "occupied": nonac_occupied},
        "capacity_breakdown": capacity_breakdown,
    }

# ─── OTP Logs Endpoint ───
@api_router.get("/admin/otp-logs")
async def get_otp_logs(request: Request, search: str = "", page: int = 1, per_page: int = 50):
    await require_admin_readable(request)
    query = {}
    if search:
        query["$or"] = [
            {"mobile": {"$regex": search, "$options": "i"}},
        ]
    total = await db.otp_sessions.count_documents(query)
    skip = (page - 1) * per_page
    logs = await db.otp_sessions.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(per_page).to_list(per_page)
    
    # Enrich with registration name
    for log in logs:
        mobile = log.get("mobile", "")
        # Try to find guest name from registrations
        reg = await db.registrations.find_one({"mobile": mobile}, {"_id": 0, "primary_guest_name": 1, "id": 1})
        if reg:
            log["guest_name"] = reg.get("primary_guest_name", "")
            log["registration_id"] = reg.get("id", "")
        else:
            log["guest_name"] = ""
            log["registration_id"] = ""
    
    return {"data": logs, "total": total, "page": page, "total_pages": max(1, (total + per_page - 1) // per_page)}

# ─── Media Upload for Conversations ───
@api_router.post("/admin/wa-conversations/{phone}/send-media")
async def send_conversation_media(phone: str, request: Request, file: UploadFile = File(...)):
    """Upload and send a media file via WhatsApp."""
    user = await require_superadmin(request)
    
    # Save file to static dir
    import os as _os
    static_dir = _os.path.join(_os.path.dirname(__file__), "static", "uploads")
    _os.makedirs(static_dir, exist_ok=True)
    
    safe_name = f"{uuid.uuid4().hex[:8]}_{file.filename.replace(' ', '_')}"
    file_path = _os.path.join(static_dir, safe_name)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Determine media type from content_type
    ct = (file.content_type or "").lower()
    if "image" in ct:
        media_type = "image"
    elif "video" in ct:
        media_type = "video"
    elif "audio" in ct:
        media_type = "audio"
    else:
        media_type = "document"
    
    # Build public URL for the file
    app_url = os.environ.get("APP_URL", "")
    if not app_url:
        # Fallback: construct from request
        app_url = str(request.base_url).rstrip("/")
    file_url = f"{app_url}/api/static/uploads/{safe_name}"
    
    # Send via WhatsApp Cloud API
    clean_phone = normalize_phone_for_wa(phone)
    
    payload = {
        "messaging_product": "whatsapp",
        "to": clean_phone,
        "type": media_type,
        media_type: {"link": file_url}
    }
    if media_type == "document":
        payload[media_type]["filename"] = file.filename
    
    wa_msg_id = ""
    error_detail = ""
    try:
        async with httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.post(
                f"{WA_API_BASE}/{WA_PHONE_ID}/messages",
                headers={"Authorization": f"Bearer {WA_TOKEN}", "Content-Type": "application/json"},
                json=payload
            )
            data = resp.json()
            if resp.status_code == 200 and data.get("messages"):
                wa_msg_id = data["messages"][0]["id"]
            else:
                error_detail = data.get("error", {}).get("message", str(data))
                raise HTTPException(status_code=500, detail=f"WhatsApp API error: {error_detail}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send: {str(e)}")
    
    now_iso = datetime.now(timezone.utc).isoformat()
    msg_doc = {
        "id": str(uuid.uuid4()), "direction": "outgoing",
        "text": f"[{media_type}: {file.filename}]", "msg_type": media_type,
        "wa_message_id": wa_msg_id, "timestamp": now_iso,
        "status": "sent", "sent_by": user["name"],
        "media_url": file_url, "media_type": media_type, "filename": file.filename,
    }
    
    conv = await db.wa_conversations.find_one({"phone": phone})
    if conv:
        await db.wa_conversations.update_one({"phone": phone}, {
            "$push": {"messages": msg_doc},
            "$set": {"last_message": f"📎 {file.filename}", "last_message_at": now_iso}
        })
    else:
        await db.wa_conversations.insert_one({
            "id": str(uuid.uuid4()), "phone": phone,
            "contact_name": "", "unread_count": 0,
            "last_message": f"📎 {file.filename}", "last_message_at": now_iso,
            "created_at": now_iso, "messages": [msg_doc],
        })
    
    return {"message": "Media sent", "wa_message_id": wa_msg_id, "media_url": file_url}

# ─── Bundled send: text + multi-media (grouped like mobile WhatsApp) ───
@api_router.post("/admin/wa-conversations/{phone}/send-bundle")
async def send_conversation_bundle(
    phone: str,
    request: Request,
    text: str = Form(default=""),
    files: List[UploadFile] = File(default=[]),
):
    """
    Send a bundle of text + multiple media in one action.
    Strategy: If N>=1 media, text becomes the caption on the FIRST media; remaining
    media are sent plain, sequentially, so mobile WhatsApp groups them visually.
    If no media, send a single text message.
    """
    user = await require_superadmin(request)
    text = (text or "").strip()
    if not text and not files:
        raise HTTPException(status_code=400, detail="Provide text or at least one file")
    if not WA_PHONE_ID or not WA_TOKEN:
        raise HTTPException(status_code=500, detail="WhatsApp API not configured")

    clean_phone = normalize_phone_for_wa(phone)

    import os as _os
    static_dir = _os.path.join(_os.path.dirname(__file__), "static", "uploads")
    _os.makedirs(static_dir, exist_ok=True)
    app_url = os.environ.get("APP_URL", "") or str(request.base_url).rstrip("/")

    sent_msg_docs = []
    headers = {"Authorization": f"Bearer {WA_TOKEN}", "Content-Type": "application/json"}

    async def _send(payload: dict):
        async with httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.post(f"{WA_API_BASE}/{WA_PHONE_ID}/messages", headers=headers, json=payload)
            data = resp.json()
            if resp.status_code == 200 and data.get("messages"):
                return data["messages"][0]["id"], ""
            return "", data.get("error", {}).get("message", str(data))

    # Case A: text only (no media)
    if not files:
        wa_msg_id, err = await _send({
            "messaging_product": "whatsapp", "to": clean_phone,
            "type": "text", "text": {"body": text}
        })
        if err:
            raise HTTPException(status_code=500, detail=f"WhatsApp API error: {err}")
        now_iso = datetime.now(timezone.utc).isoformat()
        sent_msg_docs.append({
            "id": str(uuid.uuid4()), "direction": "outgoing",
            "text": text, "msg_type": "text",
            "wa_message_id": wa_msg_id, "timestamp": now_iso,
            "status": "sent", "sent_by": user["name"],
        })
    else:
        # Case B: 1..N media, optionally text as caption on first
        for idx, file in enumerate(files):
            safe_name = f"{uuid.uuid4().hex[:8]}_{(file.filename or 'file').replace(' ', '_')}"
            file_path = _os.path.join(static_dir, safe_name)
            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)
            file_url = f"{app_url}/api/static/uploads/{safe_name}"

            ct = (file.content_type or "").lower()
            if "image" in ct:
                media_type = "image"
            elif "video" in ct:
                media_type = "video"
            elif "audio" in ct:
                media_type = "audio"
            else:
                media_type = "document"

            media_body: Dict[str, Any] = {"link": file_url}
            if media_type == "document":
                media_body["filename"] = file.filename or safe_name
            # Attach text as caption on FIRST media (audio doesn't support captions)
            if idx == 0 and text and media_type != "audio":
                media_body["caption"] = text

            wa_msg_id, err = await _send({
                "messaging_product": "whatsapp", "to": clean_phone,
                "type": media_type, media_type: media_body
            })
            if err:
                raise HTTPException(status_code=500, detail=f"WhatsApp API error on file '{file.filename}': {err}")

            now_iso = datetime.now(timezone.utc).isoformat()
            caption = media_body.get("caption", "")
            sent_msg_docs.append({
                "id": str(uuid.uuid4()), "direction": "outgoing",
                "text": caption or f"[{media_type}: {file.filename}]",
                "msg_type": media_type,
                "wa_message_id": wa_msg_id, "timestamp": now_iso,
                "status": "sent", "sent_by": user["name"],
                "media_url": file_url, "media_type": media_type,
                "filename": file.filename or safe_name,
            })
        # If text was provided but got rolled into first media, don't re-send.
        # If ALL files were audio (no caption support), send text as separate message.
        if text and all(d.get("msg_type") == "audio" for d in sent_msg_docs):
            wa_msg_id, err = await _send({
                "messaging_product": "whatsapp", "to": clean_phone,
                "type": "text", "text": {"body": text}
            })
            if not err:
                sent_msg_docs.insert(0, {
                    "id": str(uuid.uuid4()), "direction": "outgoing",
                    "text": text, "msg_type": "text",
                    "wa_message_id": wa_msg_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "status": "sent", "sent_by": user["name"],
                })

    # Persist in conversation
    if sent_msg_docs:
        last = sent_msg_docs[-1]
        last_text = last.get("text") or (f"📎 {last.get('filename','')}" if last.get("filename") else "")
        conv = await db.wa_conversations.find_one({"phone": phone})
        if conv:
            await db.wa_conversations.update_one({"phone": phone}, {
                "$push": {"messages": {"$each": sent_msg_docs}},
                "$set": {"last_message": last_text, "last_message_at": last["timestamp"]}
            })
        else:
            await db.wa_conversations.insert_one({
                "id": str(uuid.uuid4()), "phone": phone,
                "contact_name": "", "unread_count": 0,
                "last_message": last_text, "last_message_at": last["timestamp"],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "messages": sent_msg_docs,
            })

    return {"message": "Bundle sent", "count": len(sent_msg_docs), "messages": sent_msg_docs}

# ─── Auto Response Rules (keyword → template chain with delays) ───
@api_router.get("/admin/wa-auto-responses")
async def list_auto_responses(request: Request):
    await require_admin_readable(request)
    rules = await db.wa_auto_responses.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return rules

@api_router.post("/admin/wa-auto-responses")
async def create_auto_response(request: Request):
    user = await require_superadmin(request)
    body = await request.json()
    phrase = (body.get("trigger_phrase") or "").strip()
    if not phrase:
        raise HTTPException(status_code=400, detail="trigger_phrase is required")
    steps = body.get("steps") or []
    if not steps or not isinstance(steps, list):
        raise HTTPException(status_code=400, detail="At least one step is required")
    cleaned_steps = []
    for s in steps:
        tid = (s or {}).get("template_id", "")
        if not tid:
            continue
        try:
            delay = max(0, int(s.get("delay_seconds", 0)))
        except Exception:
            delay = 0
        cleaned_steps.append({"template_id": tid, "delay_seconds": delay})
    if not cleaned_steps:
        raise HTTPException(status_code=400, detail="At least one step with a template is required")
    match_type = body.get("match_type", "exact")
    if match_type not in ("exact", "contains"):
        match_type = "exact"
    doc = {
        "id": str(uuid.uuid4()),
        "trigger_phrase": phrase,
        "match_type": match_type,
        "description": (body.get("description") or "").strip(),
        "steps": cleaned_steps,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["name"],
    }
    await db.wa_auto_responses.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/admin/wa-auto-responses/{rule_id}")
async def update_auto_response(rule_id: str, request: Request):
    await require_superadmin(request)
    body = await request.json()
    updates: Dict[str, Any] = {}
    if "trigger_phrase" in body:
        p = (body["trigger_phrase"] or "").strip()
        if not p:
            raise HTTPException(status_code=400, detail="trigger_phrase cannot be empty")
        updates["trigger_phrase"] = p
    if "match_type" in body and body["match_type"] in ("exact", "contains"):
        updates["match_type"] = body["match_type"]
    if "description" in body:
        updates["description"] = (body["description"] or "").strip()
    if "is_active" in body:
        updates["is_active"] = bool(body["is_active"])
    if "steps" in body:
        cleaned = []
        for s in (body["steps"] or []):
            tid = (s or {}).get("template_id", "")
            if not tid:
                continue
            try:
                delay = max(0, int(s.get("delay_seconds", 0)))
            except Exception:
                delay = 0
            cleaned.append({"template_id": tid, "delay_seconds": delay})
        if not cleaned:
            raise HTTPException(status_code=400, detail="At least one step with a template is required")
        updates["steps"] = cleaned
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    result = await db.wa_auto_responses.update_one({"id": rule_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"message": "Updated"}

@api_router.delete("/admin/wa-auto-responses/{rule_id}")
async def delete_auto_response(rule_id: str, request: Request):
    await require_superadmin(request)
    result = await db.wa_auto_responses.delete_one({"id": rule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"message": "Deleted"}

@api_router.get("/admin/wa-auto-responses/runs")
async def list_auto_response_runs(request: Request, limit: int = 50):
    """View recent auto-response executions for debugging."""
    await require_admin_readable(request)
    runs = await db.wa_auto_response_runs.find({}, {"_id": 0}).sort("started_at", -1).limit(min(limit, 200)).to_list(200)
    return runs

@api_router.post("/admin/wa-auto-responses/test")
async def test_auto_response(request: Request):
    """Simulate an incoming WhatsApp message to test auto-response rules without needing Meta."""
    await require_superadmin(request)
    body = await request.json()
    phone = (body.get("phone") or "").strip().lstrip("+")
    text = (body.get("text") or "").strip()
    if not phone or not text:
        raise HTTPException(status_code=400, detail="phone and text are required")
    # Run synchronously so caller sees result
    await run_auto_response_matcher(phone, text)
    # Return most recent run for this phone
    run = await db.wa_auto_response_runs.find_one({"phone": phone}, {"_id": 0}, sort=[("started_at", -1)])
    return {"matched": run is not None, "run": run}

# ─── WhatsApp Flows Data Exchange Endpoint (with RSA+AES encryption) ───
# Protocol: https://developers.facebook.com/docs/whatsapp/flows/reference/implementingyourflowendpoint
# Request JSON: { encrypted_flow_data, encrypted_aes_key, initial_vector }
# Response: base64(AES-GCM(flipped_iv, aes_key, plaintext_json))

_FLOW_PRIVATE_KEY_CACHE: Any = None

def _load_flow_private_key():
    global _FLOW_PRIVATE_KEY_CACHE
    if _FLOW_PRIVATE_KEY_CACHE is not None:
        return _FLOW_PRIVATE_KEY_CACHE
    from cryptography.hazmat.primitives import serialization
    passphrase = os.environ.get("WA_FLOW_PRIVATE_KEY_PASSPHRASE", "")
    pem_bytes = None
    # Preferred: base64-encoded PEM in env var (redeploy-proof, no disk dependency)
    pem_b64 = os.environ.get("WA_FLOW_PRIVATE_KEY_B64", "").strip()
    if pem_b64:
        try:
            pem_bytes = base64.b64decode(pem_b64)
        except Exception as e:
            logger.error(f"[Flow] WA_FLOW_PRIVATE_KEY_B64 could not be decoded: {e}")
            return None
    else:
        # Fallback: file path on disk
        key_path = os.environ.get("WA_FLOW_PRIVATE_KEY_PATH", "")
        if not key_path or not os.path.exists(key_path):
            return None
        with open(key_path, "rb") as f:
            pem_bytes = f.read()
    _FLOW_PRIVATE_KEY_CACHE = serialization.load_pem_private_key(
        pem_bytes, password=passphrase.encode("utf-8") if passphrase else None
    )
    return _FLOW_PRIVATE_KEY_CACHE

def _decrypt_flow_request(encrypted_flow_data_b64: str, encrypted_aes_key_b64: str, iv_b64: str) -> (dict, bytes, bytes):
    """Returns (decrypted_body, aes_key_bytes, iv_bytes). Raises on failure."""
    from cryptography.hazmat.primitives.asymmetric import padding
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    pk = _load_flow_private_key()
    if pk is None:
        raise RuntimeError("Flow private key not configured")
    encrypted_aes_key = base64.b64decode(encrypted_aes_key_b64)
    aes_key = pk.decrypt(
        encrypted_aes_key,
        padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None),
    )
    iv = base64.b64decode(iv_b64)
    blob = base64.b64decode(encrypted_flow_data_b64)
    # Per Meta spec, last 16 bytes of blob are the GCM tag; AESGCM().decrypt handles both combined
    plaintext = AESGCM(aes_key).decrypt(iv, blob, None)
    return json.loads(plaintext.decode("utf-8")), aes_key, iv

def _encrypt_flow_response(response_obj: dict, aes_key: bytes, iv: bytes) -> str:
    """Encrypts response with the SAME aes_key, using FLIPPED iv. Returns base64 string."""
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    flipped_iv = bytes(b ^ 0xFF for b in iv)
    ct = AESGCM(aes_key).encrypt(flipped_iv, json.dumps(response_obj).encode("utf-8"), None)
    return base64.b64encode(ct).decode("utf-8")

async def _find_arrived_guest_by_phone(phone: str):
    """Locate a registration record by phone. Check if guest is on-premise (arrived/partially_arrived)."""
    raw = (phone or "").lstrip("+").strip().replace(" ", "").replace("-", "")
    candidates = {raw}
    if raw.startswith("91") and len(raw) > 10:
        candidates.add(raw[2:])
    candidates.add("91" + raw if not raw.startswith("91") else raw)
    # Also try with + prefix variations
    candidates.add("+" + raw)
    if not raw.startswith("91"):
        candidates.add("+91" + raw)
        candidates.add("+91 " + raw)
    # Try stored formats like "+917229900422" or "+91 7229900422"
    if raw.startswith("91") and len(raw) > 10:
        bare = raw[2:]
        candidates.add("+91" + bare)
        candidates.add("+91 " + bare)
        candidates.add(bare)
    reg = await db.registrations.find_one(
        {
            "primary_mobile": {"$in": list(candidates)},
            "approval_status": {"$ne": "deleted"},
        },
        {"_id": 0},
    )
    if not reg:
        return None, "not_found"
    arrival = reg.get("arrival_status", "not_arrived")
    is_onsite = arrival in ("arrived", "partially_arrived")
    return reg, ("on_premise" if is_onsite else "not_arrived")

async def _create_ticket_from_flow(phone: str, service_type: str, category_group: str, room_location: str, description: str):
    """Create a help-centre ticket from a Flow submission. Returns (ticket_doc, reg_doc_or_none, arrived_status)."""
    reg, arrived_status = await _find_arrived_guest_by_phone(phone)

    # Look up category (service_type) from DB
    cats = await get_categories()
    cat = next((c for c in cats if c["id"] == service_type), None)
    if not cat:
        # Fallback generic
        cat = {"id": "other_request", "label": service_type or "Other Request", "priority": "low", "sla_minutes": 45}

    sla = int(cat.get("sla_minutes", 30))
    priority = cat.get("priority", "low")

    assigned_to = ""
    assigned_to_name = ""
    guest_name = ""
    guest_mobile = phone

    if reg:
        guest_name = reg.get("primary_guest_name", "") or reg.get("head_name", "") or ""
        if not guest_name:
            for att in reg.get("attendees", []):
                if att.get("id") == reg.get("group_head_id"):
                    guest_name = att.get("name", "")
                    break
        guest_mobile = reg.get("primary_mobile", phone)
        # Auto-derive room_or_location from the registration if caller didn't supply one.
        if not room_location:
            ra = reg.get("room_assignments") or []
            if ra:
                first = ra[0]
                room_location = first.get("room_code") if isinstance(first, dict) else str(first)
        # Point-of-contact = assigned swamsevak on the registration
        _swam_val = reg.get("assigned_swamsevak", "")
        if _swam_val:
            assigned_to_name = _swam_val
            # Try username first, then name
            swam = await db.custom_admins.find_one({"username": _swam_val})
            if not swam:
                swam = await db.custom_admins.find_one({"name": _swam_val})
            if swam:
                assigned_to = swam.get("username", "")

    title = f"{guest_name or 'Guest'} — {cat['label']}" if guest_name else cat["label"]
    description_full = description or ""
    if room_location:
        description_full = f"Location: {room_location}\n\n{description_full}".strip()

    now_iso = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "title": title,
        "description": description_full,
        "category": cat["id"],
        "category_label": cat["label"],
        "priority": priority,
        "status": "open",
        "source_type": "wa_flow",
        "source_registration_id": reg.get("id", "") if reg else "",
        "guest_name": guest_name,
        "guest_mobile": guest_mobile,
        "room_or_location": room_location,
        "created_by": "wa_flow",
        "created_by_name": "WhatsApp Flow",
        "assigned_to": assigned_to,
        "assigned_to_name": assigned_to_name,
        "resolution_time_minutes": sla,
        "notes": "",
        "closing_note": "",
        "resolved_at": "",
        "resolved_by": "",
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    await db.tickets.insert_one(doc)
    doc.pop("_id", None)
    await log_audit("ticket_create", "ticket", doc["id"], title, f"Ticket auto-created from WA Flow: {cat['id']} ({priority})", "WhatsApp Flow")
    return doc, reg, arrived_status

@api_router.get("/webhooks/wa-flow")
async def wa_flow_health():
    """Health check for WhatsApp Flow endpoint (browser only)."""
    return {"status": "ok", "service": "wa-flow-data-exchange"}

@api_router.get("/admin/wa-config-status")
async def wa_config_status(request: Request):
    """Diagnostic: shows which WA credentials the RUNNING backend is using RIGHT NOW.
    Does not expose the full token — only the last 6 chars for verification.
    Use this after a deploy to confirm the new token actually propagated into the live container."""
    await require_superadmin(request)
    tok = os.environ.get("WA_ACCESS_TOKEN", "")
    phone_id = os.environ.get("WA_PHONE_NUMBER_ID", "")
    # Live check: does this token work against Meta right now?
    live_status = "untested"
    verified_name = None
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(
                f"{WA_API_BASE}/{phone_id}?fields=display_phone_number,verified_name",
                headers={"Authorization": f"Bearer {tok}"},
            )
            if r.status_code == 200:
                j = r.json()
                live_status = "valid"
                verified_name = j.get("verified_name")
            else:
                live_status = f"invalid (HTTP {r.status_code})"
    except Exception as e:
        live_status = f"error: {e}"
    return {
        "token_length": len(tok),
        "token_last6": tok[-6:] if tok else "",
        "phone_number_id": phone_id,
        "business_account_id": os.environ.get("WA_BUSINESS_ACCOUNT_ID", ""),
        "meta_verification": {"status": live_status, "verified_name": verified_name},
    }

@api_router.get("/admin/wa-flow-public-key")
async def get_flow_public_key(request: Request):
    """Return the current PEM-encoded RSA public key for WhatsApp Flows data-exchange.
    Upload this to Meta → WhatsApp Manager → Flows → <your flow> → Endpoint → Sign public key.
    Rotating this means Meta must be re-signed with the new key before the flow will open again."""
    await require_admin_readable(request)
    # Preferred: base64 env var (redeploy-proof). Fallback: file on disk.
    pem = None
    pub_b64 = os.environ.get("WA_FLOW_PUBLIC_KEY_B64", "").strip()
    if pub_b64:
        try:
            pem = base64.b64decode(pub_b64).decode("utf-8")
        except Exception as e:
            logger.error(f"[Flow] WA_FLOW_PUBLIC_KEY_B64 decode error: {e}")
    if not pem:
        pub_path = Path("/app/backend/keys/wa_flow_public_key.pem")
        if pub_path.exists():
            pem = pub_path.read_text()
    if not pem:
        raise HTTPException(status_code=404, detail="Public key not configured")
    return {"public_key_pem": pem, "source": "env" if pub_b64 else "file"}


@api_router.post("/admin/wa-flow-upload-public-key")
async def upload_public_key_to_meta(request: Request):
    """One-click registration of the RSA public key with Meta's WhatsApp Business Encryption API.
    Saves the super admin a manual trip to the Meta dashboard.

    Uses: POST /{PHONE_NUMBER_ID}/whatsapp_business_encryption  (Graph API v21.0)
    Required env: WA_ACCESS_TOKEN, WA_PHONE_NUMBER_ID, WA_FLOW_PUBLIC_KEY_B64 (or disk fallback)
    """
    await require_superadmin(request)
    if not WA_PHONE_ID or not WA_TOKEN:
        raise HTTPException(status_code=400, detail="WhatsApp API not configured (WA_PHONE_NUMBER_ID / WA_ACCESS_TOKEN missing)")

    # Load public key PEM (same resolution order as GET endpoint)
    pem = None
    pub_b64 = os.environ.get("WA_FLOW_PUBLIC_KEY_B64", "").strip()
    if pub_b64:
        try:
            pem = base64.b64decode(pub_b64).decode("utf-8")
        except Exception:
            pem = None
    if not pem:
        p = Path("/app/backend/keys/wa_flow_public_key.pem")
        if p.exists():
            pem = p.read_text()
    if not pem:
        raise HTTPException(status_code=404, detail="Public key not configured")

    url = f"{WA_API_BASE}/{WA_PHONE_ID}/whatsapp_business_encryption"
    headers = {"Authorization": f"Bearer {WA_TOKEN}"}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            # Upload key
            post_resp = await client.post(url, headers=headers, data={"business_public_key": pem})
            post_body = post_resp.text
            # Read back current status to confirm
            get_resp = await client.get(url, headers=headers)
            get_body = {}
            try:
                get_body = get_resp.json()
            except Exception:
                get_body = {"raw": get_resp.text}
    except Exception as e:
        logger.exception("[Flow] upload_public_key_to_meta: HTTP error")
        raise HTTPException(status_code=502, detail=f"Graph API request failed: {e}")

    ok = post_resp.status_code in (200, 201)
    if not ok:
        logger.error(f"[Flow] upload_public_key_to_meta failed: {post_resp.status_code} {post_body}")
    await log_audit("wa_flow_key_upload", "wa_flow", "public_key", "RSA Public Key", f"Upload to Meta: status={post_resp.status_code}", "super_admin")
    return {
        "success": ok,
        "upload_status_code": post_resp.status_code,
        "upload_response": post_body[:500] if isinstance(post_body, str) else post_body,
        "current_key_status": get_body,
    }

@api_router.get("/admin/wa-flow-json")
async def get_flow_json(request: Request):
    """Download the Panchariya Seva Desk Flow JSON for Meta Flow Builder."""
    await require_admin_readable(request)
    flow_path = ROOT_DIR / "static" / "panchariya_seva_desk_flow.json"
    if not flow_path.exists():
        raise HTTPException(status_code=404, detail="Flow JSON file not found")
    with open(flow_path) as f:
        return json.load(f)

@api_router.post("/webhooks/wa-flow")
async def wa_flow_data_exchange(request: Request):
    """
    WhatsApp Flows Data Exchange — Panchariya Seva Desk (Help Center).
    Aligned EXACTLY with the current /static/panchariya_seva_desk_flow.json (v7.1, data_api 3.0):

        INTRO (static) → CATEGORY_SELECTION → [data_exchange] → ISSUE_* (static) → [navigate] → SUMMARY_SUBMIT (terminal)

    Only two actions actually require the backend:
      • INIT            → open the flow at INTRO (first screen is static, no data required).
      • data_exchange   → from CATEGORY_SELECTION only: route to the correct ISSUE_* screen,
                          forwarding the chosen `category` id so the ISSUE_* screen's
                          data-schema (`data.category`) is populated and can later be carried
                          into SUMMARY_SUBMIT by the client-side `navigate` payload.

    (The client-side navigate from ISSUE_* → SUMMARY_SUBMIT carries `category`, `request_type`
     and `additional_details` directly — the backend is NOT involved there.)
    """
    try:
        body = await request.json()
    except Exception:
        return PlainTextResponse(content="Bad Request", status_code=400)

    aes_key = None
    iv = None
    is_encrypted = all(k in body for k in ("encrypted_flow_data", "encrypted_aes_key", "initial_vector"))
    if is_encrypted:
        try:
            decrypted, aes_key, iv = _decrypt_flow_request(
                body["encrypted_flow_data"], body["encrypted_aes_key"], body["initial_vector"]
            )
            body = decrypted
        except Exception as e:
            logger.exception(f"[WA Flow] Decryption failed: {e}")
            return PlainTextResponse(content="Decryption error", status_code=421)

    action = body.get("action", "")
    flow_token = body.get("flow_token", "")
    screen = body.get("screen", "")
    flow_data = body.get("data", {}) or {}
    # Always echo the request's data_api version back, per Meta spec.
    version = body.get("version", "3.0")

    logger.info(f"[WA Flow] action={action} screen={screen} flow_token={flow_token} encrypted={is_encrypted} data_keys={list(flow_data.keys())}")

    # Store event for debugging
    await db.wa_flow_events.insert_one({
        "id": str(uuid.uuid4()),
        "action": action, "screen": screen, "flow_token": flow_token,
        "data": flow_data, "encrypted": is_encrypted,
        "received_at": datetime.now(timezone.utc).isoformat(),
    })

    def _respond(payload: dict):
        if is_encrypted:
            encrypted = _encrypt_flow_response(payload, aes_key, iv)
            return PlainTextResponse(content=encrypted, status_code=200)
        return payload

    # Category id → human-readable title (for SUMMARY display + admin ticket/template)
    CATEGORY_TITLES = {
        "paani_chai_coffee":     "Paani / Chai / Coffee",
        "daily_use_items":       "Daily Use Items",
        "medical_sahayata":      "Medical Sahayata",
        "meal_request":          "Meal Request",
        "safai_hygiene":         "Safai & Hygiene",
        "room_utility_issue":    "Room / Utility Issue",
        "bedding_comfort":       "Bedding / Comfort",
        "lost_found_other_help": "Lost & Found / Other Help",
    }
    # Request-type id → title (covers all ISSUE_* screens)
    REQUEST_TYPE_TITLES = {
        # ISSUE_WATER
        "drinking_water_request":   "Drinking Water Request",
        "tea_request":              "Tea Request",
        "coffee_request":           "Coffee Request",
        # ISSUE_DAILY
        "soap_request":             "Soap",
        "shampoo_request":          "Shampoo",
        "toothpaste_request":       "Toothpaste",
        "towel_request":            "Towel",
        "other_daily_item":         "Other Daily Use Item",
        "essential_kit_all_items":  "Essential Kit (All Items)",
        # ISSUE_MEDICAL
        "first_aid_box":            "First Aid Box",
        "headache_medicine":        "Medicine for Headache",
        "cold_medicine":            "Medicine for Cold",
        "fever_medicine":           "Medicine for Fever",
        "medical_emergency":        "Medical Emergency",
        # ISSUE_MEAL
        "extra_meal_request":       "Extra Meal Request",
        "special_meal_request":     "Special Meal Request",
        "meal_not_received":        "Meal Not Received",
        # ISSUE_CLEANING
        "room_cleaning":            "Room Cleaning",
        "washroom_cleaning":        "Washroom Cleaning",
        "garbage_pickup":           "Garbage Pickup",
        "mosquito_pest_control":    "Mosquito / Pest Control",
        # ISSUE_ROOM
        "electricity_issue":        "Electricity Issue",
        "water_supply_issue":       "Water Supply Issue",
        "ac_fan_issue":             "AC / Fan Issue",
        "other_room_utility_issue": "Other Room / Utility Issue",
        # ISSUE_BEDDING
        "blanket_request":          "Blanket Request",
        "pillow_request":           "Pillow Request",
        "bedsheet_request":         "Bedsheet Request",
        "extra_bedding_request":    "Extra Bedding Request",
        # ISSUE_OTHER
        "lost_found":               "Lost & Found",
        "general_help":             "General Help",
        "other_request":            "Other Request",
    }
    ISSUE_SCREENS = {
        "ISSUE_WATER", "ISSUE_DAILY", "ISSUE_MEDICAL", "ISSUE_MEAL",
        "ISSUE_CLEANING", "ISSUE_ROOM", "ISSUE_BEDDING", "ISSUE_OTHER",
    }

    # Category id (as set in CATEGORY_SELECTION Dropdown) → target ISSUE_* screen id.
    # Keys MUST match the Dropdown ids in panchariya_seva_desk_flow.json.
    CATEGORY_TO_ISSUE_SCREEN = {
        "paani_chai_coffee":     "ISSUE_WATER",
        "daily_use_items":       "ISSUE_DAILY",
        "medical_sahayata":      "ISSUE_MEDICAL",
        "meal_request":          "ISSUE_MEAL",
        "safai_hygiene":         "ISSUE_CLEANING",
        "room_utility_issue":    "ISSUE_ROOM",
        "bedding_comfort":       "ISSUE_BEDDING",
        "lost_found_other_help": "ISSUE_OTHER",
    }

    # ── ping — Meta periodic health check ──
    if action == "ping":
        return _respond({"version": version, "data": {"status": "active"}})

    # ── INIT — user just opened the Flow. First screen is static INTRO. ──
    if action == "INIT":
        return _respond({"version": version, "screen": "INTRO", "data": {}})

    # ── BACK — echo current screen & data ──
    if action == "BACK":
        return _respond({"version": version, "screen": screen or "INTRO", "data": flow_data or {}})

    # ── data_exchange — two hops in this flow ──
    if action == "data_exchange":
        # HOP 1 — CATEGORY_SELECTION → ISSUE_*
        if screen == "CATEGORY_SELECTION":
            category = (flow_data.get("category") or "").strip()
            target_screen = CATEGORY_TO_ISSUE_SCREEN.get(category, "ISSUE_OTHER")
            logger.info(f"[WA Flow] CATEGORY_SELECTION → {target_screen} (category={category})")
            return _respond({
                "version": version,
                "screen": target_screen,
                "data": {"category": category},
            })

        # HOP 2 — ISSUE_* → SUMMARY_SUBMIT
        # Backend binds category/request_type (ids + friendly titles) + additional_details
        # onto SUMMARY_SUBMIT's data so the three text lines auto-populate reliably.
        if screen in ISSUE_SCREENS:
            category = (flow_data.get("category") or "").strip()
            request_type = (flow_data.get("request_type") or "").strip()
            additional_details = (flow_data.get("additional_details") or "").strip()
            category_title = CATEGORY_TITLES.get(category, category or "-")
            request_type_title = REQUEST_TYPE_TITLES.get(request_type, request_type or "-")
            logger.info(
                f"[WA Flow] {screen} → SUMMARY_SUBMIT "
                f"(category={category}, request_type={request_type}, details_len={len(additional_details)})"
            )
            return _respond({
                "version": version,
                "screen": "SUMMARY_SUBMIT",
                "data": {
                    "category": category,
                    "request_type": request_type,
                    "additional_details": additional_details or "-",
                    "category_title": category_title,
                    "request_type_title": request_type_title,
                },
            })

        # Any other data_exchange is unexpected — just acknowledge without changing screen.
        logger.warning(f"[WA Flow] Unexpected data_exchange from screen={screen!r}, data={flow_data}")
        return _respond({"version": version, "screen": screen or "INTRO", "data": flow_data or {}})

    # Unknown action — safe fallback.
    logger.warning(f"[WA Flow] Unknown action={action!r} — falling back to INTRO")
    return _respond({"version": version, "screen": "INTRO", "data": {}})

# ─── Flow Session CRUD (for testing / manual flow_token→phone mapping) ───
@api_router.post("/admin/wa-flow-sessions")
async def create_flow_session(request: Request):
    """Manually bind a flow_token to a phone number. Normally done when sending the template with Flow CTA (Session 4B)."""
    await require_superadmin(request)
    body = await request.json()
    flow_token = (body.get("flow_token") or "").strip()
    phone = (body.get("phone") or "").strip().lstrip("+")
    if not flow_token or not phone:
        raise HTTPException(status_code=400, detail="flow_token and phone are required")
    doc = {
        "id": str(uuid.uuid4()), "flow_token": flow_token, "phone": phone,
        "status": "pending", "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.wa_flow_sessions.update_one({"flow_token": flow_token}, {"$set": doc}, upsert=True)
    return doc

# ─── Flow Configuration CRUD ───
@api_router.get("/admin/wa-flows")
async def list_flows(request: Request):
    await require_admin_readable(request)
    flows = await db.wa_flow_configs.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return flows

@api_router.post("/admin/wa-flows")
async def create_flow(request: Request):
    user = await require_superadmin(request)
    body = await request.json()
    doc = {
        "id": str(uuid.uuid4()),
        "flow_name": body.get("flow_name", ""),
        "flow_id": body.get("flow_id", ""),
        "flow_token": body.get("flow_token", ""),
        "description": body.get("description", ""),
        "trigger_keywords": body.get("trigger_keywords", []),
        "keyword_template_name": body.get("keyword_template_name", ""),
        "keyword_template_language": body.get("keyword_template_language", "en"),
        "is_active": True,
        "init_response": body.get("init_response", {}),
        "screens": body.get("screens", {}),
        "created_by": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.wa_flow_configs.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/admin/wa-flows/{flow_id}")
async def update_flow(flow_id: str, request: Request):
    await require_superadmin(request)
    body = await request.json()
    updates = {k: v for k, v in body.items() if k in ("flow_name", "flow_id", "flow_token", "description", "trigger_keywords", "keyword_template_name", "keyword_template_language", "is_active", "init_response", "screens")}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.wa_flow_configs.update_one({"id": flow_id}, {"$set": updates})
    return {"message": "Updated"}

@api_router.delete("/admin/wa-flows/{flow_id}")
async def delete_flow(flow_id: str, request: Request):
    await require_superadmin(request)
    await db.wa_flow_configs.delete_one({"id": flow_id})
    return {"message": "Deleted"}

@api_router.get("/admin/wa-flow-events")
async def list_flow_events(request: Request, page: int = 1, per_page: int = 50):
    await require_admin_readable(request)
    total = await db.wa_flow_events.count_documents({})
    skip = (page - 1) * per_page
    events = await db.wa_flow_events.find({}, {"_id": 0}).sort("received_at", -1).skip(skip).limit(per_page).to_list(per_page)
    return {"data": events, "total": total, "page": page}

# ─── System Message Triggers ───
SYSTEM_TRIGGERS = [
    {"key": "registration_submitted", "type": "user", "label": "Registration Submitted", "description": "When a guest submits registration form", "recipient_logic": "registrant_mobile"},
    {"key": "arrival_confirmed", "type": "user", "label": "Arrival Confirmed", "description": "When guest is checked in via QR scan", "recipient_logic": "registrant_mobile"},
    {"key": "help_ticket_response", "type": "user", "label": "Help Ticket Response", "description": "When admin responds to a help request", "recipient_logic": "registrant_mobile"},
    {"key": "departure_marked", "type": "user", "label": "Departure Marked", "description": "When guest is marked as departed", "recipient_logic": "registrant_mobile"},
    # ── Help Centre / WA Flow triggers (Session 4B) ──
    {"key": "hc_flow_captured", "type": "user", "label": "HC: Query Captured", "description": "Confirms ticket capture with SLA + escalation notice (guest is on-premise)", "recipient_logic": "registrant_mobile"},
    {"key": "hc_flow_not_on_premise", "type": "user", "label": "HC: Not on Premise", "description": "Sent when help-form submitter is NOT in arrived-guest list", "recipient_logic": "registrant_mobile"},
    {"key": "hc_ticket_resolved", "type": "user", "label": "HC: Ticket Resolved", "description": "Sent to guest when swayamsevak marks ticket resolved", "recipient_logic": "registrant_mobile"},
    # ── Admin / Swayamsevak triggers ──
    {"key": "help_ticket_created", "type": "admin", "label": "Help Ticket Created", "description": "When a guest raises a help request — notifies assigned Swayamsevak (POC)", "recipient_logic": "assigned_swamsevak_mobile"},
    {"key": "hc_ticket_escalated_all", "type": "admin", "label": "HC: Ticket Escalated (All Swayamsevaks)", "description": "When SLA breached — broadcasts to ALL swayamsevaks", "recipient_logic": "all_swamsevaks_mobile"},
    {"key": "guest_arrived", "type": "admin", "label": "Guest Arrived", "description": "When assigned guest checks in", "recipient_logic": "assigned_swamsevak_mobile"},
]

@api_router.get("/admin/wa-triggers")
async def list_wa_triggers(request: Request):
    await require_admin_readable(request)
    configs = await db.wa_triggers.find({}, {"_id": 0}).to_list(100)
    config_map = {c["trigger_key"]: c for c in configs}
    result = []
    for t in SYSTEM_TRIGGERS:
        existing = config_map.get(t["key"], {})
        result.append({
            **t,
            "id": existing.get("id", ""),
            "enabled": existing.get("enabled", False),
            "template_id": existing.get("template_id", ""),
            "template_name": existing.get("template_name", ""),
            "delay_minutes": existing.get("delay_minutes", 0),
        })
    return result

@api_router.put("/admin/wa-triggers/{trigger_key}")
async def update_wa_trigger(trigger_key: str, request: Request):
    user = await require_superadmin(request)
    body = await request.json()
    existing = await db.wa_triggers.find_one({"trigger_key": trigger_key})
    updates = {
        "trigger_key": trigger_key,
        "enabled": body.get("enabled", False),
        "template_id": body.get("template_id", ""),
        "template_name": body.get("template_name", ""),
        "delay_minutes": int(body.get("delay_minutes", 0) or 0),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if existing:
        await db.wa_triggers.update_one({"trigger_key": trigger_key}, {"$set": updates})
    else:
        updates["id"] = str(uuid.uuid4())
        updates["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.wa_triggers.insert_one(updates)
    await log_audit("wa_trigger_update", "wa_trigger", trigger_key, trigger_key,
                    f"Trigger {'enabled' if updates['enabled'] else 'disabled'}", user["name"])
    return {"message": "Updated"}

async def fire_system_trigger(trigger_key: str, phone: str, variables: dict = None):
    """Fire a system message trigger if enabled.
    The `variables` dict should include MULTIPLE alias keys (e.g., 'name', 'guest_name',
    'shraddhalu_name') so the trigger resolves regardless of which variable label the admin
    used when they configured the Meta template."""
    config = await db.wa_triggers.find_one({"trigger_key": trigger_key, "enabled": True})
    if not config or not config.get("template_id"):
        logger.info(f"[Trigger] {trigger_key}: skipped (not enabled or no template set)")
        return
    tmpl = await db.wa_templates.find_one({"id": config["template_id"]}, {"_id": 0})
    if not tmpl:
        logger.warning(f"[Trigger] {trigger_key}: template_id {config['template_id']} not found in wa_templates — cannot send")
        return
    body_params = []
    # Build a case-insensitive alias map of the passed variables, so labels like "Name",
    # "guest_name", "GUEST_NAME", "shraddhalu_name" all resolve to the same value.
    vmap = {}
    for k, v in (variables or {}).items():
        if v is None:
            v = ""
        key = str(k).strip().lower().replace(" ", "_")
        vmap[key] = str(v)
    def _resolve(label):
        key = str(label).strip().lower().replace(" ", "_").lstrip("{").rstrip("}")
        # strip leading numeric sign ($, #) and "var_" prefix
        if key.startswith("var_"):
            key = key[4:]
        return vmap.get(key, "")
    if tmpl.get("variable_labels"):
        for label in tmpl["variable_labels"]:
            body_params.append(_resolve(label))
    elif tmpl.get("variable_count"):
        # Template uses positional {{1}}, {{2}} placeholders only (no labels).
        # Use passed-in list in `variables["_positional"]` if any, else fallback to alias keys named var_1, var_2...
        positional = (variables or {}).get("_positional") or []
        for i in range(int(tmpl.get("variable_count") or 0)):
            if i < len(positional):
                body_params.append(str(positional[i]))
            else:
                body_params.append(vmap.get(f"var_{i+1}", vmap.get(str(i+1), "")))
    logger.info(f"[Trigger] {trigger_key}: firing template='{tmpl.get('meta_template_name')}' to {phone} params={body_params}")
    # Honor delay_minutes setting
    delay_minutes = int(config.get("delay_minutes", 0) or 0)
    if delay_minutes > 0:
        logger.info(f"[Trigger] {trigger_key}: delaying {delay_minutes} minute(s)")
        await asyncio.sleep(delay_minutes * 60)
    # Queue the message
    queue_doc = {
        "id": str(uuid.uuid4()),
        "type": "system_trigger",
        "trigger_key": trigger_key,
        "phone_number": phone,
        "template_name": tmpl.get("meta_template_name", ""),
        "template_language": tmpl.get("language", "en"),
        "body_params": body_params,
        "media_url": "",
        "status": "queued",
        "retry_count": 0, "max_retries": 3,
        "wa_message_id": "",
        "error_detail": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.wa_message_queue.insert_one(queue_doc)
    # Process immediately in background
    asyncio.create_task(process_queue_item(queue_doc["id"]))

# ═══════════════════════════════════════════════════════════════
# HELP CENTRE · SYSTEM TRIGGER WIRING (Session 4B)
# ═══════════════════════════════════════════════════════════════
async def fire_hc_flow_outcome(phone: str, arrived_status: str, ticket: dict):
    """Called after a WA Flow submission creates a ticket. Fires either
    hc_flow_captured (on-premise) or hc_flow_not_on_premise (off-premise)."""
    sla_minutes = int(ticket.get("resolution_time_minutes") or 0)
    sla_human = f"{sla_minutes} minutes" if sla_minutes and sla_minutes < 60 else (f"{sla_minutes // 60} hour(s)" if sla_minutes else "")
    # Friendly titles (injected by _handle_flow_completion into the in-memory ticket dict)
    _cat_title = ticket.get("_category_title") or ticket.get("category_label") or ticket.get("category", "")
    _req_title = ticket.get("_request_type_title") or ticket.get("category_label") or ""
    _addl = ticket.get("_additional_details") or ""
    _room = ticket.get("room_or_location", "") or "-"
    variables = {
        # Guest identity
        "guest_name": ticket.get("guest_name", ""),
        "name": ticket.get("guest_name", ""),
        # Ticket identity
        "ticket_id": (ticket.get("id") or "")[:8].upper(),
        # What was requested (multiple aliases so any template labeling works)
        "service_type": _req_title or _cat_title,
        "category": _cat_title,
        "category_title": _cat_title,
        "request_type": _req_title,
        "request_type_title": _req_title,
        "additional_details": _addl or "-",
        "details": _addl or "-",
        "description": _addl or "-",
        # Room (all aliases)
        "room": _room, "room_no": _room, "room_number": _room,
        "room_or_location": _room, "location": _room,
        # SLA / priority
        "priority": ticket.get("priority", ""),
        "sla_minutes": str(sla_minutes),
        "sla": sla_human,
        "arrived_status": arrived_status,
    }
    if arrived_status == "on_premise":
        await fire_system_trigger("hc_flow_captured", phone, variables)
    else:
        await fire_system_trigger("hc_flow_not_on_premise", phone, variables)
    # Also notify the assigned Swayamsevak (POC) if any
    if ticket.get("assigned_to"):
        swam = await db.custom_admins.find_one({"username": ticket["assigned_to"]}, {"_id": 0})
        if not swam:
            swam = await db.custom_admins.find_one({"name": ticket.get("assigned_to_name", "")}, {"_id": 0})
        swam_phone = (swam.get("phone") or swam.get("mobile") or "") if swam else ""
        if swam and swam_phone:
            poc_vars = {
                "swamsevak_name": swam.get("name", ""),
                "guest_name": ticket.get("guest_name", ""),
                "guest_mobile": ticket.get("guest_mobile", ""),
                "ticket_id": (ticket.get("id") or "")[:8].upper(),
                "service_type": _req_title or _cat_title,
                "category": _cat_title,
                "request_type": _req_title,
                "priority": ticket.get("priority", ""),
                "room_or_location": _room, "room": _room,
                "room_no": _room, "room_number": _room, "location": _room,
                "description": (_addl or ticket.get("description", "") or "")[:200],
                "details": (_addl or ticket.get("description", "") or "")[:200],
                "additional_details": (_addl or ticket.get("description", "") or "")[:200],
            }
            await fire_system_trigger("help_ticket_created", swam_phone, poc_vars)

async def fire_hc_ticket_resolved(ticket: dict):
    """Called when a ticket is marked resolved. Notifies the guest."""
    phone = ticket.get("guest_mobile", "")
    if not phone:
        return
    variables = {
        "guest_name": ticket.get("guest_name", ""),
        "ticket_id": (ticket.get("id") or "")[:8].upper(),
        "service_type": ticket.get("category_label") or ticket.get("category", ""),
        "resolved_by_name": ticket.get("resolved_by_name", ""),
        "closing_note": (ticket.get("closing_note", "") or "")[:300],
    }
    await fire_system_trigger("hc_ticket_resolved", phone, variables)

async def fire_hc_ticket_escalated_all(ticket: dict):
    """Called when a ticket breaches SLA. Broadcasts to all swayamsevaks."""
    swamsevaks = await db.custom_admins.find({"role": {"$in": ["swamsevak", "admin"]}}, {"_id": 0}).to_list(1000)
    base_vars = {
        "ticket_id": (ticket.get("id") or "")[:8].upper(),
        "guest_name": ticket.get("guest_name", ""),
        "guest_mobile": ticket.get("guest_mobile", ""),
        "service_type": ticket.get("category_label") or ticket.get("category", ""),
        "priority": ticket.get("priority", ""),
        "room_or_location": ticket.get("room_or_location", ""),
        "description": (ticket.get("description", "") or "")[:200],
        "assigned_to_name": ticket.get("assigned_to_name", ""),
    }
    fired = 0
    for s in swamsevaks:
        s_phone = s.get("phone") or s.get("mobile") or ""
        if s_phone:
            vars_for_s = {**base_vars, "swamsevak_name": s.get("name", "")}
            await fire_system_trigger("hc_ticket_escalated_all", s_phone, vars_for_s)
            fired += 1
    logger.info(f"[HC Escalation] Ticket {ticket.get('id')} broadcast to {fired} swayamsevaks")
    return fired

async def sla_escalation_scanner():
    """Background task: every 60s, find tickets whose SLA is breached & not yet escalated, fire escalation broadcast."""
    while True:
        try:
            now = datetime.now(timezone.utc)
            # Find open tickets past SLA that haven't been escalated yet
            cursor = db.tickets.find({
                "status": {"$in": ["open", "in_progress"]},
                "escalated_at": {"$in": [None, ""]},
            }, {"_id": 0})
            count = 0
            async for t in cursor:
                try:
                    created = t.get("created_at", "")
                    sla_min = int(t.get("resolution_time_minutes") or 0)
                    if not created or not sla_min:
                        continue
                    created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                    age_min = (now - created_dt).total_seconds() / 60
                    if age_min >= sla_min:
                        await db.tickets.update_one({"id": t["id"]}, {"$set": {
                            "escalated_at": now.isoformat(), "escalation_level": "all_swamsevaks",
                        }})
                        await fire_hc_ticket_escalated_all(t)
                        count += 1
                except Exception as e:
                    logger.warning(f"[SLA Scanner] error on ticket {t.get('id')}: {e}")
            if count:
                logger.info(f"[SLA Scanner] Escalated {count} tickets to all swayamsevaks")
        except Exception as e:
            logger.exception(f"[SLA Scanner] loop error: {e}")
        await asyncio.sleep(60)

@api_router.post("/admin/tickets/escalate-check")
async def admin_escalate_check(request: Request):
    """Manual endpoint to run SLA escalation check immediately (admin tool)."""
    await require_superadmin(request)
    now = datetime.now(timezone.utc)
    escalated = []
    async for t in db.tickets.find({
        "status": {"$in": ["open", "in_progress"]},
        "escalated_at": {"$in": [None, ""]},
    }, {"_id": 0}):
        created = t.get("created_at", "")
        sla_min = int(t.get("resolution_time_minutes") or 0)
        if not created or not sla_min:
            continue
        created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
        age_min = (now - created_dt).total_seconds() / 60
        if age_min >= sla_min:
            await db.tickets.update_one({"id": t["id"]}, {"$set": {
                "escalated_at": now.isoformat(), "escalation_level": "all_swamsevaks",
            }})
            fired = await fire_hc_ticket_escalated_all(t)
            escalated.append({"ticket_id": t["id"], "swamsevaks_notified": fired})
    return {"escalated_count": len(escalated), "details": escalated}

# ─── Keyword → Template-with-Flow-CTA helper (Session 4B) ───
async def send_wa_flow_template(phone: str, template_name: str, language: str, flow_id: str,
                                flow_cta_text: str = "Open", flow_action: str = "data_exchange",
                                body_params: list = None):
    """Send a WhatsApp template that contains a Flow CTA button.
    Mints a flow_token, binds it to the phone (so Flow submission knows the user), then sends
    the template with the flow parameters. Returns (success, wa_message_id_or_error, flow_token).

    Automatically attaches the header media (image / video / document) from our wa_templates
    record so that templates with a media header on Meta don't error with
    (#132012) Parameter format does not match format in the created template.
    """
    if not WA_PHONE_ID or not WA_TOKEN:
        return False, "WhatsApp API not configured", ""
    flow_token = f"hc_{uuid.uuid4().hex[:16]}"
    # Bind token → phone first so Flow submission can resolve phone
    await db.wa_flow_sessions.update_one(
        {"flow_token": flow_token},
        {"$set": {
            "id": str(uuid.uuid4()), "flow_token": flow_token,
            "phone": normalize_phone_for_wa(phone),
            "status": "awaiting_submission",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True
    )
    clean_phone = normalize_phone_for_wa(phone)

    # Look up the template doc to figure out header media (if any) so we attach the
    # header component when Meta's template requires one.
    tmpl_doc = await db.wa_templates.find_one(
        {"meta_template_name": template_name, "language": language}, {"_id": 0}
    )
    if not tmpl_doc:
        tmpl_doc = await db.wa_templates.find_one({"meta_template_name": template_name}, {"_id": 0}) or {}

    components = []

    # 1. Header media (only if the template has one)
    header_type = (tmpl_doc.get("header_type") or "").lower()
    header_url = tmpl_doc.get("header_media_url") or ""
    if header_type in ("image", "video", "document") and header_url:
        components.append({
            "type": "header",
            "parameters": [{"type": header_type, header_type: {"link": header_url}}],
        })

    # 2. Body params (only if template has variables)
    if body_params:
        components.append({
            "type": "body",
            "parameters": [{"type": "text", "text": str(v)} for v in body_params],
        })

    # 3. Flow CTA button. For templates configured with action type = "Complete flow" +
    # "Pre-defined screen", Meta does NOT accept flow_action_data — sending an empty
    # object causes (#132012). Only include it when we actually have data to pass.
    flow_action_obj = {"flow_token": flow_token}
    components.append({
        "type": "button",
        "sub_type": "flow",
        "index": "0",
        "parameters": [{"type": "action", "action": flow_action_obj}],
    })

    payload = {
        "messaging_product": "whatsapp",
        "to": clean_phone,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": language},
            "components": components,
        }
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client_http:
            resp = await client_http.post(
                f"{WA_API_BASE}/{WA_PHONE_ID}/messages",
                headers={"Authorization": f"Bearer {WA_TOKEN}", "Content-Type": "application/json"},
                json=payload
            )
            data = resp.json()
            if resp.status_code == 200 and data.get("messages"):
                return True, data["messages"][0]["id"], flow_token
            err = data.get("error", {}).get("message", str(data))
            err_code = data.get("error", {}).get("code", "")
            logger.error(
                f"[send_wa_flow_template] Meta rejected template={template_name} "
                f"code={err_code} msg={err} payload_components={[c['type'] for c in components]}"
            )
            return False, f"({err_code}) {err}" if err_code else err, flow_token
    except Exception as e:
        return False, str(e), flow_token

async def process_queue_item(queue_id: str):
    """Process a single queued message"""
    item = await db.wa_message_queue.find_one({"id": queue_id})
    if not item:
        return
    await db.wa_message_queue.update_one({"id": queue_id}, {"$set": {"status": "processing"}})
    success, result = await send_whatsapp_template(
        phone=item["phone_number"],
        template_name=item["template_name"],
        language=item.get("template_language", "en"),
        body_params=item.get("body_params") or None,
        header_media_url=item.get("media_url") or None,
    )
    if success:
        await db.wa_message_queue.update_one({"id": queue_id}, {"$set": {
            "status": "sent", "wa_message_id": result,
            "processed_at": datetime.now(timezone.utc).isoformat()
        }})
        # Log outgoing system notification in conversation so it's visible in chat view
        try:
            conv_phone = normalize_phone_for_wa(item["phone_number"])
            now_iso = datetime.now(timezone.utc).isoformat()
            trigger_key = item.get("trigger_key", "")
            trigger_label = trigger_key.replace("_", " ").title() if trigger_key else "System"
            msg_doc = {
                "id": str(uuid.uuid4()), "direction": "outgoing",
                "text": f"[System: {trigger_label}] Template: {item['template_name']}",
                "msg_type": "system_notification",
                "wa_message_id": result, "timestamp": now_iso,
                "status": "sent", "sent_by": "System Trigger",
                "trigger_key": trigger_key,
            }
            conv = await db.wa_conversations.find_one({"phone": conv_phone})
            if conv:
                await db.wa_conversations.update_one({"phone": conv_phone}, {
                    "$push": {"messages": msg_doc},
                    "$set": {"last_message": f"[{trigger_label}]", "last_message_at": now_iso}
                })
            else:
                await db.wa_conversations.insert_one({
                    "id": str(uuid.uuid4()), "phone": conv_phone,
                    "contact_name": "", "unread_count": 0,
                    "last_message": f"[{trigger_label}]", "last_message_at": now_iso,
                    "created_at": now_iso, "messages": [msg_doc],
                })
        except Exception as e:
            logger.warning(f"[Trigger] conversation log failed for queue {queue_id}: {e}")
    else:
        retry = item.get("retry_count", 0) + 1
        if retry < item.get("max_retries", 3):
            await db.wa_message_queue.update_one({"id": queue_id}, {"$set": {
                "status": "retry", "retry_count": retry, "error_detail": result,
                "next_retry_at": (datetime.now(timezone.utc) + timedelta(minutes=retry * 5)).isoformat()
            }})
        else:
            await db.wa_message_queue.update_one({"id": queue_id}, {"$set": {
                "status": "failed", "retry_count": retry, "error_detail": result,
                "processed_at": datetime.now(timezone.utc).isoformat()
            }})

# ─── Message Queue Log ───
@api_router.get("/admin/wa-queue")
async def list_wa_queue(request: Request, page: int = 1, per_page: int = 50, status_filter: str = ""):
    await require_admin_readable(request)
    query = {}
    if status_filter:
        query["status"] = status_filter
    total = await db.wa_message_queue.count_documents(query)
    skip = (page - 1) * per_page
    items = await db.wa_message_queue.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(per_page).to_list(per_page)
    return {"data": items, "total": total, "page": page, "total_pages": max(1, math.ceil(total / per_page))}

# ═══════════════════════════════════════════════════════════════
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
    # Fire departure_marked trigger
    try:
        _primary_phone = reg.get("primary_mobile", "")
        _room = ""
        ra = reg.get("room_assignments") or []
        if ra:
            _room = (ra[0].get("room_code") if isinstance(ra[0], dict) else str(ra[0])) if ra else ""
        _base_vars = {
            "name": head_name, "guest_name": head_name, "shraddhalu_name": head_name,
            "mobile": _primary_phone, "phone": _primary_phone,
            "room": _room, "room_code": _room, "room_no": _room,
            "_positional": [head_name, _room],
        }
        await fire_system_trigger("departure_marked", _primary_phone, _base_vars)
    except Exception as e:
        logger.warning(f"[Trigger] departure trigger failed in confirm_departure: {e}")
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
async def dashboard_drill_down(request: Request, field: str = "", value: str = "", ref_person: str = ""):
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
    elif field == "attendee_arrival_status":
        # Drill-down into families that contain at least one attendee with the given status.
        # Used by the Command Centre "Present" and "Absent" buttons to list families
        # that have people in those states.
        if value == "arrived":
            query["attendees.arrival_status"] = "arrived"
        else:  # absent: registration already arrived but attendees marked not_arrived / not_coming
            query["arrival_status"] = {"$in": ["arrived", "partially_arrived", "departed"]}
            query["attendees.arrival_status"] = {"$in": ["not_arrived", "not_coming"]}
    elif field == "pending":
        query = {"approval_status": "pending"}
    elif field == "reference_person":
        query["reference_person_name"] = value
    elif field == "relation_category":
        query["relation_category"] = value
        if ref_person:
            query["reference_person_name"] = ref_person
    elif field == "ref_relation":
        # Combined: reference person + relation category
        parts = value.split("|", 1)
        if len(parts) == 2:
            query["reference_person_name"] = parts[0]
            query["relation_category"] = parts[1]
    regs = await db.registrations.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
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
            "reference_person_name": r.get("reference_person_name", ""),
            "relation_category": r.get("relation_category", ""),
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

@extra_router.get("/admin/ref-relation-stats")
async def get_ref_relation_stats(request: Request):
    """Reference Person × Relation breakdown: expected + arrived guests only (exclude pending)"""
    await get_current_user(request)
    # Get all approved registrations (expected + arrived, not pending)
    regs = await db.registrations.find(
        {"approval_status": "approved"},
        {"_id": 0, "reference_person_name": 1, "reference_person_id": 1, "relation_category": 1,
         "num_people": 1, "attendees": 1, "group_head_id": 1, "arrival_status": 1, "primary_mobile": 1, "id": 1}
    ).to_list(5000)
    # Resolve reference person names where needed
    ref_map = {}
    ref_ids_to_resolve = set()
    for r in regs:
        if r.get("reference_person_name"):
            continue
        if r.get("reference_person_id"):
            ref_ids_to_resolve.add(r["reference_person_id"])
    if ref_ids_to_resolve:
        rps = await db.reference_persons.find({"id": {"$in": list(ref_ids_to_resolve)}}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
        for rp in rps:
            ref_map[rp["id"]] = rp["name"]
    # Build stats
    ref_stats = {}  # ref_name -> { total_families, total_people, relations: { rel_name -> { families, people, expected_families, expected_people, arrived_families, arrived_people } } }
    for r in regs:
        ref_name = r.get("reference_person_name") or ref_map.get(r.get("reference_person_id", ""), "")
        if not ref_name:
            ref_name = "Unknown"
        rel = r.get("relation_category", "") or "Other"
        n_people = r.get("num_people", 1)
        is_arrived = r.get("arrival_status") in ("arrived", "partially_arrived", "departed")
        if ref_name not in ref_stats:
            ref_stats[ref_name] = {"total_families": 0, "total_people": 0, "expected_families": 0, "expected_people": 0, "arrived_families": 0, "arrived_people": 0, "relations": {}}
        ref_stats[ref_name]["total_families"] += 1
        ref_stats[ref_name]["total_people"] += n_people
        if is_arrived:
            ref_stats[ref_name]["arrived_families"] += 1
            ref_stats[ref_name]["arrived_people"] += n_people
        else:
            ref_stats[ref_name]["expected_families"] += 1
            ref_stats[ref_name]["expected_people"] += n_people
        if rel not in ref_stats[ref_name]["relations"]:
            ref_stats[ref_name]["relations"][rel] = {"families": 0, "people": 0, "expected_families": 0, "expected_people": 0, "arrived_families": 0, "arrived_people": 0}
        ref_stats[ref_name]["relations"][rel]["families"] += 1
        ref_stats[ref_name]["relations"][rel]["people"] += n_people
        if is_arrived:
            ref_stats[ref_name]["relations"][rel]["arrived_families"] += 1
            ref_stats[ref_name]["relations"][rel]["arrived_people"] += n_people
        else:
            ref_stats[ref_name]["relations"][rel]["expected_families"] += 1
            ref_stats[ref_name]["relations"][rel]["expected_people"] += n_people
    # Convert to list sorted by total_families desc
    result = []
    for name, stats in sorted(ref_stats.items(), key=lambda x: x[1]["total_families"], reverse=True):
        relations = []
        for rel_name, rel_stats in sorted(stats["relations"].items(), key=lambda x: x[1]["families"], reverse=True):
            relations.append({"name": rel_name, **rel_stats})
        result.append({"name": name, "total_families": stats["total_families"], "total_people": stats["total_people"],
                        "expected_families": stats["expected_families"], "expected_people": stats["expected_people"],
                        "arrived_families": stats["arrived_families"], "arrived_people": stats["arrived_people"],
                        "relations": relations})
    return result

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

# Serve static files (documents, media)
from fastapi.staticfiles import StaticFiles
import os as _os
_static_dir = _os.path.join(_os.path.dirname(__file__), "static")
if _os.path.isdir(_static_dir):
    app.mount("/api/static", StaticFiles(directory=_static_dir), name="static")

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
    await db.wa_templates.create_index("id", unique=True, sparse=True)
    await db.wa_campaigns.create_index("id", unique=True, sparse=True)
    await db.wa_campaign_recipients.create_index("campaign_id")
    await db.wa_campaign_recipients.create_index("wa_message_id", sparse=True)
    await db.wa_message_queue.create_index("id", unique=True, sparse=True)
    await db.wa_triggers.create_index("trigger_key", unique=True, sparse=True)
    await db.wa_webhook_events.create_index("wa_message_id")
    await db.wa_conversations.create_index("phone", unique=True, sparse=True)
    await db.wa_conversations.create_index("last_message_at")

    # Seed Panchariya family reference tree (idempotent, marker: is_family_tree=True)
    try:
        ft_path = ROOT_DIR / "data" / "family_tree.json"
        if ft_path.exists():
            with open(ft_path, "r", encoding="utf-8") as fh:
                ft_data = json.load(fh)
            ft_nodes = ft_data.get("nodes", [])
            # Build path map for breadcrumbs
            ft_by_id = {n["id"]: n for n in ft_nodes}
            def _path(nid):
                out = []
                cur = ft_by_id.get(nid)
                while cur:
                    out.insert(0, cur["name"])
                    cur = ft_by_id.get(cur.get("parent_id")) if cur.get("parent_id") else None
                return out
            now_iso = datetime.now(timezone.utc).isoformat()
            for n in ft_nodes:
                await db.reference_persons.update_one(
                    {"id": n["id"]},
                    {"$set": {
                        "id": n["id"],
                        "name": n["name"],
                        "parent_id": n.get("parent_id"),
                        "path": _path(n["id"]),
                        "is_family_tree": True,
                        "rank": 0,
                        "description": "",
                        "relation_categories": [],
                        "updated_at": now_iso,
                    }, "$setOnInsert": {"created_at": now_iso}},
                    upsert=True,
                )
            # Also seed the fallback ("I don't know") so backend lookups resolve its name
            fb = ft_data.get("fallback")
            if fb and fb.get("id"):
                await db.reference_persons.update_one(
                    {"id": fb["id"]},
                    {"$set": {
                        "id": fb["id"],
                        "name": fb.get("name_en", "I don't know / Not sure"),
                        "name_hi": fb.get("name_hi", ""),
                        "parent_id": None,
                        "path": [],
                        "is_family_tree": True,
                        "is_fallback": True,
                        "rank": 999,
                        "description": "",
                        "relation_categories": [],
                        "updated_at": now_iso,
                    }, "$setOnInsert": {"created_at": now_iso}},
                    upsert=True,
                )
            logger.info(f"[Seed] Family reference tree: {len(ft_nodes)} nodes upserted")
    except Exception as ft_err:
        logger.warning(f"[Seed] Family tree seed skipped: {ft_err}")

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

    # Seed default ticket categories (matching WA Flow service IDs) if empty
    await db.ticket_categories.create_index("id", unique=True, sparse=True)
    await seed_ticket_categories()

    # Indexes for Flow + auto-response
    await db.wa_flow_sessions.create_index("flow_token", unique=True, sparse=True)
    await db.wa_auto_responses.create_index("id", unique=True, sparse=True)

    # Purge wa_triggers rows for triggers that have been removed from SYSTEM_TRIGGERS
    _valid_trigger_keys = [t["key"] for t in SYSTEM_TRIGGERS]
    _removed = await db.wa_triggers.delete_many({"trigger_key": {"$nin": _valid_trigger_keys}})
    if _removed.deleted_count:
        logger.info(f"[Cleanup] Removed {_removed.deleted_count} obsolete wa_triggers rows")

    # Session 4B: kick off SLA escalation scanner (runs every 60s)
    asyncio.create_task(sla_escalation_scanner())
    logger.info("[HC] SLA escalation scanner started")

    logger.info("V2 startup complete")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
