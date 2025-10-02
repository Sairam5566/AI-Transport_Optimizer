#!/usr/bin/env python3
import requests
import json

def test_routes():
    base_url = "http://127.0.0.1:8000"
    
    # Test routes that should be accessible without authentication
    public_routes = [
        "/",
        "/login"
    ]
    
    # Test routes that require authentication (should redirect to login)
    protected_routes = [
        "/dashboard",
        "/vessels", 
        "/ports",
        "/plants",
        "/trains",
        "/scheduler",
        "/optimization"
    ]
    
    # Test API routes
    api_routes = [
        "/api/vessels",
        "/api/ports", 
        "/api/plants",
        "/api/trains",
        "/api/optimizer/truck",
        "/api/scheduler/truck"
    ]
    
    print("Testing AI Logistics Optimizer Routes")
    print("=" * 50)
    
    session = requests.Session()
    
    print("\n1. Testing Public Routes:")
    for route in public_routes:
        try:
            response = session.get(f"{base_url}{route}")
            print(f"  {route}: {response.status_code} - {'✓' if response.status_code == 200 else '✗'}")
        except Exception as e:
            print(f"  {route}: ERROR - {str(e)}")
    
    print("\n2. Testing Protected Routes (should redirect to login):")
    for route in protected_routes:
        try:
            response = session.get(f"{base_url}{route}", allow_redirects=False)
            expected = response.status_code in [302, 307]  # Redirect codes
            print(f"  {route}: {response.status_code} - {'✓' if expected else '✗'}")
        except Exception as e:
            print(f"  {route}: ERROR - {str(e)}")
    
    print("\n3. Testing API Routes:")
    for route in api_routes:
        try:
            response = session.get(f"{base_url}{route}")
            print(f"  {route}: {response.status_code} - {'✓' if response.status_code == 200 else '✗'}")
            if response.status_code == 200:
                data = response.json()
                if 'status' in data:
                    print(f"    Status: {data['status']}")
                    if data['status'] == 'success':
                        if 'vessels' in data:
                            print(f"    Vessels count: {len(data['vessels'])}")
                        elif 'ports' in data:
                            print(f"    Ports count: {len(data['ports'])}")
                        elif 'plants' in data:
                            print(f"    Plants count: {len(data['plants'])}")
        except Exception as e:
            print(f"  {route}: ERROR - {str(e)}")
    
    print("\n4. Testing Login Flow:")
    try:
        # Test login
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        response = session.post(f"{base_url}/login", data=login_data, allow_redirects=False)
        print(f"  Login POST: {response.status_code} - {'✓' if response.status_code in [302, 307] else '✗'}")
        
        # If login successful, test protected routes
        if response.status_code in [302, 307]:
            print("\n5. Testing Protected Routes After Login:")
            for route in protected_routes:
                try:
                    response = session.get(f"{base_url}{route}")
                    print(f"  {route}: {response.status_code} - {'✓' if response.status_code == 200 else '✗'}")
                except Exception as e:
                    print(f"  {route}: ERROR - {str(e)}")
    except Exception as e:
        print(f"  Login test: ERROR - {str(e)}")

if __name__ == "__main__":
    print("Make sure the server is running on http://127.0.0.1:8000")
    print("Run: python start_server.py")
    print()
    
    try:
        test_routes()
    except requests.exceptions.ConnectionError:
        print("ERROR: Could not connect to server. Make sure it's running on http://127.0.0.1:8000")
    except Exception as e:
        print(f"ERROR: {str(e)}")
