import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env")
    exit(1)

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def clear_table(table_name):
    print(f"Clearing table: {table_name}...")
    # Delete all rows by using a condition that matches everything (e.g., id is not null)
    # Since we might not know the exact primary key for all, we can use a trick: 
    # Not equal to a dummy UUID. Or just delete everything with a valid filter.
    # We will just delete all where id != 'dummy' or email != 'dummy'
    
    url = f"{SUPABASE_URL}/rest/v1/{table_name}"
    
    # In Supabase REST, to delete all, you must provide a filter.
    # A generic filter that matches everything is `?id=not.is.null` 
    # but some tables don't have 'id'.
    # We will use `?select=*` to get them first, then delete them by their pk?
    # No, REST allows `DELETE /table?id=not.is.null` if it has id.
    
    try:
        if table_name == "app_users":
            # Keep HRD, delete the rest
            # We fetch all, then delete them one by one if role != 'hrd'
            res = requests.get(f"{url}?select=email,role", headers=headers)
            if res.status_code == 200:
                users = res.json()
                for u in users:
                    if u.get("role") != "hrd" and u.get("role") != "master_admin":
                        requests.delete(f"{url}?email=eq.{u['email']}", headers=headers)
                print(f"  -> Cleared users (kept HRD & Master Admin)")
            return

        if table_name == "site_content":
            # Delete all
            requests.delete(f"{url}?key=not.is.null", headers=headers)
            print("  -> Cleared site_content")
            return

        # Try deleting by id
        res = requests.delete(f"{url}?id=not.is.null", headers=headers)
        if res.status_code >= 400:
            # If it fails, maybe it has no 'id' column or is a view. We can ignore.
            print(f"  -> Could not clear {table_name} with id. Status: {res.status_code}")
        else:
            print(f"  -> Cleared {table_name}")
    except Exception as e:
        print(f"  -> Error clearing {table_name}: {e}")

tables_to_clear = [
    "customers",
    "books",
    "invoices",
    "spk_naskah",
    "spk_stok",
    "spk_penjualan",
    "spk_deals",
    "spk_tasks",
    "spk_campaigns",
    "site_content",
    "app_users" # handled specially
]

print("Connecting to Supabase to clear dummy data...")
for t in tables_to_clear:
    clear_table(t)

print("Berhasil mengosongkan database Supabase! (Sisa akun HRD & Master Admin)")
