create extension if not exists pgcrypto;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null,
  signature_path text,
  signature_url text,
  created_at timestamptz default now()
);

create table if not exists site_content (
  key text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  title text not null,
  author text not null,
  description text default '',
  price integer default 0,
  category text default 'Umum',
  cover_url text default '',
  slug text unique,
  isbn text default '',
  pages integer default 0,
  year text default '',
  featured boolean default false,
  is_takedown boolean default false,
  created_at timestamptz default now()
);

create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  storage_path text not null unique,
  public_url text,
  original_filename text,
  content_type text,
  size integer default 0,
  is_deleted boolean default false,
  created_at timestamptz default now()
);

create table if not exists cs_packages (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  name text not null,
  price integer default 0
);

create table if not exists cs_facilities (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  name text not null,
  price integer default 0
);

create table if not exists cs_settings (
  key text primary key,
  bank_account text default '',
  signature_path text,
  signature_url text,
  signer_name text,
  signer_title text,
  dp_percent integer default 70,
  data jsonb default '{}'::jsonb
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  name text not null,
  phone text default '',
  instansi text default '',
  city text default '',
  created_at timestamptz default now()
);

create table if not exists counters (
  name text primary key,
  seq integer not null default 999
);

create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  number text unique,
  customer_id uuid references customers(id) on delete set null,
  customer jsonb default '{}'::jsonb,
  service_type text default 'terbit',
  publisher text default '',
  judul text default '',
  package jsonb default '{}'::jsonb,
  facilities jsonb default '[]'::jsonb,
  adjustments jsonb default '{}'::jsonb,
  package_total integer default 0,
  facilities_total integer default 0,
  subtotal integer default 0,
  grand_total integer default 0,
  status text default 'penawaran',
  hidden boolean default false,
  invoice_created boolean default false,
  created_by uuid references app_users(id) on delete set null,
  created_by_name text,
  created_at timestamptz default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  mongo_id text unique,
  number text unique,
  offer_id uuid references offers(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  customer jsonb default '{}'::jsonb,
  service_type text default 'terbit',
  publisher text default '',
  judul text default '',
  package jsonb default '{}'::jsonb,
  facilities jsonb default '[]'::jsonb,
  adjustments jsonb default '{}'::jsonb,
  package_total integer default 0,
  facilities_total integer default 0,
  subtotal integer default 0,
  grand_total integer default 0,
  status text default 'unpaid',
  paid_amount integer default 0,
  remaining integer default 0,
  hidden boolean default false,
  created_at timestamptz default now()
);

insert into counters (name, seq)
values ('offer', 999), ('invoice', 999)
on conflict (name) do nothing;

alter table offers add column if not exists service_type text default 'terbit';
alter table offers add column if not exists publisher text default '';
alter table invoices add column if not exists service_type text default 'terbit';
alter table invoices add column if not exists publisher text default '';

create table if not exists roles (
  id varchar(50) primary key,
  name text not null,
  description text
);

insert into roles (id, name, description) values
('pimpinan', 'Pimpinan', 'Memantau kinerja dan kebijakan'),
('hrd', 'HRD', 'Pengelolaan SDM dan Payroll KPI'),
('cco', 'CCO', 'Customer Care Officer (Gerbang naskah dan deal)'),
('admin', 'Admin', 'Administrasi Naskah dan SPK'),
('pic_editor', 'PIC Editor', 'Koordinator Editor'),
('pic_layouter', 'PIC Layouter', 'Koordinator Layouter'),
('editor', 'Editor', 'Tim Kreatif (Editor)'),
('layouter', 'Layouter', 'Tim Kreatif (Layouter)'),
('admin_marketplace', 'Admin Marketplace', 'Pengelolaan Penjualan Online'),
('campaign', 'Campaign', 'Manajemen Mitra dan Promosi'),
('sosmed', 'Sosmed', 'Manajemen Media Sosial'),
('crm', 'CRM', 'Manajemen Relasi Pelanggan'),
('produksi', 'Produksi', 'Tim Cetak dan Produksi'),
('finance', 'Finance', 'Manajemen Keuangan'),
('report', 'Report Display', 'Tampilan Signage Kantor')
on conflict (id) do nothing;

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
  status text default 'pending',
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists spk_naskah (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references spk_deals(id) on delete set null,
  tracking_code text unique,
  judul text not null,
  penulis text not null,
  no_hp_penulis text,
  status text default 'baru',
  assigned_to uuid references app_users(id) on delete set null,
  cco_id uuid references app_users(id) on delete set null,
  isbn text,
  spk_url text,
  spk_token text,
  spk_approved_at timestamptz,
  deadline timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists spk_kpi_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete cascade,
  metric_type text default 'manual',
  target_points integer default 100,
  target_words integer default 0,
  target_pages integer default 0,
  target_deals integer default 0,
  target_omzet integer default 0,
  target_manual integer default 0,
  month integer not null,
  year integer not null,
  created_at timestamptz default now(),
  unique(user_id, month, year)
);

alter table spk_kpi_targets add column if not exists metric_type text default 'manual';
alter table spk_kpi_targets add column if not exists target_words integer default 0;
alter table spk_kpi_targets add column if not exists target_pages integer default 0;
alter table spk_kpi_targets add column if not exists target_deals integer default 0;
alter table spk_kpi_targets add column if not exists target_omzet integer default 0;
alter table spk_kpi_targets add column if not exists target_manual integer default 0;

create table if not exists spk_tasks (
  id uuid primary key default gen_random_uuid(),
  naskah_id uuid references spk_naskah(id) on delete cascade,
  task_type text not null,
  assigned_to uuid references app_users(id) on delete set null,
  points_reward integer default 0,
  status text default 'todo',
  completed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists spk_stok (
  id uuid primary key default gen_random_uuid(),
  naskah_id uuid references spk_naskah(id) on delete cascade,
  gudang text not null,
  stok integer default 0,
  last_update timestamptz default now()
);

create table if not exists spk_penjualan (
  id uuid primary key default gen_random_uuid(),
  naskah_id uuid references spk_naskah(id) on delete cascade,
  marketplace text not null,
  gudang text not null,
  qty integer default 0,
  harga_jual integer default 0,
  tanggal date not null,
  created_at timestamptz default now()
);

create table if not exists spk_campaigns (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  date date not null,
  status text not null, 
  platform_or_location text,
  created_at timestamptz default now()
);

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
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists spk_hapus_request (
  id uuid primary key default gen_random_uuid(),
  tipe_data text not null,
  data_id uuid not null,
  alasan text not null,
  requested_by uuid references app_users(id),
  status text default 'pending',
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
  status text default 'belum_cair',
  tanggal_cair timestamptz,
  created_at timestamptz default now()
);

create table if not exists spk_kpi_manual (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete cascade,
  judul_tugas text not null,
  poin_diajukan integer not null,
  status text default 'pending',
  keterangan text,
  disetujui_oleh uuid references app_users(id),
  created_at timestamptz default now()
);
