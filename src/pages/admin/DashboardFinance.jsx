import { useEffect, useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Briefcase, Plus, Trash2, CheckCircle2, DollarSign, TrendingUp, ReceiptText, Coins, Printer, FileText, Upload, Link2 } from "lucide-react";
import { toast } from "sonner";
import { api, formatRupiah } from "../../lib/api";
import { getPayrollReleases } from "../../lib/payroll";
import FinanceReportPdfModal from "../../components/FinanceReportPdfModal";

const input = "w-full rounded-xl border border-white/10 bg-navy-950 px-4 py-3 text-sm font-semibold text-white outline-none focus:border-brand-orange";

export default function DashboardFinance() {
  const [invoices, setInvoices] = useState([]);
  const [pettyCash, setPettyCash] = useState([]);
  const [cashOut, setCashOut] = useState([]);
  const [payrollReleases, setPayrollReleases] = useState([]);
  const [coForm, setCoForm] = useState({ description: "", amount: "", category: "royalty", proof_url: "", drive_url: "" });
  const [uploadingProof, setUploadingProof] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

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
    } catch {
      toast.error("Gagal memuat data dashboard finance.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totals = useMemo(() => {
    const cashIn = invoices
      .filter((item) => ["paid", "lunas", "dp"].includes(item.status))
      .reduce((sum, item) => sum + (Number(item.paid_amount) || Number(item.grand_total) || 0), 0);

    const pcIn = pettyCash.filter((item) => item.type === "in").reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const pcOut = pettyCash.filter((item) => item.type === "out").reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const outManual = cashOut.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const payrollPaid = payrollReleases
      .filter((r) => r.status === "paid")
      .reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);

    const totalRevenue = cashIn + pcIn;
    const totalOut = pcOut + outManual + payrollPaid;
    const net = totalRevenue - totalOut;

    return { cashIn, pcIn, pcOut, outManual, payrollPaid, totalRevenue, totalOut, net };
  }, [cashOut, invoices, pettyCash, payrollReleases]);

  const validateInvoice = async (invoice) => {
    try {
      await api.put(`/finance/invoices/${invoice.id}/pay`, { amount: invoice.grand_total, status: "paid" });
      toast.success("Pembayaran invoice divalidasi lunas.");
      loadData();
    } catch {
      toast.error("Gagal memvalidasi invoice.");
    }
  };

  const submitCashOut = async (event) => {
    event.preventDefault();
    if (!coForm.description || !coForm.amount) return toast.error("Isi keterangan dan nominal!");
    try {
      await api.post("/finance/cash-out", { ...coForm, amount: Number(coForm.amount) || 0 });
      setCoForm({ description: "", amount: "", category: "royalty", proof_url: "", drive_url: "" });
      toast.success("Catatan Cash Out disimpan.");
      loadData();
    } catch {
      toast.error("Gagal menyimpan Cash Out.");
    }
  };

  const uploadCashOutProof = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingProof(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", "finance_cash_out");
    try {
      const { data } = await api.post("/upload", fd);
      setCoForm((current) => ({ ...current, proof_url: data.url, drive_url: data.drive_url || "" }));
      toast.success("Bukti Cash Out berhasil diupload.");
    } catch {
      toast.error("Gagal upload bukti Cash Out.");
    } finally {
      setUploadingProof(false);
    }
  };

  // Mock trend monthly dataset for visual chart
  const trendData = [
    { month: "Mei", inVal: 45000000, outVal: 32000000 },
    { month: "Jun", inVal: 62000000, outVal: 41000000 },
    { month: "Jul", inVal: 58000000, outVal: 39000000 },
    { month: "Agu", inVal: 75000000, outVal: 48000000 },
    { month: "Sep", inVal: totals.totalRevenue || 82000000, outVal: totals.totalOut || 51000000 },
  ];

  const maxVal = Math.max(...trendData.map((d) => Math.max(d.inVal, d.outVal))) || 100000000;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <Briefcase className="text-brand-orange" size={32} /> Dashboard Finance
          </h1>
          <p className="mt-1 text-slate-400">
            Ringkasan arus kas utama: Cash In, Cash Out, Net Profit, dan grafik tren pengeluaran vs pemasukan.
          </p>
        </div>
        <button
          onClick={() => setShowReportModal(true)}
          className="inline-flex items-center gap-2.5 bg-brand-orange hover:bg-brand-orange-dark text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg text-xs"
        >
          <Printer size={16} /> Unduh PDF Laporan Keuangan Bulanan
        </button>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Summary icon={ArrowUpCircle} label="Total Cash In" value={formatRupiah(totals.totalRevenue)} tone="text-emerald-400" />
        <Summary icon={ArrowDownCircle} label="Total Cash Out" value={formatRupiah(totals.totalOut)} tone="text-rose-400" />
        <Summary icon={Briefcase} label="Net Profit (Laba Bersih)" value={formatRupiah(totals.net)} tone={totals.net >= 0 ? "text-brand-orange" : "text-rose-400"} />
        <Summary icon={DollarSign} label="Total Gaji Dicairkan" value={formatRupiah(totals.payrollPaid)} tone="text-brand-blue" />
      </div>

      {/* Visual Chart: Tren Pemasukan & Pengeluaran */}
      <div className="bg-navy-800 border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="text-brand-orange" size={20} /> Grafik Tren Pemasukan &amp; Pengeluaran (Cash Flow)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Perbandingan Pemasukan (Cash In) dan Pengeluaran (Cash Out) per bulan.</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Cash In
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" /> Cash Out
            </span>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="pt-6 pb-2 px-4 bg-navy-900 border border-white/5 rounded-xl">
          <div className="h-48 flex items-end justify-around gap-4 border-b border-white/10 pb-2">
            {trendData.map((d, idx) => {
              const inHeightPct = Math.round((d.inVal / maxVal) * 100);
              const outHeightPct = Math.round((d.outVal / maxVal) * 100);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                  {/* Hover Tooltip */}
                  <div className="absolute -top-10 bg-navy-950 border border-white/20 px-3 py-1 rounded-lg text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 font-mono shadow-xl whitespace-nowrap">
                    In: {formatRupiah(d.inVal)} | Out: {formatRupiah(d.outVal)}
                  </div>

                  <div className="w-full flex justify-center items-end gap-1.5 h-full">
                    {/* In Bar */}
                    <div
                      style={{ height: `${Math.max(inHeightPct, 8)}%` }}
                      className="w-1/2 max-w-[28px] bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all hover:brightness-125"
                    />
                    {/* Out Bar */}
                    <div
                      style={{ height: `${Math.max(outHeightPct, 8)}%` }}
                      className="w-1/2 max-w-[28px] bg-gradient-to-t from-rose-600 to-rose-400 rounded-t-lg transition-all hover:brightness-125"
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-400 font-mono">{d.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Action Grids: Cash In Validation & Cash Out Input */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Panel 1: Validasi Pembayaran Invoice (Cash In) */}
        <div className="bg-navy-800 border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ArrowUpCircle className="text-emerald-400" size={20} /> Validasi Pembayaran Invoice (Cash In)
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-navy-900 uppercase tracking-wider text-slate-400 border-b border-white/10">
                <tr>
                  <th className="px-3 py-3">No Invoice</th>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3">Tagihan</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {invoices.slice(0, 5).map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/5">
                    <td className="px-3 py-3 font-mono font-bold text-white">{inv.number}</td>
                    <td className="px-3 py-3">{inv.customer?.name || "-"}</td>
                    <td className="px-3 py-3 font-bold text-brand-orange">{formatRupiah(inv.grand_total)}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-300">
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {!["paid", "lunas"].includes(inv.status) ? (
                        <button
                          onClick={() => validateInvoice(inv)}
                          className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500 hover:text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors"
                        >
                          Validasi
                        </button>
                      ) : (
                        <span className="text-emerald-400 font-bold text-[10px]">✓ Paid</span>
                      )}
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">Belum ada invoice.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel 2: Input Cash Out Operasional */}
        <div className="bg-navy-800 border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ArrowDownCircle className="text-rose-400" size={20} /> Input Cash Out (Pengeluaran Operasional)
          </h2>

          <form onSubmit={submitCashOut} className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Kategori Pengeluaran</label>
              <select
                value={coForm.category}
                onChange={(e) => setCoForm({ ...coForm, category: e.target.value })}
                className={input}
              >
                <option value="royalty">Royalti Penulis</option>
                <option value="vendor">Vendor Percetakan</option>
                <option value="other">Operasional Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Keterangan</label>
              <input
                type="text"
                required
                placeholder="Deskripsi pengeluaran..."
                value={coForm.description}
                onChange={(e) => setCoForm({ ...coForm, description: e.target.value })}
                className={input}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Nominal (Rp)</label>
              <input
                type="number"
                required
                placeholder="Nominal..."
                value={coForm.amount}
                onChange={(e) => setCoForm({ ...coForm, amount: e.target.value })}
                className={input}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Bukti Pengeluaran</label>
              <div className="flex items-center gap-3">
                {coForm.proof_url && <a href={coForm.drive_url || coForm.proof_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-brand-blue hover:underline"><Link2 size={13} /> File siap</a>}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-navy-950 px-4 py-2.5 text-xs font-bold text-white hover:border-brand-orange">
                  <Upload size={15} /> {uploadingProof ? "Mengupload..." : "Upload Bukti"}
                  <input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={uploadCashOutProof} className="hidden" />
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-bold py-2.5 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 text-xs"
            >
              <Plus size={16} /> Catat Cash Out
            </button>
          </form>
        </div>
      </div>

      {showReportModal && (
        <FinanceReportPdfModal
          totals={totals}
          invoices={invoices}
          cashOut={cashOut}
          pettyCash={pettyCash}
          payrollReleases={payrollReleases}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}

function Summary({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-navy-800 p-5 shadow-xl">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
        <Icon size={16} className={tone} /> {label}
      </div>
      <div className={`truncate text-2xl font-black ${tone}`}>{value}</div>
    </div>
  );
}
