const now = new Date();
const iso = (daysOffset = 0) => {
  const date = new Date(now);
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString();
};

export const demoUsers = [
  { id: "demo-hrd", name: "Maya HRD", email: "hrd@publishinc.com", role: "hrd" },
  { id: "demo-admin", name: "Alya Admin", email: "admin@publishinc.com", role: "admin" },
  { id: "demo-cs", name: "Nadia CS", email: "cs@publishinc.com", role: "cs" },
  { id: "demo-pic-editor", name: "Pipit PIC Editor", email: "pic.editor@publishinc.com", role: "pic_editor" },
  { id: "demo-editor", name: "Bima Editor", email: "editor@publishinc.com", role: "editor" },
  { id: "demo-pic-layouter", name: "Lana PIC Layouter", email: "pic.layouter@publishinc.com", role: "pic_layouter" },
  { id: "demo-layouter", name: "Sari Layouter", email: "layouter@publishinc.com", role: "layouter" },
  { id: "demo-cco", name: "Dimas CCO", email: "cco@publishinc.com", role: "cco" },
  { id: "demo-marketplace", name: "Mika Marketplace", email: "marketplace@publishinc.com", role: "admin_marketplace" },
  { id: "demo-campaign", name: "Candra Campaign", email: "campaign@publishinc.com", role: "campaign" },
  { id: "demo-sosmed", name: "Sosmed User", email: "sosmed@publishinc.com", role: "sosmed" },
  { id: "demo-crm", name: "CRM User", email: "crm@publishinc.com", role: "crm" },
  { id: "demo-finance", name: "Fina Finance", email: "finance@publishinc.com", role: "finance" },
  { id: "demo-produksi", name: "Produksi User", email: "produksi@publishinc.com", role: "produksi" },
];

export const demoNaskah = [
  {
    id: "demo-naskah-1",
    tracking_code: "TRK-A1B2C",
    judul: "Menjadi Guru Kreatif di Era Digital",
    penulis: "Ratna Wijaya",
    no_hp_penulis: "081234567890",
    status: "antrian",
    deadline: iso(3),
    created_at: iso(-2),
    updated_at: iso(-1),
    spk_deals: { customer_name: "Ratna Wijaya", customer_phone: "081234567890", penerbit: "Publish Inc.", package_name: "Paket A" },
    spk_tasks: [],
  },
  {
    id: "demo-naskah-2",
    tracking_code: "TRK-D4E5F",
    judul: "Strategi UMKM Naik Kelas",
    penulis: "Andi Saputra",
    no_hp_penulis: "082233445566",
    status: "proses",
    deadline: iso(5),
    created_at: iso(-5),
    updated_at: iso(-1),
    spk_deals: { customer_name: "Andi Saputra", customer_phone: "082233445566", penerbit: "Nasmedia", package_name: "Paket B" },
    spk_tasks: [
      { task_type: "editing", status: "done", completed_at: iso(-2), points_reward: 50 },
      { task_type: "layout", status: "todo", completed_at: null, points_reward: 30 },
    ],
  },
  {
    id: "demo-naskah-3",
    tracking_code: "TRK-G7H8I",
    judul: "Antologi Puisi Hujan Pertama",
    penulis: "Laras Prameswari",
    no_hp_penulis: "085677889900",
    status: "revisi",
    deadline: iso(-1),
    created_at: iso(-8),
    updated_at: iso(0),
    spk_deals: { customer_name: "Laras Prameswari", customer_phone: "085677889900", penerbit: "Publish Inc.", package_name: "Paket A" },
    spk_tasks: [
      { task_type: "editing", status: "done", completed_at: iso(-5), points_reward: 50 },
      { task_type: "layout", status: "done", completed_at: iso(-3), points_reward: 30 },
    ],
  },
];

export const demoKpiTargets = [
  { id: "kpi-1", user_id: "demo-cs", metric_type: "cs_sales", target_deals: 12, target_omzet: 75000000, target_points: 12 },
  { id: "kpi-2", user_id: "demo-editor", metric_type: "words", target_words: 45000, target_points: 45000 },
  { id: "kpi-3", user_id: "demo-layouter", metric_type: "pages", target_pages: 320, target_points: 320 },
  { id: "kpi-4", user_id: "demo-hrd", metric_type: "manual", target_manual: 100, target_points: 100 },
];

export const demoKpiManual = [
  {
    id: "manual-1",
    created_at: iso(-1),
    judul_tugas: "Koreksi jumlah kata naskah edukasi",
    keterangan: "Ada bagian revisi tambahan yang belum masuk rekap.",
    poin_diajukan: 3500,
    status: "pending",
    user_id: { name: "Bima Editor", nama: "Bima Editor", role: "editor" },
  },
  {
    id: "manual-2",
    created_at: iso(-3),
    judul_tugas: "Penyesuaian halaman layout final",
    keterangan: "Jumlah halaman berubah setelah revisi proof.",
    poin_diajukan: 24,
    status: "approved",
    user_id: { name: "Sari Layouter", nama: "Sari Layouter", role: "layouter" },
  },
];

export const demoDeadlineRules = [
  { working_days: 14, label: "14 Hari Kerja", administrasi_start: 1, administrasi_end: 2, proofreading_start: 3, proofreading_end: 5, layout_start: 6, layout_end: 9, produksi_start: 10, produksi_end: 12, distribusi_start: 13, distribusi_end: 14, selesai_start: 14, selesai_end: 14 },
  { working_days: 21, label: "21 Hari Kerja", administrasi_start: 1, administrasi_end: 2, proofreading_start: 3, proofreading_end: 7, layout_start: 8, layout_end: 13, produksi_start: 14, produksi_end: 18, distribusi_start: 19, distribusi_end: 21, selesai_start: 21, selesai_end: 21 },
  { working_days: 30, label: "30 Hari Kerja", administrasi_start: 1, administrasi_end: 3, proofreading_start: 4, proofreading_end: 10, layout_start: 11, layout_end: 18, produksi_start: 19, produksi_end: 25, distribusi_start: 26, distribusi_end: 30, selesai_start: 30, selesai_end: 30 },
];

export const demoHolidays = [
  { date: iso(7).slice(0, 10), note: "Tanggal merah nasional" },
  { date: iso(14).slice(0, 10), note: "Cuti bersama" },
];

export const demoLateLogs = [
  {
    id: "late-1",
    hari_terlambat: 1,
    alasan: "Menunggu revisi file gambar dari penulis.",
    created_at: iso(-1),
    app_users: { name: "Sari Layouter" },
    spk_tasks: { task_type: "layout", spk_naskah: { judul: "Antologi Puisi Hujan Pertama" } },
  },
];

export const demoMarketplace = {
  naskahList: [
    { id: "demo-naskah-4", judul: "Membaca Kota", penulis: "Irfan Maulana" },
    { id: "demo-naskah-5", judul: "Rahasia Dapur Nusantara", penulis: "Mira Safitri" },
  ],
  stok: [
    { id: "stok-1", naskah_id: "demo-naskah-4", gudang: "Jogja", stok: 42, last_update: iso(-1), spk_naskah: { judul: "Membaca Kota" } },
    { id: "stok-2", naskah_id: "demo-naskah-5", gudang: "Makassar", stok: 8, last_update: iso(-2), spk_naskah: { judul: "Rahasia Dapur Nusantara" } },
  ],
  penjualan: [
    { id: "pj-1", naskah_id: "demo-naskah-4", marketplace: "Shopee", gudang: "Jogja", qty: 6, harga_jual: 89000, tanggal: iso(-1).slice(0, 10), spk_naskah: { judul: "Membaca Kota", penulis: "Irfan Maulana" } },
    { id: "pj-2", naskah_id: "demo-naskah-5", marketplace: "Tokopedia", gudang: "Makassar", qty: 3, harga_jual: 125000, tanggal: iso(-2).slice(0, 10), spk_naskah: { judul: "Rahasia Dapur Nusantara", penulis: "Mira Safitri" } },
  ],
};

export const demoCampaigns = [
  { id: "camp-1", type: "Event", title: "Workshop Menulis Buku Ajar", date: iso(5).slice(0, 10), status: "Upcoming", platform_or_location: "Makassar" },
  { id: "camp-2", type: "Konten", title: "Reels Tips Menulis Bab Pertama", date: iso(1).slice(0, 10), status: "Scheduled", platform_or_location: "Instagram" },
  { id: "camp-3", type: "Broadcast", title: "Promo Paket Terbit September", date: iso(0).slice(0, 10), status: "Sent", platform_or_location: "WhatsApp" },
];

export const demoPenerbit = [
  { id: "pub-1", nama: "Publish Inc.", paket: ["Paket A", "Paket B", "Paket Premium"] },
  { id: "pub-2", nama: "Nasmedia", paket: ["Paket Edukasi", "Paket Kampus"] },
];

export const demoDashboardStats = {
  omzetDeal: 84500000,
  omzetMarketplace: 909000,
  labaBersih: 818100,
  naskahOnProcess: 18,
  kpiUsersTarget: 6,
  kpiUsersMet: 4,
  naskahSelesai: 11,
};
