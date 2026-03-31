from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, Request, HTTPException, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from pathlib import Path
from fpdf import FPDF
import os, logging, jwt, csv, io, uuid, math

ROOT_DIR = Path(__file__).parent
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")
JWT_ALGORITHM = "HS256"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

ADMIN_ACCOUNTS = {
    "arunpanchariya": {"password": "arunlondon123", "name": "Arun Panchariya", "city": "London"},
    "ashokpanchariya": {"password": "ashokahmedabad123", "name": "Ashok Panchariya", "city": "Ahmedabad"},
    "satishpanchariya": {"password": "satishmumbai123", "name": "Satish Panchariya", "city": "Mumbai"},
    "basantmalpani": {"password": "basantjaipur123", "name": "Basant Malpani", "city": "Jaipur"},
}

# ─── Auth Helpers ───
def get_jwt_secret():
    return os.environ["JWT_SECRET"]

def create_access_token(username: str, name: str) -> str:
    payload = {"sub": username, "name": name, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}
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
            raise HTTPException(status_code=401, detail="User not found")
        return {"username": username, "name": payload.get("name", "")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

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

# ─── Models ───
class LoginRequest(BaseModel):
    username: str
    password: str

class AttendeeItem(BaseModel):
    name: str = ""
    category: str = "Adult"
    special_needs: str = ""

class RegistrationCreate(BaseModel):
    full_name: str
    mobile: str
    email: str = ""
    city: str = ""
    country: str = ""
    attendance_intent: str = "Yes"
    arrival_date: str = ""
    departure_date: str = ""
    num_people: int = 1
    attendees: List[AttendeeItem] = []
    message: str = ""
    consent: bool = False

class ManualEntryCreate(BaseModel):
    full_name: str
    mobile: str
    email: str = ""
    city: str = ""
    country: str = ""
    attendance_intent: str = "Yes"
    arrival_date: str = ""
    departure_date: str = ""
    num_people: int = 1
    attendees: List[AttendeeItem] = []
    message: str = ""
    arrival_status: str = "Not Arrived"
    room_assignment: str = ""
    admin_notes: str = ""

class ManagementUpdate(BaseModel):
    arrival_status: Optional[str] = None
    room_assignment: Optional[str] = None
    admin_notes: Optional[str] = None

class RegistrationUpdate(BaseModel):
    full_name: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    attendance_intent: Optional[str] = None
    arrival_date: Optional[str] = None
    departure_date: Optional[str] = None
    num_people: Optional[int] = None
    attendees: Optional[List[AttendeeItem]] = None
    message: Optional[str] = None

class StatusUpdate(BaseModel):
    status: str

class BulkAction(BaseModel):
    ids: List[str]
    action: str
    status: Optional[str] = None

class RoomCreate(BaseModel):
    room_code: str
    capacity: int = 2
    ac_type: str = "Non-AC"
    notes: str = ""

class RoomBulkCreate(BaseModel):
    rooms: List[RoomCreate]

class RoomAssign(BaseModel):
    registration_id: str

# ─── Auth Endpoints ───
@api_router.post("/auth/login")
async def login(req: LoginRequest):
    username = req.username.lower().strip()
    account = ADMIN_ACCOUNTS.get(username)
    if not account or req.password != account["password"]:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = create_access_token(username, account["name"])
    return {"token": access_token, "username": username, "name": account["name"], "city": account["city"]}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    account = ADMIN_ACCOUNTS.get(user["username"], {})
    return {"username": user["username"], "name": user["name"], "city": account.get("city", "")}

@api_router.post("/auth/logout")
async def logout():
    return {"message": "Logged out"}

# ─── Public Registration ───
@api_router.post("/registrations")
async def create_registration(reg: RegistrationCreate):
    doc = reg.model_dump()
    doc["attendees"] = [a.model_dump() if hasattr(a, 'model_dump') else a for a in reg.attendees]
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["id"] = str(uuid.uuid4())
    doc["approval_status"] = "pending"
    doc["entry_type"] = "form"
    doc["arrival_status"] = "Not Arrived"
    doc["room_assignment"] = ""
    doc["admin_notes"] = ""
    doc["created_by"] = "Form Submission"
    doc["approved_by"] = ""
    doc["last_updated_by"] = ""
    doc["last_updated_at"] = ""
    doc["deleted_by"] = ""
    await db.registrations.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/registrations/count")
async def get_registration_count():
    total = await db.registrations.count_documents({})
    return {"total": total}

# ─── Admin: Manual Entry ───
@api_router.post("/admin/registrations/manual")
async def create_manual_entry(entry: ManualEntryCreate, request: Request):
    user = await get_current_user(request)
    doc = entry.model_dump()
    doc["attendees"] = [a.model_dump() if hasattr(a, 'model_dump') else a for a in entry.attendees]
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["approval_status"] = "approved"
    doc["entry_type"] = "manual"
    doc["created_by"] = user["name"]
    doc["approved_by"] = user["name"]
    doc["last_updated_by"] = user["name"]
    doc["last_updated_at"] = datetime.now(timezone.utc).isoformat()
    doc["deleted_by"] = ""
    doc["consent"] = True
    # Handle room assignment
    if doc.get("room_assignment"):
        room = await db.rooms.find_one({"room_code": doc["room_assignment"]})
        if room and room.get("occupant_id"):
            raise HTTPException(status_code=400, detail=f"Room {doc['room_assignment']} is already occupied")
        if room:
            await db.rooms.update_one({"room_code": doc["room_assignment"]}, {"$set": {"occupant_id": doc["id"], "occupant_name": doc["full_name"], "status": "occupied"}})
    await db.registrations.insert_one(doc)
    doc.pop("_id", None)
    await log_audit("manual_entry", "registration", doc["id"], doc["full_name"], f"Manual entry created by {user['name']}", user["name"])
    return doc

# ─── Admin: Duplicate Check (must be before {reg_id} routes) ───
@api_router.get("/admin/registrations/check-duplicate")
async def check_duplicate(request: Request, mobile: str = ""):
    await get_current_user(request)
    if not mobile:
        return {"duplicates": []}
    dupes = await db.registrations.find({"mobile": mobile, "approval_status": {"$ne": "deleted"}}, {"_id": 0, "id": 1, "full_name": 1, "mobile": 1, "created_at": 1, "entry_type": 1}).to_list(20)
    return {"duplicates": dupes}

# ─── Admin: List Registrations (with search, filter, pagination) ───
@api_router.get("/admin/registrations")
async def get_registrations(
    request: Request,
    status: Optional[str] = None,
    search: Optional[str] = None,
    arrival_date: Optional[str] = None,
    departure_date: Optional[str] = None,
    page: int = 1,
    per_page: int = 50,
):
    await get_current_user(request)
    query = {}
    if status:
        query["approval_status"] = status
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"mobile": {"$regex": search, "$options": "i"}},
            {"room_assignment": {"$regex": search, "$options": "i"}},
        ]
    if arrival_date:
        query["arrival_date"] = arrival_date
    if departure_date:
        query["departure_date"] = departure_date
    total = await db.registrations.count_documents(query)
    skip = (page - 1) * per_page
    regs = await db.registrations.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(per_page).to_list(per_page)
    return {"data": regs, "total": total, "page": page, "per_page": per_page, "total_pages": math.ceil(total / per_page) if total > 0 else 1}

