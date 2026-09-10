import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { BookOpen, RefreshCcw, Store, Package, TrendingUp, Save } from "lucide-react";
import { demoMarketplace } from "../../lib/demoData";
import { activeItems } from "../../lib/workflow";

const MARKETPLACE_BOOKS_KEY = "publishinc_marketplace_books_v1";
const readMarketplaceBooks = () => {
  try {
    return JSON.parse(localStorage.getItem(MARKETPLACE_BOOKS_KEY)) || [];
  } catch {
    return [];
  }
};
const saveMarketplaceBooks = (books) => localStorage.setItem(MARKETPLACE_BOOKS_KEY, JSON.stringify(books));

export default function Marketplace() {
  const [activeTab, setActiveTab] = useState("buku"); // buku, stok, penjualan, royalti
  const [stokData, setStokData] = useState([]);
  const [penjualanData, setPenjualanData] = useState([]);
  const [naskahList, setNaskahList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookForm, setBookForm] = useState({ id: "", judul: "", penulis: "", isbn: "", sumber: "manual" });
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  // Form State for Stok
  const [stokForm, setStokForm] = useState({ id: "", naskah_id: "", gudang: "Jogja", stok: 0 });
  const [isStokModalOpen, setIsStokModalOpen] = useState(false);

  // Form State for Penjualan
  const [pjForm, setPjForm] = useState({ id: "", naskah_id: "", marketplace: "Shopee", gudang: "Jogja", qty: 1, harga_jual: 0, tanggal: new Date().toISOString().split('T')[0] });
  const [isPjModalOpen, setIsPjModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    
    const savedBooks = readMarketplaceBooks();
    setNaskahList(savedBooks.length ? savedBooks : demoMarketplace.naskahList);

    // Stok
    const { data: stok, error: stokError } = await supabase.from("spk_stok").select("*, spk_naskah(judul)");
    setStokData(!stokError && stok?.length ? stok : demoMarketplace.stok);

    // Penjualan
    const { data: penjualan, error: penjualanError } = await supabase.from("spk_penjualan").select("*, spk_naskah(judul, penulis)").order("tanggal", { ascending: false });
    setPenjualanData(!penjualanError && penjualan?.length ? penjualan : demoMarketplace.penjualan);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const downloadTemplate = () => {
    const header = "ID Naskah (JANGAN DIUBAH),Judul Buku,Marketplace (Shopee/Tokopedia),Gudang (Jogja/Makassar),Qty,Harga Jual,Tanggal (YYYY-MM-DD)\n";
    const rows = naskahList.map(n => `${n.id},"${n.judul}",Shopee,Jogja,0,0,${new Date().toISOString().split('T')[0]}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Template_Penjualan_Marketplace.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const persistBooks = (books) => {
    saveMarketplaceBooks(books);
    setNaskahList(books);
  };

  const pullFromCco = () => {
    const ccoBooks = activeItems()
      .filter((item) => item.stage === "done" && item.jual_marketplace)
      .map((item) => ({
        id: item.id,
        judul: item.manuscript?.title || item.title || "-",
        penulis: item.manuscript?.author || item.customer?.name || "-",
        isbn: item.manuscript?.isbn || "",
        sumber: "cco",
        updated_at: new Date().toISOString(),
      }));
    const merged = [...readMarketplaceBooks()];
    ccoBooks.forEach((book) => {
      const index = merged.findIndex((item) => item.id === book.id);
      if (index >= 0) merged[index] = { ...merged[index], ...book };
      else merged.unshift(book);
    });
    persistBooks(merged);
    toast.success(`${ccoBooks.length} buku dari CCO diperbarui.`);
  };

  const saveBook = () => {
    if (!bookForm.judul.trim()) return toast.error("Judul buku wajib diisi.");
    const next = bookForm.id
      ? naskahList.map((item) => item.id === bookForm.id ? { ...item, ...bookForm, updated_at: new Date().toISOString() } : item)
      : [{ ...bookForm, id: `mp-book-${Date.now()}`, updated_at: new Date().toISOString() }, ...naskahList];
    persistBooks(next);
    setIsBookModalOpen(false);
    setBookForm({ id: "", judul: "", penulis: "", isbn: "", sumber: "manual" });
    toast.success("Database buku marketplace disimpan.");
  };

  const deleteBook = (id) => {
    persistBooks(naskahList.filter((item) => item.id !== id));
    toast.success("Buku dihapus dari database marketplace.");
  };

  const uploadCsv = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const text = await file.text();
    const rows = text.split("\n").map(r => r.trim()).filter(r => r);
    if (rows.length < 2) return toast.error("File CSV kosong atau tidak valid.");
    
    const records = [];
    // Skip header
    for (let i = 1; i < rows.length; i++) {
      // Very basic CSV parsing (assumes no commas inside values except quotes which we handle poorly, so we told them not to change title).
      // A better split:
      const cols = rows[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
      if (!cols || cols.length < 7) continue;
      
      const naskah_id = cols[0].replace(/"/g, '');
      const qty = parseInt(cols[4]) || 0;
      const harga_jual = parseInt(cols[5]) || 0;
      
      if (qty > 0) {
        records.push({
          naskah_id,
          marketplace: cols[2].replace(/"/g, ''),
          gudang: cols[3].replace(/"/g, ''),
          qty,
          harga_jual,
          tanggal: cols[6].replace(/"/g, '')
        });
      }
    }
    
    if (records.length === 0) return toast.info("Tidak ada data penjualan (Qty > 0) untuk diupload.");
    
    try {
      const { error } = await supabase.from("spk_penjualan").insert(records);
      if (error) throw error;
      toast.success(`${records.length} data penjualan berhasil diupload!`);
      fetchData();
    } catch (err) {
      toast.error("Gagal upload: " + err.message);
    }
    e.target.value = null; // reset input
  };

  // --- Stok Handlers ---
  const saveStok = async () => {
    if (!stokForm.naskah_id) return toast.error("Pilih naskah terlebih dahulu");
    try {
      if (stokForm.id) {
        const { error } = await supabase.from("spk_stok").update({ 
          stok: stokForm.stok,
          last_update: new Date().toISOString()
        }).eq("id", stokForm.id);
        if (error) throw error;
      } else {
        // Check if exists
        const { data: existing } = await supabase.from("spk_stok").select("id").eq("naskah_id", stokForm.naskah_id).eq("gudang", stokForm.gudang).single();
        
        if (existing) {
          const { error } = await supabase.from("spk_stok").update({ 
            stok: stokForm.stok,
            last_update: new Date().toISOString()
          }).eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("spk_stok").insert({
            naskah_id: stokForm.naskah_id,
            gudang: stokForm.gudang,
            stok: stokForm.stok
          });
          if (error) throw error;
        }
      }
      toast.success("Stok berhasil disimpan");
      setIsStokModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const deleteStok = async (id) => {
    if (confirm("Hapus data stok ini?")) {
      await supabase.from("spk_stok").delete().eq("id", id);
      fetchData();
    }
  };

  // --- Penjualan Handlers ---
  const savePenjualan = async () => {
    if (!pjForm.naskah_id) return toast.error("Pilih naskah");
    try {
      // Validate stok
      const existingStok = stokData.find(s => s.naskah_id === pjForm.naskah_id && s.gudang === pjForm.gudang);
      const currentStok = existingStok ? existingStok.stok : 0;
      
      // If new sale, check if stock is enough
      if (!pjForm.id && pjForm.qty > currentStok) {
        return toast.error(`Stok tidak cukup! Sisa stok di ${pjForm.gudang}: ${currentStok}`);
      }

      if (pjForm.id) {
        await supabase.from("spk_penjualan").update({
          marketplace: pjForm.marketplace,
          gudang: pjForm.gudang,
          qty: pjForm.qty,
          harga_jual: pjForm.harga_jual,
          tanggal: pjForm.tanggal
        }).eq("id", pjForm.id);
      } else {
        await supabase.from("spk_penjualan").insert({
          naskah_id: pjForm.naskah_id,
          marketplace: pjForm.marketplace,
          gudang: pjForm.gudang,
          qty: pjForm.qty,
          harga_jual: pjForm.harga_jual,
          tanggal: pjForm.tanggal
        });
        
        // Kurangi stok otomatis
        if (existingStok) {
           await supabase.from("spk_stok").update({ stok: currentStok - pjForm.qty }).eq("id", existingStok.id);
        }
      }
      toast.success("Data penjualan berhasil disimpan");
      setIsPjModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const deletePenjualan = async (id) => {
    if (confirm("Hapus catatan penjualan ini?")) {
      await supabase.from("spk_penjualan").delete().eq("id", id);
      fetchData();
    }
  };

  const formatRp = (angka) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(angka);
  const bookById = (id) => naskahList.find((item) => item.id === id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Marketplace & Stok</h1>
          <p className="text-slate-400 mt-1">Kelola stok gudang, penjualan online, dan hitung royalti buku.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10 pb-4">
        <button 
          onClick={() => setActiveTab("buku")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'buku' ? 'bg-white text-navy-900 shadow-sm' : 'bg-navy-800 text-slate-400 hover:text-white'}`}
        >
          <BookOpen className="w-4 h-4" /> Database Buku
        </button>
        <button 
          onClick={() => setActiveTab("stok")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'stok' ? 'bg-white text-navy-900 shadow-sm' : 'bg-navy-800 text-slate-400 hover:text-white'}`}
        >
          <Package className="w-4 h-4" /> Stok Buku
        </button>
        <button 
          onClick={() => setActiveTab("penjualan")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'penjualan' ? 'bg-white text-navy-900 shadow-sm' : 'bg-navy-800 text-slate-400 hover:text-white'}`}
        >
          <Store className="w-4 h-4" /> Penjualan
        </button>
        <button 
          onClick={() => setActiveTab("royalti")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'royalti' ? 'bg-white text-navy-900 shadow-sm' : 'bg-navy-800 text-slate-400 hover:text-white'}`}
        >
          <TrendingUp className="w-4 h-4" /> Hitung Royalti
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Memuat data marketplace...</div>
      ) : (
        <>
          {activeTab === "buku" && (
            <div className="bg-navy-800 rounded-3xl p-6 border border-white/10">
              <div className="flex flex-wrap justify-between gap-3 mb-4">
                <button onClick={pullFromCco} className="inline-flex items-center gap-2 bg-navy-900 border border-white/10 hover:border-brand-orange text-slate-200 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                  <RefreshCcw size={16} /> Perbarui dari CCO
                </button>
                <button onClick={() => { setBookForm({ id: "", judul: "", penulis: "", isbn: "", sumber: "manual" }); setIsBookModalOpen(true); }} className="bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                  + Input Buku Manual
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-navy-900/50 text-[10px] uppercase tracking-widest text-slate-400">
                    <tr><th className="px-6 py-4">Judul</th><th className="px-6 py-4">Penulis</th><th className="px-6 py-4">ISBN</th><th className="px-6 py-4">Sumber</th><th className="px-6 py-4 text-right">Aksi</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {naskahList.map((book) => (
                      <tr key={book.id} className="hover:bg-white/5">
                        <td className="px-6 py-4 font-bold text-white">{book.judul}</td>
                        <td className="px-6 py-4">{book.penulis || "-"}</td>
                        <td className="px-6 py-4 font-mono text-xs">{book.isbn || "-"}</td>
                        <td className="px-6 py-4"><span className="rounded-full bg-brand-orange/15 px-3 py-1 text-[10px] font-black uppercase text-brand-orange">{book.sumber || "manual"}</span></td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => { setBookForm({ id: book.id, judul: book.judul || "", penulis: book.penulis || "", isbn: book.isbn || "", sumber: book.sumber || "manual" }); setIsBookModalOpen(true); }} className="text-brand-blue hover:text-white">Edit</button>
                          <button onClick={() => deleteBook(book.id)} className="text-red-500 hover:text-red-400">Hapus</button>
                        </td>
                      </tr>
                    ))}
                    {!naskahList.length && <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500">Belum ada database buku marketplace.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "stok" && (
            <div className="bg-navy-800 rounded-3xl p-6 border border-white/10">
              <div className="flex justify-end mb-4">
                <button 
                  onClick={() => {
                    setStokForm({ id: "", naskah_id: "", gudang: "Jogja", stok: 0 });
                    setIsStokModalOpen(true);
                  }}
                  className="bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                >
                  + Update Stok Baru
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-navy-900/50 text-[10px] uppercase tracking-widest text-slate-400">
                    <tr>
                      <th className="px-6 py-4 font-bold">Judul Buku</th>
                      <th className="px-6 py-4 font-bold">Gudang</th>
                      <th className="px-6 py-4 font-bold text-center">Stok Sisa</th>
                      <th className="px-6 py-4 font-bold">Last Update</th>
                      <th className="px-6 py-4 font-bold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {stokData.map(s => (
                      <tr key={s.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-bold text-white">{s.spk_naskah?.judul || bookById(s.naskah_id)?.judul || "-"}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${s.gudang === 'Jogja' ? 'bg-blue-500/20 text-blue-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                            {s.gudang}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-xl font-black ${s.stok < 10 ? 'text-red-500' : 'text-green-500'}`}>{s.stok}</span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">{new Date(s.last_update).toLocaleString('id-ID')}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => { setStokForm(s); setIsStokModalOpen(true); }} className="text-brand-blue hover:text-white transition">Edit</button>
                          <button onClick={() => deleteStok(s.id)} className="text-red-500 hover:text-red-400 transition">Hapus</button>
                        </td>
                      </tr>
                    ))}
                    {stokData.length === 0 && (
                      <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500">Belum ada data stok.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "penjualan" && (
            <div className="bg-navy-800 rounded-3xl p-6 border border-white/10">
              <div className="flex justify-between mb-4 items-center">
                <div className="flex gap-2">
                  <button onClick={downloadTemplate} className="bg-navy-900 border border-white/10 hover:bg-navy-700 text-slate-300 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                    Unduh Template CSV
                  </button>
                  <label className="bg-navy-900 border border-white/10 hover:bg-navy-700 text-slate-300 px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer">
                    Upload CSV
                    <input type="file" accept=".csv" onChange={uploadCsv} className="hidden" />
                  </label>
                </div>
                <button 
                  onClick={() => {
                    setPjForm({ id: "", naskah_id: "", marketplace: "Shopee", gudang: "Jogja", qty: 1, harga_jual: 0, tanggal: new Date().toISOString().split('T')[0] });
                    setIsPjModalOpen(true);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                >
                  + Catat Penjualan Manual
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-navy-900/50 text-[10px] uppercase tracking-widest text-slate-400">
                    <tr>
                      <th className="px-6 py-4 font-bold">Judul Buku</th>
                      <th className="px-6 py-4 font-bold">Platform / Gudang</th>
                      <th className="px-6 py-4 font-bold text-center">Qty</th>
                      <th className="px-6 py-4 font-bold text-right">Harga Jual</th>
                      <th className="px-6 py-4 font-bold text-right">Total</th>
                      <th className="px-6 py-4 font-bold">Tanggal</th>
                      <th className="px-6 py-4 font-bold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {penjualanData.map(p => (
                      <tr key={p.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-bold text-white">{p.spk_naskah?.judul || bookById(p.naskah_id)?.judul || "-"}</td>
                        <td className="px-6 py-4 text-xs">
                          <div className="text-brand-orange font-bold uppercase">{p.marketplace}</div>
                          <div className="text-slate-500 mt-0.5">{p.gudang}</div>
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-lg text-white">{p.qty}</td>
                        <td className="px-6 py-4 text-right font-mono">{formatRp(p.harga_jual)}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-green-500">{formatRp(p.qty * p.harga_jual)}</td>
                        <td className="px-6 py-4 text-xs text-slate-400">{p.tanggal}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => { setPjForm(p); setIsPjModalOpen(true); }} className="text-brand-blue hover:text-white transition">Edit</button>
                          <button onClick={() => deletePenjualan(p.id)} className="text-red-500 hover:text-red-400 transition">Hapus</button>
                        </td>
                      </tr>
                    ))}
                    {penjualanData.length === 0 && (
                      <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-500">Belum ada catatan penjualan.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "royalti" && (
            <div className="bg-navy-800 rounded-3xl p-6 border border-white/10">
              <div className="mb-6 p-4 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-xl text-sm flex items-center gap-3">
                <TrendingUp className="w-5 h-5 shrink-0" />
                <p>Simulasi kalkulasi royalti global berdasarkan seluruh penjualan yang tercatat di Marketplace. Secara default persentase Royalti ditetapkan 10%.</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-navy-900/50 text-[10px] uppercase tracking-widest text-slate-400">
                    <tr>
                      <th className="px-6 py-4 font-bold">Judul Buku & Penulis</th>
                      <th className="px-6 py-4 font-bold text-center">Total Qty Terjual</th>
                      <th className="px-6 py-4 font-bold text-right">Total Omzet</th>
                      <th className="px-6 py-4 font-bold text-right">Royalti 10%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(() => {
                      const aggregated = {};
                      penjualanData.forEach(p => {
                        const book = bookById(p.naskah_id);
                        const judul = p.spk_naskah?.judul || book?.judul || "Unknown";
                        const penulis = p.spk_naskah?.penulis || book?.penulis || "-";
                        const id = p.naskah_id;
                        if (!aggregated[id]) {
                          aggregated[id] = { judul, penulis, qty: 0, omzet: 0 };
                        }
                        aggregated[id].qty += p.qty;
                        aggregated[id].omzet += (p.qty * p.harga_jual);
                      });
                      
                      const items = Object.values(aggregated);
                      return items.map((r, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-white">{r.judul}</div>
                            <div className="text-xs text-slate-500 mt-1">{r.penulis}</div>
                          </td>
                          <td className="px-6 py-4 text-center font-mono text-lg text-white">{r.qty}</td>
                          <td className="px-6 py-4 text-right font-mono">{formatRp(r.omzet)}</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-brand-orange">{formatRp(r.omzet * 0.1)}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODALS */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-navy-900 border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">{bookForm.id ? "Edit Buku Marketplace" : "Input Buku Marketplace"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Judul Buku</label>
                <input value={bookForm.judul} onChange={e => setBookForm({...bookForm, judul: e.target.value})} className="w-full bg-navy-800 border border-white/10 rounded-xl px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Penulis</label>
                <input value={bookForm.penulis} onChange={e => setBookForm({...bookForm, penulis: e.target.value})} className="w-full bg-navy-800 border border-white/10 rounded-xl px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">ISBN</label>
                <input value={bookForm.isbn} onChange={e => setBookForm({...bookForm, isbn: e.target.value})} className="w-full bg-navy-800 border border-white/10 rounded-xl px-4 py-2 text-white" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setIsBookModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-xl">Batal</button>
              <button onClick={saveBook} className="flex-1 px-4 py-2 bg-brand-blue text-white rounded-xl font-bold">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {isStokModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-navy-900 border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">{stokForm.id ? "Edit Stok" : "Update Stok Baru"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Naskah (Buku)</label>
                <select value={stokForm.naskah_id} onChange={e => setStokForm({...stokForm, naskah_id: e.target.value})} className="w-full bg-navy-800 border border-white/10 rounded-xl px-4 py-2 text-white">
                  <option value="">-- Pilih Buku --</option>
                  {naskahList.map(n => <option key={n.id} value={n.id}>{n.judul}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Gudang</label>
                <select value={stokForm.gudang} onChange={e => setStokForm({...stokForm, gudang: e.target.value})} className="w-full bg-navy-800 border border-white/10 rounded-xl px-4 py-2 text-white">
                  <option value="Jogja">Jogja</option>
                  <option value="Makassar">Makassar</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Total Stok Tersedia</label>
                <input type="number" min="0" value={stokForm.stok} onChange={e => setStokForm({...stokForm, stok: parseInt(e.target.value) || 0})} className="w-full bg-navy-800 border border-white/10 rounded-xl px-4 py-2 text-white font-mono" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setIsStokModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-xl">Batal</button>
              <button onClick={saveStok} className="flex-1 px-4 py-2 bg-brand-blue text-white rounded-xl font-bold">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {isPjModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-navy-900 border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">{pjForm.id ? "Edit Penjualan" : "Catat Penjualan Baru"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Naskah (Buku Terjual)</label>
                <select value={pjForm.naskah_id} onChange={e => setPjForm({...pjForm, naskah_id: e.target.value})} className="w-full bg-navy-800 border border-white/10 rounded-xl px-4 py-2 text-white">
                  <option value="">-- Pilih Buku --</option>
                  {naskahList.map(n => <option key={n.id} value={n.id}>{n.judul}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">Marketplace</label>
                  <select value={pjForm.marketplace} onChange={e => setPjForm({...pjForm, marketplace: e.target.value})} className="w-full bg-navy-800 border border-white/10 rounded-xl px-4 py-2 text-white">
                    <option value="Shopee">Shopee</option>
                    <option value="Tokopedia">Tokopedia</option>
                    <option value="TikTok Shop">TikTok Shop</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">Gudang Asal</label>
                  <select value={pjForm.gudang} onChange={e => setPjForm({...pjForm, gudang: e.target.value})} className="w-full bg-navy-800 border border-white/10 rounded-xl px-4 py-2 text-white">
                    <option value="Jogja">Jogja</option>
                    <option value="Makassar">Makassar</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">Qty Terjual</label>
                  <input type="number" min="1" value={pjForm.qty} onChange={e => setPjForm({...pjForm, qty: parseInt(e.target.value) || 0})} className="w-full bg-navy-800 border border-white/10 rounded-xl px-4 py-2 text-white font-mono" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">Harga Jual / pcs</label>
                  <input type="number" min="0" value={pjForm.harga_jual} onChange={e => setPjForm({...pjForm, harga_jual: parseInt(e.target.value) || 0})} className="w-full bg-navy-800 border border-white/10 rounded-xl px-4 py-2 text-white font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Tanggal Terjual</label>
                <input type="date" value={pjForm.tanggal} onChange={e => setPjForm({...pjForm, tanggal: e.target.value})} className="w-full bg-navy-800 border border-white/10 rounded-xl px-4 py-2 text-white" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setIsPjModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-xl">Batal</button>
              <button onClick={savePenjualan} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold">Simpan Penjualan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
