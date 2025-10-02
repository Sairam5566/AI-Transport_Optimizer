#!/usr/bin/env python3
import uvicorn
from main import app

if __name__ == "__main__":
    print("Starting AI Logistics Optimizer server...")
    print("Server will be available at: http://127.0.0.1:8000")
    print("Login credentials:")
    print("  Admin: admin / admin123")
    print("  Planner: planner / planner123")
    print("  Viewer: viewer / viewer123")
    
    uvicorn.run(
        app, 
        host="127.0.0.1", 
        port=8000, 
        reload=True,
        log_level="info"
    )
