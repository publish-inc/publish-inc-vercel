import { useMemo, useState, useEffect } from "react";
import { Clipboard, Send, Package, Check, Truck, Trash2, Clock, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { activeItems, finishCcoStage, startProduction, completeAuthorForm, STAGE_LABELS, addDelay } from "../../lib/workflow";
import { supabase } from "../../lib/supabase";

const visibleForCco = new Set(["cco_new", "author_form", "admin_administrasi", "cco_ready_production", "cco_isbn", "cco_distribution", "done", "delete_requested"]);

export default function CcoIntake() {
  const { user } = useAuth();
  const [items, setItems] = useState(() => activeItems());
  const [search, setSearch] = useState("");
  const [delayReasons, setDelayReasons] = useState({});
  const [delayModal, setDelayModal] = useState(null);

  useEffect(() => {
    supabase.from("spk_settings").select("value").eq("key", "delay_reasons").single().then(({ data }) => {
      if (data) setDelayReasons(data.value || {});
    });
  }, []);

  const refresh = () => setItems(activeItems());

  const list = useMemo(() => {
    const needle = search.toLowerCase().trim();
    return items
      .filter((item) => item.service_type !== "lainnya")
      .filter((item) => item.stage !== "deleted")
      .filter((item) => visibleForCco.has(item.stage))
      .filter((item) => {
        if (!user || user.role !== "cco") return true;
        if (!item.cco_assigned_to && !item.cco_assigned_name) return true;
        return item.cco_assigned_to === user.id || (item.cco_assigned_name && user.name && item.cco_assigned_name.toLowerCase() === user.name.toLowerCase());
      })
      .filter((item) => !needle || [item.manuscript?.title, item.customer?.name, item.tracking_code, item.customer?.phone, item.manuscript?.publisher, item.cco_assigned_name].some((v) => String(v || "").toLowerCase().includes(needle)));
  }, [items, search, user]);

  const copy = async (text, label) => {
    await navigator.clipboard.writeText(text || "");
    toast.success(`${label} disalin.`);
  };

  const action = (fn, message) => {
    fn();
    refresh();
    toast.success(message);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-white">Naskah Intake</h1>
        <p className="mt-1 text-slate-400">Daftar naskah yang membutuhkan perhatian atau aksi spesifik dari CCO.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-navy-800 p-5 shadow-sm">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-4 top-3.5 text-slate-300" size={20} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari judul, kode, penulis, penerbit..." className="h-12 w-full rounded-xl border border-white/10 bg-navy-950 pl-11 pr-4 font-semibold text-white outline-none focus:border-brand-orange" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {list.map((item) => (
          <IntakeCard key={item.id} item={item} user={user} copy={copy} action={action} setDelayModal={setDelayModal} />
        ))}
        {!list.length && <div className="col-span-full rounded-3xl border border-dashed border-white/10 bg-navy-800/60 p-12 text-center text-slate-500">Tidak ada naskah intake saat ini.</div>}
      </div>

      {delayModal && <DelayModal item={delayModal} delayReasons={delayReasons} onClose={() => setDelayModal(null)} onSaved={() => { setDelayModal(null); refresh(); }} />}
    </div>
  );
}

