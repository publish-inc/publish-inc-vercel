import os, requests, bcrypt
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

url = f"{SUPABASE_URL}/rest/v1/app_users"

# Check existing users
res = requests.get(f"{url}?select=id,email,role,password_hash", headers=headers)
print(f"Status: {res.status_code}")
if res.status_code == 200:
    users = res.json()
    print(f"Found {len(users)} users:")
    for u in users:
        has_hash = bool(u.get("password_hash"))
        print(f"  - {u['email']} (role: {u.get('role')}, has_password: {has_hash})")
        
        # If HRD user exists but has no valid password hash, set one
        if u.get("role") == "hrd" and not has_hash:
            pw_hash = bcrypt.hashpw("hrd123".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            patch = requests.patch(
                f"{url}?id=eq.{u['id']}",
                json={"password_hash": pw_hash},
                headers=headers
            )
            print(f"    -> Updated password hash for HRD: {patch.status_code}")
        
        if u.get("role") == "master_admin" and not has_hash:
            pw_hash = bcrypt.hashpw("master123".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            patch = requests.patch(
                f"{url}?id=eq.{u['id']}",
                json={"password_hash": pw_hash},
                headers=headers
            )
            print(f"    -> Updated password hash for Master Admin: {patch.status_code}")
else:
    print(f"Error: {res.text}")
    
print("\nDone! You can now login with:")
print("  HRD: hrd@publishinc.com / hrd123")
print("  Master Admin: master@publishinc.com / master123")
