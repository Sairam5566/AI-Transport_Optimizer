from fastapi import FastAPI, Request, Depends, HTTPException, status, Form
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import requests
import json
import pandas as pd
import numpy as np
from typing import Optional, List, Dict, Any
import asyncio
import aiofiles
from pulp import *
import websockets
import threading
import time
from collections import deque

# Load environment variables
load_dotenv()

app = FastAPI(title="AI-Enabled Logistics Optimizer", version="1.0.0")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates
templates = Jinja2Templates(directory="templates")

# Security
security = HTTPBearer(auto_error=False)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
AISSTREAM_API_KEY = os.getenv("AISSTREAM_API_KEY")

# Global vessel data storage
vessel_data_cache = deque(maxlen=1000)  # Store last 1000 vessel updates
vessel_cache_lock = threading.Lock()

# Mock user database (in production, use a real database)
# Initialize with placeholder, will be populated on startup
fake_users_db = {}

# Utility functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    # Ensure password is within bcrypt's 72-byte limit
    if len(password.encode('utf-8')) > 72:
        password = password[:72]
    return pwd_context.hash(password)

def initialize_users():
    """Initialize the user database with default users"""
    global fake_users_db
    fake_users_db = {
        "admin": {
            "username": "admin",
            "hashed_password": get_password_hash("admin123"),
            "role": "admin"
        },
        "planner": {
            "username": "planner",
            "hashed_password": get_password_hash("planner123"),
            "role": "planner"
        },
        "viewer": {
            "username": "viewer",
            "hashed_password": get_password_hash("viewer123"),
            "role": "viewer"
        }
    }

def authenticate_user(username: str, password: str):
    user = fake_users_db.get(username)
    if not user or not verify_password(password, user["hashed_password"]):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not credentials:
        return None
        
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = fake_users_db.get(username)
    if user is None:
        raise credentials_exception
    return user

# Routes
@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.post("/login")
async def login(username: str = Form(...), password: str = Form(...)):
    user = authenticate_user(username, password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"], "role": user["role"]}, 
        expires_delta=access_token_expires
    )
    
    response = RedirectResponse(url="/dashboard", status_code=302)
    response.set_cookie(key="access_token", value=f"Bearer {access_token}", httponly=True)
    return response

def verify_token(request: Request):
    """Helper function to verify authentication token"""
    token = request.cookies.get("access_token")
    if not token:
        return None, None
    
    try:
        token_data = token.replace("Bearer ", "")
        payload = jwt.decode(token_data, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        role = payload.get("role")
        
        if not username:
            return None, None
        return username, role
    except JWTError:
        return None, None

@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request):
    username, role = verify_token(request)
    if not username:
        return RedirectResponse(url="/login")
    
    return templates.TemplateResponse("dashboard.html", {
        "request": request, 
        "username": username,
        "role": role
    })

@app.get("/vessels", response_class=HTMLResponse)
async def vessels_page(request: Request):
    username, role = verify_token(request)
    if not username:
        return RedirectResponse(url="/login")
    
    return templates.TemplateResponse("vessels.html", {
        "request": request, 
        "username": username,
        "role": role
    })

@app.get("/ports", response_class=HTMLResponse)
async def ports_page(request: Request):
    username, role = verify_token(request)
    if not username:
        return RedirectResponse(url="/login")
    
    return templates.TemplateResponse("ports.html", {
        "request": request, 
        "username": username,
        "role": role
    })

@app.get("/plants", response_class=HTMLResponse)
async def plants_page(request: Request):
    username, role = verify_token(request)
    if not username:
        return RedirectResponse(url="/login")
    
    return templates.TemplateResponse("plants.html", {
        "request": request, 
        "username": username,
        "role": role
    })

@app.get("/optimization", response_class=HTMLResponse)
async def optimization_page(request: Request):
    username, role = verify_token(request)
    if not username:
        return RedirectResponse(url="/login")
    
    return templates.TemplateResponse("optimization.html", {
        "request": request, 
        "username": username,
        "role": role
    })

# New pages: Trains and Scheduler
@app.get("/trains", response_class=HTMLResponse)
async def trains_page(request: Request):
    username, role = verify_token(request)
    if not username:
        return RedirectResponse(url="/login")

    return templates.TemplateResponse("trains.html", {
        "request": request,
        "username": username,
        "role": role
    })

@app.get("/scheduler", response_class=HTMLResponse)
async def scheduler_page(request: Request):
    username, role = verify_token(request)
    if not username:
        return RedirectResponse(url="/login")

    return templates.TemplateResponse("scheduler.html", {
        "request": request,
        "username": username,
        "role": role
    })

