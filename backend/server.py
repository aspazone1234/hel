from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, Request, Response, HTTPException
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from pathlib import Path
import os, logging, jwt, csv, io, uuid

ROOT_DIR = Path(__file__).parent

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Hardcoded Admin Credentials ---
ADMIN_ACCOUNTS = {
    "arunpanchariya": {"password": "arunlondon123", "name": "Arun Panchariya", "city": "London"},
    "ashokpanchariya": {"password": "ashokahmedabad123", "name": "Ashok Panchariya", "city": "Ahmedabad"},
    "satishpanchariya": {"password": "satishmumbai123", "name": "Satish Panchariya", "city": "Mumbai"},
    "basantmalpani": {"password": "basantjaipur123", "name": "Basant Malpani", "city": "Jaipur"},
}

# --- Auth Helpers ---
def get_jwt_secret():
    return os.environ["JWT_SECRET"]

def create_access_token(username: str, name: str) -> str:
    payload = {"sub": username, "name": name, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request):
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
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

# --- Models ---
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
    days_attending: List[str] = []
    num_people: int = 1
    attendees: List[AttendeeItem] = []
    message: str = ""
    consent: bool = False

class StatusUpdate(BaseModel):
    status: str  # "approved", "deleted", "pending"

# --- Auth Endpoints ---
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

# --- Registration ---
@api_router.post("/registrations")
async def create_registration(reg: RegistrationCreate):
    doc = reg.model_dump()
    doc["attendees"] = [a.model_dump() if hasattr(a, 'model_dump') else a for a in reg.attendees]
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["id"] = str(uuid.uuid4())
    doc["approval_status"] = "pending"
    await db.registrations.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/registrations/count")
async def get_registration_count():
    total = await db.registrations.count_documents({})
    return {"total": total}

# --- Admin Endpoints ---
@api_router.get("/admin/registrations")
async def get_registrations(request: Request, status: str = None):
    await get_current_user(request)
    query = {}
    if status:
        query["approval_status"] = status
    regs = await db.registrations.find(query, {"_id": 0}).sort("created_at", -1).to_list(5000)
    return regs

@api_router.put("/admin/registrations/{reg_id}/status")
async def update_registration_status(reg_id: str, body: StatusUpdate, request: Request):
    user = await get_current_user(request)
    valid_statuses = ["approved", "deleted", "pending"]
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    reg = await db.registrations.find_one({"id": reg_id})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    old_status = reg.get("approval_status", "pending")
    await db.registrations.update_one({"id": reg_id}, {"$set": {"approval_status": body.status}})
    
    # Log activity
    log_entry = {
        "id": str(uuid.uuid4()),
        "registration_id": reg_id,
        "guest_name": reg.get("full_name", ""),
        "action": body.status,
        "old_status": old_status,
        "performed_by": user["name"],
        "performed_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.activity_logs.insert_one(log_entry)
    
    return {"message": f"Registration status updated to {body.status}", "id": reg_id, "new_status": body.status}

@api_router.get("/admin/activity-logs")
async def get_activity_logs(request: Request):
    await get_current_user(request)
    logs = await db.activity_logs.find({}, {"_id": 0}).sort("performed_at", -1).to_list(500)
    return logs

@api_router.get("/admin/summary")
async def get_summary(request: Request):
    await get_current_user(request)
    total = await db.registrations.count_documents({})
    pending = await db.registrations.count_documents({"approval_status": "pending"})
    approved = await db.registrations.count_documents({"approval_status": "approved"})
    deleted = await db.registrations.count_documents({"approval_status": "deleted"})
    
    pipeline = [{"$match": {"approval_status": {"$ne": "deleted"}}}, {"$group": {
        "_id": None,
        "total_people": {"$sum": "$num_people"},
        "attend_yes": {"$sum": {"$cond": [{"$eq": ["$attendance_intent", "Yes"]}, 1, 0]}},
        "attend_probably": {"$sum": {"$cond": [{"$eq": ["$attendance_intent", "Most Probably"]}, 1, 0]}},
        "attend_maybe": {"$sum": {"$cond": [{"$eq": ["$attendance_intent", "Maybe"]}, 1, 0]}},
    }}]
    result = await db.registrations.aggregate(pipeline).to_list(1)
    summary = result[0] if result else {}
    summary.pop("_id", None)
    summary["total_registrations"] = total
    summary["pending_count"] = pending
    summary["approved_count"] = approved
    summary["deleted_count"] = deleted
    return summary

@api_router.get("/admin/export-csv")
async def export_csv(request: Request):
    await get_current_user(request)
    regs = await db.registrations.find({"approval_status": "approved"}, {"_id": 0}).to_list(5000)
    if not regs:
        return StreamingResponse(io.StringIO("No approved registrations"), media_type="text/csv")
    output = io.StringIO()
    fields = ["id","full_name","mobile","email","city","country","attendance_intent","arrival_date","departure_date","days_attending","num_people","message","approval_status","created_at"]
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction='ignore')
    writer.writeheader()
    for reg in regs:
        if isinstance(reg.get("days_attending"), list):
            reg["days_attending"] = ", ".join(reg["days_attending"])
        writer.writerow(reg)
    output.seek(0)
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=approved_guests.csv"})

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
    logger.info("Admin accounts configured (hardcoded): " + ", ".join(ADMIN_ACCOUNTS.keys()))
    # Migrate old registrations without approval_status
    await db.registrations.update_many(
        {"approval_status": {"$exists": False}},
        {"$set": {"approval_status": "pending"}}
    )
    logger.info("Migration: ensured all registrations have approval_status field")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
