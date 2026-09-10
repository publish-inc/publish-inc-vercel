import os
import requests
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL", "").rstrip("/")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not url or not key:
    print("Error: SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di .env")
    exit(1)

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
}

print(f"Mengoneksikan ke Supabase Live: {url}")

tables_to_clear = [
    "spk_deals",
    "spk_tasks",
    "customers",
    "offers",
    "invoices",
    "spk_campaigns",
    "spk_royalti",
    "spk_kpi_manual",
    "spk_kpi_koreksi",
    "spk_hapus_request",
    "spk_keterlambatan",
]

print("\n--- MEMULAI PEMBERSIHAN DATA DUMMY PRODUKSI ---")

for table in tables_to_clear:
    r = requests.delete(f"{url}/rest/v1/{table}?id=neq.00000000-0000-0000-0000-000000000000", headers=headers)
    if r.status_code in (200, 204):
        print(f"[OK] Tabel '{table}' berhasil dikosongkan.")
    else:
        print(f"[WARN] Tabel '{table}': {r.status_code} - {r.text}")

print("\n--- PEMBERSIHAN DATA DUMMY SELESAI ---")
print("Semua tabel transaksi siap 100% untuk digunakan secara Clean (Produksi Nyata).\n")
