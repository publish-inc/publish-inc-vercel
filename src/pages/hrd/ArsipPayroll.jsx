import { useMemo, useState } from "react";
import { Calendar, Download, FolderOpen, Search, CheckCircle2, Send, Eye, X, Printer, Users } from "lucide-react";
import { formatRupiah } from "../../lib/api";
import { ROLE_LABELS } from "../../lib/workflow";
import { getPayrollReleases, calculatePayrollSummary } from "../../lib/payroll";

const monthLabel = (key) => {
  try {
    return new Date(`${key}-01T00:00:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  } catch {
    return key;
  }
};

export default function ArsipPayroll() {
  const [search, setSearch] = useState("");
  const [selectedArchive, setSelectedArchive] = useState(null);

  const archives = useMemo(() => {
    const releases = getPayrollReleases();
    const currentPeriod = new Date().toISOString().slice(0, 7);

    // If current period release doesn't exist yet, generate from summary
    if (!releases.find((r) => r.period === currentPeriod)) {
      const summaryRows = calculatePayrollSummary([], currentPeriod);
      if (summaryRows.length) {
        releases.push({
          id: `pay-${currentPeriod}`,
          period: currentPeriod,
          total_amount: summaryRows.reduce((sum, r) => sum + r.net_salary, 0),
          employee_count: summaryRows.length,
          status: "draft",
          submitted_at: new Date().toISOString(),
          details: summaryRows,
        });
      }
    }

    return releases
      .map((item) => {
        const details = item.details || calculatePayrollSummary([], item.period);
        const totalBase = details.reduce((sum, r) => sum + (r.base_salary || 0), 0);
        const totalAllowance = details.reduce((sum, r) => sum + (r.allowance || 0), 0);
        const totalBonus = details.reduce((sum, r) => sum + (r.bonus_kpi || 0), 0);
        const totalDeductions = details.reduce((sum, r) => sum + (r.late_deduction || 0), 0);
        const totalNet = details.reduce((sum, r) => sum + (r.net_salary || 0), 0);

        return {
          ...item,
          month_name: monthLabel(item.period),
          total_base: totalBase,
          total_allowance: totalAllowance,
          total_bonus: totalBonus,
          total_deductions: totalDeductions,
          total_net: totalNet || item.total_amount,
          details,
        };
      })
      .sort((a, b) => b.period.localeCompare(a.period));
  }, []);

  const filtered = archives.filter((item) =>
    item.month_name.toLowerCase().includes(search.toLowerCase()) || item.period.includes(search)
  );

  const downloadCsv = (archive) => {
    const header = "Periode,Nama Karyawan,Email,Role,NIK,Bank,No Rekening,Gaji Pokok,Tunjangan,Bonus KPI,Potongan,Take Home Pay\n";
    const rows = archive.details
      .map((row) =>
        [
          archive.period,
          row.name || "",
          row.email || "",
          ROLE_LABELS[row.role] || row.role || "",
          row.nik || "",
          row.bank_name || "Bank BCA",
          row.bank_account_number || "",
          row.base_salary || 0,
          row.allowance || 0,
          row.bonus_kpi || 0,
          row.late_deduction || 0,
          row.net_salary || 0,
        ]
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arsip-payroll-${archive.period}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-display font-bold text-white">Arsip Penggajian Bulanan (Payroll)</h1>
        <p className="mt-1 text-slate-400">Riwayat arsip penggajian lengkap (Gaji Pokok, Tunjangan, Bonus KPI, & Potongan) per bulan.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-navy-800 p-5 space-y-6">
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
            <div key={archive.id} className="rounded-2xl border border-white/10 bg-navy-900 p-5 flex flex-col justify-between hover:border-brand-orange/50 transition-all">
              <div>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-orange/20 text-brand-orange">
                      <FolderOpen size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white leading-tight">{archive.month_name}</h3>
                      <p className="flex items-center gap-1 text-xs font-semibold text-slate-400 mt-1">
                        <Users size={12} /> {archive.employee_count || archive.details.length} Karyawan
                      </p>
                    </div>
                  </div>
                  {archive.status === "paid" ? (
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                      Lunas
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-[10px] font-bold text-amber-300">
                      Draft / Pending
                    </span>
                  )}
                </div>

                <div className="space-y-2 rounded-xl border border-white/5 bg-navy-950 p-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Gaji Pokok:</span>
                    <span className="font-mono text-slate-200">{formatRupiah(archive.total_base)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Bonus KPI:</span>
                    <span className="font-mono text-emerald-300">+{formatRupiah(archive.total_bonus)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Potongan:</span>
                    <span className="font-mono text-rose-300">-{formatRupiah(archive.total_deductions)}</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex justify-between items-center text-sm font-bold">
                    <span className="text-slate-200">Total Payout:</span>
                    <span className="text-brand-orange text-base">{formatRupiah(archive.total_net)}</span>
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
              Arsip penggajian belum tersedia.
            </div>
          )}
        </div>
      </div>

      {/* Archive Details Modal */}
      {selectedArchive && (
        <ArchiveDetailsModal
          archive={selectedArchive}
          onClose={() => setSelectedArchive(null)}
          onDownload={() => downloadCsv(selectedArchive)}
        />
      )}
    </div>
  );
}

function ArchiveDetailsModal({ archive, onClose, onDownload }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-2xl border border-white/10 bg-navy-900 p-6 space-y-4 my-8 max-h-[90vh] flex flex-col shadow-2xl">
        {/* Sticky Header Top */}
        <div className="flex justify-between items-center border-b border-white/10 pb-4 shrink-0 bg-navy-900 sticky top-0 z-20">
          <div>
            <h2 className="text-xl font-black text-white">Rincian Arsip Payroll - Periode {archive.month_name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Total Pengeluaran Gaji ({archive.details.length} Karyawan): <strong className="text-brand-orange">{formatRupiah(archive.total_net)}</strong>
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={onDownload} className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-brand-orange-dark">
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
                <th className="px-4 py-3.5 bg-navy-950">Nama Karyawan &amp; Bank</th>
                <th className="px-4 py-3.5 bg-navy-950">Role</th>
                <th className="px-4 py-3.5 bg-navy-950 text-right">Gaji Pokok</th>
                <th className="px-4 py-3.5 bg-navy-950 text-right">Tunjangan</th>
                <th className="px-4 py-3.5 bg-navy-950 text-right">Bonus KPI</th>
                <th className="px-4 py-3.5 bg-navy-950 text-right">Potongan</th>
                <th className="px-4 py-3.5 bg-navy-950 text-right">Take Home Pay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300 bg-navy-900">
              {archive.details.map((r, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-white">
                    <div>{r.name}</div>
                    <div className="text-xs font-normal text-slate-400 font-mono">{r.bank_name || "Bank BCA"} ({r.bank_account_number || "-"})</div>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-mono">{ROLE_LABELS[r.role] || r.role}</td>
                  <td className="px-4 py-3.5 text-right font-mono">{formatRupiah(r.base_salary)}</td>
                  <td className="px-4 py-3.5 text-right font-mono">{formatRupiah(r.allowance)}</td>
                  <td className="px-4 py-3.5 text-right font-mono text-emerald-300">+{formatRupiah(r.bonus_kpi)}</td>
                  <td className="px-4 py-3.5 text-right font-mono text-rose-300">-{formatRupiah(r.late_deduction)}</td>
                  <td className="px-4 py-3.5 text-right font-bold font-mono text-brand-orange text-base">{formatRupiah(r.net_salary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