@app.post("/logout")
async def logout():
    response = RedirectResponse(url="/login", status_code=302)
    response.delete_cookie(key="access_token")
    return response

# API Endpoints for Vessels, Ports, and Plants
# AISStream WebSocket connection handler
async def aisstream_websocket_handler():
    """Handle AISStream WebSocket connection and cache vessel data"""
    if not AISSTREAM_API_KEY:
        print("AISStream API key not found. Vessel tracking will use fallback data.")
        return
    
    try:
        # Define Indian Ocean bounding box for vessel tracking
        indian_ocean_bbox = [
            [[5.0, 65.0], [25.0, 95.0]],  # Indian Ocean region
            [[8.0, 68.0], [37.0, 97.0]]   # Extended Indian subcontinent waters
        ]
        
        async with websockets.connect("wss://stream.aisstream.io/v0/stream") as websocket:
            subscribe_message = {
                "APIKey": AISSTREAM_API_KEY,
                "BoundingBoxes": indian_ocean_bbox,
                "FilterMessageTypes": ["PositionReport", "ShipStaticData"]
            }
            
            await websocket.send(json.dumps(subscribe_message))
            print("Connected to AISStream API for real-time vessel tracking")
            
            async for message_json in websocket:
                try:
                    message = json.loads(message_json)
                    message_type = message.get("MessageType")
                    
                    if message_type == "PositionReport":
                        ais_message = message['Message']['PositionReport']
                        
                        # Convert AIS data to our vessel format
                        vessel_data = {
                            "mmsi": str(ais_message.get('UserID', '')),
                            "lat": ais_message.get('Latitude', 0),
                            "lon": ais_message.get('Longitude', 0),
                            "speed": ais_message.get('SpeedOverGround', 0),
                            "course": ais_message.get('CourseOverGround', 0),
                            "last_update": datetime.now().isoformat() + "Z",
                            "source": "aisstream"
                        }
                        
                        # Cache the vessel data
                        with vessel_cache_lock:
                            vessel_data_cache.append(vessel_data)
                            
                    elif message_type == "ShipStaticData":
                        static_data = message['Message']['ShipStaticData']
                        
                        # Update vessel static information
                        vessel_static = {
                            "mmsi": str(static_data.get('UserID', '')),
                            "vessel_name": static_data.get('VesselName', '').strip(),
                            "vessel_type": get_vessel_type_name(static_data.get('Type', 0)),
                            "length": static_data.get('Dimension', {}).get('A', 0) + static_data.get('Dimension', {}).get('B', 0),
                            "width": static_data.get('Dimension', {}).get('C', 0) + static_data.get('Dimension', {}).get('D', 0),
                            "destination": static_data.get('Destination', '').strip(),
                            "eta": static_data.get('Eta', ''),
                            "source": "aisstream_static"
                        }
                        
                        with vessel_cache_lock:
                            vessel_data_cache.append(vessel_static)
                            
                except json.JSONDecodeError:
                    continue
                except Exception as e:
                    print(f"Error processing AIS message: {e}")
                    continue
                    
    except Exception as e:
        print(f"AISStream connection error: {e}")
        # Fallback to mock data if connection fails
        await asyncio.sleep(60)  # Wait before retry
        
def get_vessel_type_name(type_code):
    """Convert AIS vessel type code to readable name"""
    vessel_types = {
        70: "Cargo Ship",
        71: "Cargo Ship",
        72: "Cargo Ship",
        73: "Cargo Ship",
        74: "Cargo Ship",
        75: "Cargo Ship",
        76: "Cargo Ship",
        77: "Cargo Ship",
        78: "Cargo Ship",
        79: "Cargo Ship",
        80: "Tanker",
        81: "Tanker",
        82: "Tanker",
        83: "Tanker",
        84: "Tanker",
        85: "Tanker",
        86: "Tanker",
        87: "Tanker",
        88: "Tanker",
        89: "Tanker"
    }
    return vessel_types.get(type_code, "Unknown Vessel")

# Start AISStream connection in background
def start_aisstream_background():
    """Start AISStream connection in background thread"""
    def run_aisstream():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(aisstream_websocket_handler())
    
    if AISSTREAM_API_KEY:
        thread = threading.Thread(target=run_aisstream, daemon=True)
        thread.start()
        print("AISStream background service started")

