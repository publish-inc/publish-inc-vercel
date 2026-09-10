import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Search, Loader2, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Logo } from "../components/Logo";
import { activeItems, buildTimeline, STAGE_LABELS } from "../lib/workflow";

export default function PublicTracking() {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!code || phone.length !== 4) {
      setError("Masukkan Kode Tracking dan 4 digit terakhir nomor HP dengan benar.");
      return;
    }
    
    setLoading(true);
    setError("");
    setResult(null);
    
    try {
      const localItem = activeItems().find((item) => item.tracking_code?.toUpperCase() === code.toUpperCase());
      if (localItem) {
        const last4 = String(localItem.customer?.phone || "").slice(-4);
        if (last4 && last4 !== phone) throw new Error("Data tidak ditemukan atau Nomor HP tidak cocok.");
        setResult({
          source: "workflow",
          tracking_code: localItem.tracking_code,
          judul: localItem.manuscript.title,
          penulis: localItem.customer.name,
          status: localItem.stage,
          updated_at: localItem.updated_at,
          spk_deals: { penerbit: localItem.manuscript.publisher, package_name: localItem.manuscript.package_name },
          timeline: buildTimeline(localItem),
        });
        return;
      }

      // Cari naskah berdasarkan tracking_code
      let naskahQuery = supabase.from("spk_naskah").select(`
        id, tracking_code, judul, penulis, status, deadline, no_hp_penulis, updated_at,
        spk_deals ( id, customer_name, package_name, penerbit )
      `);
      
      naskahQuery = naskahQuery.eq("tracking_code", code.toUpperCase());

      const { data, error: fetchErr } = await naskahQuery.single();

      if (fetchErr || !data) {
        throw new Error("Data tracking tidak ditemukan. Pastikan kode benar.");
      }

      // Validasi 4 digit hp terakhir (jika no_hp_penulis ada)
      if (data.no_hp_penulis) {
        const last4 = data.no_hp_penulis.slice(-4);
        if (last4 !== phone) {
          throw new Error("Data tidak ditemukan atau Nomor HP tidak cocok.");
        }
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Header Hero */}
        <div className="bg-navy-950 text-white p-8 border-b-4 border-brand-orange flex items-center gap-6">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center p-2 shadow-lg shrink-0">
            <Logo iconOnly />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Tracking Naskah</h1>
            <p className="text-slate-400 font-medium text-sm mt-1">Portal Cek Progres Buku - Publish Inc.</p>
          </div>
        </div>

        <div className="p-8">
          {!result ? (
            <form onSubmit={handleSearch} className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-black text-slate-800">Cek Progress Naskah</h2>
                <p className="text-slate-500 text-sm">Masukkan ID Tracking (UUID) dan 4 digit terakhir nomor HP Anda untuk melihat tahapan naskah.</p>
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl flex items-center gap-3 text-sm font-medium">
                  <AlertTriangle size={18} /> {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Kode Tracking (TRK)</label>
                  <input 
                    type="text" 
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Contoh: TRK-A1B2C" 
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-800 outline-none focus:border-brand-orange focus:bg-white transition-colors uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">4 Digit Terakhir No HP</label>
                  <input 
                    type="text" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 1234" 
                    maxLength={4}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-800 outline-none focus:border-brand-orange focus:bg-white transition-colors"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-brand-orange hover:bg-orange-600 text-white font-black py-4 rounded-xl shadow-lg shadow-orange-500/20 transition-all flex justify-center items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : "Lihat Progress"}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-black text-slate-800">Status: <span className="text-brand-orange uppercase">{STAGE_LABELS[result.status] || result.status}</span></h2>
                  <p className="text-slate-500 text-sm mt-1">Terakhir diperbarui: {new Date(result.updated_at).toLocaleDateString("id-ID")}</p>
                </div>
                <button 
                  onClick={() => { setResult(null); setCode(""); setPhone(""); }}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg"
                >
                  Cari Lagi
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="border border-slate-200 p-4 rounded-xl bg-slate-50">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Penulis</span>
                  <strong className="text-slate-800 text-sm">{result.penulis}</strong>
                </div>
                <div className="border border-slate-200 p-4 rounded-xl bg-slate-50">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Judul</span>
                  <strong className="text-slate-800 text-sm">{result.judul}</strong>
                </div>
                <div className="border border-slate-200 p-4 rounded-xl bg-slate-50">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Penerbit</span>
                  <strong className="text-slate-800 text-sm">{result.spk_deals?.penerbit || "-"}</strong>
                </div>
                <div className="border border-slate-200 p-4 rounded-xl bg-slate-50">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Paket</span>
                  <strong className="text-slate-800 text-sm">{result.spk_deals?.package_name || "-"}</strong>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden mt-6">
                {result.timeline ? result.timeline.map((step) => (
                  <div key={step.key} className="p-4 flex gap-4 border-b border-slate-100 last:border-0 bg-white">
                    <div className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] bg-emerald-100 text-emerald-600">
                      <CheckCircle2 size={14} />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm text-slate-800 uppercase">{step.label}</div>
                      <div className="text-xs text-slate-500 mt-1">{step.start} sampai {step.end}{step.delay ? `, mundur ${step.delay} hari kerja` : ""}</div>
                    </div>
                  </div>
                )) : ['baru', 'antrian', 'proses', 'revisi', 'selesai'].map((step, idx) => {
                  const stepOrder = ['baru', 'antrian', 'proses', 'revisi', 'selesai'];
                  const currentIndex = stepOrder.indexOf(result.status);
                  const isDone = currentIndex >= idx;
                  const isActive = currentIndex === idx;
                  
                  // Skip revisi from default timeline if not in revision
                  if (step === 'revisi' && currentIndex < 3) return null;

                  return (
                    <div key={step} className={`p-4 flex gap-4 border-b border-slate-100 last:border-0 ${isActive ? 'bg-orange-50' : 'bg-white'}`}>
                      <div className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] ${isDone ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        {isDone ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                      </div>
                      <div className="flex-1">
                        <div className={`font-bold text-sm ${isActive ? 'text-brand-orange' : (isDone ? 'text-slate-800' : 'text-slate-400')} uppercase`}>
                          {step}
                        </div>
                        {isActive && (
                          <div className="text-xs text-slate-500 mt-1">Saat ini sedang dalam pengerjaan.</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