function IntakeCard({ item, user, copy, action, setDelayModal }) {
  const titleParts = [item.manuscript?.title, item.customer?.name].filter(Boolean);

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-navy-800 p-5 shadow-sm hover:border-brand-orange/50 transition-colors">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-brand-orange tracking-widest">{item.tracking_code}</span>
          <span className="rounded-full bg-navy-950 px-3 py-1 text-[10px] font-bold text-slate-300 border border-white/5">{STAGE_LABELS[item.stage] || "-"}</span>
        </div>
        {item.cco_assigned_name && (
          <div className="mb-2 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-lg bg-navy-950 border border-white/10 text-xs font-semibold text-brand-orange">
            Penanggung Jawab CCO: {item.cco_assigned_name}
          </div>
        )}
        <h2 className="text-lg font-black text-white leading-tight mb-2">{titleParts.join(" - ")}</h2>
        <div className="text-sm text-slate-400 mb-4 line-clamp-2">
          {item.manuscript?.publisher} &bull; {item.manuscript?.package_name}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
        {item.stage === "cco_new" && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-400">Naskah baru. Salin token untuk dikirim ke penulis agar bisa mengisi form kelengkapan.</p>
            <button onClick={() => copy(item.token, "Token penulis")} className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-blue/20 px-4 py-2.5 text-sm font-bold text-brand-blue hover:bg-brand-blue hover:text-white transition-colors">
              <Clipboard size={16} /> Salin No Token
            </button>
          </div>
        )}

        {item.stage === "author_form" && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-center text-sm text-amber-300 font-medium">
            Menunggu penulis mengisi form & kelengkapan administrasi
          </div>
        )}

        {item.stage === "admin_administrasi" && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-400">Naskah dalam tahap Administrasi (Generate SPK, ISBN, LoA, SKTT).</p>
            <a href="/admin/administrasi-spk" className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 px-4 py-2.5 text-sm font-bold hover:bg-purple-500 hover:text-white transition-colors">
              Buka Administrasi Naskah
            </a>
          </div>
        )}

        {item.stage === "cco_ready_production" && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-400">Administrasi selesai. Naskah siap diproses produksi.</p>
            <button onClick={() => action(() => startProduction(item.id, user), "Produksi dimulai. Naskah masuk antrian distribusi PIC.")} className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-orange-dark transition-colors">
              <Package size={16} /> Mulai Produksi
            </button>
          </div>
        )}

        {item.stage === "cco_isbn" && (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => action(() => finishCcoStage(item.id, "masuk_produksi"), "Naskah diserahkan ke tim Produksi.")} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/20 px-3 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors">
              <Check size={14} /> ISBN Selesai, Mulai Cetak
            </button>
            <button onClick={() => setDelayModal(item)} className="flex items-center justify-center gap-2 rounded-xl bg-amber-500/20 px-3 py-2.5 text-xs font-bold text-amber-400 hover:bg-amber-500 hover:text-white transition-colors">
              <Clock size={14} /> Atur Delay (ISBN)
            </button>
          </div>
        )}

        {item.stage === "cco_distribution" && (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => action(async () => {
              finishCcoStage(item.id, "distribution", true);
              if (item.manuscript?.title) await supabase.from('books').update({ is_takedown: false }).eq('title', item.manuscript.title);
            }, "Distribusi selesai. Dijual di marketplace.")} className="flex items-center justify-center gap-2 rounded-xl bg-brand-orange/20 px-3 py-2.5 text-xs font-bold text-brand-orange hover:bg-brand-orange hover:text-white transition-colors">
              <Package size={14} /> Selesai & Jual Marketplace
            </button>
            <button onClick={() => action(async () => {
              finishCcoStage(item.id, "distribution", false);
              if (item.manuscript?.title) await supabase.from('books').update({ is_takedown: true }).eq('title', item.manuscript.title);
            }, "Distribusi selesai. Tidak dijual di marketplace.")} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/20 px-3 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors">
              <Truck size={14} /> Selesai (Tidak Jual)
            </button>
            <button onClick={() => setDelayModal(item)} className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-amber-500/20 px-3 py-2.5 text-xs font-bold text-amber-400 hover:bg-amber-500 hover:text-white transition-colors">
              <Clock size={14} /> Atur Delay
            </button>
          </div>
        )}

        {item.stage === "done" && (
          <button onClick={() => action(() => finishCcoStage(item.id, "delete_request"), "Pengajuan hapus masuk approval master.")} className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-500/20 px-4 py-2.5 text-sm font-bold text-rose-400 hover:bg-rose-500 hover:text-white transition-colors">
            <Trash2 size={16} /> Ajukan Penghapusan
          </button>
        )}
        
        {item.stage === "delete_requested" && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-center text-sm text-rose-300 font-medium">
            Menunggu approval penghapusan dari Master
          </div>
        )}
      </div>
    </div>
  );
}

function DelayModal({ item, delayReasons, onClose, onSaved }) {
  const [stage, setStage] = useState("produksi");
  const [reason, setReason] = useState("");
  const [days, setDays] = useState("1");

  const submit = () => {
    if (!reason || !days) return toast.error("Semua field wajib diisi.");
    addDelay(item.id, stage, days, reason);
    toast.success("Kemunduran tersimpan dan timeline berikutnya ikut bergeser.");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-navy-900 p-5 space-y-4">
        <h2 className="text-xl font-black text-white">Atur Delay</h2>
        <select value={stage} onChange={(e) => { setStage(e.target.value); setReason(""); }} className="w-full rounded-lg border border-white/10 bg-navy-950 px-4 py-3 text-white">
          <option value="administrasi">Administrasi</option><option value="proofreading">Proofreading</option>
          <option value="layout">Layout</option><option value="produksi">Produksi</option>
          <option value="distribusi">Distribusi</option><option value="selesai">Selesai</option>
        </select>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-white/10 bg-navy-950 px-4 py-3 text-white">
          <option value="">-- Pilih Alasan --</option>
          {(delayReasons[stage] || []).map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <input type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} placeholder="Jumlah hari kerja" className="w-full rounded-lg border border-white/10 bg-navy-950 px-4 py-3 text-white" />
        <div className="flex justify-end gap-2"><button onClick={onClose} className="rounded-lg bg-white/5 px-4 py-2 text-white">Batal</button><button onClick={submit} className="rounded-lg bg-brand-orange px-4 py-2 font-bold text-white">Simpan</button></div>
      </div>
    </div>
  );
}
