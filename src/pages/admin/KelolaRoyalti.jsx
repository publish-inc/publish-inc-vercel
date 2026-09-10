import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Coins, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function KelolaRoyalti() {
  const [royalti, setRoyalti] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRoyalti = async () => {
    setLoading(true);
    // Kita ambil dari spk_royalti join dengan spk_penjualan dan spk_naskah
    const { data, error } = await supabase
      .from("spk_royalti")
      .select(`
        id, jumlah_royalti, status, tanggal_cair, created_at,
        spk_naskah(judul, penulis, no_hp_penulis),
        spk_penjualan(marketplace, qty, harga_jual, tanggal)
      `)
      .order("created_at", { ascending: false });
      
    if (!error) setRoyalti(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRoyalti();
  }, []);

  const handleCairkan = async (id) => {
    const { error } = await supabase
      .from("spk_royalti")
      .update({ status: 'sudah_cair', tanggal_cair: new Date().toISOString() })
      .eq("id", id);
      
    if (!error) {
      toast.success("Status royalti berhasil diubah menjadi Sudah Cair.");
      fetchRoyalti();
    } else {
      toast.error("Gagal mencairkan royalti.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3"><Coins /> Kelola Royalti Penulis</h1>
        <p className="text-slate-400 mt-1">Daftar royalti (10%) dari hasil penjualan buku di marketplace.</p>
      </div>

      <div className="bg-navy-800 rounded-3xl p-6 border border-white/10">
        <h2 className="text-xl font-bold text-white mb-4">Riwayat Royalti</h2>
        {loading ? (
          <div className="text-slate-400">Memuat data...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-navy-900/50 text-slate-400 text-xs uppercase tracking-widest">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg font-bold">Judul & Penulis</th>
                  <th className="px-4 py-3 font-bold">Detail Penjualan</th>
                  <th className="px-4 py-3 font-bold text-right">Nilai Royalti (10%)</th>
                  <th className="px-4 py-3 font-bold text-center">Status</th>
                  <th className="px-4 py-3 rounded-tr-lg font-bold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {royalti.map(r => (
                  <tr key={r.id} className="hover:bg-white/5">
                    <td className="px-4 py-4">
                      <div className="font-bold text-white">{r.spk_naskah?.judul}</div>
                      <div className="text-xs text-slate-400">{r.spk_naskah?.penulis}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-300">{r.spk_penjualan?.marketplace} &bull; {r.spk_penjualan?.qty} pcs</div>
                      <div className="text-[10px] text-slate-500">{new Date(r.spk_penjualan?.tanggal).toLocaleDateString('id-ID')}</div>
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-black text-brand-orange">
                      Rp {r.jumlah_royalti.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        r.status === 'sudah_cair' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-500'
                      }`}>
                        {r.status === 'sudah_cair' ? <><CheckCircle size={12}/> Cair</> : <><Clock size={12}/> Pending</>}
                      </span>
                      {r.tanggal_cair && <div className="text-[9px] text-slate-500 mt-1">{new Date(r.tanggal_cair).toLocaleDateString('id-ID')}</div>}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {r.status === 'belum_cair' && (
                        <button 
                          onClick={() => handleCairkan(r.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs transition-colors"
                        >
                          Tandai Cair
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {royalti.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-slate-500">Belum ada data royalti. Tambahkan penjualan di menu Marketplace untuk meng-generate royalti otomatis.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
