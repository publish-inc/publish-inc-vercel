from __future__ import annotations

from datetime import datetime, timezone
import argparse
import os
from typing import Any

import requests
from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()


def required_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise SystemExit(f"Env {name} belum diisi. Lengkapi file .env dulu.")
    return value


SUPABASE_URL = required_env("SUPABASE_URL").rstrip("/")
SUPABASE_KEY = required_env("SUPABASE_SERVICE_ROLE_KEY")
MONGO_URL = required_env("MONGO_URL")
MONGO_DB_NAME = required_env("MONGO_DB_NAME")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation,resolution=merge-duplicates",
}

UPSERT_KEYS = {
    "app_users": "mongo_id",
    "customers": "mongo_id",
    "books": "mongo_id",
    "cs_packages": "mongo_id",
    "cs_facilities": "mongo_id",
    "cs_settings": "key",
    "site_content": "key",
    "offers": "mongo_id",
    "invoices": "mongo_id",
    "files": "mongo_id",
}


def iso(value: Any) -> str:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    if isinstance(value, str) and value:
        return value
    return datetime.now(timezone.utc).isoformat()


def oid(value: Any) -> str:
    return str(value) if isinstance(value, ObjectId) else str(value or "")


def jsonable(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    if isinstance(value, list):
        return [jsonable(item) for item in value]
    if isinstance(value, dict):
        return {str(k): jsonable(v) for k, v in value.items()}
    return value


def post(table: str, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not rows:
        return []
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    params = {"on_conflict": UPSERT_KEYS[table]} if table in UPSERT_KEYS else None
    result = []
    for i in range(0, len(rows), 200):
        payload = jsonable(rows[i : i + 200])
        r = requests.post(url, headers=HEADERS, params=params, json=payload, timeout=60)
        if r.status_code >= 400:
            raise RuntimeError(f"{table} import failed: {r.status_code} {r.text}")
        result.extend(r.json())
    return result


def check_supabase() -> None:
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/app_users",
        headers=HEADERS,
        params={"select": "id", "limit": 1},
        timeout=30,
    )
    if r.status_code >= 400:
        raise SystemExit(
            "Supabase belum siap. Pastikan supabase/schema.sql sudah dijalankan "
            f"dan SERVICE_ROLE_KEY benar. Response: {r.status_code} {r.text}"
        )


def collection_count(mongo, name: str) -> int:
    try:
        return mongo[name].count_documents({})
    except Exception:
        return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrasi data Publish Inc. dari MongoDB ke Supabase.")
    parser.add_argument("--dry-run", action="store_true", help="Cek koneksi dan tampilkan jumlah dokumen tanpa insert ke Supabase.")
    args = parser.parse_args()

    mongo = MongoClient(MONGO_URL)[MONGO_DB_NAME]
    check_supabase()

    collections = ["users", "customers", "books", "cs_packages", "cs_facilities", "cs_settings", "site_content", "offers", "invoices", "files"]
    counts = {name: collection_count(mongo, name) for name in collections}
    print("Koneksi MongoDB dan Supabase OK.")
    for name, count in counts.items():
        print(f"- {name}: {count} dokumen")
    if args.dry_run:
        print("Dry run selesai. Tidak ada data yang diinsert.")
        return

    id_map: dict[str, str] = {}

    users = []
    for u in mongo.users.find({}):
        users.append({
            "mongo_id": oid(u["_id"]),
            "name": u.get("name") or u.get("email", "User"),
            "email": (u.get("email") or "").lower(),
            "password_hash": u.get("password_hash") or "",
            "role": u.get("role") or "admin",
            "signature_path": u.get("signature_path"),
            "signature_url": u.get("signature_url"),
            "created_at": iso(u.get("created_at")),
        })
    for row in post("app_users", users):
        if row.get("mongo_id"):
            id_map[row["mongo_id"]] = row["id"]

    customers = []
    for c in mongo.customers.find({}):
        customers.append({
            "mongo_id": oid(c["_id"]),
            "name": c.get("name") or "-",
            "phone": c.get("phone") or "",
            "instansi": c.get("instansi") or "",
            "city": c.get("city") or "",
            "created_at": iso(c.get("created_at")),
        })
    for row in post("customers", customers):
        if row.get("mongo_id"):
            id_map[row["mongo_id"]] = row["id"]

    books = []
    for b in mongo.books.find({}):
        books.append({
            "mongo_id": oid(b["_id"]),
            "title": b.get("title") or "Tanpa Judul",
            "author": b.get("author") or "-",
            "description": b.get("description") or "",
            "price": int(b.get("price") or 0),
            "category": b.get("category") or "Umum",
            "cover_url": b.get("cover_url") or "",
            "slug": b.get("slug"),
            "isbn": b.get("isbn") or "",
            "pages": int(b.get("pages") or 0),
            "year": b.get("year") or "",
            "featured": bool(b.get("featured")),
            "is_takedown": bool(b.get("is_takedown")),
            "created_at": iso(b.get("created_at")),
        })
    post("books", books)

    packages = [{"mongo_id": oid(p["_id"]), "name": p.get("name") or "-", "price": int(p.get("price") or 0)} for p in mongo.cs_packages.find({})]
    facilities = [{"mongo_id": oid(f["_id"]), "name": f.get("name") or "-", "price": int(f.get("price") or 0)} for f in mongo.cs_facilities.find({})]
    post("cs_packages", packages)
    post("cs_facilities", facilities)

    settings = mongo.cs_settings.find_one({"key": "cs"})
    if settings:
        post("cs_settings", [{
            "key": "cs",
            "bank_account": settings.get("bank_account") or "",
            "signature_path": settings.get("signature_path"),
            "signature_url": settings.get("signature_url"),
            "signer_name": settings.get("signer_name"),
            "signer_title": settings.get("signer_title"),
            "dp_percent": int(settings.get("dp_percent") or 70),
            "data": jsonable({k: v for k, v in settings.items() if k not in {"_id", "key"}}),
        }])

    content = mongo.site_content.find_one({"key": "landing"})
    if content:
        content.pop("_id", None)
        post("site_content", [{"key": "landing", "content": jsonable(content), "updated_at": datetime.now(timezone.utc).isoformat()}])

    offers = []
    for o in mongo.offers.find({}):
        mid = oid(o["_id"])
        cid = id_map.get(oid(o.get("customer_id"))) if o.get("customer_id") else None
        uid = id_map.get(oid(o.get("created_by"))) if o.get("created_by") else None
        offers.append({
            "mongo_id": mid,
            "number": o.get("number"),
            "customer_id": cid,
            "customer": jsonable(o.get("customer") or {}),
            "judul": o.get("judul") or "",
            "package": jsonable(o.get("package") or {}),
            "facilities": jsonable(o.get("facilities") or []),
            "adjustments": jsonable(o.get("adjustments") or {}),
            "package_total": int(o.get("package_total") or 0),
            "facilities_total": int(o.get("facilities_total") or 0),
            "subtotal": int(o.get("subtotal") or 0),
            "grand_total": int(o.get("grand_total") or 0),
            "status": o.get("status") or "penawaran",
            "hidden": bool(o.get("hidden")),
            "invoice_created": bool(o.get("invoice_created")),
            "created_by": uid,
            "created_by_name": o.get("created_by_name"),
            "created_at": iso(o.get("created_at")),
        })
    for row in post("offers", offers):
        if row.get("mongo_id"):
            id_map[row["mongo_id"]] = row["id"]

    invoices = []
    for inv in mongo.invoices.find({}):
        invoices.append({
            "mongo_id": oid(inv["_id"]),
            "number": inv.get("number"),
            "offer_id": id_map.get(oid(inv.get("offer_id"))) if inv.get("offer_id") else None,
            "customer_id": id_map.get(oid(inv.get("customer_id"))) if inv.get("customer_id") else None,
            "customer": jsonable(inv.get("customer") or {}),
            "judul": inv.get("judul") or "",
            "package": jsonable(inv.get("package") or {}),
            "facilities": jsonable(inv.get("facilities") or []),
            "adjustments": jsonable(inv.get("adjustments") or {}),
            "package_total": int(inv.get("package_total") or 0),
            "facilities_total": int(inv.get("facilities_total") or 0),
            "subtotal": int(inv.get("subtotal") or 0),
            "grand_total": int(inv.get("grand_total") or 0),
            "status": inv.get("status") or "unpaid",
            "paid_amount": int(inv.get("paid_amount") or 0),
            "remaining": int(inv.get("remaining") or 0),
            "hidden": bool(inv.get("hidden")),
            "created_at": iso(inv.get("created_at")),
        })
    post("invoices", invoices)

    files = []
    for f in mongo.files.find({}):
        files.append({
            "mongo_id": oid(f["_id"]),
            "storage_path": f.get("storage_path") or oid(f["_id"]),
            "public_url": f.get("public_url"),
            "original_filename": f.get("original_filename"),
            "content_type": f.get("content_type"),
            "size": int(f.get("size") or 0),
            "is_deleted": bool(f.get("is_deleted")),
            "created_at": iso(f.get("created_at")),
        })
    post("files", files)

    print("Migrasi selesai.")
    print("Catatan: file lama yang masih tersimpan di Emergent perlu dipindahkan terpisah ke Supabase Storage bila URL /api/files lama harus tetap aktif.")


if __name__ == "__main__":
    main()
