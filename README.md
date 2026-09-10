# Publish Inc. Vercel

Rebuild bersih dari project Publish Inc. untuk deploy ke Vercel dengan:

- React + Vite + Tailwind untuk frontend.
- FastAPI sebagai Vercel Python Function di `/api`.
- Supabase Postgres untuk database.
- Supabase Storage atau Google Drive untuk cover buku, tanda tangan, dokumen administrasi, dan arsip file.

## Setup Supabase

1. Buat project Supabase.
2. Buka SQL Editor, jalankan `supabase/schema.sql`.
3. Buat Storage bucket public bernama `publishinc-assets`.
4. Ambil `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`.

## Setup Google Drive

Google Drive bersifat opsional. Jika kredensial Drive belum diisi, sistem tetap memakai Supabase Storage atau storage lokal development.

1. Pakai folder root Drive: `https://drive.google.com/drive/folders/1LmwDKWYvPzanDQ_e42YBjjsnaJimJMiV`
2. Buat service account di Google Cloud dan aktifkan Google Drive API.
3. Share folder root tersebut ke email service account dengan akses Editor.
4. Isi env `GOOGLE_DRIVE_ROOT_FOLDER_ID` dan salah satu kredensial service account.

Sistem akan membuat subfolder otomatis, misalnya `Marketplace/Cover Buku`, `Landing Page/Hero`, `Administrasi Naskah/SPK`, `HRD/Payroll`, `Finance/Bukti Cash Out`, `Campaign/Event`, dan `Sosmed/Konten`.

## Jalankan Lokal

Install dependency frontend sekali:

```bash
npm install
```

Lalu jalankan:

```bash
npm run dev
```

Perintah ini menyalakan:

- Frontend Vite: `http://localhost:3000`
- Backend FastAPI: `http://127.0.0.1:8000`

Kalau `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` belum diisi, backend otomatis memakai database memory lokal dengan data contoh supaya UI tetap bisa dibuka. Data memory akan reset saat server dimatikan.

## Environment Vercel

Isi env vars berikut di Vercel Project Settings:

```txt
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET=publishinc-assets
JWT_SECRET
MASTER_ADMIN_EMAIL=master@publishinc.com
MASTER_ADMIN_PASSWORD=master123
ADMIN_EMAIL=admin@publishinc.com
ADMIN_PASSWORD=admin123
CS_EMAIL=cs@publishinc.com
CS_PASSWORD=cs123
GOOGLE_DRIVE_ROOT_FOLDER_ID=1LmwDKWYvPzanDQ_e42YBjjsnaJimJMiV
GOOGLE_SERVICE_ACCOUNT_JSON
```

## Migrasi MongoDB

Isi `.env` lokal dari `.env.example`, lalu jalankan:

```bash
pip install -r scripts/requirements-migration.txt
python scripts/migrate_mongo_to_supabase.py
```

Script ini memindahkan data utama dari MongoDB ke Supabase. File asset lama perlu dipindahkan terpisah kalau masih berupa object storage Emergent private.

## Deploy Vercel

Push folder ini ke GitHub, import di Vercel, lalu deploy. Build command:

```bash
npm run build
```

Output directory:

```txt
dist
```
