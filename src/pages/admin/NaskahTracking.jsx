import { useMemo, useState } from "react";
import { Ban, Check, Clipboard, Clock, Eye, Flag, MessageCircle, Package, Phone, Search, Send, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { activeItems, addDelay, buildTimeline, completeAuthorForm, finishCcoStage, stageToTimelineKey, startProduction, STAGE_LABELS, TRACKING_STAGE_ORDER } from "../../lib/workflow";

import { supabase } from "../../lib/supabase";
import { useEffect } from "react";

const icons = { administrasi: Clipboard, proofreading: Flag, layout: Check, produksi: Package, distribusi: Truck, selesai: Flag };

export default function NaskahTracking() {
  const { user } = useAuth();
  const [items, setItems] = useState(() => activeItems());
  const [search, setSearch] = useState("");
  const [publisher, setPublisher] = useState("");
  const [stage, setStage] = useState("");
  const [detail, setDetail] = useState(null);
  const [delayReasons, setDelayReasons] = useState({});
  const [delayModal, setDelayModal] = useState(null);
  const [phoneModal, setPhoneModal] = useState(null);

  useEffect(() => {
    supabase.from("spk_settings").select("value").eq("key", "delay_reasons").single().then(({ data }) => {
      if (data) setDelayReasons(data.value || {});
    });
  }, []);

  const publishers = useMemo(() => [...new Set(items.map((item) => item.manuscript.publisher).filter(Boolean))], [items]);
  const list = useMemo(() => {
    const needle = search.toLowerCase().trim();
    return items
      .filter((item) => item.service_type !== "lainnya")
      .filter((item) => item.stage !== "deleted")
      .filter((item) => !publisher || item.manuscript.publisher === publisher)
      .filter((item) => !stage || stageToTimelineKey(item.stage) === stage)
      .filter((item) => !needle || [item.manuscript.title, item.customer.name, item.tracking_code, item.customer.phone, item.manuscript.publisher].some((v) => String(v || "").toLowerCase().includes(needle)));
  }, [items, search, publisher, stage]);

  const refresh = () => setItems(activeItems());
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
        <h1 className="text-3xl font-display font-bold text-white">Tracking Naskah</h1>
        <p className="mt-1 text-slate-400">Pantau detail proses naskah, timeline hari kerja, kode tracking, dan kontak penulis.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-navy-800 p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-3.5 text-slate-300" size={20} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari judul, kode, penulis, penerbit, PIC..." className="h-12 w-full rounded-xl border border-white/10 bg-navy-950 pl-11 pr-4 font-semibold text-white outline-none focus:border-brand-orange" />
          </div>
          <select value={publisher} onChange={(e) => setPublisher(e.target.value)} className="h-12 rounded-xl border border-white/10 bg-navy-950 px-4 font-bold text-white outline-none focus:border-brand-orange">
            <option value="">Semua Penerbit</option>
            {publishers.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <select value={stage} onChange={(e) => setStage(e.target.value)} className="h-12 rounded-xl border border-white/10 bg-navy-950 px-4 font-bold text-white outline-none focus:border-brand-orange">
            <option value="">Semua Tahap</option>
            {TRACKING_STAGE_ORDER.map((key) => <option key={key} value={key}>{labelFor(key)}</option>)}
          </select>
          <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-orange px-8 font-black text-white hover:bg-brand-orange-dark">
            <Search size={19} /> Cari
          </button>
        </div>
        <div className="mt-4 text-sm font-bold text-slate-400">Menampilkan {list.length} dari {items.length} progress.</div>
      </div>

      <div className="space-y-5">
        {list.map((item) => (
          <TrackingCard key={item.id} item={item} user={user} copy={copy} setDetail={setDetail} action={action} setDelayModal={setDelayModal} setPhoneModal={setPhoneModal} />
        ))}
        {!list.length && <div className="rounded-3xl border border-dashed border-white/10 bg-navy-800/60 p-12 text-center text-slate-500">Tidak ada naskah pada filter ini.</div>}
      </div>

      {detail && <DetailModal item={detail} onClose={() => setDetail(null)} copy={copy} />}
      {delayModal && <DelayModal item={delayModal} user={user} delayReasons={delayReasons} onClose={() => setDelayModal(null)} onSaved={() => { setDelayModal(null); refresh(); }} />}
      {phoneModal && <PhoneModal item={phoneModal} onClose={() => setPhoneModal(null)} />}
    </div>
  );
}

function TrackingCard({ item, user, copy, setDetail, action, setDelayModal, setPhoneModal }) {
  const timeline = buildTimeline(item);
  const currentKey = stageToTimelineKey(item.stage);
  const currentIndex = TRACKING_STAGE_ORDER.indexOf(currentKey);
  const titleParts = [item.manuscript.title, item.customer.name].filter(Boolean);

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-800 p-5 text-slate-200 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">{titleParts.join(" || ")}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => copy(item.tracking_code, "Kode tracking")} className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-black text-brand-orange">
              <Clipboard size={15} /> Kode: {item.tracking_code}
            </button>
            <span className="inline-flex items-center rounded-xl border border-white/10 bg-navy-950 px-4 py-2 text-sm font-bold text-slate-300">Status: <b className="ml-1 text-brand-orange">{STAGE_LABELS[item.stage] || "-"}</b></span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <SmallButton onClick={() => setDetail(item)} icon={Eye} label="Detail" tone="blue" />
          <SmallButton onClick={() => setDelayModal(item)} icon={Clock} label="Delay" tone="yellow" />
          <a href={`https://wa.me/${String(item.customer.phone || "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-black text-white hover:bg-emerald-600">
            <MessageCircle size={16} /> Chat WA
          </a>
          <SmallButton onClick={() => setPhoneModal(item)} icon={Phone} label="No HP" tone="green" />
        </div>
      </div>

      <div className="mt-10 overflow-x-auto pb-2">
        <div className="relative min-w-[920px]">
          <div className="absolute left-10 right-10 top-9 h-3 rounded-full bg-navy-950" />
          <div className="absolute left-10 top-9 h-3 rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-blue-600" style={{ width: `${Math.max(0, Math.min(currentIndex, 4)) * 18}%` }} />
          <div className="relative grid grid-cols-6 gap-2">
            {TRACKING_STAGE_ORDER.map((key, index) => {
              const step = timeline.find((row) => row.key === key);
              const state = index < currentIndex ? "done" : index === currentIndex ? "active" : "waiting";
              return <TimelineStep key={key} stepKey={key} step={step} state={state} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineStep({ stepKey, step, state }) {
  const Icon = icons[stepKey] || Check;
  const active = state === "active";
  const done = state === "done";
  return (
    <div className="flex flex-col items-center text-center">
      <div className={`z-10 flex h-16 w-16 items-center justify-center rounded-full shadow-sm ${active ? "bg-red-500 text-white" : done ? "bg-white text-brand-orange" : "bg-white text-slate-300"}`}>
        <Icon size={18} />
      </div>
      <div className={`mt-3 text-sm font-black ${active ? "text-white" : done ? "text-slate-200" : "text-slate-500"}`}>{labelFor(stepKey)}</div>
      <div className="mt-1 text-sm text-slate-400">{active ? "Tahap aktif" : done ? "Selesai" : "Menunggu"}</div>
      <div className="mt-2 text-sm font-black text-brand-orange">{formatDate(step?.end)}</div>
      {step?.delay > 0 && <div className="mt-2 rounded-full bg-red-50 px-3 py-1 text-[10px] font-black text-red-500">DELAY {step.delay}H</div>}
    </div>
  );
}

function DelayModal({ item, user, delayReasons, onClose, onSaved }) {
  const currentStage = stageToTimelineKey(item.stage);
  const canChooseStage = user?.role === "master_admin";
  const [stage, setStage] = useState(currentStage);
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
        {canChooseStage ? (
          <select value={stage} onChange={(e) => { setStage(e.target.value); setReason(""); }} className="w-full rounded-lg border border-white/10 bg-navy-950 px-4 py-3 text-white">
            <option value="administrasi">Administrasi</option><option value="proofreading">Proofreading</option>
            <option value="layout">Layout</option><option value="produksi">Produksi</option>
            <option value="distribusi">Distribusi</option><option value="selesai">Selesai</option>
          </select>
        ) : (
          <div className="rounded-lg border border-white/10 bg-navy-950 px-4 py-3 text-sm font-bold text-white">
            Tahap berjalan: {labelFor(stage)}
          </div>
        )}
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

function PhoneModal({ item, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-navy-900 p-5 space-y-6 text-center">
        <div className="text-sm font-bold text-slate-400">Nomor HP Penulis</div>
        <div className="text-3xl font-black text-white">{item.customer.phone || "-"}</div>
        <div className="text-brand-orange text-sm">{item.customer.name}</div>
        <button onClick={onClose} className="w-full rounded-lg bg-white/5 px-4 py-3 text-white font-bold hover:bg-white/10">Tutup</button>
      </div>
    </div>
  );
}

function SmallButton({ onClick, icon: Icon, label, tone }) {
  const tones = {
    blue: "border-brand-blue/30 bg-brand-blue/15 text-brand-blue",
    green: "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
    yellow: "border-amber-500/25 bg-amber-500/15 text-amber-300",
    orange: "border-orange-200 bg-brand-orange text-white",
    red: "border-rose-500/25 bg-rose-500/15 text-rose-300",
  };
  return (
    <button onClick={onClick} className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-black ${tones[tone] || tones.blue}`}>
      <Icon size={16} /> {label}
    </button>
  );
}

