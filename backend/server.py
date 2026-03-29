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
import os, logging, bcrypt, jwt, csv, io, uuid

ROOT_DIR = Path(__file__).parent

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Auth Helpers ---
def get_jwt_secret():
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# --- Models ---
class LoginRequest(BaseModel):
    email: str
    password: str

class RegistrationCreate(BaseModel):
    full_name: str
    mobile: str
    whatsapp: str = ""
    email: str = ""
    city_country: str = ""
    will_attend: str = "Yes"
    arrival_date: str = ""
    departure_date: str = ""
    days_attending: List[str] = []
    adults: int = 1
    children: int = 0
    senior_citizens: int = 0
    attendee_details: List[dict] = []
    need_accommodation: bool = False
    room_type: str = ""
    ac_preference: str = ""
    num_rooms: int = 0
    check_in: str = ""
    check_out: str = ""
    num_meals: int = 0
    jain_food: bool = False
    no_onion_garlic: bool = False
    allergies: str = ""
    travel_mode: str = ""
    arrival_time: str = ""
    pickup_required: bool = False
    parking_needed: bool = False
    message: str = ""
    consent: bool = False

# --- Auth Endpoints ---
@api_router.post("/auth/login")
async def login(req: LoginRequest, response: Response):
    email = req.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    return {"id": user_id, "email": user["email"], "name": user.get("name", ""), "role": user.get("role", "")}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return {"id": user["_id"], "email": user["email"], "name": user.get("name", ""), "role": user.get("role", "")}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"message": "Logged out"}

# --- Registration ---
@api_router.post("/registrations")
async def create_registration(reg: RegistrationCreate):
    doc = reg.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["id"] = str(uuid.uuid4())
    await db.registrations.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/registrations/count")
async def get_registration_count():
    total = await db.registrations.count_documents({})
    return {"total": total}

# --- Admin Endpoints ---
@api_router.get("/admin/registrations")
async def get_registrations(request: Request):
    await get_current_user(request)
    regs = await db.registrations.find({}, {"_id": 0}).sort("created_at", -1).to_list(10000)
    return regs

@api_router.get("/admin/summary")
async def get_summary(request: Request):
    await get_current_user(request)
    total = await db.registrations.count_documents({})
    pipeline = [{"$group": {
        "_id": None,
        "total_adults": {"$sum": "$adults"},
        "total_children": {"$sum": "$children"},
        "total_seniors": {"$sum": "$senior_citizens"},
        "total_rooms": {"$sum": "$num_rooms"},
        "accommodation_needed": {"$sum": {"$cond": ["$need_accommodation", 1, 0]}},
        "jain_food_count": {"$sum": {"$cond": ["$jain_food", 1, 0]}},
        "no_onion_garlic_count": {"$sum": {"$cond": ["$no_onion_garlic", 1, 0]}},
        "pickup_needed": {"$sum": {"$cond": ["$pickup_required", 1, 0]}},
    }}]
    result = await db.registrations.aggregate(pipeline).to_list(1)
    summary = result[0] if result else {}
    summary.pop("_id", None)
    summary["total_registrations"] = total
    return summary

@api_router.get("/admin/export-csv")
async def export_csv(request: Request):
    await get_current_user(request)
    regs = await db.registrations.find({}, {"_id": 0}).to_list(10000)
    if not regs:
        return StreamingResponse(io.StringIO("No registrations"), media_type="text/csv")
    output = io.StringIO()
    fields = ["id","full_name","mobile","whatsapp","email","city_country","will_attend","arrival_date","departure_date","days_attending","adults","children","senior_citizens","need_accommodation","room_type","ac_preference","num_rooms","check_in","check_out","num_meals","jain_food","no_onion_garlic","allergies","travel_mode","arrival_time","pickup_required","parking_needed","message","created_at"]
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction='ignore')
    writer.writeheader()
    for reg in regs:
        if isinstance(reg.get("days_attending"), list):
            reg["days_attending"] = ", ".join(reg["days_attending"])
        if isinstance(reg.get("attendee_details"), list):
            pass  # skip complex field for CSV
        writer.writerow(reg)
    output.seek(0)
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=registrations.csv"})

@api_router.get("/")
async def root():
    return {"message": "Shrimad Bhagavat Katha Mahotsav 2026 API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[o.strip() for o in os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({"email": admin_email, "password_hash": hashed, "name": "Admin", "role": "admin", "created_at": datetime.now(timezone.utc)})
        logger.info(f"Admin user seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info(f"Admin password updated: {admin_email}")
    await db.users.create_index("email", unique=True)
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"# Test Credentials\n\n## Admin\n- Email: {admin_email}\n- Password: {admin_password}\n- Role: admin\n\n## Endpoints\n- Login: POST /api/auth/login\n- Me: GET /api/auth/me\n- Logout: POST /api/auth/logout\n- Register: POST /api/registrations\n- Admin Registrations: GET /api/admin/registrations\n- Admin Summary: GET /api/admin/summary\n- Admin Export CSV: GET /api/admin/export-csv\n")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
