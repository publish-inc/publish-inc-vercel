import { useState, useEffect, useMemo } from "react";
import { TrendingUp, Calendar, ArrowUpCircle, ArrowDownCircle, PieChart, DollarSign, Filter } from "lucide-react";
import { api, formatRupiah } from "../../lib/api";
import { getPayrollReleases } from "../../lib/payroll";

export default function Laba() {
  const [invoices, setInvoices] = useState([]);
  const [pettyCash, setPettyCash] = useState([]);
  const [cashOut, setCashOut] = useState([]);
  const [payrollReleases, setPayrollReleases] = useState([]);

  // Month & Year Filter
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().toISOString().slice(0, 7); // e.g. '2026-09'

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(String(currentYear));

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
      console.error("Failed to load finance laba rugi data", e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered dataset according to selected Month & Year
  const filteredData = useMemo(() => {
    const isAllMonths = selectedMonth === "all";

    // 1. Invoices (Cash In)
    const paidInvoices = invoices.filter((item) => {
      if (!["paid", "lunas", "dp"].includes(item.status)) return false;
      const dateStr = item.date || item.created_at || new Date().toISOString();
      if (selectedYear && !dateStr.startsWith(selectedYear)) return false;
      if (!isAllMonths && !dateStr.startsWith(selectedMonth)) return false;
      return true;
    });

    const cashInTotal = paidInvoices.reduce(
      (sum, item) => sum + (Number(item.paid_amount) || Number(item.grand_total) || 0),
      0
    );

    // 2. Petty Cash In & Out
    const filteredPetty = pettyCash.filter((item) => {
      const dateStr = item.date || new Date().toISOString();
      if (selectedYear && !dateStr.startsWith(selectedYear)) return false;
      if (!isAllMonths && !dateStr.startsWith(selectedMonth)) return false;
      return true;
    });

    const pettyInTotal = filteredPetty
      .filter((i) => i.type === "in")
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    const pettyOutTotal = filteredPetty
      .filter((i) => i.type === "out")
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    // 3. Cash Out Operasional & Vendor
    const filteredCashOut = cashOut.filter((item) => {
      const dateStr = item.date || new Date().toISOString();
      if (selectedYear && !dateStr.startsWith(selectedYear)) return false;
      if (!isAllMonths && !dateStr.startsWith(selectedMonth)) return false;
      return true;
    });

    const cashOutTotal = filteredCashOut.reduce(
      (sum, i) => sum + (Number(i.amount) || 0),
      0
    );

    // 4. Payroll Releases
    const filteredPayroll = payrollReleases.filter((item) => {
      if (item.status !== "paid") return false;
      if (selectedYear && !item.period.startsWith(selectedYear)) return false;
      if (!isAllMonths && item.period !== selectedMonth) return false;
      return true;
    });

    const payrollTotal = filteredPayroll.reduce(
      (sum, i) => sum + (Number(i.total_amount) || 0),
      0
    );

    const totalRevenue = cashInTotal + pettyInTotal;
    const totalExpense = pettyOutTotal + cashOutTotal + payrollTotal;
    const netProfit = totalRevenue - totalExpense;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

    return {
      cashInTotal,
      pettyInTotal,
      pettyOutTotal,
      cashOutTotal,
      payrollTotal,
      totalRevenue,
      totalExpense,
      netProfit,
      profitMargin,
      paidInvoices,
      filteredCashOut,
      filteredPayroll,
    };
  }, [invoices, pettyCash, cashOut, payrollReleases, selectedMonth, selectedYear]);

  // Generate Month Options (Last 12 months)
  const monthOptions = [
    { value: "all", label: "Semua Bulan" },
    { value: "2026-09", label: "September 2026" },
    { value: "2026-08", label: "Agustus 2026" },
    { value: "2026-07", label: "Juli 2026" },
    { value: "2026-06", label: "Juni 2026" },
    { value: "2026-05", label: "Mei 2026" },
    { value: "2026-04", label: "April 2026" },
    { value: "2026-03", label: "Maret 2026" },
    { value: "2026-02", label: "Februari 2026" },
    { value: "2026-01", label: "Januari 2026" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <TrendingUp className="text-brand-orange" size={32} /> Laba Rugi Perusahaan
          </h1>
          <p className="mt-1 text-slate-400">
            Laporan kalkulasi laba bersih, pemasukan kotor, dan pengeluaran dengan filter periode bulanan.
          </p>
        </div>

        {/* Month Filter Picker */}
        <div className="flex items-center gap-3 bg-navy-800 border border-white/10 p-3 rounded-2xl shadow-lg">
          <Filter size={18} className="text-brand-orange ml-1" />
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase text-slate-400">Periode Bulan:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-navy-950 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white outline-none focus:border-brand-orange"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-navy-800 border border-white/10 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400">
            <span>Total Pemasukan (Gross)</span>
            <ArrowUpCircle className="text-emerald-400" size={20} />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2">
            {formatRupiah(filteredData.totalRevenue)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Invoice CS &amp; Pemasukan Kas</div>
        </div>

        <div className="bg-navy-800 border border-white/10 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400">
            <span>Total Pengeluaran</span>
            <ArrowDownCircle className="text-rose-400" size={20} />
          </div>
          <div className="text-2xl font-black text-rose-400 mt-2">
            {formatRupiah(filteredData.totalExpense)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Gaji, Vendor &amp; Operasional</div>
        </div>

        <div className="bg-navy-800 border border-brand-orange/40 bg-brand-orange/10 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-brand-orange">
            <span>Laba Bersih (Net Profit)</span>
            <TrendingUp size={20} />
          </div>
          <div
            className={`text-2xl font-black mt-2 font-mono ${
              filteredData.netProfit >= 0 ? "text-brand-orange" : "text-rose-400"
            }`}
          >
            {formatRupiah(filteredData.netProfit)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Hasil bersih periode ini</div>
        </div>

        <div className="bg-navy-800 border border-white/10 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400">
            <span>Margin Keuntungan</span>
            <PieChart className="text-brand-blue" size={20} />
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">
            {filteredData.profitMargin}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Rasio Laba Bersih vs Pemasukan</div>
        </div>
      </div>

      {/* Financial Statement Breakdown */}
      <div className="bg-navy-800 border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="border-b border-white/10 pb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign className="text-brand-orange" size={24} /> Laporan Rincian Laba &amp; Rugi (Income Statement)
          </h2>
          <span className="text-xs font-mono bg-navy-900 border border-white/10 px-3 py-1 rounded-lg text-slate-300">
            Periode: {selectedMonth === "all" ? "Semua Bulan" : selectedMonth}
          </span>
        </div>

        <div className="space-y-4 max-w-3xl mx-auto">
          {/* SECTION 1: PEMASUKAN */}
          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
              1. PEMASUKAN KOTOR (REVENUE)
            </div>
            <div className="pl-4 space-y-2">
              <div className="flex justify-between items-center bg-navy-900/60 p-3 rounded-xl border border-white/5 text-sm">
                <span className="text-slate-300">Penjualan Invoice CS &amp; Customer</span>
                <span className="font-bold text-emerald-400 font-mono">+{formatRupiah(filteredData.cashInTotal)}</span>
              </div>
              <div className="flex justify-between items-center bg-navy-900/60 p-3 rounded-xl border border-white/5 text-sm">
                <span className="text-slate-300">Pemasukan Kas Kecil (Petty Cash In)</span>
                <span className="font-bold text-emerald-400 font-mono">+{formatRupiah(filteredData.pettyInTotal)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center bg-navy-900 p-4 rounded-xl border border-emerald-500/30 text-sm font-bold">
              <span className="text-white">TOTAL PEMASUKAN</span>
              <span className="text-emerald-400 font-mono text-base font-black">+{formatRupiah(filteredData.totalRevenue)}</span>
            </div>
          </div>

          {/* SECTION 2: PENGELUARAN */}
          <div className="space-y-2 pt-4">
            <div className="text-xs font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 px-4 py-2 rounded-xl border border-rose-500/20">
              2. PENGELUARAN BEBAN OPERASIONAL &amp; GAJI (EXPENSES)
            </div>
            <div className="pl-4 space-y-2">
              <div className="flex justify-between items-center bg-navy-900/60 p-3 rounded-xl border border-white/5 text-sm">
                <span className="text-slate-300">Penggajian Karyawan (Payroll HRD)</span>
                <span className="font-bold text-rose-400 font-mono">-{formatRupiah(filteredData.payrollTotal)}</span>
              </div>
              <div className="flex justify-between items-center bg-navy-900/60 p-3 rounded-xl border border-white/5 text-sm">
                <span className="text-slate-300">Pengeluaran Operasional &amp; Royalti (Cash Out)</span>
                <span className="font-bold text-rose-400 font-mono">-{formatRupiah(filteredData.cashOutTotal)}</span>
              </div>
              <div className="flex justify-between items-center bg-navy-900/60 p-3 rounded-xl border border-white/5 text-sm">
                <span className="text-slate-300">Pengeluaran Kas Kecil (Petty Cash Out)</span>
                <span className="font-bold text-rose-400 font-mono">-{formatRupiah(filteredData.pettyOutTotal)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center bg-navy-900 p-4 rounded-xl border border-rose-500/30 text-sm font-bold">
              <span className="text-white">TOTAL PENGELUARAN</span>
              <span className="text-rose-400 font-mono text-base font-black">-{formatRupiah(filteredData.totalExpense)}</span>
            </div>
          </div>

          {/* SECTION 3: HASIL NET PROFIT */}
          <div className="pt-6">
            <div className="bg-gradient-to-r from-navy-900 via-brand-orange/20 to-navy-900 border-2 border-brand-orange p-6 rounded-2xl flex items-center justify-between shadow-2xl">
              <div>
                <div className="text-xs font-black uppercase text-brand-orange tracking-widest">HASIL AKHIR LABA BERSIH (NET PROFIT)</div>
                <div className="text-sm text-slate-300 mt-1">Pemasukan Kotor dikurangi Seluruh Beban Pengeluaran</div>
              </div>
              <div className="text-3xl font-black text-white font-mono">
                {formatRupiah(filteredData.netProfit)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
