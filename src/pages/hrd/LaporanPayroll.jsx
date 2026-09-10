import { useEffect, useMemo, useState } from "react";
import { Printer, Send, CheckCircle2, Users, DollarSign, Award, FileText, Settings, X, Save, Calculator, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { api, formatRupiah } from "../../lib/api";
import { ROLE_LABELS } from "../../lib/workflow";
import {
  calculatePayrollSummary,
  getPayrollReleases,
  submitPayrollRelease,
  getSalaryConfig,
  saveSalaryConfig,
  calculateKemnakerDeduction,
} from "../../lib/payroll";
import HrdReportPdfModal from "../../components/HrdReportPdfModal";

export default function LaporanPayroll() {
  const [users, setUsers] = useState([]);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [releaseStatus, setReleaseStatus] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showKemnakerModal, setShowKemnakerModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/hrd/users");
      setUsers(res.data || []);
    } catch {
      toast.error("Gagal mengambil data karyawan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const releases = getPayrollReleases();
    const current = releases.find((r) => r.period === period);
    setReleaseStatus(current?.status || null);
  }, [period]);

  const rows = useMemo(() => {
    return calculatePayrollSummary(users, period);
  }, [period, users, showConfigModal, selectedUserForEdit, showKemnakerModal]);

  const totalBaseSalary = useMemo(() => rows.reduce((sum, r) => sum + r.base_salary, 0), [rows]);
  const totalIncentive = useMemo(() => rows.reduce((sum, r) => sum + r.bonus_kpi, 0), [rows]);
  const totalDeductions = useMemo(() => rows.reduce((sum, r) => sum + r.late_deduction, 0), [rows]);
  const totalNetSalary = useMemo(() => rows.reduce((sum, r) => sum + r.net_salary, 0), [rows]);

  const handleSendToFinance = () => {
    if (!rows.length) return toast.warning("Belum ada data penggajian.");
    const release = submitPayrollRelease(period, rows);
    setReleaseStatus(release.status);
    toast.success(`Pengajuan penggajian periode ${period} berhasil dikirim ke Finance!`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Rekap & Pengaturan Payroll</h1>
          <p className="mt-1 text-slate-400">Atur Gaji Pokok, Tunjangan, Bonus KPI, Potongan Kemnaker, dan pengajuan ke Finance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-xl border border-white/10 bg-navy-900 px-4 py-3 text-sm font-bold text-white outline-none focus:border-brand-orange"
          />
          <button
            onClick={() => setShowReportModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-orange hover:bg-brand-orange-dark text-white px-4 py-3 text-sm font-bold shadow-md transition-all"
          >
            <Printer size={18} /> Unduh PDF Laporan HRD
          </button>
          <button
            onClick={() => setShowKemnakerModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600/30 border border-indigo-500/40 px-4 py-3 text-sm font-bold text-indigo-200 hover:bg-indigo-600 hover:text-white transition-all shadow-md"
          >
            <Calculator size={18} /> Kalkulator Potongan Kemnaker
          </button>
          <button
            onClick={() => setShowConfigModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-navy-800 px-4 py-3 text-sm font-bold text-white hover:border-brand-orange"
          >
            <Settings size={18} /> Atur Master Gaji
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-navy-800 px-4 py-3 text-sm font-bold text-white hover:border-brand-orange"
          >
            <Printer size={18} /> Cetak
          </button>
          {releaseStatus === "paid" ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-5 py-3 text-sm font-bold text-emerald-300">
              <CheckCircle2 size={18} /> Lunas Dicairkan Finance
            </div>
          ) : releaseStatus === "submitted_to_finance" ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-500/30 px-5 py-3 text-sm font-bold text-amber-300">
              <Send size={18} /> Menunggu Validasi Finance
            </div>
          ) : (
            <button
              onClick={handleSendToFinance}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-5 py-3 text-sm font-bold text-white shadow-lg hover:bg-brand-orange-dark"
            >
              <Send size={18} /> Kirim Tagihan ke Finance
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Summary icon={Users} label="Total Karyawan" value={rows.length} />
        <Summary icon={DollarSign} label="Total Gaji Pokok" value={formatRupiah(totalBaseSalary)} />
        <Summary icon={Award} label="Total Bonus KPI" value={formatRupiah(totalIncentive)} />
        <Summary icon={DollarSign} label="Total Take Home Pay" value={formatRupiah(totalNetSalary)} tone="text-brand-orange" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-navy-800">
        <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <h2 className="font-bold text-white">Rincian Penggajian Periode: {period}</h2>
          <span className="text-xs text-slate-400">Total Rp: {formatRupiah(totalNetSalary)}</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400">Memuat data payroll...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-navy-900 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Karyawan</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4 text-right">Gaji Pokok</th>
                  <th className="px-6 py-4 text-right">Tunjangan</th>
                  <th className="px-6 py-4 text-right">Bonus KPI</th>
                  <th className="px-6 py-4 text-right">Potongan Kemnaker</th>
                  <th className="px-6 py-4 text-right">Gaji Bersih</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 font-bold text-white">
                      <div>{row.name}</div>
                      <div className="text-xs font-normal text-slate-400">{row.email}</div>
                    </td>
                    <td className="px-6 py-4">{ROLE_LABELS[row.role] || row.role}</td>
                    <td className="px-6 py-4 text-right font-mono">{formatRupiah(row.base_salary)}</td>
                    <td className="px-6 py-4 text-right font-mono">{formatRupiah(row.allowance)}</td>
                    <td className="px-6 py-4 text-right font-mono text-emerald-300">+{formatRupiah(row.bonus_kpi)}</td>
                    <td className="px-6 py-4 text-right font-mono text-rose-300">
                      {row.late_deduction > 0 ? `-${formatRupiah(row.late_deduction)}` : "Rp 0"}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-brand-orange">{formatRupiah(row.net_salary)}</td>
                    <td className="px-6 py-4 text-center space-x-2">
                      <button
                        onClick={() => setSelectedUserForEdit(row)}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:border-brand-orange hover:text-white"
                      >
                        <Settings size={13} /> Edit Gaji
                      </button>
                      <Link
                        to={`/admin/slip-gaji?user=${encodeURIComponent(row.name)}&period=${period}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-navy-900 px-2.5 py-1.5 text-xs font-bold text-white hover:border-brand-orange"
                      >
                        <FileText size={13} /> Slip
                      </Link>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                      Belum ada data payroll.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showKemnakerModal && (
        <KemnakerCalculatorModal
          users={rows}
          onClose={() => setShowKemnakerModal(false)}
          onApply={(userId, totalDeduction) => {
            const config = getSalaryConfig();
            const updated = {
              ...config,
              [`deduction_${userId}`]: totalDeduction,
            };
            saveSalaryConfig(updated);
            setShowKemnakerModal(false);
            toast.success("Potongan Kemnaker berhasil diterapkan ke payroll karyawan!");
          }}
        />
      )}

      {selectedUserForEdit && (
        <EditEmployeeSalaryModal
          employee={selectedUserForEdit}
          onClose={() => setSelectedUserForEdit(null)}
          onSave={() => {
            setSelectedUserForEdit(null);
            toast.success("Pengaturan gaji karyawan berhasil disimpan!");
          }}
        />
      )}

      {showConfigModal && (
        <MasterSalaryConfigModal
          onClose={() => setShowConfigModal(false)}
          onSave={() => {
            setShowConfigModal(false);
            toast.success("Master Gaji & Tunjangan per Role tersimpan!");
          }}
        />
      )}

      {showReportModal && (
        <HrdReportPdfModal
          users={users}
          suspendedUsers={[]}
          payroll={[]}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}

function KemnakerCalculatorModal({ users, onClose, onApply }) {
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id || "");
  const selectedUser = useMemo(() => users.find((u) => u.id === selectedUserId) || users[0], [users, selectedUserId]);

  const [baseSalary, setBaseSalary] = useState(selectedUser?.base_salary || 3500000);
  const [allowance, setAllowance] = useState(selectedUser?.allowance || 500000);
  const [workDaysSystem, setWorkDaysSystem] = useState(21); // 21 (5 hari kerja) atau 25 (6 hari kerja)
  const [alpaDays, setAlpaDays] = useState(0);
  const [unpaidLeaveDays, setUnpaidLeaveDays] = useState(0);
  const [lateHours, setLateHours] = useState(0);

  useEffect(() => {
    if (selectedUser) {
      setBaseSalary(selectedUser.base_salary);
      setAllowance(selectedUser.allowance);
    }
  }, [selectedUser]);

  const calc = useMemo(() => {
    return calculateKemnakerDeduction({
      baseSalary,
      allowance,
      alpaDays,
      unpaidLeaveDays,
      lateHours,
      workDaysSystem,
    });
  }, [baseSalary, allowance, alpaDays, unpaidLeaveDays, lateHours, workDaysSystem]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-navy-900 p-6 space-y-5 my-8">
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/20 text-indigo-300 rounded-xl flex items-center justify-center">
              <Calculator size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg leading-tight">Kalkulator Potongan Kemnaker</h3>
              <p className="text-xs text-slate-400">Aturan UU Ketenagakerjaan No. 13/2003 & PP No. 36/2021</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Form Inputs */}
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-300 block mb-1">Pilih Karyawan</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-navy-950 px-4 py-2.5 font-bold text-white outline-none focus:border-brand-orange"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({ROLE_LABELS[u.role] || u.role})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-400 block mb-1">Gaji Pokok (Rp)</label>
              <input
                type="number"
                value={baseSalary}
                onChange={(e) => setBaseSalary(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-white/10 bg-navy-950 px-3.5 py-2 font-mono text-white outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-400 block mb-1">Tunjangan Tetap (Rp)</label>
              <input
                type="number"
                value={allowance}
                onChange={(e) => setAllowance(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-white/10 bg-navy-950 px-3.5 py-2 font-mono text-white outline-none"
              />
            </div>
          </div>

          <div className="bg-navy-950 p-3.5 rounded-xl border border-white/5 space-y-3">
            <label className="font-bold text-slate-300 block">Sistem Hari Kerja Bulanan</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setWorkDaysSystem(21)}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                  workDaysSystem === 21
                    ? "bg-indigo-600 border-indigo-400 text-white"
                    : "bg-navy-900 border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                5 Hari Kerja / Minggu (21 Hari)
              </button>
              <button
                type="button"
                onClick={() => setWorkDaysSystem(25)}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                  workDaysSystem === 25
                    ? "bg-indigo-600 border-indigo-400 text-white"
                    : "bg-navy-900 border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                6 Hari Kerja / Minggu (25 Hari)
              </button>
            </div>
          </div>

          {/* Form Input Alpa, Izin, Late */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-rose-300 block mb-1">Hari Alpa / Mangkir</label>
              <input
                type="number"
                min="0"
                value={alpaDays}
                onChange={(e) => setAlpaDays(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-rose-500/30 bg-navy-950 px-3 py-2 text-center font-bold text-white outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="font-bold text-amber-300 block mb-1">Hari Izin Unpaid</label>
              <input
                type="number"
                min="0"
                value={unpaidLeaveDays}
                onChange={(e) => setUnpaidLeaveDays(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-amber-500/30 bg-navy-950 px-3 py-2 text-center font-bold text-white outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="font-bold text-sky-300 block mb-1">Jam Terlambat</label>
              <input
                type="number"
                min="0"
                value={lateHours}
                onChange={(e) => setLateHours(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-sky-500/30 bg-navy-950 px-3 py-2 text-center font-bold text-white outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Calculation Result Preview */}
        <div className="bg-navy-950 p-4 rounded-xl border border-white/10 space-y-2 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Upah Harian ({workDaysSystem} Hari):</span>
            <span className="font-mono text-slate-200">{formatRupiah(calc.dailyRate)} / hari</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Upah Per Jam (Kemnaker 1/173):</span>
            <span className="font-mono text-slate-200">{formatRupiah(calc.hourlyRate)} / jam</span>
          </div>
          <div className="border-t border-white/10 pt-2 space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Potongan Alpa ({alpaDays} hari):</span>
              <span className="font-mono text-rose-300">-{formatRupiah(calc.alpaDeduction)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Potongan Izin Unpaid ({unpaidLeaveDays} hari):</span>
              <span className="font-mono text-amber-300">-{formatRupiah(calc.unpaidDeduction)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Potongan Keterlambatan ({lateHours} jam):</span>
              <span className="font-mono text-sky-300">-{formatRupiah(calc.lateDeduction)}</span>
            </div>
          </div>
          <div className="border-t-2 border-white/10 pt-2 flex justify-between items-center text-sm font-bold">
            <span className="text-white">Total Potongan Kemnaker:</span>
            <span className="text-rose-400 text-base">{formatRupiah(calc.totalDeduction)}</span>
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-3 border-t border-white/10">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white">
            Batal
          </button>
          <button
            type="button"
            onClick={() => onApply(selectedUser?.id, calc.totalDeduction)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-md"
          >
            <CheckCircle2 size={15} /> Terapkan ke Payroll {selectedUser?.name}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditEmployeeSalaryModal({ employee, onClose, onSave }) {
  const config = getSalaryConfig();
  const [baseSalary, setBaseSalary] = useState(employee.base_salary);
  const [allowance, setAllowance] = useState(employee.allowance);
  const [deduction, setDeduction] = useState(employee.late_deduction);
  const [customBonusKpi, setCustomBonusKpi] = useState(config[`bonus_kpi_${employee.id}`] ?? "");

  const handleSave = (e) => {
    e.preventDefault();
    const updated = {
      ...config,
      [`base_${employee.id}`]: Number(baseSalary) || 0,
      [`allowance_${employee.id}`]: Number(allowance) || 0,
      [`deduction_${employee.id}`]: Number(deduction) || 0,
      [`bonus_kpi_${employee.id}`]: customBonusKpi !== "" ? Number(customBonusKpi) || 0 : undefined,
    };
    saveSalaryConfig(updated);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <form onSubmit={handleSave} className="w-full max-w-md rounded-2xl border border-white/10 bg-navy-900 p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div>
            <h3 className="font-bold text-white text-lg">Edit Gaji Karyawan</h3>
            <p className="text-xs text-slate-400">{employee.name} ({ROLE_LABELS[employee.role] || employee.role})</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 block mb-1">Gaji Pokok (Rp)</label>
          <input
            type="number"
            value={baseSalary}
            onChange={(e) => setBaseSalary(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-navy-950 px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-brand-orange"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 block mb-1">Tunjangan Tetap (Rp)</label>
          <input
            type="number"
            value={allowance}
            onChange={(e) => setAllowance(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-navy-950 px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-brand-orange"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 block mb-1">Bonus KPI Custom (Kosongkan bila mengikuti persentase/poin)</label>
          <input
            type="number"
            value={customBonusKpi}
            placeholder={`Otomatis (${formatRupiah(employee.bonus_kpi)})`}
            onChange={(e) => setCustomBonusKpi(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-navy-950 px-4 py-2.5 text-sm font-bold text-emerald-300 outline-none focus:border-brand-orange"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 block mb-1">Potongan / Denda Kemnaker (Rp)</label>
          <input
            type="number"
            value={deduction}
            onChange={(e) => setDeduction(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-navy-950 px-4 py-2.5 text-sm font-bold text-rose-300 outline-none focus:border-brand-orange"
          />
        </div>

        <div className="pt-2 flex justify-end gap-3 border-t border-white/10">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white">
            Batal
          </button>
          <button type="submit" className="inline-flex items-center gap-1.5 rounded-xl bg-brand-orange px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-orange-dark shadow-md">
            <Save size={15} /> Simpan Gaji {employee.name}
          </button>
        </div>
      </form>
    </div>
  );
}

function MasterSalaryConfigModal({ onClose, onSave }) {
  const [config, setConfig] = useState(getSalaryConfig());

  const handleSave = (e) => {
    e.preventDefault();
    saveSalaryConfig(config);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <form onSubmit={handleSave} className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-navy-900 p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <h3 className="font-bold text-white text-lg">Pengaturan Master Gaji Pokok & Tunjangan per Role</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          {Object.entries(ROLE_LABELS).map(([roleKey, label]) => {
            const baseVal = config.baseSalaries?.[roleKey] ?? 3500000;
            const allowVal = config.allowances?.[roleKey] ?? 500000;
            return (
              <div key={roleKey} className="grid grid-cols-3 gap-3 items-center bg-navy-950 p-3 rounded-xl border border-white/5">
                <span className="text-xs font-bold text-white">{label}</span>
                <div>
                  <span className="text-[10px] text-slate-400 block">Gaji Pokok:</span>
                  <input
                    type="number"
                    value={baseVal}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        baseSalaries: { ...config.baseSalaries, [roleKey]: Number(e.target.value) || 0 },
                      })
                    }
                    className="w-full rounded-lg border border-white/10 bg-navy-900 px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Tunjangan:</span>
                  <input
                    type="number"
                    value={allowVal}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        allowances: { ...config.allowances, [roleKey]: Number(e.target.value) || 0 },
                      })
                    }
                    className="w-full rounded-lg border border-white/10 bg-navy-900 px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-3 flex justify-end gap-3 border-t border-white/10">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white">
            Batal
          </button>
          <button type="submit" className="inline-flex items-center gap-1.5 rounded-xl bg-brand-orange px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-orange-dark">
            <Save size={15} /> Simpan Master Gaji
          </button>
        </div>
      </form>
    </div>
  );
}

function Summary({ icon: Icon, label, value, tone = "text-white" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-navy-800 p-5">
      <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
        <Icon size={16} className="text-brand-orange" /> {label}
      </div>
      <div className={`text-2xl font-black ${tone}`}>{value}</div>
    </div>
  );
}
