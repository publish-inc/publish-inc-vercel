import { useMemo, useState, useEffect } from "react";
import { ClipboardList, Eye, LayoutPanelTop, ListTodo, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { activeItems, buildTimeline, finishCcoStage, saveWorkflowItems, STAGE_LABELS } from "../../lib/workflow";
import { api } from "../../lib/api";
import { demoPenerbit } from "../../lib/demoData";

const EMPTY = { title: "", name: "", phone: "", city: "", profession: "", publisher: "", package_name: "Paket A", need_proofreading: true, estimated_words: "", estimated_pages: "", specs: "", ukuran: "" };

export default function ManajemenNaskah({ forceTab }) {
  const [tab, setTab] = useState(forceTab || "antrian");
  const [subTab, setSubTab] = useState("proofreading");
  const [items, setItems] = useState(() => activeItems());
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [penerbitList, setPenerbitList] = useState([]);

  useEffect(() => {
    api.get("/system/penerbit")
      .then(({ data }) => setPenerbitList(data?.length ? data : demoPenerbit))
      .catch(() => setPenerbitList(demoPenerbit));
  }, []);

  const refresh = () => setItems(activeItems());
  const filtered = useMemo(() => {
    const needle = search.toLowerCase().trim();
    return items.filter((item) => item.service_type !== "lainnya").filter((item) => !needle || [item.manuscript.title, item.customer.name, item.tracking_code, item.customer.phone].some((v) => String(v || "").toLowerCase().includes(needle)));
  }, [items, search]);
  const queues = {
    antrian_proofreading: filtered.filter((item) => item.stage === "pic_editor"),
    antrian_layout: filtered.filter((item) => item.stage === "pic_layouter"),
    antrian: filtered.filter((item) => item.stage === "pic_editor" || item.stage === "pic_layouter"),
    berjalan: filtered.filter((item) => !["done", "delete_requested", "deleted"].includes(item.stage)),
    hapus: filtered.filter((item) => item.stage === "delete_requested"),
  };
  const activeTab = forceTab || tab;
  const currentListKey = activeTab === "antrian" ? `antrian_${subTab}` : activeTab;
  const tabs = [
    ["antrian", "Antrian Naskah", ListTodo],
    ["berjalan", "Naskah Berjalan", ClipboardList],
    ["hapus", "Approval Hapus", Trash2],
  ];
  const approveDelete = (item) => {
    finishCcoStage(item.id, "delete_approve");
    refresh();
    toast.success("Penghapusan disetujui. Naskah hilang tanpa mengubah KPI.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">
            {activeTab === "antrian" ? "Antrian Naskah" : activeTab === "berjalan" ? "Naskah Berjalan" : activeTab === "hapus" ? "Approval Hapus" : "Pengawasan Naskah"}
          </h1>
          <p className="text-slate-400 mt-1">
            {activeTab === "antrian" ? "Pantau antrian proofreading dan layout." : activeTab === "berjalan" ? "Pantau naskah berjalan." : activeTab === "hapus" ? "Persetujuan penghapusan naskah." : "Pantau antrian proofreading, layout, naskah berjalan, dan approval penghapusan."}
          </p>
        </div>
        {activeTab === "berjalan" && <button onClick={() => setShowForm(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-orange px-5 py-3 text-sm font-bold text-white hover:bg-brand-orange-dark"><Plus size={18} /> Input Naskah Manual</button>}
      </div>

      <div className="rounded-xl border border-white/10 bg-navy-800 p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          {!forceTab && (
            <div className="flex flex-wrap gap-2">
              {tabs.map(([id, label, Icon]) => (
                <button key={id} onClick={() => setTab(id)} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold ${activeTab === id ? "bg-brand-orange text-white" : "bg-navy-900 text-slate-400 hover:text-white"}`}>
                  <Icon size={16} /> {label}<span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{queues[id]?.length || 0}</span>
                </button>
              ))}
            </div>
          )}
          <div className={`relative w-full ${!forceTab ? "xl:w-80" : ""}`}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari judul, TRK, penulis, WA..." className="w-full rounded-lg border border-white/10 bg-navy-950 py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-brand-orange" />
          </div>
        </div>
        {activeTab === "antrian" && (
          <div className="mt-4 flex gap-2 border-t border-white/10 pt-4">
            <button onClick={() => setSubTab("proofreading")} className={`rounded-lg px-4 py-2 text-sm font-bold ${subTab === "proofreading" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}>Antrian Proofreading <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{queues.antrian_proofreading?.length || 0}</span></button>
            <button onClick={() => setSubTab("layout")} className={`rounded-lg px-4 py-2 text-sm font-bold ${subTab === "layout" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}>Antrian Layout <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{queues.antrian_layout?.length || 0}</span></button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-navy-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-navy-900 text-xs uppercase tracking-wider text-slate-500">
              <tr><th className="px-5 py-4">Tgl</th><th className="px-5 py-4">Tracking / Judul</th><th className="px-5 py-4">Customer</th><th className="px-5 py-4">Paket</th><th className="px-5 py-4">Tahap</th><th className="px-5 py-4 text-right">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(queues[currentListKey] || []).map((item) => (
                <tr key={item.id} className="hover:bg-white/5">
                  <td className="px-5 py-4 text-xs">{new Date(item.created_at).toLocaleDateString("id-ID")}</td>
                  <td className="px-5 py-4"><div className="font-mono text-xs font-bold text-brand-orange">{item.tracking_code}</div><div className="mt-1 max-w-sm truncate font-bold text-white">{item.manuscript.title}</div></td>
                  <td className="px-5 py-4"><div className="font-semibold text-white">{item.customer.name}</div><div className="text-xs text-slate-500">{item.customer.phone || "-"}</div></td>
                  <td className="px-5 py-4"><div className="text-white">{item.manuscript.publisher}</div><div className="text-xs text-slate-500">{item.manuscript.package_name}</div></td>
                  <td className="px-5 py-4"><span className="rounded-full border border-white/10 bg-navy-900 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-300">{STAGE_LABELS[item.stage]}</span></td>
                  <td className="px-5 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => setDetail(item)} className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-3 py-2 text-xs font-bold text-white hover:bg-blue-600"><Eye size={14} /> Detail</button>{activeTab === "hapus" && <button onClick={() => approveDelete(item)} className="rounded-lg bg-rose-500/20 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/30">Approve</button>}</div></td>
                </tr>
              ))}
              {!queues[currentListKey]?.length && <tr><td colSpan="6" className="px-5 py-12 text-center text-slate-500">Tidak ada data pada kategori ini.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {detail && <DetailModal item={detail} onClose={() => setDetail(null)} />}
      {showForm && <ManualModal onClose={() => setShowForm(false)} onSaved={refresh} penerbitList={penerbitList} />}
    </div>
  );
}

function ManualModal({ onClose, onSaved, penerbitList }) {
  const [form, setForm] = useState(EMPTY);
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const selectedPublisherData = penerbitList.find((p) => (p.nama || p.name) === form.publisher);
  const availablePackages = selectedPublisherData?.paket?.length ? selectedPublisherData.paket : ["Paket A", "Paket B", "Langsung Layout"];

  const save = () => {
    if (!form.title || !form.name) return toast.error("Judul dan penulis wajib diisi.");
    const item = {
      id: `wf-master-${Date.now()}`,
      service_type: "terbit",
      stage: "admin_administrasi",
      tracking_code: `TRK-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      token: Math.floor(100000 + Math.random() * 900000).toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      base_date: new Date().toISOString().slice(0, 10),
      customer: { name: form.name, phone: form.phone, city: form.city, profession: form.profession },
      manuscript: { title: form.title, author: form.name, phone: form.phone, publisher: form.publisher, package_name: form.package_name, need_proofreading: form.need_proofreading, estimated_words: Number(form.estimated_words) || 0, estimated_pages: Number(form.estimated_pages) || 0, specs: form.specs, notes: "Input manual dari master." },
      financial: { total_price: 0, down_payment: 0, status_payment: "manual" },
      tasks: {},
      delays: {},
      history: [{ at: new Date().toISOString(), text: "Naskah input manual dari master." }],
    };
    saveWorkflowItems([item, ...activeItems()]);
    onSaved();
    onClose();
    toast.success("Naskah manual masuk Administrasi.");
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-navy-900 p-5 space-y-4 my-8">
        <div className="flex justify-between"><h2 className="text-xl font-black text-white">Input Naskah Manual</h2><button onClick={onClose} className="text-slate-400 hover:text-white"><X /></button></div>
        <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Judul naskah" className="w-full rounded-lg border border-white/10 bg-navy-950 px-4 py-3 text-white" />
        <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Nama penulis" className="w-full rounded-lg border border-white/10 bg-navy-950 px-4 py-3 text-white" />
        <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Nomor WA" className="w-full rounded-lg border border-white/10 bg-navy-950 px-4 py-3 text-white" />
        <div className="grid grid-cols-2 gap-3">
          <input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Kota Asal" className="w-full rounded-lg border border-white/10 bg-navy-950 px-4 py-3 text-white" />
          <input value={form.profession} onChange={(e) => set("profession", e.target.value)} placeholder="Profesi / Instansi" className="w-full rounded-lg border border-white/10 bg-navy-950 px-4 py-3 text-white" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select value={form.publisher} onChange={(e) => {
            const pubName = e.target.value;
            const pubData = penerbitList.find((p) => (p.nama || p.name) === pubName);
            const pkgs = pubData?.paket?.length ? pubData.paket : ["Paket A", "Paket B", "Langsung Layout"];
            setForm(curr => ({ ...curr, publisher: pubName, package_name: pkgs.includes(curr.package_name) ? curr.package_name : (pkgs[0] || "") }));
          }} className="w-full rounded-lg border border-white/10 bg-navy-950 px-4 py-3 text-white">
            <option value="">-- Pilih Penerbit --</option>
            {penerbitList.map((p) => <option key={p.id || p.nama} value={p.nama || p.name}>{p.nama || p.name}</option>)}
          </select>
          <select value={form.package_name} onChange={(e) => set("package_name", e.target.value)} className="w-full rounded-lg border border-white/10 bg-navy-950 px-4 py-3 text-white">
            {availablePackages.map((pkg) => <option key={pkg} value={pkg}>{pkg}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input type="number" value={form.estimated_words} onChange={(e) => set("estimated_words", e.target.value)} placeholder="Estimasi Kata" className="w-full rounded-lg border border-white/10 bg-navy-950 px-4 py-3 text-white" />
          <input type="number" value={form.estimated_pages} onChange={(e) => set("estimated_pages", e.target.value)} placeholder="Estimasi Halaman" className="w-full rounded-lg border border-white/10 bg-navy-950 px-4 py-3 text-white" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input type="text" value={form.ukuran} onChange={(e) => set("ukuran", e.target.value)} placeholder="Ukuran Buku" className="w-full rounded-lg border border-white/10 bg-navy-950 px-4 py-3 text-white" />
          <textarea value={form.specs} onChange={(e) => set("specs", e.target.value)} placeholder="Spesifikasi / Tambahan" rows="1" className="w-full rounded-lg border border-white/10 bg-navy-950 px-4 py-3 text-white" />
        </div>
        <select value={form.need_proofreading ? "true" : "false"} onChange={(e) => set("need_proofreading", e.target.value === "true")} className="w-full rounded-lg border border-white/10 bg-navy-950 px-4 py-3 text-white text-sm">
          <option value="true">Perlu Proofreading</option>
          <option value="false">Langsung Layout</option>
        </select>
        <div className="flex justify-end gap-2"><button onClick={onClose} className="rounded-lg bg-white/5 px-4 py-2 text-white">Batal</button><button onClick={save} className="rounded-lg bg-brand-orange px-4 py-2 font-bold text-white">Simpan</button></div>
      </div>
    </div>
  );
}

function DetailModal({ item, onClose }) {
  const timeline = buildTimeline(item);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
      <div className="my-8 w-full max-w-3xl rounded-xl border border-white/10 bg-navy-900 p-6">
        <div className="mb-6 flex items-start justify-between gap-4"><div><div className="font-mono text-xs font-bold text-brand-orange">{item.tracking_code}</div><h2 className="mt-1 text-2xl font-black text-white">{item.manuscript.title}</h2><p className="text-sm text-slate-400">{item.customer.name} &bull; {item.customer.phone || "-"}</p></div><button onClick={onClose} className="text-slate-400 hover:text-white"><X /></button></div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Info label="Tahap" value={STAGE_LABELS[item.stage]} />
          <Info label="Paket" value={item.manuscript.package_name} />
          <Info label="Editor" value={item.tasks?.editor?.assignee_name || "Belum ada"} />
          <Info label="Layouter" value={item.tasks?.layouter?.assignee_name || "Belum ada"} />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          {timeline.map((step) => <Info key={step.key} label={step.label} value={`${step.start} - ${step.end}${step.delay ? `, mundur ${step.delay} hari` : ""}`} />)}
        </div>
        <div className="mt-6 rounded-xl border border-white/10 bg-navy-950 p-4">
          <div className="mb-3 text-sm font-black uppercase tracking-wider text-white">Riwayat</div>
          {(item.history || []).map((row, index) => <div key={index} className="text-sm text-slate-300"><span className="text-slate-500">{new Date(row.at).toLocaleString("id-ID")} - </span>{row.text}</div>)}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return <div className="rounded-xl border border-white/10 bg-navy-950 p-4"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</div><div className="mt-1 break-words text-sm font-bold text-white">{value}</div></div>;
}
