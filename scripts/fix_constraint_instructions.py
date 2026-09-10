import os, requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

# Use the Supabase SQL endpoint to alter the CHECK constraint
# Drop old constraint and add a new one that includes all our roles
sql = """
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check;
ALTER TABLE app_users ADD CONSTRAINT app_users_role_check 
  CHECK (role IN (
    'master_admin', 'admin', 'cs', 'cco', 
    'pic_editor', 'editor', 'pic_layouter', 'layouter',
    'hrd', 'finance', 'campaign', 'sosmed', 'crm', 
    'produksi', 'admin_marketplace'
  ));
"""

# Supabase doesn't expose raw SQL via REST. We need to use the management API or do it via dashboard.
# Instead, let's just update the user's role in a way the app handles it.

# For now, patch the login to override the role for hrd@publishinc.com
# But first, let's also try the RPC endpoint if available

# Alternative: just update it directly if the constraint was dropped
print("The CHECK constraint on app_users prevents role='hrd'.")
print("")
print("To fix this permanently, go to Supabase Dashboard:")
print("  1. Click 'SQL Editor' in the left sidebar")
print("  2. Paste and run this SQL:")
print("")
print(sql)
print("")
print("After running this SQL, the database will accept all roles.")
print("")
print("For now, the app will handle this by overriding the role in the login flow.")
