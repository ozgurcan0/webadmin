@echo off
echo Installing required packages...
pip install -r requirements.txt

echo Starting Remote Desktop Client...
python client.py