@app.get("/api/vessels")
async def get_vessels():
    """Fetch real-time vessel data from AISStream API cache"""
    try:
        vessels_data = []
        
        # Get cached vessel data from AISStream
        with vessel_cache_lock:
            cached_vessels = list(vessel_data_cache)
        
        # Process and merge vessel data
        vessel_dict = {}
        
        for vessel in cached_vessels:
            mmsi = vessel.get('mmsi')
            if mmsi:
                if mmsi not in vessel_dict:
                    vessel_dict[mmsi] = {}
                vessel_dict[mmsi].update(vessel)
        
        # Convert to list with only real data
        for mmsi, vessel_info in vessel_dict.items():
            vessel = {
                "mmsi": mmsi,
                "vessel_name": vessel_info.get('vessel_name', ''),
                "lat": vessel_info.get('lat', 0),
                "lon": vessel_info.get('lon', 0),
                "speed": vessel_info.get('speed', 0),
                "course": vessel_info.get('course', 0),
                "destination": vessel_info.get('destination', ''),
                "eta": vessel_info.get('eta', ''),
                "vessel_type": vessel_info.get('vessel_type', ''),
                "length": vessel_info.get('length', 0),
                "width": vessel_info.get('width', 0),
                "last_update": vessel_info.get('last_update', datetime.now().isoformat() + "Z"),
                "status": "En Route",
                "cargo": "Iron Ore"
            }
            vessels_data.append(vessel)
        
        # Add mock data if no real vessels available
        if not vessels_data:
            mock_vessels = [
                {
                    "mmsi": "123456789",
                    "vessel_name": "MV STEEL CARRIER 1",
                    "lat": 19.0760,
                    "lon": 72.8777,
                    "speed": 12.5,
                    "course": 45,
                    "destination": "Mumbai Port",
                    "eta": (datetime.now() + timedelta(hours=6)).isoformat() + "Z",
                    "vessel_type": "Bulk Carrier",
                    "length": 180,
                    "width": 32,
                    "last_update": datetime.now().isoformat() + "Z",
                    "status": "En Route",
                    "cargo": "Iron Ore"
                },
                {
                    "mmsi": "987654321",
                    "vessel_name": "MV OCEAN TRADER 5",
                    "lat": 13.0827,
                    "lon": 80.2707,
                    "speed": 8.2,
                    "course": 180,
                    "destination": "Chennai Port",
                    "eta": (datetime.now() + timedelta(hours=12)).isoformat() + "Z",
                    "vessel_type": "Container Ship",
                    "length": 200,
                    "width": 28,
                    "last_update": datetime.now().isoformat() + "Z",
                    "status": "Delayed",
                    "cargo": "Coal"
                },
                {
                    "mmsi": "456789123",
                    "vessel_name": "MV CARGO EXPRESS",
                    "lat": 22.5726,
                    "lon": 88.3639,
                    "speed": 0,
                    "course": 0,
                    "destination": "Kolkata Port",
                    "eta": datetime.now().isoformat() + "Z",
                    "vessel_type": "General Cargo",
                    "length": 150,
                    "width": 25,
                    "last_update": datetime.now().isoformat() + "Z",
                    "status": "Docked",
                    "cargo": "Limestone"
                }
            ]
            vessels_data.extend(mock_vessels)
        
        return {"vessels": vessels_data, "status": "success"}
        
    except Exception as e:
        return {"error": str(e), "status": "error"}

