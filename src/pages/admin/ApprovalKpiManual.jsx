import { useMemo, useState } from "react";
import { CheckCircle2, ShieldCheck, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { approveKpiApproval, getKpiApprovals, ROLE_LABELS } from "../../lib/workflow";

export default function ApprovalKpiManual({ forceTab }) {
  const { user } = useAuth();
  const [items, setItems] = useState(() => getKpiApprovals());
  const [type, setType] = useState(forceTab || "claim");

  const activeType = forceTab || type;

  const visible = useMemo(() => {
    return items
      .filter((item) => item.type === activeType)
      .filter((item) => {
        if (user?.role === "master_admin") return item.approver_role === "master_admin" || !item.approver_role;
        return item.approver_role === user?.role;
      });
  }, [items, activeType, user]);

  const decide = (id, approved) => {
    const next = approveKpiApproval(id, approved, user);
    setItems(next);
    toast.success(approved ? "KPI disetujui dan masuk capaian." : "KPI ditolak.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-white">Approval KPI</h1>
        <p className="mt-1 text-slate-400">Approval adalah validasi capaian baru sebelum masuk dashboard. Koreksi KPI dipakai saat tim mengubah atau memperbaiki input yang keliru.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InfoCard icon={ShieldCheck} title="Approval KPI" text="Semua klaim KPI masuk pending dulu. Master approve role tanpa PIC; Editor dan Layouter lewat PIC masing-masing." />
        <InfoCard icon={ShieldAlert} title="Koreksi KPI" text="Dipakai untuk perbaikan input, edit, atau penghapusan KPI. Tabel menampilkan nilai sebelumnya dan nilai perbaikan." />
      </div>



      <div className="overflow-hidden rounded-2xl border border-white/10 bg-navy-800">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-navy-900 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-4">Tanggal</th>
              <th className="px-5 py-4">Pemohon</th>
              <th className="px-5 py-4">KPI</th>
              <th className="px-5 py-4 text-center">Sebelumnya</th>
              <th className="px-5 py-4 text-center">Diajukan</th>
              <th className="px-5 py-4 text-center">Status</th>
              <th className="px-5 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {visible.map((item) => (
              <tr key={item.id} className="hover:bg-white/5">
                <td className="px-5 py-4 text-xs">{new Date(item.created_at || item.at).toLocaleDateString("id-ID")}</td>
                <td className="px-5 py-4">
                  <div className="font-bold text-white">{item.user_name || item.user_id?.nama || item.user_id?.name || item.user_id || "-"}</div>
                  <div className="text-[10px] font-bold uppercase text-slate-500">{ROLE_LABELS[item.role] || item.role || "-"}</div>
                </td>
                <td className="px-5 py-4">
                  <div className="font-bold text-brand-blue">{item.title || item.judul_tugas || "-"}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.metric || "-"} - {item.note || item.keterangan || "-"}</div>
                </td>
                <td className="px-5 py-4 text-center font-mono font-black text-slate-400">{Number(item.previous_value ?? item.poin_sebelumnya ?? 0).toLocaleString("id-ID")}</td>
                <td className="px-5 py-4 text-center font-mono font-black text-white">{Number(item.requested_value ?? item.poin_diajukan ?? 0).toLocaleString("id-ID")}</td>
                <td className="px-5 py-4 text-center">
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${item.status === "approved" ? "bg-emerald-500/15 text-emerald-300" : item.status === "rejected" ? "bg-rose-500/15 text-rose-300" : "bg-amber-500/15 text-amber-300"}`}>
                    {item.status || "pending"}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  {(item.status || "pending") === "pending" && (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => decide(item.id, true)} className="rounded-lg p-2 text-emerald-400 hover:bg-emerald-500/10" title="Setujui"><CheckCircle2 size={17} /></button>
                      <button onClick={() => decide(item.id, false)} className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/10" title="Tolak"><XCircle size={17} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!visible.length && (
              <tr><td colSpan="7" className="px-5 py-14 text-center text-slate-500">Belum ada data {activeType === "claim" ? "approval KPI" : "koreksi KPI"} untuk role ini.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, title, text }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-navy-800 p-5">
      <div className="mb-3 flex items-center gap-2 font-black text-white"><Icon size={18} className="text-brand-orange" /> {title}</div>
      <p className="text-sm leading-6 text-slate-400">{text}</p>
    </div>
  );
}

function TabButton({ active, onClick, label }) {
  return <button onClick={onClick} className={`rounded-xl px-4 py-2 text-sm font-bold ${active ? "bg-brand-orange text-white" : "bg-navy-800 text-slate-400 hover:text-white"}`}>{label}</button>;
}
