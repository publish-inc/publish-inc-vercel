import os
from dotenv import load_dotenv
import requests

load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# We need to hash the password exactly as api/index.py does.
# But wait, bcrypt might not be installed in the default python, or maybe it is in .venv
# Let's import from api.index !
import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from api.index import hash_password, db

def reset():
    email = "master@publishinc.com"
    pwd = "master123"
    hashed = hash_password(pwd)
    
    headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
    
    # Update via REST
    url = f"{URL}/rest/v1/app_users?email=eq.{email}"
    res = requests.patch(url, headers=headers, json={"password_hash": hashed})
    print(res.status_code, res.text)
    
    # Try admin too just in case
    url = f"{URL}/rest/v1/app_users?email=eq.admin@publishinc.com"
    res = requests.patch(url, headers=headers, json={"password_hash": hash_password("admin123")})
    print(res.status_code, res.text)

if __name__ == "__main__":
    reset()
