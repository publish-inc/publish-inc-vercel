import { useState } from "react";
import { Calculator, Store, Percent, Tag, ArrowRight } from "lucide-react";

export default function MarketplaceKalkulator() {
  const [hpp, setHpp] = useState(30000);
  const [margin, setMargin] = useState(40); // persentase keuntungan kotor
  const [royalti, setRoyalti] = useState(10);
  const [adminShopee, setAdminShopee] = useState(8); // persentase admin shopee
  const [adminToped, setAdminToped] = useState(6.5); // persentase admin toped

  // Rumus: Harga Jual Wajar = HPP / (1 - Margin% - Admin% - Royalti%)
  
  const hitungHarga = (adminRate) => {
    const totalPotongan = (margin + adminRate + royalti) / 100;
    if (totalPotongan >= 1) return 0; // Invalid
    return Math.ceil(hpp / (1 - totalPotongan) / 1000) * 1000; // Pembulatan ke atas ribuan terdekat
  };

  const hargaShopee = hitungHarga(adminShopee);
  const hargaToped = hitungHarga(adminToped);

  // Proyeksi Laba Bersih
  const royaltiShopee = hargaShopee * royalti / 100;
  const royaltiToped = hargaToped * royalti / 100;
  const labaShopee = hargaShopee - hpp - (hargaShopee * adminShopee / 100) - royaltiShopee;
  const labaToped = hargaToped - hpp - (hargaToped * adminToped / 100) - royaltiToped;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-white">Rumus Marketplace</h1>
        <p className="text-slate-400 mt-1">Kalkulator untuk menentukan harga jual wajar agar tidak rugi potongan admin aplikasi.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Kolom Input */}
        <div className="bg-navy-800 rounded-3xl p-8 border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-brand-blue/20 text-brand-blue rounded-lg">
              <Calculator size={24} />
            </div>
            <h2 className="text-xl font-bold text-white">Parameter Biaya</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">HPP Cetak Buku (Rp)</label>
              <input 
                type="number" 
                value={hpp}
                onChange={e => setHpp(Number(e.target.value))}
                className="w-full bg-navy-900 border border-white/10 rounded-xl px-4 py-3 text-white font-mono font-bold focus:border-brand-blue outline-none"
              />
            </div>
            
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Target Margin / Keuntungan (%)</label>
              <div className="flex items-center gap-2">
                <input 
                  type="range" 
                  min="10" max="80" step="1"
                  value={margin}
                  onChange={e => setMargin(Number(e.target.value))}
                  className="flex-1 accent-brand-blue"
                />
                <div className="w-16 bg-navy-900 border border-white/10 rounded-lg px-3 py-2 text-center text-white font-bold">{margin}%</div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Royalti Penulis (%)</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0" max="50" step="0.5"
                  value={royalti}
                  onChange={e => setRoyalti(Number(e.target.value))}
                  className="flex-1 accent-brand-orange"
                />
                <div className="w-20 bg-navy-900 border border-white/10 rounded-lg px-3 py-2 text-center text-white font-bold">{royalti}%</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Store size={12}/> Biaya Admin Shopee (%)</label>
                <input 
                  type="number" step="0.1"
                  value={adminShopee}
                  onChange={e => setAdminShopee(Number(e.target.value))}
                  className="w-full bg-navy-900 border border-white/10 rounded-xl px-4 py-2.5 text-white font-bold outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Store size={12}/> Biaya Admin Tokopedia (%)</label>
                <input 
                  type="number" step="0.1"
                  value={adminToped}
                  onChange={e => setAdminToped(Number(e.target.value))}
                  className="w-full bg-navy-900 border border-white/10 rounded-xl px-4 py-2.5 text-white font-bold outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Hasil */}
        <div className="bg-gradient-to-br from-brand-blue to-blue-900 rounded-3xl p-8 border border-blue-400/20 text-white relative overflow-hidden">
          {/* Decorative */}
          <Percent className="absolute -right-10 -bottom-10 text-white/5" size={200} />

          <h2 className="text-xl font-bold text-blue-100 mb-6 flex items-center gap-2"><Tag size={20} /> Rekomendasi Harga Jual</h2>

          <div className="space-y-6 relative z-10">
            {/* Shopee */}
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/20">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-xs font-bold text-blue-200 uppercase tracking-wider">Harga Jual Shopee</div>
                  <div className="text-3xl font-black font-mono mt-1">Rp {hargaShopee.toLocaleString('id-ID')}</div>
                </div>
                <div className="bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded">Shopee</div>
              </div>
              <div className="flex items-center gap-4 text-xs text-blue-100/70 pt-4 border-t border-white/10">
                <div>Potongan ({adminShopee}%): <strong className="text-white">Rp {(hargaShopee * adminShopee / 100).toLocaleString('id-ID')}</strong></div>
                <ArrowRight size={12} />
                <div>Royalti ({royalti}%): <strong className="text-white">Rp {Math.floor(royaltiShopee).toLocaleString('id-ID')}</strong></div>
                <ArrowRight size={12} />
                <div>Laba Bersih: <strong className="text-emerald-400">Rp {Math.floor(labaShopee).toLocaleString('id-ID')}</strong></div>
              </div>
            </div>

            {/* Tokopedia */}
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/20">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-xs font-bold text-blue-200 uppercase tracking-wider">Harga Jual Tokopedia</div>
                  <div className="text-3xl font-black font-mono mt-1">Rp {hargaToped.toLocaleString('id-ID')}</div>
                </div>
                <div className="bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded">Tokopedia</div>
              </div>
              <div className="flex items-center gap-4 text-xs text-blue-100/70 pt-4 border-t border-white/10">
                <div>Potongan ({adminToped}%): <strong className="text-white">Rp {(hargaToped * adminToped / 100).toLocaleString('id-ID')}</strong></div>
                <ArrowRight size={12} />
                <div>Royalti ({royalti}%): <strong className="text-white">Rp {Math.floor(royaltiToped).toLocaleString('id-ID')}</strong></div>
                <ArrowRight size={12} />
                <div>Laba Bersih: <strong className="text-emerald-400">Rp {Math.floor(labaToped).toLocaleString('id-ID')}</strong></div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
