@echo off
echo ========================================
echo   EzSAKAY Backend Server Starter
echo ========================================
echo.

REM Check if virtual environment exists
if exist "fastapi_env\Scripts\activate.bat" (
    echo Activating virtual environment...
    call fastapi_env\Scripts\activate.bat
) else (
    echo Virtual environment not found. Using system Python...
)

echo.
echo Starting FastAPI server on http://0.0.0.0:8000
echo Press Ctrl+C to stop the server
echo.
echo ========================================
echo.

python main.py

pause

