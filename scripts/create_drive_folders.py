import os
import sys
import json
import base64
import time
import uuid
import requests
import jwt
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]

# Load env variables from .env manually if dotenv isn't installed
env_file = ROOT_DIR / ".env"
if env_file.exists():
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

DEFAULT_GOOGLE_DRIVE_ROOT_FOLDER_ID = "1LmwDKWYvPzanDQ_e42YBjjsnaJimJMiV"

GOOGLE_DRIVE_FOLDER_MAP = {
    "marketplace_covers": ["Marketplace", "Cover Buku"],
    "landing": ["Landing Page", "Gambar CMS"],
    "landing_hero": ["Landing Page", "Hero"],
    "landing_about": ["Landing Page", "Tentang Kami"],
    "landing_services": ["Landing Page", "Layanan"],
    "landing_packages": ["Landing Page", "Paket"],
    "landing_promo": ["Landing Page", "Promo"],
    "landing_team": ["Landing Page", "Tim"],
    "employee_photo": ["HRD", "Foto Karyawan"],
    "user_signature": ["HRD", "Tanda Tangan Karyawan"],
    "cs_signature": ["CS", "Tanda Tangan"],
    "admin_spk": ["Administrasi Naskah", "SPK"],
    "admin_keaslian": ["Administrasi Naskah", "Keaslian Naskah"],
    "admin_isbn": ["Administrasi Naskah", "Permohonan ISBN"],
    "admin_loa": ["Administrasi Naskah", "LoA"],
    "admin_sktt": ["Administrasi Naskah", "SKTT"],
    "hrd_leave": ["HRD", "Lampiran Izin Cuti"],
    "hrd_attendance_in": ["HRD", "Absensi", "Selfie Masuk"],
    "hrd_attendance_out": ["HRD", "Absensi", "Selfie Pulang"],
    "finance_invoice": ["Finance", "Bukti Pembayaran Invoice"],
    "finance_cash_out": ["Finance", "Bukti Cash Out"],
    "finance_petty_cash": ["Finance", "Petty Cash"],
    "payroll_reports": ["HRD", "Payroll", "Rekap Bulanan"],
    "payroll_slips": ["HRD", "Payroll", "Slip Gaji"],
    "campaign_event": ["Campaign", "Event"],
    "campaign_poster": ["Campaign", "Event Poster"],
    "sosmed_content": ["Sosmed", "Konten"],
}

def load_credentials():
    raw = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
    if raw:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return json.loads(base64.b64decode(raw).decode("utf-8"))
    
    path = os.environ.get("GOOGLE_SERVICE_ACCOUNT_FILE", "").strip()
    if path and Path(path).exists():
        return json.loads(Path(path).read_text(encoding="utf-8"))
        
    # Check current directory or ROOT_DIR for any google service account json files
    for candidate in ROOT_DIR.glob("*.json"):
        if candidate.name not in ("package.json", "package-lock.json", "tsconfig.json", "vercel.json"):
            try:
                data = json.loads(candidate.read_text(encoding="utf-8"))
                if isinstance(data, dict) and data.get("type") == "service_account" and data.get("private_key"):
                    return data
            except Exception:
                pass

    email = os.environ.get("GOOGLE_SERVICE_ACCOUNT_EMAIL", "").strip()
    private_key = os.environ.get("GOOGLE_PRIVATE_KEY", "").replace("\\n", "\n").strip()
    if email and private_key:
        return {"client_email": email, "private_key": private_key, "token_uri": "https://oauth2.googleapis.com/token"}

    return {}

def get_access_token(creds):
    now = int(time.time())
    claims = {
        "iss": creds["client_email"],
        "scope": "https://www.googleapis.com/auth/drive",
        "aud": creds.get("token_uri") or "https://oauth2.googleapis.com/token",
        "iat": now,
        "exp": now + 3600,
    }
    assertion = jwt.encode(claims, creds["private_key"], algorithm="RS256")
    resp = requests.post(
        creds.get("token_uri") or "https://oauth2.googleapis.com/token",
        data={"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": assertion},
        timeout=30
    )
    if resp.status_code >= 400:
        raise Exception(f"OAuth gagal: {resp.text}")
    return resp.json()["access_token"]

