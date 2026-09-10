import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import { PlusCircle, Clock, CheckCircle2, XCircle } from "lucide-react";
import { demoUsers } from "../../lib/demoData";
import { addKpiEvent, getKpiApprovals, getRoleKpiTargets } from "../../lib/workflow";

const MANUAL_ONLY_ROLES = ["editor", "layouter", "pic_editor", "pic_layouter"];
const OTHER_TARGET = { id: "manual-lainnya", name: "Lainnya", metric: "manual_lainnya", target: 0, unit: "poin", fixed: false };

export default function InputKpiManual() {
  const { user } = useAuth();
  const [klaim, setKlaim] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [judul, setJudul] = useState("");
  const [poin, setPoin] = useState(1);
  const [keterangan, setKeterangan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [availableTargets, setAvailableTargets] = useState([]);

  useEffect(() => {
    if (user?.role) {
      const targets = getRoleKpiTargets();
      const roleTargets = MANUAL_ONLY_ROLES.includes(user.role) ? [OTHER_TARGET] : (targets[user.role] || []);
      setAvailableTargets(roleTargets);
      if (roleTargets.length > 0) {
        setJudul(roleTargets[0].name);
      }
    }
  }, [user]);

  const fetchKlaim = async () => {
    setLoading(true);
    const demoId = demoUsers.find((person) => person.email === user?.email || person.role === user?.role)?.id;
    const mine = getKpiApprovals()
      .filter((item) => item.type === "claim")
      .filter((item) => item.user_id === user?.id || item.user_email === user?.email || item.user_id === demoId)
      .map((item) => ({
        id: item.id,
        created_at: item.created_at,
        judul_tugas: item.title,
        keterangan: item.note,
        poin_diajukan: item.requested_value,
        status: item.status,
      }));
    setKlaim(mine);
    setLoading(false);
  };

  useEffect(() => {
    if (user?.id) fetchKlaim();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!judul || poin < 1) return toast.error("Judul dan poin harus diisi dengan benar.");
    
    setSubmitting(true);
    const selectedTarget = availableTargets.find((target) => target.name === judul);
    addKpiEvent({
      user_id: user.id,
      user_name: user.name,
      user_email: user.email,
      role: user.role,
      metric: selectedTarget?.metric || "manual",
      value: poin,
      title: judul,
      note: keterangan || "Klaim KPI manual.",
    });
    toast.success("Klaim KPI manual berhasil dikirim dan menunggu persetujuan.");
    setJudul(availableTargets[0]?.name || "");
    setPoin(1);
    setKeterangan("");
    fetchKlaim();
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">Klaim KPI Manual</h1>
        <p className="text-slate-400 mt-1">Ajukan penambahan poin untuk tugas-tugas ekstra di luar naskah buku reguler.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Form Pengajuan */}
        <div className="md:col-span-1 bg-navy-800 rounded-3xl p-6 border border-white/10 h-fit">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><PlusCircle size={20}/> Form Klaim</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Pilih Target KPI</label>
              <select 
                value={judul} onChange={e => setJudul(e.target.value)}
                className="w-full bg-navy-900 border border-white/10 rounded-xl px-4 py-2.5 text-white font-medium outline-none focus:border-brand-blue"
                required
              >
                {availableTargets.map((target) => (
                  <option key={target.id} value={target.name}>{target.name} ({target.unit})</option>
                ))}
                {availableTargets.length === 0 && <option value="">Belum ada target KPI untuk role ini</option>}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Poin Yang Diajukan</label>
              <input 
                type="number" 
                min="1" max="100"
                value={poin} onChange={e => setPoin(Number(e.target.value))}
                className="w-full bg-navy-900 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono font-bold outline-none focus:border-brand-blue"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Keterangan / Bukti Link</label>
              <textarea 
                value={keterangan} onChange={e => setKeterangan(e.target.value)}
                placeholder="Opsional, sertakan link Drive / deskripsi singkat..."
                className="w-full bg-navy-900 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-brand-blue h-24 resize-none"
              ></textarea>
            </div>
            <button 
              type="submit" 
              disabled={submitting}
              className="w-full bg-brand-blue hover:bg-blue-600 text-white font-black py-3 rounded-xl shadow-lg transition-all"
            >
              {submitting ? "Mengirim..." : "Kirim Pengajuan"}
            </button>
          </form>
        </div>

        {/* Riwayat Klaim */}
        <div className="md:col-span-2 bg-navy-800 rounded-3xl p-6 border border-white/10">
          <h2 className="text-xl font-bold text-white mb-4">Riwayat Pengajuan Saya</h2>
          
          {loading ? (
            <div className="text-slate-400 text-center py-8">Memuat data...</div>
          ) : (
            <div className="space-y-3">
              {klaim.map(k => (
                <div key={k.id} className="p-4 bg-navy-900/50 border border-white/5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-white text-base">{k.judul_tugas}</h3>
                    <p className="text-sm text-slate-400 italic mt-1">"{k.keterangan || "Tanpa keterangan"}"</p>
                    <div className="text-[10px] text-slate-500 mt-2">
                      Diajukan pada: {new Date(k.created_at).toLocaleString('id-ID')}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-center">
                      <div className="text-2xl font-black font-mono text-white">{k.poin_diajukan}</div>
                      <div className="text-[10px] uppercase font-bold text-slate-500">Poin</div>
                    </div>
                    
                    <div className={`flex flex-col items-center justify-center w-24 px-2 py-1.5 rounded-lg border font-bold text-[10px] uppercase tracking-wider ${
                      k.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                      k.status === 'rejected' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                      'bg-amber-500/10 border-amber-500/20 text-amber-500'
                    }`}>
                      {k.status === 'approved' && <CheckCircle2 size={16} className="mb-1" />}
                      {k.status === 'rejected' && <XCircle size={16} className="mb-1" />}
                      {k.status === 'pending' && <Clock size={16} className="mb-1" />}
                      {k.status}
                    </div>
                  </div>
                </div>
              ))}
              {klaim.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-2xl">
                  <p className="text-slate-400">Belum ada pengajuan poin manual.</p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
