import { useMemo, useState, useEffect } from "react";
import { Send, FileText, UserCheck, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { activeItems, updateWorkflowItem, STAGE_LABELS } from "../../lib/workflow";
import { api, formatRupiah } from "../../lib/api";

const DEFAULT_CCO_USERS = [
  { id: "cco-1", name: "Budi Santoso (CCO 1)", email: "budi.cco@publishinc.id", role: "cco" },
  { id: "cco-2", name: "Siti Rahma (CCO 2)", email: "siti.cco@publishinc.id", role: "cco" },
];

export default function NaskahDealCS() {
  const { user } = useAuth();
  const [items, setItems] = useState(() => activeItems());
  const [ccoList, setCcoList] = useState(DEFAULT_CCO_USERS);
  const [assignModal, setAssignModal] = useState(null);
  const [selectedCcoId, setSelectedCcoId] = useState("");

  useEffect(() => {
    api.get("/hrd/users")
      .then((res) => {
        const ccos = (res.data || []).filter((u) => u.role === "cco" || u.role === "admin_cco");
        if (ccos.length > 0) {
          setCcoList(ccos);
        }
      })
      .catch(() => {
        // Fallback to default CCO users if API fails
      });
  }, []);

  const csHolds = useMemo(() => 
    items.filter((item) => (item.created_by === user?.id || user?.role === "cs") && item.stage === "cs_hold"), 
  [items, user]);

  const getCcoActiveCount = (ccoUser) => {
    return items.filter((it) => 
      it.stage !== "cs_hold" && 
      it.stage !== "done" && 
      it.stage !== "delete_requested" &&
      it.stage !== "deleted" && 
      (it.cco_assigned_to === ccoUser.id || it.cco_assigned_name === ccoUser.name)
    ).length;
  };

  const openAssignModal = (item) => {
    setAssignModal(item);
    setSelectedCcoId(ccoList[0]?.id || "");
  };

  const handleConfirmAssign = () => {
    const selectedCco = ccoList.find((c) => c.id === selectedCcoId) || ccoList[0];
    if (!selectedCco) return toast.error("Silakan pilih CCO penanggung jawab.");

    const now = new Date();
    updateWorkflowItem(assignModal.id, (item) => ({
      ...item,
      stage: "cco_new",
      cco_assigned_to: selectedCco.id,
      cco_assigned_name: selectedCco.name,
      created_at: now.toISOString(),
      base_date: now.toISOString().slice(0, 10),
      history: [
        ...(item.history || []),
        { at: now.toISOString(), text: `Naskah diserahkan oleh CS & ditugaskan ke ${selectedCco.name}.` }
      ]
    }));

    toast.success(`Naskah berhasil ditugaskan ke ${selectedCco.name} & diserahkan ke tim.`);
    setAssignModal(null);
    setItems(activeItems());
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-white">Naskah Deal Tertahan</h1>
        <p className="text-slate-400 mt-1">Daftar naskah yang sudah deal (KPI diklaim) namun belum diserahkan ke tim. Perhitungan argometer SLA belum berjalan.</p>
      </div>

      <div className="bg-navy-800 rounded-xl border border-white/10 overflow-hidden">
        <div className="p-5 border-b border-white/10 flex items-center gap-2 text-white font-bold"><FileText size={18} /> Naskah Perlu Diserahkan</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-navy-900/60 text-[10px] uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Naskah / Layanan</th>
                <th className="px-5 py-3">Invoice</th>
                <th className="px-5 py-3">Jenis</th>
                <th className="px-5 py-3">Posisi</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {csHolds.map((item) => (
                <tr key={item.id} className="hover:bg-white/5">
                  <td className="px-5 py-4">
                    <div className="font-bold text-white">{item.customer.name}</div>
                    <div className="text-xs text-slate-500">{item.customer.city} &bull; {item.customer.profession}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-bold text-white">{item.manuscript.title}</div>
                    <div className="text-xs text-slate-500">{item.tracking_code || "-"} &bull; {item.customer.phone}</div>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-slate-300">
                    <div className="font-bold">{item.financial.invoice_number || "-"}</div>
                    <div className="text-brand-orange">{formatRupiah(item.financial.total_price)}</div>
                  </td>
                  <td className="px-5 py-4 uppercase text-xs font-black text-brand-orange">{item.service_type}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-orange-500/10 text-brand-orange px-3 py-1 text-[10px] font-bold uppercase">{STAGE_LABELS[item.stage] || item.stage}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button 
                      onClick={() => openAssignModal(item)}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white transition-colors shadow-md active:scale-95"
                    >
                      <Send size={15} /> Serahkan ke Tim
                    </button>
                  </td>
                </tr>
              ))}
              {!csHolds.length && (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center text-slate-500">
                    Semua naskah deal sudah diserahkan ke tim.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL POP-UP PENUGASAN CCO */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-navy-900 border border-white/10 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-display font-bold text-white text-lg flex items-center gap-2">
                <UserCheck className="text-brand-orange" size={20} /> Penugasan Naskah ke CCO
              </h3>
              <button onClick={() => setAssignModal(null)} className="text-slate-400 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            <div className="bg-navy-950 p-4 rounded-xl border border-white/5 space-y-1">
              <div className="text-xs text-slate-400">Detail Naskah:</div>
              <div className="font-bold text-white text-sm">{assignModal.manuscript?.title || "Judul Naskah"}</div>
              <div className="text-xs text-slate-300">Penulis: {assignModal.customer?.name} &bull; Layanan: <span className="uppercase text-brand-orange font-bold">{assignModal.service_type}</span></div>
            </div>

            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-slate-400 uppercase">Pilih CCO Penanggung Jawab *</label>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {ccoList.map((cco) => {
                  const activeCount = getCcoActiveCount(cco);
                  const isSelected = selectedCcoId === cco.id;
                  return (
                    <label
                      key={cco.id}
                      onClick={() => setSelectedCcoId(cco.id)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected ? "bg-brand-orange/15 border-brand-orange text-white" : "bg-navy-950 border-white/10 text-slate-300 hover:bg-navy-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="cco_select"
                          checked={isSelected}
                          onChange={() => setSelectedCcoId(cco.id)}
                          className="accent-brand-orange h-4 w-4"
                        />
                        <div>
                          <div className="font-bold text-sm text-white">{cco.name}</div>
                          <div className="text-xs text-slate-400">Tim CCO &bull; {cco.email || "cco@publishinc.id"}</div>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-navy-900 border border-white/10 text-brand-orange">
                        {activeCount} naskah aktif
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setAssignModal(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-navy-800 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmAssign}
                className="bg-brand-orange hover:bg-brand-orange-dark text-white rounded-xl px-5 py-2.5 font-bold text-xs shadow-md transition-colors flex items-center gap-1.5"
              >
                <Send size={15} /> Tugaskan &amp; Serahkan ke Tim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

