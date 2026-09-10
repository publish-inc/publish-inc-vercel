import { useState, useEffect, useMemo } from "react";
import { Coins, Plus, Trash2, ArrowUpCircle, ArrowDownCircle, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import { api, formatRupiah } from "../../lib/api";

const inputStyle =
  "w-full rounded-xl border border-white/10 bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white outline-none focus:border-brand-orange";

export default function PettyCash() {
  const [pettyCash, setPettyCash] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  const [form, setForm] = useState({
    type: "out",
    description: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/finance/petty-cash");
      setPettyCash(res.data || []);
    } catch {
      toast.error("Gagal memuat data Kas Kecil dari server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totals = useMemo(() => {
    const totalIn = pettyCash
      .filter((i) => i.type === "in")
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const totalOut = pettyCash
      .filter((i) => i.type === "out")
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    return {
      totalIn,
      totalOut,
      balance: totalIn - totalOut,
    };
  }, [pettyCash]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description || !form.amount) {
      return toast.error("Keterangan dan nominal wajib diisi!");
    }

    try {
      await api.post("/finance/petty-cash", {
        ...form,
        amount: Number(form.amount) || 0,
      });
      toast.success("Catatan Kas Kecil berhasil ditambahkan!");
      setForm({
        type: "out",
        description: "",
        amount: "",
        date: new Date().toISOString().slice(0, 10),
      });
      loadData();
    } catch {
      toast.error("Gagal menyimpan transaksi Kas Kecil.");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus catatan kas kecil ini?")) return;
    try {
      await api.delete(`/finance/petty-cash/${id}`);
      toast.success("Transaksi Kas Kecil dihapus!");
      loadData();
    } catch {
      toast.error("Gagal menghapus transaksi.");
    }
  };

  const filteredItems = pettyCash.filter((item) => {
    const matchesSearch = item.description
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || item.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header Title */}
      <div>
        <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
          <Coins className="text-brand-orange" size={32} /> Petty Cash (Kas Kecil)
        </h1>
        <p className="mt-1 text-slate-400">
          Pencatatan khusus dana kas kecil harian operasional kantor &amp; penerimaan tunai ringan.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-navy-800 border border-white/10 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
            <ArrowUpCircle className="text-emerald-400" size={18} /> Total Pemasukan Kas Kecil
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2">
            {formatRupiah(totals.totalIn)}
          </div>
        </div>

        <div className="bg-navy-800 border border-white/10 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
            <ArrowDownCircle className="text-rose-400" size={18} /> Total Pengeluaran Kas Kecil
          </div>
          <div className="text-2xl font-black text-rose-400 mt-2">
            {formatRupiah(totals.totalOut)}
          </div>
        </div>

        <div className="bg-navy-800 border border-brand-orange/30 bg-brand-orange/10 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-brand-orange">
            <Coins size={18} /> Saldo Bersih Kas Kecil
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">
            {formatRupiah(totals.balance)}
          </div>
        </div>
      </div>

      {/* Form & Table Layout */}
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Form Input Petty Cash */}
        <form onSubmit={handleSubmit} className="bg-navy-800 border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl h-fit">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Plus size={18} className="text-brand-orange" /> Input Kas Kecil
          </h2>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Jenis Transaksi *</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className={inputStyle}
            >
              <option value="out">🔴 Pengeluaran (Out)</option>
              <option value="in">🟢 Pemasukan (In)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Tanggal *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputStyle}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Keterangan *</label>
            <input
              type="text"
              required
              placeholder="Contoh: Beli ATK, Snack Rapat, Bensin"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputStyle}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Nominal (Rp) *</label>
            <input
              type="number"
              required
              min="0"
              placeholder="Contoh: 150000"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className={inputStyle}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-bold py-3 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Plus size={16} /> Simpan Catatan Petty Cash
          </button>
        </form>

        {/* Table Petty Cash History */}
        <div className="bg-navy-800 border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-white">Riwayat Kas Kecil</h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari keterangan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-navy-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-brand-orange"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-orange"
              >
                <option value="all">Semua</option>
                <option value="in">Pemasukan</option>
                <option value="out">Pengeluaran</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-navy-900 text-xs uppercase tracking-wider text-slate-400 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Keterangan</th>
                  <th className="px-4 py-3">Jenis</th>
                  <th className="px-4 py-3">Nominal</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredItems.map((row) => (
                  <tr key={row.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3.5 text-xs font-mono text-slate-400">
                      {new Date(row.date || Date.now()).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-white">{row.description}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          row.type === "in"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {row.type === "in" ? "Pemasukan" : "Pengeluaran"}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3.5 font-bold font-mono ${
                        row.type === "in" ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {row.type === "in" ? "+" : "-"}{formatRupiah(row.amount)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="text-rose-400 hover:text-rose-300 transition-colors p-1"
                        title="Hapus"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      Belum ada data kas kecil.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