function DetailModal({ item, onClose, copy }) {
  const timeline = buildTimeline(item);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/10 bg-navy-800">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div><div className="text-xs font-black uppercase text-brand-orange">{item.tracking_code}</div><h2 className="text-2xl font-black text-white">{item.manuscript.title}</h2><p className="text-slate-400">{item.customer.name} - {item.customer.phone}</p></div>
          <button onClick={onClose} className="rounded-lg bg-white/5 px-3 py-2 text-white">Tutup</button>
        </div>
        <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-2">
          <div className="space-y-3">
            <Info label="Penerbit/Paket" value={`${item.manuscript.publisher} / ${item.manuscript.package_name}`} />
            <Info label="Kebutuhan" value={item.manuscript.need_proofreading ? "Proofreading lalu layout" : "Langsung layout"} />
            <Info label="Estimasi" value={`${item.manuscript.estimated_words || 0} kata / ${item.manuscript.estimated_pages || 0} halaman`} />
            <Info label="Spesifikasi" value={item.manuscript.specs || "-"} />
            <div className="grid grid-cols-2 gap-2">
              <CopyBox label="Kode Tracking" value={item.tracking_code} onClick={() => copy(item.tracking_code, "Kode tracking")} />
              <CopyBox label="Nomor WA" value={item.customer.phone} onClick={() => copy(item.customer.phone, "Nomor WA")} />
            </div>
          </div>
          <div className="space-y-3">
            <div className="font-bold text-white">Timeline Hari Kerja</div>
            {timeline.map((step) => <div key={step.key} className="rounded-lg border border-white/10 bg-navy-900 p-3"><div className="flex justify-between text-sm"><span className="font-bold text-white">{step.label}</span><span className="text-slate-300">{formatDate(step.start)} - {formatDate(step.end)}</span></div>{step.delay > 0 && <div className="mt-1 text-xs text-amber-400">Mundur {step.delay} hari kerja</div>}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

function labelFor(key) {
  return key === "layout" ? "Desain Cover & Layout" : key.charAt(0).toUpperCase() + key.slice(1);
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

function CopyBox({ label, value, onClick }) {
  return <button onClick={onClick} className="rounded-lg border border-white/10 bg-navy-900 p-3 text-left hover:border-brand-orange/60"><div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500"><Clipboard size={12} /> {label}</div><div className="truncate font-mono text-sm text-white">{value || "-"}</div></button>;
}

function Info({ label, value }) {
  return <div className="rounded-lg border border-white/10 bg-navy-900 p-3"><div className="text-[10px] font-black uppercase text-slate-500">{label}</div><div className="mt-1 font-bold text-white">{value}</div></div>;
}