# ─── Admin: Single Registration Detail ───
@api_router.get("/admin/registrations/{reg_id}")
async def get_registration_detail(reg_id: str, request: Request):
    await get_current_user(request)
    reg = await db.registrations.find_one({"id": reg_id}, {"_id": 0})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    return reg

# ─── Admin: Update General Details ───
@api_router.put("/admin/registrations/{reg_id}")
async def update_registration(reg_id: str, body: RegistrationUpdate, request: Request):
    user = await get_current_user(request)
    reg = await db.registrations.find_one({"id": reg_id})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "attendees" in updates:
        updates["attendees"] = [a.model_dump() if hasattr(a, 'model_dump') else a for a in updates["attendees"]]
    updates["last_updated_by"] = user["name"]
    updates["last_updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.registrations.update_one({"id": reg_id}, {"$set": updates})
    changed = ", ".join(updates.keys())
    await log_audit("edit", "registration", reg_id, reg.get("full_name", ""), f"Updated: {changed}", user["name"])
    return {"message": "Updated", "id": reg_id}

# ─── Admin: Update Management Details ───
@api_router.put("/admin/registrations/{reg_id}/management")
async def update_management(reg_id: str, body: ManagementUpdate, request: Request):
    user = await get_current_user(request)
    reg = await db.registrations.find_one({"id": reg_id})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    updates = {}
    details_parts = []
    if body.arrival_status is not None:
        old = reg.get("arrival_status", "Not Arrived")
        updates["arrival_status"] = body.arrival_status
        if old != body.arrival_status:
            details_parts.append(f"Arrival: {old} → {body.arrival_status}")
    if body.room_assignment is not None:
        old_room = reg.get("room_assignment", "")
        new_room = body.room_assignment
        if old_room != new_room:
            # Unassign old room
            if old_room:
                await db.rooms.update_one({"room_code": old_room}, {"$set": {"occupant_id": "", "occupant_name": "", "status": "available"}})
                await log_audit("room_unassign", "room", old_room, old_room, f"Unassigned from {reg.get('full_name', '')}", user["name"])
            # Assign new room
            if new_room:
                room = await db.rooms.find_one({"room_code": new_room})
                if not room:
                    raise HTTPException(status_code=400, detail=f"Room {new_room} does not exist")
                if room.get("occupant_id") and room["occupant_id"] != reg_id:
                    raise HTTPException(status_code=409, detail=f"Room {new_room} just assigned to another guest")
                await db.rooms.update_one({"room_code": new_room}, {"$set": {"occupant_id": reg_id, "occupant_name": reg.get("full_name", ""), "status": "occupied"}})
                await log_audit("room_assign", "room", new_room, new_room, f"Assigned to {reg.get('full_name', '')}", user["name"])
            updates["room_assignment"] = new_room
            details_parts.append(f"Room: {old_room or 'None'} → {new_room or 'None'}")
    if body.admin_notes is not None:
        updates["admin_notes"] = body.admin_notes
        details_parts.append("Notes updated")
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["last_updated_by"] = user["name"]
    updates["last_updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.registrations.update_one({"id": reg_id}, {"$set": updates})
    await log_audit("management_update", "registration", reg_id, reg.get("full_name", ""), "; ".join(details_parts), user["name"])
    return {"message": "Management details updated", "id": reg_id}

# ─── Admin: Status Changes (approve/reject/delete/restore) ───
@api_router.put("/admin/registrations/{reg_id}/status")
async def update_status(reg_id: str, body: StatusUpdate, request: Request):
    user = await get_current_user(request)
    valid = ["approved", "rejected", "deleted", "pending"]
    if body.status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid}")
    reg = await db.registrations.find_one({"id": reg_id})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    old_status = reg.get("approval_status", "pending")
    updates = {"approval_status": body.status, "last_updated_by": user["name"], "last_updated_at": datetime.now(timezone.utc).isoformat()}
    if body.status == "approved" and not reg.get("approved_by"):
        updates["approved_by"] = user["name"]
    if body.status == "deleted":
        updates["deleted_by"] = user["name"]
        # Free room if assigned
        room_code = reg.get("room_assignment", "")
        if room_code:
            await db.rooms.update_one({"room_code": room_code}, {"$set": {"occupant_id": "", "occupant_name": "", "status": "available"}})
            updates["room_assignment"] = ""
    await db.registrations.update_one({"id": reg_id}, {"$set": updates})
    action = "restore" if body.status == "pending" and old_status == "deleted" else body.status
    await log_audit(action, "registration", reg_id, reg.get("full_name", ""), f"{old_status} → {body.status}", user["name"])
    return {"message": f"Status updated to {body.status}", "id": reg_id, "new_status": body.status}

# ─── Admin: Bulk Actions ───
@api_router.post("/admin/registrations/bulk-action")
async def bulk_action(body: BulkAction, request: Request):
    user = await get_current_user(request)
    valid_actions = ["approve", "reject", "delete", "status_update"]
    if body.action not in valid_actions:
        raise HTTPException(status_code=400, detail=f"Invalid action. Must be one of: {valid_actions}")
    count = 0
    for rid in body.ids:
        reg = await db.registrations.find_one({"id": rid})
        if not reg:
            continue
        old_status = reg.get("approval_status", "pending")
        updates = {"last_updated_by": user["name"], "last_updated_at": datetime.now(timezone.utc).isoformat()}
        if body.action == "approve":
            updates["approval_status"] = "approved"
            if not reg.get("approved_by"):
                updates["approved_by"] = user["name"]
        elif body.action == "reject":
            updates["approval_status"] = "rejected"
        elif body.action == "delete":
            updates["approval_status"] = "deleted"
            updates["deleted_by"] = user["name"]
            if reg.get("room_assignment"):
                await db.rooms.update_one({"room_code": reg["room_assignment"]}, {"$set": {"occupant_id": "", "occupant_name": "", "status": "available"}})
                updates["room_assignment"] = ""
        elif body.action == "status_update" and body.status:
            updates["arrival_status"] = body.status
        await db.registrations.update_one({"id": rid}, {"$set": updates})
        await log_audit(f"bulk_{body.action}", "registration", rid, reg.get("full_name", ""), f"Bulk {body.action}: {old_status} → {updates.get('approval_status', old_status)}", user["name"])
        count += 1
    return {"message": f"Bulk {body.action} completed", "affected": count}

# ─── Room Management ───
@api_router.get("/admin/rooms")
async def get_rooms(request: Request):
    await get_current_user(request)
    rooms = await db.rooms.find({}, {"_id": 0}).sort("room_code", 1).to_list(500)
    return rooms

@api_router.post("/admin/rooms")
async def create_room(room: RoomCreate, request: Request):
    user = await get_current_user(request)
    existing = await db.rooms.find_one({"room_code": room.room_code})
    if existing:
        raise HTTPException(status_code=409, detail=f"Room code '{room.room_code}' already exists")
    doc = room.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["occupant_id"] = ""
    doc["occupant_name"] = ""
    doc["status"] = "available"
    doc["created_by"] = user["name"]
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.rooms.insert_one(doc)
    doc.pop("_id", None)
    await log_audit("room_create", "room", doc["id"], room.room_code, f"Room created: {room.room_code} (Cap: {room.capacity}, {room.ac_type})", user["name"])
    return doc

@api_router.post("/admin/rooms/bulk")
async def bulk_create_rooms(body: RoomBulkCreate, request: Request):
    user = await get_current_user(request)
    created = 0
    errors = []
    for room in body.rooms:
        existing = await db.rooms.find_one({"room_code": room.room_code})
        if existing:
            errors.append(f"Room '{room.room_code}' already exists")
            continue
        doc = room.model_dump()
        doc["id"] = str(uuid.uuid4())
        doc["occupant_id"] = ""
        doc["occupant_name"] = ""
        doc["status"] = "available"
        doc["created_by"] = user["name"]
        doc["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.rooms.insert_one(doc)
        await log_audit("room_create", "room", doc["id"], room.room_code, f"Bulk room created: {room.room_code}", user["name"])
        created += 1
    return {"created": created, "errors": errors}

@api_router.delete("/admin/rooms/{room_code}")
async def delete_room(room_code: str, request: Request):
    user = await get_current_user(request)
    room = await db.rooms.find_one({"room_code": room_code})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.get("occupant_id"):
        raise HTTPException(status_code=400, detail="Cannot delete an occupied room. Unassign the guest first.")
    await db.rooms.delete_one({"room_code": room_code})
    await log_audit("room_delete", "room", room.get("id", ""), room_code, f"Room deleted: {room_code}", user["name"])
    return {"message": f"Room {room_code} deleted"}

@api_router.put("/admin/rooms/{room_code}/assign")
async def assign_room(room_code: str, body: RoomAssign, request: Request):
    user = await get_current_user(request)
    room = await db.rooms.find_one({"room_code": room_code})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.get("occupant_id") and room["occupant_id"] != body.registration_id:
        raise HTTPException(status_code=409, detail=f"Room already occupied by {room.get('occupant_name', 'another guest')}")
    reg = await db.registrations.find_one({"id": body.registration_id})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    # Unassign previous room
    old_room = reg.get("room_assignment", "")
    if old_room and old_room != room_code:
        await db.rooms.update_one({"room_code": old_room}, {"$set": {"occupant_id": "", "occupant_name": "", "status": "available"}})
    await db.rooms.update_one({"room_code": room_code}, {"$set": {"occupant_id": body.registration_id, "occupant_name": reg.get("full_name", ""), "status": "occupied"}})
    await db.registrations.update_one({"id": body.registration_id}, {"$set": {"room_assignment": room_code, "last_updated_by": user["name"], "last_updated_at": datetime.now(timezone.utc).isoformat()}})
    await log_audit("room_assign", "room", room_code, room_code, f"Assigned to {reg.get('full_name', '')}", user["name"])
    return {"message": f"Room {room_code} assigned to {reg.get('full_name', '')}"}

@api_router.put("/admin/rooms/{room_code}/unassign")
async def unassign_room(room_code: str, request: Request):
    user = await get_current_user(request)
    room = await db.rooms.find_one({"room_code": room_code})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    occupant_name = room.get("occupant_name", "")
    occupant_id = room.get("occupant_id", "")
    await db.rooms.update_one({"room_code": room_code}, {"$set": {"occupant_id": "", "occupant_name": "", "status": "available"}})
    if occupant_id:
        await db.registrations.update_one({"id": occupant_id}, {"$set": {"room_assignment": "", "last_updated_by": user["name"], "last_updated_at": datetime.now(timezone.utc).isoformat()}})
    await log_audit("room_unassign", "room", room_code, room_code, f"Unassigned {occupant_name}", user["name"])
    return {"message": f"Room {room_code} unassigned"}

# ─── Dashboard / Summary ───
@api_router.get("/admin/dashboard")
async def get_dashboard(request: Request):
    await get_current_user(request)
    total_approved = await db.registrations.count_documents({"approval_status": "approved"})
    pending_count = await db.registrations.count_documents({"approval_status": "pending"})
    deleted_count = await db.registrations.count_documents({"approval_status": "deleted"})
    rejected_count = await db.registrations.count_documents({"approval_status": "rejected"})
    # Total people
    pipeline_people = [{"$match": {"approval_status": "approved"}}, {"$group": {"_id": None, "total": {"$sum": "$num_people"}}}]
    people_res = await db.registrations.aggregate(pipeline_people).to_list(1)
    total_people = people_res[0]["total"] if people_res else 0
    # Arrival summary
    arrived = await db.registrations.count_documents({"approval_status": "approved", "arrival_status": "Arrived"})
    arrived_people_p = [{"$match": {"approval_status": "approved", "arrival_status": "Arrived"}}, {"$group": {"_id": None, "total": {"$sum": "$num_people"}}}]
    arrived_people_res = await db.registrations.aggregate(arrived_people_p).to_list(1)
    arrived_people = arrived_people_res[0]["total"] if arrived_people_res else 0
    not_coming = await db.registrations.count_documents({"approval_status": "approved", "arrival_status": "Not Coming"})
    # Arrivals in range (28 May - 3 June)
    arrivals_range = await db.registrations.count_documents({"approval_status": "approved", "arrival_date": {"$gte": "2026-05-28", "$lte": "2026-06-03"}})
    departures_range = await db.registrations.count_documents({"approval_status": "approved", "departure_date": {"$gte": "2026-05-28", "$lte": "2026-06-03"}})
    # Missing management details
    missing_mgmt = await db.registrations.count_documents({"approval_status": "approved", "$or": [{"arrival_status": "Not Arrived"}, {"room_assignment": {"$in": ["", None]}}]})
    # Room stats
    total_rooms = await db.rooms.count_documents({})
    occupied_rooms = await db.rooms.count_documents({"status": "occupied"})
    available_rooms = total_rooms - occupied_rooms
    return {
        "total_approved": total_approved, "pending_count": pending_count, "deleted_count": deleted_count, "rejected_count": rejected_count,
        "total_people": total_people,
        "arrivals_range": arrivals_range, "departures_range": departures_range,
        "arrived_families": arrived, "arrived_people": arrived_people, "not_coming": not_coming,
        "missing_management": missing_mgmt,
        "total_rooms": total_rooms, "occupied_rooms": occupied_rooms, "available_rooms": available_rooms,
    }

# ─── Audit Logs ───
@api_router.get("/admin/audit-logs")
async def get_audit_logs(request: Request, page: int = 1, per_page: int = 50):
    await get_current_user(request)
    total = await db.audit_logs.count_documents({})
    skip = (page - 1) * per_page
    logs = await db.audit_logs.find({}, {"_id": 0}).sort("performed_at", -1).skip(skip).limit(per_page).to_list(per_page)
    return {"data": logs, "total": total, "page": page, "total_pages": math.ceil(total / per_page) if total > 0 else 1}

# ─── CSV Export ───
@api_router.get("/admin/export-csv")
async def export_csv(request: Request):
    await get_current_user(request)
    regs = await db.registrations.find({"approval_status": "approved"}, {"_id": 0}).to_list(5000)
    output = io.StringIO()
    fields = ["id","full_name","mobile","email","city","country","attendance_intent","arrival_date","departure_date","num_people","room_assignment","arrival_status","admin_notes","message","approved_by","created_at"]
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction='ignore')
    writer.writeheader()
    for reg in regs:
        writer.writerow(reg)
    output.seek(0)
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=approved_guests.csv"})

# ─── PDF Export ───
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
        headers = ["Room Code", "Capacity", "Type", "Status", "Occupant", "Created By"]
        col_w = [40, 25, 25, 30, 80, 60]
        pdf.set_font("Helvetica", "B", 9)
        for i, h in enumerate(headers):
            pdf.cell(col_w[i], 8, h, border=1, align="C")
        pdf.ln()
        pdf.set_font("Helvetica", "", 8)
        for room in rooms:
            vals = [room.get("room_code", ""), str(room.get("capacity", "")), room.get("ac_type", ""), room.get("status", ""), room.get("occupant_name", "") or "-", room.get("created_by", "")]
            for i, v in enumerate(vals):
                pdf.cell(col_w[i], 7, str(v)[:30], border=1, align="C")
            pdf.ln()
    else:
        pdf.cell(0, 10, "Final Guest List - Shrimad Bhagavat Katha 2026", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.set_font("Helvetica", "", 8)
        pdf.cell(0, 6, f"Generated: {datetime.now(timezone.utc).strftime('%d %b %Y %H:%M UTC')}", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(5)
        regs = await db.registrations.find({"approval_status": "approved"}, {"_id": 0}).sort("full_name", 1).to_list(5000)
        headers = ["#", "Name", "People", "Arrival", "Departure", "Room", "Status", "Mobile"]
        col_w = [12, 60, 20, 32, 32, 30, 30, 40]
        pdf.set_font("Helvetica", "B", 9)
        for i, h in enumerate(headers):
            pdf.cell(col_w[i], 8, h, border=1, align="C")
        pdf.ln()
        pdf.set_font("Helvetica", "", 8)
        for idx, reg in enumerate(regs, 1):
            vals = [str(idx), reg.get("full_name", "")[:25], str(reg.get("num_people", 1)), reg.get("arrival_date", ""), reg.get("departure_date", ""), reg.get("room_assignment", "") or "-", reg.get("arrival_status", ""), reg.get("mobile", "")]
            for i, v in enumerate(vals):
                pdf.cell(col_w[i], 7, str(v), border=1, align="C")
            pdf.ln()
    buf = io.BytesIO()
    pdf.output(buf)
    buf.seek(0)
    fname = "room_allocation.pdf" if report_type == "rooms" else "guest_list.pdf"
    return StreamingResponse(buf, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={fname}"})

@api_router.get("/")
async def root():
    return {"message": "Shrimad Bhagavat Katha Mahotsav 2026 API"}

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
    logger.info("Admin accounts configured: " + ", ".join(ADMIN_ACCOUNTS.keys()))
    # Migrate old registrations
    await db.registrations.update_many({"approval_status": {"$exists": False}}, {"$set": {"approval_status": "pending"}})
    await db.registrations.update_many({"entry_type": {"$exists": False}}, {"$set": {"entry_type": "form"}})
    await db.registrations.update_many({"arrival_status": {"$exists": False}}, {"$set": {"arrival_status": "Not Arrived"}})
    await db.registrations.update_many({"room_assignment": {"$exists": False}}, {"$set": {"room_assignment": ""}})
    await db.registrations.update_many({"admin_notes": {"$exists": False}}, {"$set": {"admin_notes": ""}})
    await db.registrations.update_many({"created_by": {"$exists": False}}, {"$set": {"created_by": "Form Submission"}})
    await db.registrations.update_many({"approved_by": {"$exists": False}}, {"$set": {"approved_by": ""}})
    await db.registrations.update_many({"last_updated_by": {"$exists": False}}, {"$set": {"last_updated_by": ""}})
    await db.registrations.update_many({"last_updated_at": {"$exists": False}}, {"$set": {"last_updated_at": ""}})
    await db.registrations.update_many({"deleted_by": {"$exists": False}}, {"$set": {"deleted_by": ""}})
    # Create unique index on room_code
    await db.rooms.create_index("room_code", unique=True, sparse=True)
    logger.info("Migration complete, indexes ensured")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
