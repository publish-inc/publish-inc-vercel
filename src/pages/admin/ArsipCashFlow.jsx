import { useState, useEffect, useMemo } from "react";
import { FolderOpen, Search, Download, Eye, X, ArrowUpCircle, ArrowDownCircle, Briefcase, Calendar } from "lucide-react";
import { formatRupiah, api } from "../../lib/api";
import { getPayrollReleases } from "../../lib/payroll";

const monthLabel = (key) => {
  try {
    return new Date(`${key}-01T00:00:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  } catch {
    return key;
  }
};

export default function ArsipCashFlow() {
  const [invoices, setInvoices] = useState([]);
  const [pettyCash, setPettyCash] = useState([]);
  const [cashOut, setCashOut] = useState([]);
  const [payrollReleases, setPayrollReleases] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedArchive, setSelectedArchive] = useState(null);

  const loadData = async () => {
    try {
      const [cashInRes, pettyRes, cashOutRes] = await Promise.all([
        api.get("/finance/cash-in"),
        api.get("/finance/petty-cash"),
        api.get("/finance/cash-out"),
      ]);
      setInvoices(cashInRes.data || []);
      setPettyCash(pettyRes.data || []);
      setCashOut(cashOutRes.data || []);
      setPayrollReleases(getPayrollReleases());
    } catch (e) {
      console.error("Failed to load cash flow data", e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Group cash flow by YYYY-MM
  const archives = useMemo(() => {
    const periodMap = new Map();

    const getPeriodKey = (dateStr) => {
      if (!dateStr) return new Date().toISOString().slice(0, 7);
      return String(dateStr).slice(0, 7);
    };

    const ensurePeriod = (periodKey) => {
      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, {
          period: periodKey,
          month_name: monthLabel(periodKey),
          cash_in: 0,
          petty_in: 0,
          petty_out: 0,
          cash_out: 0,
          payroll_out: 0,
          transactions: [],
        });
      }
      return periodMap.get(periodKey);
    };

    // 1. Paid Invoices
    invoices.forEach((inv) => {
      if (["paid", "lunas", "dp"].includes(inv.status)) {
        const periodKey = getPeriodKey(inv.date || inv.created_at);
        const item = ensurePeriod(periodKey);
        const amt = Number(inv.paid_amount) || Number(inv.grand_total) || 0;
        item.cash_in += amt;
        item.transactions.push({
          type: "Cash In (Invoice)",
          date: inv.date || inv.created_at || periodKey,
          description: `Invoice ${inv.number} - ${inv.customer?.name || "Customer"}`,
          amount: amt,
          flow: "in",
        });
      }
    });

    // 2. Petty Cash
    pettyCash.forEach((pc) => {
      const periodKey = getPeriodKey(pc.date);
      const item = ensurePeriod(periodKey);
      const amt = Number(pc.amount) || 0;
      if (pc.type === "in") {
        item.petty_in += amt;
        item.transactions.push({
          type: "Petty Cash (In)",
          date: pc.date || periodKey,
          description: pc.description || "Pemasukan Kas Kecil",
          amount: amt,
          flow: "in",
        });
      } else {
        item.petty_out += amt;
        item.transactions.push({
          type: "Petty Cash (Out)",
          date: pc.date || periodKey,
          description: pc.description || "Pengeluaran Kas Kecil",
          amount: amt,
          flow: "out",
        });
      }
    });

    // 3. Manual Cash Out
    cashOut.forEach((co) => {
      const periodKey = getPeriodKey(co.date);
      const item = ensurePeriod(periodKey);
      const amt = Number(co.amount) || 0;
      item.cash_out += amt;
      item.transactions.push({
        type: `Cash Out (${co.category || "operasional"})`,
        date: co.date || periodKey,
        description: co.description || "Pengeluaran Operasional",
        amount: amt,
        flow: "out",
      });
    });

    // 4. Payroll Releases
    payrollReleases.forEach((pr) => {
      if (pr.status === "paid") {
        const periodKey = pr.period || getPeriodKey(pr.paid_at);
        const item = ensurePeriod(periodKey);
        const amt = Number(pr.total_amount) || 0;
        item.payroll_out += amt;
        item.transactions.push({
          type: "Payroll HRD (Gaji)",
          date: pr.paid_at || pr.submitted_at || periodKey,
          description: `Pencairan Gaji Karyawan (${pr.employee_count || 0} Orang)`,
          amount: amt,
          flow: "out",
        });
      }
    });

    // Ensure current period is always present
    const currentPeriod = new Date().toISOString().slice(0, 7);
    ensurePeriod(currentPeriod);

    return Array.from(periodMap.values())
      .map((item) => {
        const totalRevenue = item.cash_in + item.petty_in;
        const totalExpense = item.petty_out + item.cash_out + item.payroll_out;
        const netProfit = totalRevenue - totalExpense;
        return {
          ...item,
          totalRevenue,
          totalExpense,
          netProfit,
        };
      })
      .sort((a, b) => b.period.localeCompare(a.period));
  }, [invoices, pettyCash, cashOut, payrollReleases]);

  const filtered = archives.filter(
    (item) => item.month_name.toLowerCase().includes(search.toLowerCase()) || item.period.includes(search)
  );

  const downloadCsv = (archive) => {
    const header = "Periode,Tanggal,Kategori,Keterangan,Alur,Nominal Rupiah\n";
    const rows = archive.transactions
      .map((t) =>
        [
          archive.period,
          t.date ? new Date(t.date).toLocaleDateString("id-ID") : archive.period,
          t.type,
          t.description,
          t.flow === "in" ? "Pemasukan (+)" : "Pengeluaran (-)",
          t.amount,
        ]
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arsip-cashflow-${archive.period}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
          <FolderOpen className="text-brand-orange" size={32} /> Arsip Cash Flow Bulanan
        </h1>
        <p className="mt-1 text-slate-400">
          Riwayat lengkap arus kas perusahaan (Pemasukan Invoice, Kas Kecil, Cash Out, &amp; Payroll Gaji) per bulan.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-navy-800 p-5 space-y-6 shadow-xl">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-4 top-3.5 text-slate-400" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari bulan atau tahun..."
            className="h-11 w-full rounded-xl border border-white/10 bg-navy-950 pl-11 pr-4 font-semibold text-white outline-none focus:border-brand-orange"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((archive) => (
            <div
              key={archive.period}
              className="rounded-2xl border border-white/10 bg-navy-900 p-5 flex flex-col justify-between hover:border-brand-orange/50 transition-all shadow-lg"
            >
              <div>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-orange/20 text-brand-orange">
                      <FolderOpen size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white leading-tight">{archive.month_name}</h3>
                      <p className="text-xs font-semibold text-slate-400 mt-0.5">
                        {archive.transactions.length} Transaksi Terpencatat
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                      archive.netProfit >= 0
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {archive.netProfit >= 0 ? "Surplus" : "Defisit"}
                  </span>
                </div>

                <div className="space-y-2 rounded-xl border border-white/5 bg-navy-950 p-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Cash In (Pemasukan):</span>
                    <span className="font-mono text-emerald-400 font-bold">+{formatRupiah(archive.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Cash Out (Pengeluaran):</span>
                    <span className="font-mono text-rose-400 font-bold">-{formatRupiah(archive.totalExpense)}</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex justify-between items-center text-sm font-bold">
                    <span className="text-slate-200">Net Cash Flow:</span>
                    <span
                      className={`text-base font-black ${
                        archive.netProfit >= 0 ? "text-brand-orange" : "text-rose-400"
                      }`}
                    >
                      {formatRupiah(archive.netProfit)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setSelectedArchive(archive)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-navy-800 py-2.5 text-xs font-bold text-white hover:border-brand-orange"
                >
                  <Eye size={15} /> Lihat Rincian
                </button>
                <button
                  onClick={() => downloadCsv(archive)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-orange px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-orange-dark shadow-md"
                >
                  <Download size={15} /> CSV
                </button>
              </div>
            </div>
          ))}

          {!filtered.length && (
            <div className="col-span-full rounded-2xl border border-dashed border-white/10 bg-navy-900/40 py-16 text-center text-slate-500">
              Arsip cash flow belum tersedia.
            </div>
          )}
        </div>
      </div>

      {/* Archive Details Modal with Sticky Headers */}
      {selectedArchive && (
        <CashFlowDetailsModal
          archive={selectedArchive}
          onClose={() => setSelectedArchive(null)}
          onDownload={() => downloadCsv(selectedArchive)}
        />
      )}
    </div>
  );
}

function CashFlowDetailsModal({ archive, onClose, onDownload }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-2xl border border-white/10 bg-navy-900 p-6 space-y-4 my-8 max-h-[90vh] flex flex-col shadow-2xl">
        {/* Sticky Header Top */}
        <div className="flex justify-between items-center border-b border-white/10 pb-4 shrink-0 bg-navy-900 sticky top-0 z-20">
          <div>
            <h2 className="text-xl font-black text-white">Rincian Cash Flow - Periode {archive.month_name}</h2>
            <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
              <span>Pemasukan: <strong className="text-emerald-400">+{formatRupiah(archive.totalRevenue)}</strong></span>
              <span>•</span>
              <span>Pengeluaran: <strong className="text-rose-400">-{formatRupiah(archive.totalExpense)}</strong></span>
              <span>•</span>
              <span>Net Profit: <strong className="text-brand-orange">{formatRupiah(archive.netProfit)}</strong></span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onDownload}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-brand-orange-dark"
            >
              <Download size={15} /> Export CSV
            </button>
            <button onClick={onClose} className="rounded-xl bg-navy-800 p-2 text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Container with Sticky Table Header */}
        <div className="overflow-y-auto overflow-x-auto flex-1 max-h-[60vh] border border-white/10 rounded-xl shadow-inner">
          <table className="w-full text-left text-sm relative border-collapse">
            <thead className="bg-navy-950 text-xs uppercase tracking-wider text-slate-300 sticky top-0 z-10 border-b border-white/10 shadow-md">
              <tr>
                <th className="px-4 py-3.5 bg-navy-950">Tanggal</th>
                <th className="px-4 py-3.5 bg-navy-950">Kategori Transaksi</th>
                <th className="px-4 py-3.5 bg-navy-950">Keterangan</th>
                <th className="px-4 py-3.5 bg-navy-950 text-center">Alur Cash</th>
                <th className="px-4 py-3.5 bg-navy-950 text-right">Nominal (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300 bg-navy-900">
              {archive.transactions.map((t, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3.5 text-xs font-mono text-slate-400">
                    {t.date ? new Date(t.date).toLocaleDateString("id-ID") : archive.period}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-white text-xs">{t.type}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-200">{t.description}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        t.flow === "in"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {t.flow === "in" ? "Pemasukan (+)" : "Pengeluaran (-)"}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3.5 text-right font-mono font-bold text-base ${
                      t.flow === "in" ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {t.flow === "in" ? "+" : "-"}{formatRupiah(t.amount)}
                  </td>
                </tr>
              ))}
              {archive.transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Belum ada transaksi di bulan ini.
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
