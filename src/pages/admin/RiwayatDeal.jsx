import { useMemo, useState } from "react";
import { ReceiptText, Search, Filter } from "lucide-react";
import { activeItems, STAGE_LABELS } from "../../lib/workflow";
import { formatRupiah } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export default function RiwayatDeal() {
  const { user } = useAuth();
  const [items] = useState(() => activeItems());
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  const deals = useMemo(() => {
    return items.filter((item) => {
      const isOwnerOrCs = item.created_by === user?.id || user?.role === "cs";
      if (!isOwnerOrCs) return false;

      const matchesType = filterType === "all" || item.service_type === filterType;
      
      const query = searchTerm.toLowerCase().trim();
      if (!query) return matchesType;

      const customerName = (item.customer?.name || "").toLowerCase();
      const manuscriptTitle = (item.manuscript?.title || "").toLowerCase();
      const invoiceNumber = (item.financial?.invoice_number || "").toLowerCase();
      const trackingCode = (item.tracking_code || "").toLowerCase();

      return matchesType && (
        customerName.includes(query) ||
        manuscriptTitle.includes(query) ||
        invoiceNumber.includes(query) ||
        trackingCode.includes(query)
      );
    });
  }, [items, user, filterType, searchTerm]);

  const stats = useMemo(() => {
    const csDeals = deals.filter((item) => item.financial?.status_payment === "deal");
    return {
      totalDeal: csDeals.length,
      dealTerbit: csDeals.filter((item) => item.service_type === "terbit").length,
      dealCetak: csDeals.filter((item) => item.service_type === "cetak").length,
      dealLainnya: csDeals.filter((item) => item.service_type === "lainnya").length,
      totalOmzet: csDeals.reduce((sum, item) => sum + (Number(item.financial?.total_price) || 0), 0),
    };
  }, [deals]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <ReceiptText className="text-brand-orange" size={32} /> Riwayat Deal CS
          </h1>
          <p className="text-slate-400 mt-1">
            Daftar seluruh deal yang telah diklaim dan dicatat oleh CS (Terbit, Cetak, dan Layanan Lainnya).
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 min-w-[400px]">
          <StatCard label="Total Deal" value={stats.totalDeal} />
          <StatCard label="Deal Terbit" value={stats.dealTerbit} />
          <StatCard label="Deal Cetak" value={stats.dealCetak} />
          <StatCard label="Lainnya" value={stats.dealLainnya} />
          <StatCard label="Total Omzet" value={formatRupiah(stats.totalOmzet)} highlight />
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-navy-800 rounded-xl p-4 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari customer, judul, invoice..."
            className="w-full bg-navy-900 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-orange"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={16} className="text-slate-400" />
          <span className="text-xs text-slate-400 font-bold uppercase mr-1">Layanan:</span>
          {["all", "terbit", "cetak", "lainnya"].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition-colors ${
                filterType === type
                  ? "bg-brand-orange text-white"
                  : "bg-navy-900 text-slate-400 hover:text-white border border-white/10"
              }`}
            >
              {type === "all" ? "Semua" : type}
            </button>
          ))}
        </div>
      </div>

      {/* Riwayat Deal Table */}
      <div className="bg-navy-800 rounded-xl border border-white/10 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold">
            <ReceiptText size={18} className="text-brand-orange" />
            <span>Data Naskah &amp; Layanan Deal</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {deals.length} Transaksi Ditemukan
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-navy-900/80 text-[10px] uppercase tracking-widest text-slate-400 border-b border-white/10">
              <tr>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Naskah / Layanan</th>
                <th className="px-5 py-3">Invoice</th>
                <th className="px-5 py-3">Jenis</th>
                <th className="px-5 py-3">Omzet</th>
                <th className="px-5 py-3">Status / Posisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {deals.map((item) => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-white">{item.customer?.name || "-"}</div>
                    <div className="text-xs text-slate-500">
                      {item.customer?.city || "-"} &bull; {item.customer?.profession || "-"}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-bold text-white">{item.manuscript?.title || "-"}</div>
                    <div className="text-xs text-slate-500 font-mono">
                      {item.tracking_code || "-"} &bull; {item.customer?.phone || "-"}
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-slate-300">
                    {item.financial?.invoice_number || "-"}
                  </td>
                  <td className="px-5 py-4 uppercase text-xs font-black">
                    <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] ${
                      item.service_type === "terbit"
                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        : item.service_type === "cetak"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    }`}>
                      {item.service_type}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono font-bold text-white">
                    {formatRupiah(item.financial?.total_price)}
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase text-slate-300 border border-white/10">
                      {STAGE_LABELS[item.stage] || item.stage}
                    </span>
                  </td>
                </tr>
              ))}
              {!deals.length && (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-slate-500">
                    Belum ada riwayat deal yang sesuai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }) {
  return (
    <div className={`bg-navy-800 border border-white/10 rounded-xl p-3.5 ${highlight ? "bg-brand-orange/10 border-brand-orange/30" : ""}`}>
      <div className="text-[10px] text-slate-500 uppercase font-black tracking-wider">{label}</div>
      <div className={`font-black text-sm mt-0.5 truncate ${highlight ? "text-brand-orange font-mono" : "text-white"}`}>
        {value}
      </div>
    </div>
  );
}