def ensure_folder(access_token, parent_id, name, cache):
    cache_key = f"{parent_id}/{name}"
    if cache_key in cache:
        return cache[cache_key]

    headers = {"Authorization": f"Bearer {access_token}"}
    q = f"name = '{name.replace('\'', '\\\'')}' and '{parent_id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    
    resp = requests.get(
        "https://www.googleapis.com/drive/v3/files",
        headers=headers,
        params={"q": q, "fields": "files(id,name)", "pageSize": 1, "supportsAllDrives": "true"},
        timeout=30
    )
    if resp.status_code >= 400:
        raise Exception(f"Gagal query folder: {resp.text}")

    files = resp.json().get("files") or []
    if files:
        folder_id = files[0]["id"]
        print(f"  [EXISTING] {name} ({folder_id})")
    else:
        resp = requests.post(
            "https://www.googleapis.com/drive/v3/files",
            headers={**headers, "Content-Type": "application/json"},
            json={"name": name, "mimeType": "application/vnd.google-apps.folder", "parents": [parent_id]},
            params={"fields": "id,name", "supportsAllDrives": "true"},
            timeout=30
        )
        if resp.status_code >= 400:
            raise Exception(f"Gagal buat folder {name}: {resp.text}")
        folder_id = resp.json()["id"]
        print(f"  [CREATED]  {name} ({folder_id})")

    cache[cache_key] = folder_id
    return folder_id

def main():
    root_id = os.environ.get("GOOGLE_DRIVE_ROOT_FOLDER_ID", DEFAULT_GOOGLE_DRIVE_ROOT_FOLDER_ID).strip()
    creds = load_credentials()

    print("=== DUKUNGAN OTOMATISISASI FOLDER GOOGLE DRIVE PUBLISH INC ===")
    print(f"Root Folder ID : {root_id}")
    print(f"Root Folder URL: https://drive.google.com/drive/folders/{root_id}")

    if not creds.get("client_email") or not creds.get("private_key"):
        print("\n[PERHATIAN] Service Account Credentials belum ditemukan di .env atau file JSON.")
        print("Silakan masukkan GOOGLE_SERVICE_ACCOUNT_JSON atau GOOGLE_SERVICE_ACCOUNT_EMAIL & GOOGLE_PRIVATE_KEY ke env / Vercel.")
        print("Daftar Folder yang dikonfigurasi dalam sistem:")
        seen_paths = set()
        for cat, path in GOOGLE_DRIVE_FOLDER_MAP.items():
            path_str = " / ".join(path)
            if path_str not in seen_paths:
                seen_paths.add(path_str)
                print(f" - {path_str}")
        return

    print(f"Service Account: {creds['client_email']}")
    print("Membuka koneksi ke Google Drive API...")
    
    try:
        token = get_access_token(creds)
        print("Berhasil terautentikasi dengan Google Drive!")
        print("\nMembuat/Verifikasi Struktur Folder...")
        cache = {}
        
        # Unique list of paths
        unique_paths = []
        for cat, path in GOOGLE_DRIVE_FOLDER_MAP.items():
            if path not in unique_paths:
                unique_paths.append(path)

        for path in unique_paths:
            print(f"\nPath: {' / '.join(path)}")
            current_parent = root_id
            for part in path:
                current_parent = ensure_folder(token, current_parent, part, cache)
                
        print("\n=======================================================")
        print("SEMUA FOLDER BERHASIL DIVERIFIKASI & DIBUAT DI GOOGLE DRIVE!")
        print("=======================================================")
    except Exception as e:
        print(f"\n[ERROR] {e}")

if __name__ == "__main__":
    main()
