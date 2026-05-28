#!/bin/bash

echo "========================================"
echo "  EzSAKAY Backend Server Starter"
echo "========================================"
echo ""

# Check if virtual environment exists
if [ -d "fastapi_env/bin" ]; then
    echo "Activating virtual environment..."
    source fastapi_env/bin/activate
else
    echo "Virtual environment not found. Using system Python..."
fi

echo ""
echo "Starting FastAPI server on http://0.0.0.0:8000"
echo "Press Ctrl+C to stop the server"
echo ""
echo "========================================"
echo ""

python main.py

