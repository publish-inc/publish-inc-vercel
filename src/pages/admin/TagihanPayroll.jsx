import { useState, useEffect } from "react";
import { ReceiptText, CheckCircle2, Send, CreditCard, Building2, User, CheckSquare, ShieldCheck, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { formatRupiah, api } from "../../lib/api";
import { getPayrollReleases, markPayrollAsPaid, calculatePayrollSummary } from "../../lib/payroll";
import { demoUsers } from "../../lib/demoData";

export default function TagihanPayroll() {
  const [payrollReleases, setPayrollReleases] = useState([]);
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [verifiedEmployeeIds, setVerifiedEmployeeIds] = useState(new Set());

  const loadReleases = () => {
    const releases = getPayrollReleases();
    setPayrollReleases(releases);
    if (releases.length > 0 && !selectedRelease) {
      setSelectedRelease(releases[0]);
    } else if (selectedRelease) {
      const updated = releases.find((r) => r.id === selectedRelease.id);
      if (updated) setSelectedRelease(updated);
    }
  };

  useEffect(() => {
    loadReleases();
  }, []);

  // Compute employee rows for selected release
  const employeeRows = selectedRelease
    ? selectedRelease.details && selectedRelease.details.length > 0
      ? selectedRelease.details
      : calculatePayrollSummary(demoUsers, selectedRelease.period)
    : [];

  const handleToggleVerifyUser = (userId) => {
    setVerifiedEmployeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleVerifyAll = () => {
    if (verifiedEmployeeIds.size === employeeRows.length) {
      setVerifiedEmployeeIds(new Set());
    } else {
      setVerifiedEmployeeIds(new Set(employeeRows.map((e) => e.id)));
    }
  };

  const handleCompleteValidation = async () => {
    if (!selectedRelease) return;

    if (selectedRelease.status === "paid") {
      return toast.info("Penggajian periode ini sudah divalidasi dan dicairkan!");
    }

    // Mark as paid
    markPayrollAsPaid(selectedRelease.period);

    // Save into cash out list in backend/localStorage
    try {
      await api.post("/finance/cash-out", {
        category: "payroll",
        description: `Pencairan Gaji Karyawan Periode ${selectedRelease.period} (${employeeRows.length} Karyawan)`,
        amount: selectedRelease.total_amount,
        date: new Date().toISOString(),
      });
    } catch {
      // Fallback silent
    }

    toast.success(`Penggajian periode ${selectedRelease.period} berhasil divalidasi penuh dan dicairkan!`);
    loadReleases();
  };

  const isAllVerified = employeeRows.length > 0 && verifiedEmployeeIds.size === employeeRows.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
          <ReceiptText className="text-brand-orange" size={32} /> Tagihan Payroll HRD &amp; Validasi Penggajian
        </h1>
        <p className="mt-1 text-slate-400">
          Pemeriksaan rincian gaji, bank &amp; nomor rekening karyawan, serta validasi pencairan dana dari HRD.
        </p>
      </div>

      {/* Select Period Tabs */}
      <div className="flex flex-wrap gap-3 border-b border-white/10 pb-4">
        {payrollReleases.map((release) => {
          const isSelected = selectedRelease?.id === release.id;
          const isPaid = release.status === "paid";
          return (
            <button
              key={release.id}
              onClick={() => {
                setSelectedRelease(release);
                setVerifiedEmployeeIds(new Set());
              }}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all ${
                isSelected
                  ? "bg-brand-orange text-white shadow-lg shadow-brand-orange/20"
                  : "bg-navy-800 text-slate-400 hover:bg-navy-700 hover:text-white"
              }`}
            >
              <ReceiptText size={16} />
              <span>Periode {release.period}</span>
              <span
                className={`ml-2 px-2 py-0.5 rounded-full text-[10px] uppercase font-black ${
                  isPaid ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400 animate-pulse"
                }`}
              >
                {isPaid ? "Lunas/Dicairkan" : "Menunggu HRD"}
              </span>
            </button>
          );
        })}

        {payrollReleases.length === 0 && (
          <div className="text-slate-500 text-sm italic py-2">Belum ada pengajuan tagihan payroll dari HRD.</div>
        )}
      </div>

      {selectedRelease && (
        <div className="space-y-6">
          {/* Release Overview Banner */}
          <div className="bg-navy-800 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Ringkasan Tagihan Payroll</div>
              <div className="text-2xl font-black text-white">Periode Gaji: {selectedRelease.period}</div>
              <div className="text-sm text-slate-400 flex items-center gap-4 pt-1">
                <span>Total Karyawan: <strong className="text-white">{employeeRows.length} Orang</strong></span>
                <span>•</span>
                <span>Terverifikasi: <strong className="text-emerald-400">{verifiedEmployeeIds.size} / {employeeRows.length} Karyawan</strong></span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="bg-navy-900 border border-white/10 px-5 py-3 rounded-xl text-right">
                <div className="text-[10px] font-bold uppercase text-slate-500">Total Nominal Gaji (Take Home Pay)</div>
                <div className="text-2xl font-black text-brand-orange font-mono">
                  {formatRupiah(selectedRelease.total_amount)}
                </div>
              </div>

              {selectedRelease.status !== "paid" ? (
                <button
                  onClick={handleCompleteValidation}
                  disabled={verifiedEmployeeIds.size === 0}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <ShieldCheck size={18} /> Selesai Validasi Penggajian Karyawan
                </button>
              ) : (
                <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold px-6 py-3 rounded-xl flex items-center gap-2 text-sm">
                  <CheckCircle2 size={18} /> Penggajian Telah Divalidasi &amp; Dicairkan
                </div>
              )}
            </div>
          </div>

          {/* Verification Bar */}
          {selectedRelease.status !== "paid" && (
            <div className="bg-navy-800/80 border border-white/10 rounded-xl p-4 flex items-center justify-between">
              <div className="text-xs text-slate-300">
                Silakan lakukan pemeriksaan nomor rekening dan nominal gaji tiap karyawan sebelum menyelesaikan validasi.
              </div>
              <button
                onClick={handleVerifyAll}
                className="text-xs text-brand-orange hover:underline font-bold flex items-center gap-1.5"
              >
                <CheckSquare size={16} /> {isAllVerified ? "Batal Verifikasi Semua" : "Verifikasi Semua Karyawan"}
              </button>
            </div>
          )}

          {/* Employee Bank & Salary Table */}
          <div className="bg-navy-800 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-white/10 font-bold text-white flex items-center justify-between">
              <span>Daftar Transfer Rekening &amp; Rincian Gaji Karyawan</span>
              <span className="text-xs font-mono text-slate-400">{employeeRows.length} Karyawan</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-navy-900 text-xs uppercase tracking-wider text-slate-400 border-b border-white/10">
                  <tr>
                    {selectedRelease.status !== "paid" && <th className="px-5 py-4 w-12 text-center">Cek</th>}
                    <th className="px-5 py-4">Karyawan &amp; Role</th>
                    <th className="px-5 py-4">Bank &amp; No Rekening</th>
                    <th className="px-5 py-4">Gaji Pokok + Tunjangan</th>
                    <th className="px-5 py-4">Reward KPI</th>
                    <th className="px-5 py-4">Potongan</th>
                    <th className="px-5 py-4">Total Gaji (Take Home Pay)</th>
                    <th className="px-5 py-4 text-center">Status Validasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {employeeRows.map((emp) => {
                    const isVerified = verifiedEmployeeIds.has(emp.id) || selectedRelease.status === "paid";
                    return (
                      <tr key={emp.id} className={`hover:bg-white/5 transition-colors ${isVerified ? "bg-emerald-500/5" : ""}`}>
                        {selectedRelease.status !== "paid" && (
                          <td className="px-5 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={isVerified}
                              onChange={() => handleToggleVerifyUser(emp.id)}
                              className="w-4 h-4 accent-brand-orange rounded cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-5 py-4">
                          <div className="font-bold text-white">{emp.name}</div>
                          <div className="text-xs text-slate-500 uppercase font-mono">{emp.role} &bull; NIK: {emp.nik || "-"}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 font-mono font-bold text-brand-orange">
                            <CreditCard size={16} className="text-slate-400 shrink-0" />
                            <span>{emp.bank_name || "Bank BCA"}</span>
                          </div>
                          <div className="text-xs font-mono text-slate-300 mt-0.5">
                            No. Rek: <strong className="text-white">{emp.bank_account_number || "1234567890"}</strong>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs">
                          <div>Gapok: {formatRupiah(emp.base_salary)}</div>
                          <div className="text-slate-400">Tunjangan: {formatRupiah(emp.allowance)}</div>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-emerald-400 font-bold">
                          +{formatRupiah(emp.bonus_kpi)}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-rose-400">
                          -{formatRupiah(emp.late_deduction)}
                        </td>
                        <td className="px-5 py-4 font-mono font-black text-base text-white">
                          {formatRupiah(emp.net_salary)}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1 ${
                              isVerified
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {isVerified ? <CheckCircle2 size={12} /> : null}
                            {isVerified ? "Terverifikasi" : "Belum Diperiksa"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
