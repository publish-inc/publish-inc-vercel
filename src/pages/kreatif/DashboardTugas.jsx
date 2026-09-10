import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { activeItems, addDelay, buildTimeline, claimCreativeRevision, updateCreativeStatus } from "../../lib/workflow";

export default function DashboardTugas() {
  const { user } = useAuth();
  const [items, setItems] = useState(() => activeItems());
  const [claim, setClaim] = useState(null);
  const [revisionClaim, setRevisionClaim] = useState(null);
  const [delayModal, setDelayModal] = useState(null);
  const [delayReasons, setDelayReasons] = useState({});
  const type = user?.role?.includes("layouter") ? "layouter" : "editor";
  const belongsToUser = (task) => task?.assignee_id === user?.id || task?.assignee_name === user?.name || (user?.role === type && task?.assignee_id === `demo-${type}`);

  useEffect(() => {
    supabase.from("spk_settings").select("value").eq("key", "delay_reasons").single().then(({ data }) => {
      if (data) setDelayReasons(data.value || {});
    });
  }, []);

  const tasks = useMemo(() => items
    .filter((item) => belongsToUser(item.tasks?.[type]))
    .filter((item) => item.tasks?.[type]?.status !== "complete")
    .filter((item) => type !== "layouter" || !item.manuscript.need_proofreading || item.tasks?.editor?.status === "complete"),
  [items, type, user]);

  const refresh = () => setItems(activeItems());
  const statusCount = (status) => tasks.filter((item) => item.tasks[type]?.status === status).length;
  const update = (item, status, value = 0) => {
    updateCreativeStatus(item.id, type, status, value, user);
    refresh();
    toast.success(status === "complete" ? "Tugas complete dan berpindah ke tahap berikutnya." : `Status diubah ke ${status}.`);
  };
  const claimRevision = (item, value) => {
    claimCreativeRevision(item.id, type, value, user);
    refresh();
    toast.success("Klaim revisi masuk approval KPI dan tahapan revisi diperbarui.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-white">Naskah Ditugaskan</h1>
        <p className="text-slate-400 mt-1">Selesaikan tugas, klaim KPI, kelola revisi, lalu complete agar naskah lanjut otomatis.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Menunggu" value={statusCount("menunggu")} />
        <Stat label="Done" value={statusCount("done")} />
        <Stat label="Revisi Aktif" value={tasks.filter((item) => item.tasks[type]?.status?.startsWith("revisi")).length} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {tasks.map((item) => {
          const task = item.tasks[type];
          const timeline = buildTimeline(item).find((row) => row.key === (type === "editor" ? "proofreading" : "layout"));
          return (
            <div key={item.id} className="bg-navy-800 border border-white/10 rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase font-black tracking-widest text-brand-orange">{item.tracking_code}</div>
                  <h2 className="text-xl font-black text-white leading-tight">{item.manuscript.title}</h2>
                  <p className="text-sm text-slate-400">{item.customer.name} &bull; {item.manuscript.package_name}</p>
                </div>
                <Badge status={task.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Info label="Target Halaman" value={item.manuscript.estimated_pages} />
                <Info label="Timeline" value={timeline ? `${timeline.start} - ${timeline.end}` : "-"} />
              </div>
              <div className="rounded-lg bg-navy-900 border border-white/10 p-3 text-sm text-slate-300">
                Revisi: {task.revision_done || 0}/{task.revision_limit || 0}
                {task.kpi_claimed && <span className="ml-3 text-emerald-300">KPI diklaim: {task.kpi_value}</span>}
                {task.revision_kpi_total > 0 && <span className="ml-3 text-amber-300">Tambahan revisi: {task.revision_kpi_total}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {task.status === "menunggu" && <button onClick={() => setClaim(item)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/25 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25"><CheckCircle2 size={16} /> Done & Klaim KPI</button>}
                {(task.status === "done" || task.status?.startsWith("revisi")) && (task.revision_done || 0) < (task.revision_limit || 0) && <button onClick={() => setRevisionClaim(item)} className="inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/10"><RotateCcw size={16} /> Klaim Revisi {Number(task.revision_done || 0) + 1}</button>}
                {task.status === "done" && (task.revision_done || 0) >= (task.revision_limit || 0) && <button onClick={() => update(item, "complete")} className="rounded-lg bg-brand-blue/20 border border-brand-blue/30 px-3 py-2 text-xs font-bold text-brand-blue hover:bg-brand-blue/30">Complete</button>}
                <button onClick={() => setDelayModal(item)} className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/10">Atur Kemunduran</button>
              </div>
            </div>
          );
        })}
        {!tasks.length && <div className="xl:col-span-2 rounded-xl border border-dashed border-white/10 bg-navy-800/60 p-10 text-center text-slate-500">Belum ada naskah ditugaskan untuk akun ini.</div>}
      </div>

      {claim && <ClaimModal type={type} item={claim} onClose={() => setClaim(null)} onSubmit={(value) => { update(claim, "done", value); setClaim(null); }} />}
      {revisionClaim && <ClaimModal type={type} item={revisionClaim} revision onClose={() => setRevisionClaim(null)} onSubmit={(value) => { claimRevision(revisionClaim, value); setRevisionClaim(null); }} />}
      {delayModal && <DelayModal item={delayModal} type={type} delayReasons={delayReasons} onClose={() => setDelayModal(null)} onSaved={() => { setDelayModal(null); refresh(); }} />}
    </div>
  );
}

function ClaimModal({ type, item, revision = false, onClose, onSubmit }) {
  const task = item.tasks?.[type] || {};
  const revisionNumber = Number(task.revision_done || 0) + 1;
  const [value, setValue] = useState(revision ? "" : item.manuscript.estimated_pages || "");
  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-xl bg-navy-800 border border-white/10 p-5 space-y-4">
        <h2 className="text-xl font-black text-white">{revision ? `Klaim KPI Revisi ${revisionNumber}` : `Klaim KPI ${type === "editor" ? "Editor" : "Layouter"}`}</h2>
        <p className="text-sm text-slate-400">{item.manuscript.title}</p>
        <label className="block text-xs text-slate-300">
          {revision ? (type === "editor" ? "Tambahan Kata Revisi" : "Tambahan Halaman Revisi") : (type === "editor" ? "Jumlah Kata" : "Jumlah Halaman")}
          <input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} className="mt-1 w-full bg-navy-900 border border-white/10 rounded-lg px-3 py-2 text-white" />
        </label>
        <div className="flex justify-end gap-2"><button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/5 text-white">Batal</button><button onClick={() => onSubmit(value)} className="px-4 py-2 rounded-lg bg-brand-orange text-white font-bold">Klaim</button></div>
      </div>
    </div>
  );
}

function DelayModal({ item, type, delayReasons, onClose, onSaved }) {
  const stage = type === "editor" ? "proofreading" : "layout";
  const [reason, setReason] = useState("");
  const [days, setDays] = useState("1");

  const submit = () => {
    if (!days) return toast.error("Jumlah hari kerja wajib diisi.");
    addDelay(item.id, stage, days, reason);
    toast.success("Kemunduran tersimpan. Timeline tahap berikutnya ikut bergeser.");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-navy-900 p-5 space-y-4">
        <h2 className="text-xl font-black text-white">Atur Kemunduran</h2>
        <div className="rounded-lg border border-white/10 bg-navy-950 px-4 py-3 text-sm font-bold text-white">
          Tahap berjalan: {stage === "proofreading" ? "Proofreading" : "Layout"}
        </div>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-white/10 bg-navy-950 px-4 py-3 text-white">
          <option value="">-- Pilih Alasan --</option>
          {(delayReasons[stage] || []).map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Atau tulis alasan kemunduran..." className="w-full rounded-lg border border-white/10 bg-navy-950 px-4 py-3 text-white" />
        <input type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} placeholder="Jumlah hari kerja" className="w-full rounded-lg border border-white/10 bg-navy-950 px-4 py-3 text-white" />
        <div className="flex justify-end gap-2"><button onClick={onClose} className="rounded-lg bg-white/5 px-4 py-2 text-white">Batal</button><button onClick={submit} className="rounded-lg bg-brand-orange px-4 py-2 font-bold text-white">Simpan</button></div>
      </div>
    </div>
  );
}

function Badge({ status }) {
  const cls = status === "done" ? "bg-emerald-500/15 text-emerald-300" : status?.startsWith("revisi") ? "bg-amber-500/15 text-amber-300" : "bg-slate-500/15 text-slate-300";
  return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] uppercase font-black ${cls}`}><Clock size={12} /> {status}</span>;
}

function Info({ label, value }) {
  return <div className="rounded-lg bg-navy-900 border border-white/10 p-3"><div className="text-[10px] uppercase font-black text-slate-500">{label}</div><div className="text-white font-bold">{value || "-"}</div></div>;
}

function Stat({ label, value }) {
  return <div className="bg-navy-800 border border-white/10 rounded-xl p-5"><div className="text-xs uppercase font-black tracking-widest text-slate-500">{label}</div><div className="text-3xl font-black text-white">{value}</div></div>;
}
