-- Ekstensi UUID dan pgcrypto (biasanya sudah ada, tapi kita pastikan)
create extension if not exists pgcrypto;

-- 1. Modifikasi tabel app_users untuk menghapus batasan role (master_admin, admin, cs)
-- Karena SQLite/Postgres tidak semudah itu mengubah CHECK constraint tanpa mengetahui nama aslinya,
-- kita bisa mengubah kolom atau membiarkannya jika kita menggunakan tipe teks biasa.
-- Tapi untuk amannya, kita izinkan text biasa saja.
-- Jika tabel app_users sudah ada dan ada CHECK constraint, kita harus melakukan ALTER TABLE (jika tahu namanya).
-- Asumsikan kita akan menambah tabel role tersendiri untuk fleksibilitas di sistem React ERP:

create table if not exists roles (
  id varchar(50) primary key, -- 'pimpinan', 'hrd', 'cco', dsb.
  name text not null,
  description text
);

insert into roles (id, name, description) values
('pimpinan', 'Pimpinan', 'Memantau kinerja dan kebijakan'),
('manajemen', 'Manajemen', 'Mengelola target dan parameter sistem'),
('hrd', 'HRD', 'Pengelolaan SDM dan Payroll KPI'),
('cco', 'CCO', 'Customer Care Officer (Gerbang naskah dan deal)'),
('admin', 'Admin', 'Administrasi Naskah dan SPK'),
('pic_editor', 'PIC Editor', 'Koordinator Editor'),
('pic_layouter', 'PIC Layouter', 'Koordinator Layouter'),
('editor', 'Editor', 'Tim Kreatif (Editor)'),
('layouter', 'Layouter', 'Tim Kreatif (Layouter)'),
('admin_marketplace', 'Admin Marketplace', 'Pengelolaan Penjualan Online'),
('campaign', 'Campaign', 'Manajemen Mitra dan Promosi'),
('report', 'Report Display', 'Tampilan Signage Kantor')
on conflict (id) do nothing;

-- Update `app_users` untuk merujuk ke tabel roles ini nantinya bisa dilakukan manual,
-- Tapi untuk saat ini kita pastikan tabel-tabel utama SPK dibuat.

-- 2. Tabel SPK Naskah & Deals
create table if not exists spk_deals (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text,
  penerbit text,
  package_name text,
  spesifikasi_cetak text,
  ukuran text,
  estimasi_halaman integer,
  estimasi_kata integer,
  total_price integer default 0,
  down_payment integer default 0,
  catatan text,
  status text default 'pending', -- pending, dp, lunas
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists spk_naskah (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references spk_deals(id) on delete set null,
  tracking_code text unique, -- Readable code ex: TRK-001
  judul text not null,
  penulis text not null,
  no_hp_penulis text,
  status text default 'baru', -- baru, antrian, proses, revisi, selesai
  assigned_to uuid references app_users(id) on delete set null, -- User eksekutor (editor/layouter)
  cco_id uuid references app_users(id) on delete set null, -- Assigned CCO
  isbn text,
  spk_url text, -- link ke dokumen PDF SPK
  spk_token text, -- 6 digit PIN untuk approval penulis
  spk_approved_at timestamptz,
  deadline timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Tabel KPI Targets & Tasks
create table if not exists spk_kpi_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete cascade,
  target_points integer default 100,
  month integer not null,
  year integer not null,
  created_at timestamptz default now(),
  unique(user_id, month, year)
);

create table if not exists spk_tasks (
  id uuid primary key default gen_random_uuid(),
  naskah_id uuid references spk_naskah(id) on delete cascade,
  task_type text not null, -- 'layout', 'editing', 'cover'
  assigned_to uuid references app_users(id) on delete set null,
  points_reward integer default 0,
  status text default 'todo', -- todo, in_progress, done
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- 4. Tabel Marketplace & Stok
create table if not exists spk_stok (
  id uuid primary key default gen_random_uuid(),
  naskah_id uuid references spk_naskah(id) on delete cascade,
  gudang text not null, -- 'Jogja', 'Makassar'
  stok integer default 0,
  last_update timestamptz default now()
);

create table if not exists spk_penjualan (
  id uuid primary key default gen_random_uuid(),
  naskah_id uuid references spk_naskah(id) on delete cascade,
  marketplace text not null, -- 'Shopee', 'Tokopedia', 'TikTok Shop'
  gudang text not null, -- 'Jogja', 'Makassar'
  qty integer default 0,
  harga_jual integer default 0,
  tanggal date not null,
  created_at timestamptz default now()
);

-- 5. Tabel Campaign
create table if not exists spk_campaigns (
  id uuid primary key default gen_random_uuid(),
  type text not null, -- 'Event', 'Konten', 'Broadcast'
  title text not null,
  date date not null,
  status text not null, 
  platform_or_location text,
  created_at timestamptz default now()
);

-- 6. Tabel Master Data & Pengaturan Sistem (Manajemen)
create table if not exists spk_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists spk_penerbit (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  paket text[],
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists spk_kpi_koreksi (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references spk_tasks(id) on delete cascade,
  user_id uuid references app_users(id) on delete cascade,
  alasan text not null,
  status text default 'pending', -- pending, approved, rejected
  created_at timestamptz default now()
);

-- 7. Tabel Ekstensi (Fase 8: Manajemen & Royalti)
create table if not exists spk_hapus_request (
  id uuid primary key default gen_random_uuid(),
  tipe_data text not null, -- 'deal', 'naskah'
  data_id uuid not null,
  alasan text not null,
  requested_by uuid references app_users(id),
  status text default 'pending', -- pending, approved, rejected
  created_at timestamptz default now()
);

create table if not exists spk_keterlambatan (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references spk_tasks(id) on delete cascade,
  user_id uuid references app_users(id),
  alasan text not null,
  hari_terlambat integer default 1,
  created_at timestamptz default now()
);

create table if not exists spk_royalti (
  id uuid primary key default gen_random_uuid(),
  penjualan_id uuid references spk_penjualan(id) on delete cascade,
  naskah_id uuid references spk_naskah(id) on delete cascade,
  jumlah_royalti integer not null,
  status text default 'belum_cair', -- belum_cair, sudah_cair
  tanggal_cair timestamptz,
  created_at timestamptz default now()
);

-- 8. Tabel Ekstensi (Fase 9: KPI Manual Eksekutor)
create table if not exists spk_kpi_manual (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete cascade,
  judul_tugas text not null,
  poin_diajukan integer not null,
  status text default 'pending', -- pending, approved, rejected
  keterangan text,
  disetujui_oleh uuid references app_users(id),
  created_at timestamptz default now()
);
