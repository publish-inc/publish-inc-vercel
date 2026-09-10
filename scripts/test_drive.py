import os
import sys
import json
import time
import requests
import jwt
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
json_file = ROOT_DIR / "publish-inc-drive-5fe45eede3ab.json"

if not json_file.exists():
    print("File JSON tidak ditemukan.")
    sys.exit(1)

creds = json.loads(json_file.read_text(encoding="utf-8"))
email = creds["client_email"]
private_key = creds["private_key"]
root_id = "1LmwDKWYvPzanDQ_e42YBjjsnaJimJMiV"

print(f"Menggunakan Service Account: {email}")
print(f"Root Folder Target ID       : {root_id}")

now = int(time.time())
claims = {
    "iss": email,
    "scope": "https://www.googleapis.com/auth/drive",
    "aud": "https://oauth2.googleapis.com/token",
    "iat": now,
    "exp": now + 3600,
}

print("Membuat JWT token assertion...")
assertion = jwt.encode(claims, private_key, algorithm="RS256")
resp = requests.post("https://oauth2.googleapis.com/token", data={"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": assertion}, timeout=15)

if resp.status_code >= 400:
    print(f"OAuth gagal: {resp.status_code} - {resp.text}")
    sys.exit(1)

access_token = resp.json()["access_token"]
print("OAUTH BERHASIL! Token diterima.")

headers = {"Authorization": f"Bearer {access_token}"}
print(f"Cek akses folder root ({root_id})...")

q = f"'{root_id}' in parents and trashed = false"
resp = requests.get(
    "https://www.googleapis.com/drive/v3/files",
    headers=headers,
    params={"q": q, "fields": "files(id,name,mimeType)", "pageSize": 10, "supportsAllDrives": "true"},
    timeout=15
)

print(f"Status Cek Root: {resp.status_code}")
if resp.status_code == 200:
    files = resp.json().get("files") or []
    print(f"Berhasil mengakses root folder! Ditemukan {len(files)} item di dalam root folder:")
    for f in files:
        print(f" - [{f.get('mimeType')}] {f.get('name')} (ID: {f.get('id')})")
else:
    print(f"Gagal akses root folder: {resp.text}")