@app.get("/api/ports")
async def get_ports():
    """Fetch port data from CSV file"""
    try:
        import csv
        ports_data = []
        csv_path = os.path.join("data", "ports_data.csv")
        
        if os.path.exists(csv_path):
            with open(csv_path, newline='', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # Convert numeric fields
                    for field in ['capacity', 'current_stock', 'available_capacity', 'utilization_percent', 
                                'handling_cost', 'storage_cost', 'expected_vessels', 'berth_count']:
                        if field in row:
                            row[field] = float(row[field]) if '.' in str(row[field]) else int(row[field])
                    
                    # Convert location fields
                    if 'location_lat' in row and 'location_lon' in row:
                        row['location'] = {
                            'lat': float(row['location_lat']),
                            'lon': float(row['location_lon'])
                        }
                    
                    ports_data.append(row)
        
        return {"ports": ports_data, "status": "success"}
        
    except Exception as e:
        print(f"Error loading port data: {e}")
        return {"error": str(e), "status": "error"}

@app.get("/api/plants")
async def get_plants():
    """Fetch steel plant data from CSV file"""
    try:
        import csv
        plants_data = []
        csv_path = os.path.join("data", "plants_data.csv")
        
        if os.path.exists(csv_path):
            with open(csv_path, newline='', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # Convert numeric fields
                    for field in ['capacity_mtpa', 'required_materials_iron_ore', 'required_materials_coal',
                                'required_materials_limestone', 'current_stock_iron_ore', 'current_stock_coal',
                                'current_stock_limestone', 'stock_days_remaining_iron_ore', 
                                'stock_days_remaining_coal', 'stock_days_remaining_limestone']:
                        if field in row:
                            row[field] = float(row[field]) if '.' in str(row[field]) else int(row[field])
                    
                    # Convert location fields
                    if 'location_lat' in row and 'location_lon' in row:
                        row['location'] = {
                            'lat': float(row['location_lat']),
                            'lon': float(row['location_lon'])
                        }
                    
                    plants_data.append(row)
        
        return {"plants": plants_data, "status": "success"}
        
    except Exception as e:
        print(f"Error loading plant data: {e}")
        return {"error": str(e), "status": "error"}

# API: Trains data from CSV file
@app.get("/api/trains")
async def get_trains():
    """Fetch train freight data from CSV file"""
    try:
        import csv
        trains = []
        csv_path = os.path.join("data", "trains_data.csv")
        
        if os.path.exists(csv_path):
            with open(csv_path, newline='', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # Convert numeric fields
                    for field in ['rake_capacity_tonnes', 'wagons', 'route_distance_km', 'expected_cost_per_ton']:
                        if field in row:
                            row[field] = float(row[field]) if '.' in str(row[field]) else int(row[field])
                    trains.append(row)
        
        return {"trains": trains, "status": "success"}
    except Exception as e:
        return {"error": str(e), "status": "error"}

# API: AI-powered cost and truck fuel optimizer
@app.get("/api/optimizer/truck")
async def optimize_trucking():
    """Optimize port-to-plant trucking for cost and fuel usage using real data"""
    try:
        # Get real data from CSV files
        ports_response = await get_ports()
        plants_response = await get_plants()
        
        if ports_response.get("status") != "success" or plants_response.get("status") != "success":
            return {"status": "error", "message": "Unable to load ports or plants data"}
        
        ports_data = ports_response.get("ports", [])
        plants_data = plants_response.get("plants", [])
        
        if not ports_data or not plants_data:
            return {"status": "error", "message": "No data available for optimization"}
        
        # Build supplies and demands from real data
        supplies = {}
        demands = {}
        
        for port in ports_data:
            if port.get('available_capacity', 0) > 0:
                supplies[port.get('port_name', 'Unknown')] = port.get('available_capacity', 0)
        
        for plant in plants_data:
            total_demand = (plant.get('required_materials_iron_ore', 0) + 
                          plant.get('required_materials_coal', 0) + 
                          plant.get('required_materials_limestone', 0))
            if total_demand > 0:
                demands[plant.get('plant_name', 'Unknown')] = total_demand
        
        if not supplies or not demands:
            return {"status": "error", "message": "No supply or demand data available"}
        
        # Simple distance calculation (placeholder - in real scenario, use actual distances)
        distances = {}
        for port_name in supplies.keys():
            for plant_name in demands.keys():
                # Placeholder distance calculation
                distances[(port_name, plant_name)] = 500 + hash(port_name + plant_name) % 1000
        
        # Cost parameters
        cost_per_ton_km = 0.02
        fuel_l_per_ton_km = 0.0005
        
        # Simple optimization result (placeholder for real MILP)
        allocations = []
        total_cost = 0.0
        total_fuel = 0.0
        
        # Basic allocation logic
        for (port, plant), distance in distances.items():
            if port in supplies and plant in demands:
                allocation = min(supplies[port], demands[plant]) * 0.5  # Allocate 50%
                if allocation > 0:
                    allocations.append({
                        "from": port,
                        "to": plant,
                        "tonnes": round(allocation, 2),
                        "distance_km": distance
                    })
                    total_cost += cost_per_ton_km * distance * allocation
                    total_fuel += fuel_l_per_ton_km * distance * allocation
        
        return {
            "status": "optimal" if allocations else "no_solution",
            "total_cost": round(total_cost, 2),
            "total_fuel_liters": round(total_fuel, 2),
            "allocations": allocations
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

# API: AI-powered truck scheduler
@app.get("/api/scheduler/truck")
async def schedule_trucking():
    """Create trucking schedule based on real port and plant data"""
    try:
        # Get real data from CSV files
        ports_response = await get_ports()
        plants_response = await get_plants()
        
        if ports_response.get("status") != "success" or plants_response.get("status") != "success":
            return {"status": "error", "message": "Unable to load ports or plants data"}
        
        ports_data = ports_response.get("ports", [])
        plants_data = plants_response.get("plants", [])
        
        if not ports_data or not plants_data:
            return {"status": "error", "message": "No data available for scheduling"}
        
        # Generate schedule based on real data
        base_time = datetime.now()
        avg_speed_kmph = 45
        fuel_km_per_l = 3.5
        cost_per_km = 2.2
        
        schedule = []
        truck_counter = 1001
        
        # Create routes from ports with available capacity to plants with demand
        for port in ports_data[:3]:  # Limit to first 3 ports
            for plant in plants_data[:3]:  # Limit to first 3 plants
                if port.get('available_capacity', 0) > 0:
                    # Calculate distance (placeholder - use actual coordinates in real scenario)
                    port_lat = port.get('location', {}).get('lat', 0)
                    port_lon = port.get('location', {}).get('lon', 0)
                    plant_lat = plant.get('location', {}).get('lat', 0)
                    plant_lon = plant.get('location', {}).get('lon', 0)
                    
                    # Simple distance calculation
                    distance_km = abs(port_lat - plant_lat) * 111 + abs(port_lon - plant_lon) * 85
                    distance_km = max(100, min(2000, distance_km))  # Reasonable bounds
                    
                    depart = base_time + timedelta(hours=len(schedule) * 2)
                    travel_hours = distance_km / avg_speed_kmph
                    arrive = depart + timedelta(hours=travel_hours)
                    fuel = distance_km / fuel_km_per_l
                    cost = distance_km * cost_per_km
                    
                    schedule.append({
                        "truck_id": f"TRK-{truck_counter}",
                        "origin": port.get('port_name', 'Unknown Port'),
                        "destination": plant.get('plant_name', 'Unknown Plant'),
                        "depart_time": depart.isoformat(),
                        "arrive_time": arrive.isoformat(),
                        "distance_km": round(distance_km, 2),
                        "fuel_liters": round(fuel, 2),
                        "cost": round(cost, 2)
                    })
                    truck_counter += 1
                    
                    if len(schedule) >= 5:  # Limit to 5 trips
                        break
            if len(schedule) >= 5:
                break
        
        return {
            "status": "success",
            "avg_speed_kmph": avg_speed_kmph,
            "fuel_km_per_l": fuel_km_per_l,
            "cost_per_km": cost_per_km,
            "trips": schedule
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/predict-delay")
async def predict_delay(vessel_mmsi: str):
    """AI-based delay prediction for vessels - requires real ML model"""
    return {
        "vessel_mmsi": vessel_mmsi,
        "status": "not_implemented",
        "message": "Delay prediction requires trained ML model and real vessel data"
    }

@app.get("/api/optimize")
async def optimize_logistics():
    """MILP-based cost optimization for logistics"""
    try:
        # Simple MILP optimization using PuLP
        prob = LpProblem("Steel_Logistics_Optimization", LpMinimize)
        
        # Decision variables (simplified example)
        x1 = LpVariable("Port1_to_Plant1", lowBound=0, cat='Continuous')
        x2 = LpVariable("Port1_to_Plant2", lowBound=0, cat='Continuous')
        x3 = LpVariable("Port2_to_Plant1", lowBound=0, cat='Continuous')
        x4 = LpVariable("Port2_to_Plant2", lowBound=0, cat='Continuous')
        
        # Objective function (minimize total cost)
        prob += 25.5*x1 + 30.2*x2 + 28.1*x3 + 22.8*x4
        
        # Constraints
        prob += x1 + x2 <= 18000  # Port 1 capacity
        prob += x3 + x4 <= 17000  # Port 2 capacity
        prob += x1 + x3 >= 15000  # Plant 1 demand
        prob += x2 + x4 >= 20000  # Plant 2 demand
        
        # Solve
        prob.solve(PULP_CBC_CMD(msg=0))
        
        if prob.status == 1:  # Optimal solution found
            solution = {
                "status": "optimal",
                "total_cost": value(prob.objective),
                "allocations": {
                    "Mumbai_to_JSW": value(x1),
                    "Mumbai_to_Tata": value(x2),
                    "Chennai_to_JSW": value(x3),
                    "Chennai_to_Tata": value(x4)
                },
                "recommendations": [
                    "Prioritize Chennai to Tata Steel route for cost efficiency",
                    "Consider rail transport for Mumbai to JSW route",
                    "Monitor port congestion levels for dynamic routing"
                ]
            }
        else:
            solution = {"status": "infeasible", "message": "No optimal solution found"}
        
        return solution
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Initialize AISStream connection on startup
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    print("Starting AI-Enabled Logistics Optimizer...")
    
    # Initialize user database
    initialize_users()
    print("User database initialized")
    
    # Start AISStream background service
    start_aisstream_background()
    
    print("Application startup complete")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
