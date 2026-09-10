from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")


def required_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise SystemExit(f"Env {name} belum diisi.")
    return value


SUPABASE_URL = required_env("SUPABASE_URL").rstrip("/")
SUPABASE_KEY = required_env("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_BUCKET = os.environ.get("SUPABASE_STORAGE_BUCKET", "publishinc-assets")
EMERGENT_KEY = required_env("EMERGENT_LLM_KEY")
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "https://integrations.emergentagent.com").rstrip("/")
EMERGENT_STORAGE_URL = f"{STORAGE_BASE}/objstore/api/v1/storage"

SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
}


def supabase_get(table: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers=SUPABASE_HEADERS,
        params={"select": "*", **(params or {})},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def init_emergent_storage() -> str:
    response = requests.post(
        f"{EMERGENT_STORAGE_URL}/init",
        json={"emergent_key": EMERGENT_KEY},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["storage_key"]


def download_emergent(path: str, storage_key: str) -> tuple[bytes, str]:
    response = requests.get(
        f"{EMERGENT_STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": storage_key},
        timeout=90,
    )
    response.raise_for_status()
    return response.content, response.headers.get("Content-Type", "application/octet-stream")


def upload_supabase(path: str, data: bytes, content_type: str, overwrite: bool) -> None:
    response = requests.put(
        f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_BUCKET}/{path}",
        headers={
            **SUPABASE_HEADERS,
            "Content-Type": content_type,
            "x-upsert": "true" if overwrite else "false",
        },
        data=data,
        timeout=120,
    )
    if response.status_code == 409 and not overwrite:
        print(f"SKIP sudah ada: {path}")
        return
    response.raise_for_status()


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrasi file Emergent object storage ke Supabase Storage.")
    parser.add_argument("--dry-run", action="store_true", help="Cek daftar file tanpa download/upload.")
    parser.add_argument("--overwrite", action="store_true", help="Timpa object yang sudah ada di Supabase Storage.")
    args = parser.parse_args()

    files = supabase_get("files", {"is_deleted": "is.false", "order": "created_at.asc"})
    files = [f for f in files if f.get("storage_path")]
    print(f"File metadata ditemukan: {len(files)}")
    if args.dry_run:
        for item in files:
            print(item["storage_path"])
        return

    storage_key = init_emergent_storage()
    copied = 0
    failed = 0
    for item in files:
        path = item["storage_path"]
        try:
            data, content_type = download_emergent(path, storage_key)
            upload_supabase(path, data, item.get("content_type") or content_type, args.overwrite)
            copied += 1
            print(f"OK {path} ({len(data)} bytes)")
        except Exception as exc:
            failed += 1
            print(f"FAIL {path}: {exc}")

    print(f"Selesai. copied={copied} failed={failed}")


if __name__ == "__main__":
    main()
