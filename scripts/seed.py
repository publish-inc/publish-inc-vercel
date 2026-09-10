import os
import json
import uuid
import random
from datetime import datetime, timezone, timedelta
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

def req(method, table, data=None):
    headers = {
        "apikey": KEY, 
        "Authorization": f"Bearer {KEY}", 
        "Content-Type": "application/json", 
        "Prefer": "return=representation,resolution=merge-duplicates"
    }
    url = f"{URL}/rest/v1/{table}"
    if method == "POST":
        return requests.post(url, headers=headers, json=data).json()
    if method == "GET":
        return requests.get(url, headers=headers).json()

print("Seeding dummy data...")

# 1. Customers
customers = [
    {"name": "Budi Santoso", "phone": "081234567890", "instansi": "Universitas Gadjah Mada", "city": "Yogyakarta", "created_at": datetime.now(timezone.utc).isoformat()},
    {"name": "Siti Aminah", "phone": "081298765432", "instansi": "Dinas Pendidikan Makassar", "city": "Makassar", "created_at": datetime.now(timezone.utc).isoformat()},
    {"name": "Ahmad Yani", "phone": "085512341234", "instansi": "Perpustakaan Nasional", "city": "Jakarta", "created_at": datetime.now(timezone.utc).isoformat()}
]
cust_ids = []
for c in customers:
    res = req("POST", "customers", c)
    cust_ids.append(res[0]["id"])

# 2. Books
books = [
    {"title": "Pengantar Ilmu Komunikasi", "author": "Budi Santoso", "price": 85000, "category": "Pendidikan", "pages": 150, "year": "2023", "slug": "pengantar-ilmu-komunikasi", "featured": True},
    {"title": "Sejarah Makassar Abad 19", "author": "Siti Aminah", "price": 95000, "category": "Sejarah", "pages": 220, "year": "2024", "slug": "sejarah-makassar", "featured": True, "marketplace_url": "https://shopee.co.id/dummy"}
]
for b in books:
    req("POST", "books", b)

# 3. SPK Naskah (Dummy deals and workflows)
naskah = [
    {
        "customer_id": cust_ids[0],
        "judul": "Buku Panduan React",
        "penulis": "Budi Santoso",
        "paket": "Paket Premium",
        "total_harga": 1500000,
        "status": "proses",
        "stage": "editor_work",
        "manuscript": {"title": "Buku Panduan React", "author": "Budi Santoso", "pages": 120, "size": "A5", "isbn": "978-623-123-456-7"},
        "tasks": {"editor": {"pic": "editor_user_id", "status": "in_progress"}}
    },
    {
        "customer_id": cust_ids[1],
        "judul": "Sejarah Makassar Abad 19 (Revisi)",
        "penulis": "Siti Aminah",
        "paket": "Paket Standard",
        "total_harga": 800000,
        "status": "selesai",
        "stage": "done",
        "jual_marketplace": True,
        "manuscript": {"title": "Sejarah Makassar Abad 19", "isbn": "978-623-321-765-4"}
    }
]
for n in naskah:
    req("POST", "spk_naskah", n)

# 4. Site Content (Events & Social Content)
events = [
    {"id": "1", "date": (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d"), "time": "14:00", "title": "Webinar Self-Publishing", "location": "Zoom Meeting", "description": "Belajar menerbitkan buku sendiri.", "link": "https://zoom.us"},
    {"id": "2", "date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"), "time": "10:00", "title": "Bedah Buku Fiksi", "location": "Perpustakaan Kota", "description": "Membahas buku fiksi terbaru."}
]
req("POST", "site_content", {"key": "events", "content": events, "updated_at": datetime.now(timezone.utc).isoformat()})

social = [
    {"id": "1", "date": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"), "platform": "Instagram", "title": "Promo Diskon 20%", "description": "Banner promo 20% untuk paket premium"},
]
req("POST", "site_content", {"key": "social", "content": social, "updated_at": datetime.now(timezone.utc).isoformat()})

# 5. Invoices (Finance)
invoices = [
    {"number": "1/INV/Publish-Inc/09/2026", "customer_id": cust_ids[0] if cust_ids else None, "customer": customers[0] if customers else {}, "grand_total": 1500000, "status": "dp", "paid_amount": 750000, "created_at": datetime.now(timezone.utc).isoformat()},
    {"number": "2/INV/Publish-Inc/09/2026", "customer_id": cust_ids[1] if cust_ids else None, "customer": customers[1] if customers else {}, "grand_total": 800000, "status": "unpaid", "paid_amount": 0, "created_at": datetime.now(timezone.utc).isoformat()},
    {"number": "3/INV/Publish-Inc/09/2026", "customer_id": cust_ids[2] if cust_ids else None, "customer": customers[2] if customers else {}, "grand_total": 2000000, "status": "lunas", "paid_amount": 2000000, "created_at": datetime.now(timezone.utc).isoformat()}
]
for i in invoices:
    req("POST", "invoices", i)

# 6. Finance
petty_cash = [
    {"id": str(uuid.uuid4()), "date": datetime.now(timezone.utc).isoformat(), "description": "Beli Kertas A4", "amount": 55000, "type": "out", "created_by": "Fina Finance"},
    {"id": str(uuid.uuid4()), "date": datetime.now(timezone.utc).isoformat(), "description": "Sisa Uang Jalan", "amount": 20000, "type": "in", "created_by": "Fina Finance"}
]
req("POST", "site_content", {"key": "finance_petty_cash", "content": petty_cash, "updated_at": datetime.now(timezone.utc).isoformat()})

cash_out = [
    {"id": str(uuid.uuid4()), "date": datetime.now(timezone.utc).isoformat(), "description": "Tagihan Vendor Percetakan Bintang", "amount": 1200000, "category": "vendor", "created_by": "Fina Finance"},
    {"id": str(uuid.uuid4()), "date": datetime.now(timezone.utc).isoformat(), "description": "Royalti Buku React Budi", "amount": 450000, "category": "royalty", "created_by": "Fina Finance"}
]
req("POST", "site_content", {"key": "finance_cash_out", "content": cash_out, "updated_at": datetime.now(timezone.utc).isoformat()})

# 7. HRD Payroll KPI
kpi_claims = [
    {"id": str(uuid.uuid4()), "user_email": "editor@publishinc.com", "user_name": "Bima Editor", "judul_tugas": "Editing Buku React", "poin_diajukan": 50, "status": "approved", "created_at": datetime.now(timezone.utc).isoformat()},
    {"id": str(uuid.uuid4()), "user_email": "layouter@publishinc.com", "user_name": "Sari Layouter", "judul_tugas": "Layout Sejarah", "poin_diajukan": 30, "status": "approved", "created_at": datetime.now(timezone.utc).isoformat()}
]
req("POST", "site_content", {"key": "kpi_claims", "content": kpi_claims, "updated_at": datetime.now(timezone.utc).isoformat()})

print("Done seeding.")
