@echo off
echo Starting AI Logistics Optimizer...
echo.
echo Installing dependencies...
pip install fastapi uvicorn python-multipart jinja2 python-jose[cryptography] passlib[bcrypt] python-dotenv requests pandas numpy scikit-learn pulp aiofiles websockets
echo.
echo Starting the application...
echo Open your browser and go to: http://127.0.0.1:8000
echo.
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause
