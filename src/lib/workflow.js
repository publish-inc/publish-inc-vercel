import { demoUsers } from "./demoData";

const WORKFLOW_KEY = "publishinc_workflow_items_v1";
const KPI_KEY = "publishinc_kpi_events_v1";
const KPI_TARGETS_KEY = "publishinc_role_kpi_targets_v1";
const KPI_APPROVALS_KEY = "publishinc_kpi_approvals_v1";
export const LAYOUT_ACCESS_KEY = "publishinc_layout_access_key_v1";

const today = () => new Date().toISOString().slice(0, 10);
const iso = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString();
};

export const ROLE_LABELS = {
  master_admin: "Master",
  pimpinan: "Pimpinan",
  admin: "Admin",
  cs: "CS",
  cco: "CCO",
  pic_editor: "PIC Editor",
  editor: "Editor",
  pic_layouter: "PIC Layouter",
  layouter: "Layouter",
  hrd: "HRD",
  admin_marketplace: "Admin Marketplace",
  campaign: "Campaign",
  sosmed: "Sosmed",
  crm: "CRM",
  finance: "Finance",
  produksi: "Produksi",
};

export const STAGE_LABELS = {
  cs_hold: "Hold CS (Menunggu Diserahkan)",
  cco_new: "Naskah Baru CCO",
  author_form: "Menunggu Form Penulis",
  admin_administrasi: "Administrasi",
  cco_ready_production: "Siap Produksi",
  pic_editor: "Antrian PIC Editor",
  editor_work: "Dikerjakan Editor",
  pic_layouter: "Antrian PIC Layouter",
  layouter_work: "Dikerjakan Layouter",
  cco_isbn: "Pengecekan ISBN (CCO)",
  produksi_work: "Proses Cetak Produksi",
  cco_distribution: "Distribusi CCO",
  done: "Selesai",
  delete_requested: "Pengajuan Hapus",
  deleted: "Dihapus",
  omzet_only: "Layanan Non Naskah",
};

export const TIMELINE_STAGES = [
  ["administrasi", "Administrasi"],
  ["proofreading", "Proofreading"],
  ["layout", "Desain Cover & Layout"],
  ["produksi", "Produksi"],
  ["distribusi", "Distribusi"],
  ["selesai", "Selesai"],
];

export const DEFAULT_RULES = {
  Paket_A: { package_name: "Paket A", administrasi_start: 1, administrasi_end: 2, proofreading_start: 3, proofreading_end: 5, layout_start: 6, layout_end: 9, produksi_start: 10, produksi_end: 12, distribusi_start: 13, distribusi_end: 14, selesai_start: 15, selesai_end: 15 },
  Paket_B: { package_name: "Paket B", administrasi_start: 1, administrasi_end: 2, proofreading_start: 3, proofreading_end: 6, layout_start: 7, layout_end: 11, produksi_start: 12, produksi_end: 15, distribusi_start: 16, distribusi_end: 17, selesai_start: 18, selesai_end: 18 },
  Langsung_Layout: { package_name: "Langsung Layout", administrasi_start: 1, administrasi_end: 2, proofreading_start: 0, proofreading_end: 0, layout_start: 3, layout_end: 6, produksi_start: 7, produksi_end: 9, distribusi_start: 10, distribusi_end: 11, selesai_start: 12, selesai_end: 12 },
};

export const TRACKING_STAGE_ORDER = ["administrasi", "proofreading", "layout", "produksi", "distribusi", "selesai"];

export const DEFAULT_ROLE_KPIS = {
  cs: [
    { id: "cs-terbit", name: "Terbit", metric: "deal_terbit", target: 12, fixed: true, unit: "deal" },
    { id: "cs-omzet", name: "Omzet", metric: "omzet", target: 75000000, fixed: true, unit: "rupiah" },
    { id: "cs-cetak", name: "Cetak", metric: "deal_cetak", target: 0, fixed: false, unit: "deal" },
  ],
  cco: [{ id: "cco-pendampingan", name: "Pendampingan", metric: "pendampingan_naskah", target: 30, fixed: true, unit: "naskah" }],
  admin: [{ id: "admin-administrasi", name: "Administrasi", metric: "administrasi", target: 30, fixed: true, unit: "dokumen" }],
  pic_editor: [{ id: "pic-editor-team", name: "Capaian Tim Editor", metric: "team_editor_pages", target: 8, fixed: true, unit: "orang" }],
  pic_layouter: [{ id: "pic-layouter-team", name: "Capaian Tim Layouter", metric: "team_layouter_pages", target: 8, fixed: true, unit: "orang" }],
  editor: [{ id: "editor-kata", name: "Jumlah Kata Proofreading", metric: "jumlah_kata", target: 30000, fixed: true, unit: "kata" }],
  layouter: [{ id: "layouter-halaman", name: "Jumlah Halaman", metric: "jumlah_halaman", target: 320, fixed: true, unit: "halaman" }],
  produksi: [{ id: "produksi-cetak", name: "Jumlah Naskah Dicetak", metric: "produksi_naskah", target: 30, fixed: false, unit: "naskah" }],
  campaign: [{ id: "campaign-event", name: "Event Terselenggara", metric: "campaign_event", target: 4, fixed: false, unit: "event" }],
  sosmed: [{ id: "sosmed-konten", name: "Konten Dipublikasi", metric: "sosmed_konten", target: 30, fixed: false, unit: "konten" }],
  admin_marketplace: [{ id: "marketplace-omzet", name: "Omzet Penjualan Buku", metric: "marketplace_omzet", target: 10000000, fixed: false, unit: "rupiah" }],
  crm: [{ id: "crm-followup", name: "Follow Up Prospek", metric: "crm_followup", target: 100, fixed: false, unit: "kontak" }],
  finance: [{ id: "finance-laporan", name: "Laporan Keuangan Selesai", metric: "finance_laporan", target: 1, fixed: false, unit: "laporan" }],
  hrd: [],
  master_admin: [],
};

const seedItems = () => [
  {
    id: "wf-1001",
    service_type: "terbit",
    stage: "cco_new",
    tracking_code: "TRK-A1B2C",
    token: "582194",
    created_at: iso(-2),
    updated_at: iso(-1),
    base_date: today(),
    customer: { name: "Ratna Wijaya", phone: "081234567890", city: "Bandung", profession: "Guru" },
    manuscript: { title: "Menjadi Guru Kreatif di Era Digital", author: "Ratna Wijaya", phone: "081234567890", publisher: "Publish Inc.", package_name: "Paket A", need_proofreading: true, estimated_words: 42000, estimated_pages: 180, specs: "B5, BW, bookpaper", notes: "Butuh proofreading bahasa Indonesia." },
    financial: { total_price: 7500000, down_payment: 3500000, status_payment: "deal" },
    tasks: {},
    delays: {},
    history: [{ at: iso(-2), text: "Deal terbit dibuat oleh CS." }],
  },
  {
    id: "wf-1002",
    service_type: "terbit",
    stage: "admin_administrasi",
    tracking_code: "TRK-D4E5F",
    token: "719305",
    created_at: iso(-5),
    updated_at: iso(-1),
    base_date: iso(-4).slice(0, 10),
    customer: { name: "Andi Saputra", phone: "082233445566", city: "Makassar", profession: "Dosen" },
    manuscript: { title: "Strategi UMKM Naik Kelas", author: "Andi Saputra", phone: "082233445566", publisher: "Nasmedia", package_name: "Paket B", need_proofreading: true, estimated_words: 61000, estimated_pages: 246, specs: "A5, SC, BW", notes: "Form penulis dan SPK sudah masuk." },
    financial: { total_price: 9800000, down_payment: 5000000, status_payment: "deal" },
    tasks: {},
    delays: {},
    spk_url: "",
    history: [{ at: iso(-5), text: "Deal dibuat CS." }, { at: iso(-1), text: "Penulis menyelesaikan form dan SPK." }],
  },
  {
    id: "wf-1003",
    service_type: "terbit",
    stage: "editor_work",
    tracking_code: "TRK-G7H8I",
    token: "438812",
    created_at: iso(-8),
    updated_at: iso(-1),
    base_date: iso(-7).slice(0, 10),
    customer: { name: "Laras Prameswari", phone: "085677889900", city: "Yogyakarta", profession: "Penulis" },
    manuscript: { title: "Antologi Puisi Hujan Pertama", author: "Laras Prameswari", phone: "085677889900", publisher: "Publish Inc.", package_name: "Paket A", need_proofreading: true, estimated_words: 28000, estimated_pages: 132, specs: "13x19, BW", notes: "Maksimal revisi 2 kali." },
    financial: { total_price: 5200000, down_payment: 5200000, status_payment: "deal" },
    tasks: {
      editor: { id: "task-1003-editor", type: "editor", assignee_id: "demo-editor", assignee_name: "Bima Editor", status: "menunggu", revision_limit: 2, revision_done: 0, kpi_claimed: false },
    },
    delays: {},
    history: [{ at: iso(-8), text: "Mulai produksi dan masuk PIC Editor." }, { at: iso(-1), text: "Ditugaskan ke Bima Editor." }],
  },
  {
    id: "wf-1004",
    service_type: "cetak",
    stage: "pic_layouter",
    tracking_code: "TRK-L8Y2T",
    token: "902117",
    created_at: iso(-4),
    updated_at: iso(-1),
    base_date: iso(-3).slice(0, 10),
    customer: { name: "Mira Safitri", phone: "087812341234", city: "Surabaya", profession: "Konsultan" },
    manuscript: { title: "Modul Pelatihan Komunikasi Publik", author: "Mira Safitri", phone: "087812341234", publisher: "Publish Inc.", package_name: "Langsung Layout", need_proofreading: false, estimated_words: 0, estimated_pages: 96, specs: "Cetak 100 eks, A4, full color", notes: "Langsung layout untuk kebutuhan cetak." },
    financial: { total_price: 12300000, down_payment: 6000000, status_payment: "deal" },
    tasks: {},
    delays: {},
    history: [{ at: iso(-4), text: "Deal cetak dibuat CS." }, { at: iso(-1), text: "Administrasi selesai, masuk PIC Layouter." }],
  },
  {
    id: "wf-1005",
    service_type: "cetak",
    stage: "produksi_work",
    tracking_code: "TRK-PRD01",
    token: "610294",
    created_at: iso(-3),
    updated_at: iso(-1),
    base_date: iso(-2).slice(0, 10),
    customer: { name: "Dr. Hendra Gunawan", phone: "08119876543", city: "Makassar", profession: "Dosen" },
    manuscript: { title: "Buku Ajar Biokimia Molekuler", author: "Dr. Hendra Gunawan", phone: "08119876543", publisher: "Publish Inc.", package_name: "Paket Cetak Edisi Khusus", need_proofreading: false, estimated_words: 55000, estimated_pages: 240, specs: "Cetak 200 Eks • A5 • Bookpaper 57gr • Softcover Glossy", notes: "Order cetak fisik 200 eksemplar untuk kuliah umum." },
    financial: { total_price: 14500000, down_payment: 14500000, status_payment: "deal" },
    tasks: {},
    delays: {},
    history: [{ at: iso(-3), text: "Masuk antrian cetak produksi." }],
  },
  {
    id: "wf-1006",
    service_type: "terbit",
    stage: "produksi_work",
    tracking_code: "TRK-PRD02",
    token: "882103",
    created_at: iso(-5),
    updated_at: iso(-1),
    base_date: iso(-4).slice(0, 10),
    customer: { name: "Rina Sastro", phone: "081234112233", city: "Surabaya", profession: "Penulis Novel" },
    manuscript: { title: "Kisah di Ujung Musim Dingin", author: "Rina Sastro", phone: "081234112233", publisher: "Publish Inc.", package_name: "Paket A (50 Eks)", need_proofreading: true, estimated_words: 38000, estimated_pages: 160, specs: "Cetak 50 Eks • 13x19 cm • Bookpaper 72gr • SC Doff", notes: "Naskah terbit & cetak 50 eks." },
    financial: { total_price: 6800000, down_payment: 3400000, status_payment: "deal" },
    tasks: {},
    delays: {},
    history: [{ at: iso(-5), text: "Proofreading & layout selesai, masuk antrian cetak produksi." }],
  },
];

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));

export const getWorkflowItems = () => {
  let items = readJson(WORKFLOW_KEY, null);
  if (items === null) {
    items = [];
    writeJson(WORKFLOW_KEY, items);
  }
  return items;
};

export const saveWorkflowItems = (items) => writeJson(WORKFLOW_KEY, items);

export const getKpiEvents = () => readJson(KPI_KEY, []);
export const saveKpiEvents = (events) => writeJson(KPI_KEY, events);
export const getKpiApprovals = () => readJson(KPI_APPROVALS_KEY, []);

export const saveKpiApprovals = (items) => writeJson(KPI_APPROVALS_KEY, items);

export const getRoleKpiTargets = () => {
  const saved = readJson(KPI_TARGETS_KEY, {});
  return Object.fromEntries(
    Object.entries(DEFAULT_ROLE_KPIS).map(([role, defaults]) => {
      const existing = Array.isArray(saved[role]) ? saved[role] : [];
      const mergedDefaults = defaults.map((target) => {
        const override = existing.find((item) => item.id === target.id || item.metric === target.metric);
        return { ...target, ...(override || {}), fixed: target.fixed };
      });
      const manual = existing.filter((item) => !mergedDefaults.some((fixed) => fixed.id === item.id));
      return [role, [...mergedDefaults, ...manual]];
    }),
  );
};

export const saveRoleKpiTargets = (targets) => writeJson(KPI_TARGETS_KEY, targets);

export const stageToTimelineKey = (stage) => {
  if (["admin_administrasi", "author_form", "cco_ready_production"].includes(stage)) return "administrasi";
  if (["pic_editor", "editor_work"].includes(stage)) return "proofreading";
  if (["pic_layouter", "layouter_work"].includes(stage)) return "layout";
  if (["cco_isbn", "produksi_work"].includes(stage)) return "produksi";
  if (stage === "cco_distribution") return "distribusi";
  if (["done", "delete_requested", "deleted"].includes(stage)) return "selesai";
  return "administrasi";
};

export const usersByRole = (roles) => demoUsers.filter((user) => roles.includes(user.role));

export const findUserName = (id) => demoUsers.find((user) => user.id === id)?.name || "Diri sendiri";

export const findDemoUserForRole = (role) => demoUsers.find((user) => user.role === role);

export const kpiMetricForCreativeType = () => "jumlah_halaman";

export const createCsDeal = (payload, user) => {
  const item = {
    id: `wf-${Date.now()}`,
    service_type: payload.service_type,
    stage: payload.service_type === "lainnya" ? "omzet_only" : "cs_hold",
    tracking_code: `TRK-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    token: Math.floor(100000 + Math.random() * 900000).toString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    base_date: today(),
    customer: {
      name: payload.customer_name,
      phone: payload.customer_phone,
      city: payload.customer_city,
      profession: payload.customer_profession,
    },
    manuscript: {
      title: payload.title,
      author: payload.customer_name,
      phone: payload.customer_phone,
      publisher: payload.publisher,
      package_name: payload.package_name,
      working_days: Number(payload.working_days) || (payload.need_proofreading ? 30 : 14),
      need_proofreading: payload.need_proofreading,
      estimated_words: Number(payload.estimated_words) || 0,
      estimated_pages: Number(payload.estimated_pages) || 0,
      specs: payload.specs,
      notes: payload.notes,
    },
    financial: {
      total_price: Number(payload.total_price) || 0,
      down_payment: Number(payload.down_payment) || 0,
      status_payment: payload.status_payment,
      invoice_number: payload.invoice_number || "",
      invoice_id: payload.invoice_id || "",
    },
    tasks: {},
    delays: {},
    created_by: user?.id,
    history: [{ at: new Date().toISOString(), text: payload.service_type === "lainnya" ? "Layanan lainnya dicatat untuk omzet CS." : `Deal ${payload.service_type} disimpan (menunggu diserahkan).` }],
  };
  const items = [item, ...getWorkflowItems()];
  saveWorkflowItems(items);
  if (payload.status_payment === "deal") {
    addKpiEvent({ user_id: user?.id || "demo-cs", role: "cs", metric: payload.service_type === "cetak" ? "deal_cetak" : payload.service_type === "terbit" ? "deal_terbit" : "omzet", value: payload.service_type === "lainnya" ? Number(payload.total_price) || 0 : 1, omzet: Number(payload.total_price) || 0, item_id: item.id, title: item.manuscript.title || payload.package_name });
  }
  return item;
};

export const updateWorkflowItem = (id, updater) => {
  const items = getWorkflowItems();
  let updated;
  const next = items.map((item) => {
    if (item.id !== id) return item;
    updated = typeof updater === "function" ? updater(item) : { ...item, ...updater };
    updated.updated_at = new Date().toISOString();
    return updated;
  });
  saveWorkflowItems(next);
  return updated;
};

export const addHistory = (item, text) => ({
  ...item,
  history: [...(item.history || []), { at: new Date().toISOString(), text }],
});

export const addKpiEvent = (event) => {
  const approval = {
    id: `approval-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    type: "claim",
    status: "pending",
    created_at: new Date().toISOString(),
    previous_value: 0,
    requested_value: Number(event.value) || 0,
    approver_role: event.role === "editor" ? "pic_editor" : event.role === "layouter" ? "pic_layouter" : "master_admin",
    ...event,
    user_name: event.user_name || findUserName(event.user_id),
  };
  saveKpiApprovals([approval, ...getKpiApprovals()]);
};

export const approveKpiApproval = (id, approved, approver) => {
  let approvedEvent = null;
  const next = getKpiApprovals().map((item) => {
    if (item.id !== id) return item;
    const updated = { ...item, status: approved ? "approved" : "rejected", approved_by: approver?.id || approver?.email || "", approved_at: new Date().toISOString() };
    if (approved) {
      approvedEvent = {
        id: `kpi-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        at: new Date().toISOString(),
        user_id: item.user_id,
        user_name: item.user_name,
        user_email: item.user_email,
        role: item.role,
        metric: item.metric,
        value: Number(item.requested_value) || Number(item.value) || 0,
        item_id: item.item_id,
        title: item.title,
        note: item.note,
        approval_id: item.id,
      };
    }
    return updated;
  });
  saveKpiApprovals(next);
  if (approvedEvent) saveKpiEvents([approvedEvent, ...getKpiEvents()]);
  return next;
};

export const addApprovedKpiEvent = (event) => {
  const next = [
    {
      id: `kpi-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      at: new Date().toISOString(),
      ...event,
    },
    ...getKpiEvents(),
  ];
  saveKpiEvents(next);
};

export const completeAuthorForm = (id) => updateWorkflowItem(id, (item) => addHistory({ ...item, stage: "admin_administrasi" }, "Penulis menyelesaikan form naskah fix dan SPK."));

export const completeAdministration = (id, adminUser) => updateWorkflowItem(id, (item) => {
  addKpiEvent({ user_id: adminUser?.id || "demo-admin", role: "admin", metric: "administrasi", value: 1, item_id: id, title: item.manuscript.title });
  return addHistory({ ...item, stage: "cco_ready_production", spk_url: item.spk_url || "https://docs.google.com/document/d/mockup/edit" }, "Administrasi selesai dan kembali ke CCO.");
});

export const startProduction = (id, ccoUser) => updateWorkflowItem(id, (item) => {
  addKpiEvent({ user_id: ccoUser?.id || "demo-cco", role: "cco", metric: "pendampingan_naskah", value: 1, item_id: id, title: item.manuscript.title });
  const tasks = item.manuscript.need_proofreading
    ? { ...(item.tasks || {}), layouter: { ...(item.tasks?.layouter || {}), status: "menunggu_editor", locked_until_editor_complete: true } }
    : item.tasks || {};
  return addHistory({ ...item, tasks, stage: item.manuscript.need_proofreading ? "pic_editor" : "pic_layouter" }, item.manuscript.need_proofreading ? "CCO mulai produksi, masuk PIC Editor dan masuk pantauan PIC Layouter." : "CCO mulai produksi, langsung masuk PIC Layouter.");
});

export const assignCreativeTask = (id, type, assigneeId, revisionLimit, picUser) => updateWorkflowItem(id, (item) => {
  const assigneeName = assigneeId === picUser?.id ? picUser?.name : findUserName(assigneeId);
  const existingTask = item.tasks?.[type] || {};
  const tasks = {
    ...(item.tasks || {}),
    [type]: { ...existingTask, id: existingTask.id || `task-${id}-${type}`, type, assignee_id: assigneeId, assignee_name: assigneeName, status: "menunggu", revision_limit: Number(revisionLimit) || 0, revision_done: Number(existingTask.revision_done) || 0, kpi_claimed: Boolean(existingTask.kpi_claimed) },
  };
  return addHistory({ ...item, tasks, stage: type === "editor" ? "editor_work" : "layouter_work" }, `PIC menugaskan ${type === "editor" ? "proofreading" : "layout"} ke ${assigneeName}.`);
});

export const updateCreativeStatus = (itemId, type, status, kpiValue, user) => updateWorkflowItem(itemId, (item) => {
  const task = item.tasks?.[type];
  if (!task) return item;
  const nextTask = { ...task, status };
  let text = `${type === "editor" ? "Editor" : "Layouter"} mengubah status ke ${status}.`;
  if (status === "done" && !task.kpi_claimed) {
    nextTask.kpi_claimed = true;
    nextTask.kpi_value = Number(kpiValue) || 0;
    nextTask.done_at = new Date().toISOString();
    addKpiEvent({ user_id: user?.id || task.assignee_id, user_name: user?.name || task.assignee_name, user_email: user?.email || "", role: type, metric: kpiMetricForCreativeType(type), value: Number(kpiValue) || 0, item_id: itemId, title: item.manuscript.title, note: "Klaim pekerjaan utama." });
    text = `${type === "editor" ? "Editor" : "Layouter"} selesai dan klaim KPI halaman ${nextTask.kpi_value}.`;
  }
  let stage = item.stage;
  if (status === "complete") {
    const limit = Number(task.revision_limit) || 0;
    const done = Number(task.revision_done) || 0;
    if (done < limit) {
      nextTask.status = `revisi ${done + 1}`;
      return addHistory({ ...item, tasks: { ...(item.tasks || {}), [type]: nextTask } }, `${type === "editor" ? "Editor" : "Layouter"} belum bisa complete karena revisi ${done + 1}/${limit} belum diklaim.`);
    }
    stage = type === "editor" ? "pic_layouter" : "cco_isbn";
  }
  return addHistory({ ...item, stage, tasks: { ...(item.tasks || {}), [type]: nextTask } }, text);
});

export const claimCreativeRevision = (itemId, type, kpiValue, user) => updateWorkflowItem(itemId, (item) => {
  const task = item.tasks?.[type];
  if (!task) return item;

  const limit = Number(task.revision_limit) || 0;
  const revisionNumber = Math.min((Number(task.revision_done) || 0) + 1, limit || 1);
  const revisionDone = limit ? Math.min(revisionNumber, limit) : revisionNumber;
  const nextStatus = limit && revisionDone < limit ? `revisi ${revisionDone + 1}` : "done";
  const value = Number(kpiValue) || 0;
  const nextTask = {
    ...task,
    status: nextStatus,
    revision_done: revisionDone,
    revision_kpi_total: (Number(task.revision_kpi_total) || 0) + value,
    revision_claims: [
      ...(task.revision_claims || []),
      { revision: revisionNumber, value, at: new Date().toISOString() },
    ],
  };

  addKpiEvent({
    user_id: user?.id || task.assignee_id,
    user_name: user?.name || task.assignee_name,
    user_email: user?.email || "",
    role: type,
    metric: kpiMetricForCreativeType(type),
    value,
    item_id: itemId,
    title: item.manuscript.title,
    note: `Tambahan halaman revisi ${revisionNumber}.`,
  });

  const text = nextStatus === "done"
    ? `${type === "editor" ? "Editor" : "Layouter"} klaim revisi ${revisionNumber}/${limit || revisionNumber} dan semua revisi selesai.`
    : `${type === "editor" ? "Editor" : "Layouter"} klaim revisi ${revisionNumber}/${limit} dan lanjut ke ${nextStatus}.`;

  return addHistory({ ...item, tasks: { ...(item.tasks || {}), [type]: nextTask } }, text);
});

export const finishCcoStage = (id, action, isMarketplace) => updateWorkflowItem(id, (item) => {
  if (action === "masuk_produksi") return addHistory({ ...item, stage: "produksi_work" }, "CCO mengonfirmasi ISBN. Naskah diserahkan ke Produksi.");
  if (action === "distribution") return addHistory({ ...item, stage: "done", jual_marketplace: isMarketplace }, "CCO menyelesaikan distribusi. Naskah selesai secara keseluruhan.");
  if (action === "delete_request") return addHistory({ ...item, stage: "delete_requested" }, "CCO mengajukan penghapusan naskah.");
  if (action === "delete_approve") return addHistory({ ...item, stage: "deleted", deleted: true }, "Master menyetujui penghapusan naskah.");
  return item;
});

export const finishProduksiStage = (id) => updateWorkflowItem(id, (item) => {
  return addHistory({ ...item, stage: "cco_distribution" }, "Produksi selesai mencetak naskah. Naskah diserahkan ke CCO untuk Distribusi.");
});

export const addDelay = (id, stageKey, days, reason) => updateWorkflowItem(id, (item) => {
  const newDelay = (Number(item.delays?.[stageKey]) || 0) + (Number(days) || 0);
  const logText = `Kemunduran ${days} hari kerja ditambahkan pada tahap ${stageKey}. Alasan: ${reason || "Tanpa alasan"}`;
  const delayLogs = [...(item.delay_logs || []), { stage: stageKey, days: Number(days), reason: reason || "Tanpa alasan", at: new Date().toISOString() }];
  return addHistory({ ...item, delays: { ...(item.delays || {}), [stageKey]: newDelay }, delay_logs: delayLogs }, logText);
});

export const isBusinessDay = (date, holidays = []) => {
  const day = date.getDay();
  const dateKey = date.toISOString().slice(0, 10);
  return day >= 1 && day <= 5 && !holidays.some((h) => (h.date || h) === dateKey);
};

export const addBusinessDays = (dateInput, days, holidays = []) => {
  const date = new Date(dateInput);
  let left = Number(days) || 0;
  if (left <= 0) return date;
  while (left > 0) {
    date.setDate(date.getDate() + 1);
    if (isBusinessDay(date, holidays)) left -= 1;
  }
  return date;
};

export const getTimelineRule = (packageName) => Object.values(DEFAULT_RULES).find((rule) => rule.package_name === packageName) || DEFAULT_RULES.Paket_A;

export const buildTimeline = (item, holidays = []) => {
  const rule = getTimelineRule(item.manuscript?.package_name);
  let cumulativeDelay = 0;
  return TIMELINE_STAGES
    .filter(([key]) => item.manuscript?.need_proofreading || key !== "proofreading")
    .map(([key, label]) => {
      const start = rule[`${key}_start`];
      const end = rule[`${key}_end`];
      const startDate = addBusinessDays(item.base_date || item.created_at || today(), Math.max(0, (start || 1) - 1 + cumulativeDelay), holidays);
      const endDate = addBusinessDays(item.base_date || item.created_at || today(), Math.max(0, (end || start || 1) - 1 + cumulativeDelay), holidays);
      cumulativeDelay += Number(item.delays?.[key]) || 0;
      return { key, label, start: startDate.toISOString().slice(0, 10), end: endDate.toISOString().slice(0, 10), delay: Number(item.delays?.[key]) || 0 };
    });
};

export const activeItems = () => getWorkflowItems().filter((item) => !item.deleted);
