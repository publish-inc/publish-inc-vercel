import { useEffect, useMemo, useState } from "react";
import { BarChart3, ClipboardList, Target, Users, Wallet, Calendar, Clock, CheckCircle2, AlertTriangle, FileText, ArrowRight, UserCheck, Printer } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api, formatApiErrorDetail, formatRupiah } from "../../lib/api";
import { activeItems, getKpiEvents, getRoleKpiTargets, ROLE_LABELS, usersByRole } from "../../lib/workflow";
import { getAttendanceRecords, getLeaveQuotas, getLeaveRequests } from "../../lib/attendance";
import { demoUsers } from "../../lib/demoData";
import PicTeamReportPdfModal from "../../components/PicTeamReportPdfModal";
import HrdReportPdfModal from "../../components/HrdReportPdfModal";

const sumEvents = (events, metric) => events.filter((event) => event.metric === metric).reduce((sum, event) => sum + (Number(event.value) || 0), 0);
const matchesUser = (event, person) => event.user_id === person?.id || event.user_email === person?.email || event.user_name === person?.name;

export default function RoleKpiDashboard() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [kpiEvents, setKpiEvents] = useState(() => getKpiEvents());
  const [items, setItems] = useState(() => activeItems());
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    if (user?.role !== "cs") return;
    api.get("/invoices", { params: { page: 1, limit: 100, status: "all", include_hidden: true } })
      .then((res) => setInvoices(res.data.items || []))
      .catch((error) => toast.error(formatApiErrorDetail(error.response?.data?.detail)));
  }, [user]);

  const targets = useMemo(() => getRoleKpiTargets(), []);

  useEffect(() => {
    const refreshLocal = () => {
      setKpiEvents(getKpiEvents());
      setItems(activeItems());
    };
    refreshLocal();
    window.addEventListener("focus", refreshLocal);
    return () => window.removeEventListener("focus", refreshLocal);
  }, []);

  // If role is HRD, render dedicated HRD Attendance & Leave Analytics Dashboard
  if (user?.role === "hrd") {
    return <HrdAnalyticsDashboard />;
  }

  const stats = useMemo(() => {
    const role = user?.role;
    const roleTargets = targets[role] || [];

    if (role === "cs") {
      const dealInvoices = invoices.filter((item) => ["paid", "dp"].includes(item.status));
      const values = {
        deal_terbit: dealInvoices.filter((item) => (item.service_type || "terbit") === "terbit").length,
        deal_cetak: dealInvoices.filter((item) => item.service_type === "cetak").length,
        omzet: dealInvoices.reduce((sum, item) => sum + (Number(item.grand_total) || 0), 0),
      };
      return {
        title: "Dashboard KPI CS",
        subtitle: "Deal terbit, cetak, dan omzet berdasarkan invoice berstatus deal.",
        cards: roleTargets.map((target) => ({ label: target.name, value: values[target.metric] || 0, target: target.target, money: target.unit === "rupiah" })),
        rows: dealInvoices.map((item) => ({ id: item.id, title: item.judul || item.package?.spesifikasi || item.package?.name || "Layanan", subtitle: item.number, metric: item.service_type || "terbit", value: formatRupiah(item.grand_total) })),
      };
    }

    if (role === "pic_editor" || role === "pic_layouter") {
      const childRole = role === "pic_editor" ? "editor" : "layouter";
      const metric = "jumlah_halaman";
      const team = usersByRole([childRole]);
      const childTarget = (targets[childRole] || []).find((item) => item.metric === metric)?.target || 0;
      const teamRows = team.map((person) => {
        const value = kpiEvents.filter((event) => event.role === childRole && event.metric === metric && matchesUser(event, person)).reduce((sum, event) => sum + (Number(event.value) || 0), 0);
        return { id: person.id, title: person.name, subtitle: childRole, metric, value, achieved: childTarget > 0 && value >= childTarget };
      });
      const achievedMembers = teamRows.filter((row) => row.achieved).length;
      const totalValue = kpiEvents.filter((event) => event.role === childRole && event.metric === metric).reduce((sum, event) => sum + (Number(event.value) || 0), 0);
      return {
        title: `Dashboard KPI ${ROLE_LABELS[role]}`,
        subtitle: "PIC memantau total capaian tim dan jumlah anggota yang memenuhi target.",
        cards: [
          { label: "Capaian All Team", value: totalValue, target: childTarget * Math.max(team.length, 1) },
          { label: "Memenuhi Target", value: achievedMembers, target: team.length, suffix: `/${team.length}` },
          { label: "Persentase Tim", value: team.length ? Math.round((achievedMembers / team.length) * 100) : 0, suffix: "%" },
          { label: "Naskah Aktif", value: items.filter((item) => item.stage === (role === "pic_editor" ? "pic_editor" : "pic_layouter")).length },
        ],
        rows: teamRows,
      };
    }

    const demoId = role ? `demo-${role}` : "";
    const relevant = kpiEvents.filter((event) => event.user_id === user?.id || event.user_email === user?.email || event.user_id === demoId || (event.role === role && !event.user_email && !event.user_id));
    return {
      title: `Dashboard KPI ${ROLE_LABELS[role] || role || ""}`,
      subtitle: "Pantau capaian KPI pribadi berdasarkan target yang diatur master.",
      cards: roleTargets.length ? roleTargets.map((target) => ({
        label: target.name,
        value: sumEvents(relevant, target.metric),
        target: target.target,
        money: target.unit === "rupiah",
      })) : [{ label: "Capaian KPI", value: relevant.reduce((sum, event) => sum + (Number(event.value) || 0), 0), target: 0 }],
      rows: relevant.slice(0, 10).map((event) => ({ id: event.id, title: event.title, subtitle: event.metric, metric: event.role, value: event.value })),
    };
  }, [invoices, items, kpiEvents, targets, user]);

  const isPic = user?.role === "pic_editor" || user?.role === "pic_layouter";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">{stats.title}</h1>
          <p className="mt-1 text-slate-400">{stats.subtitle}</p>
        </div>
        {isPic && (
          <button
            onClick={() => setShowReportModal(true)}
            className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg text-xs"
          >
            <Printer size={16} /> Unduh PDF Laporan Capaian Tim
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.cards.map((card) => <StatCard key={card.label} {...card} />)}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-navy-800">
          <div className="flex items-center gap-2 border-b border-white/10 p-5 font-bold text-white"><BarChart3 size={18} /> Aktivitas KPI Terbaru</div>
          <div className="divide-y divide-white/5">
            {stats.rows.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div><div className="font-bold text-white">{row.title || "-"}</div><div className="text-xs text-slate-500">{row.subtitle || "-"}</div></div>
                <div className="text-right"><div className="font-black text-brand-orange">{row.value}</div><div className="text-[10px] uppercase text-slate-500">{row.achieved ? "target terpenuhi" : row.metric}</div></div>
              </div>
            ))}
            {!stats.rows.length && <div className="px-5 py-12 text-center text-slate-500">Belum ada aktivitas KPI.</div>}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-navy-800 p-5">
          <div className="mb-4 flex items-center gap-2 font-bold text-white"><ClipboardList size={18} /> Posisi Naskah</div>
          <div className="space-y-3">
            {items.slice(0, 6).map((item) => (
              <div key={item.id} className="rounded-lg border border-white/10 bg-navy-900 p-3 text-xs">
                <div className="font-bold text-white truncate">{item.manuscript?.title}</div>
                <div className="mt-1 text-slate-400">{ROLE_LABELS[item.stage] || item.stage}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showReportModal && (
        <PicTeamReportPdfModal role={user?.role} stats={stats} onClose={() => setShowReportModal(false)} />
      )}
    </div>
  );
}

function HrdAnalyticsDashboard() {
  const attendanceRecords = useMemo(() => getAttendanceRecords(), []);
  const leaveRequests = useMemo(() => getLeaveRequests(), []);
  const leaveQuotas = useMemo(() => getLeaveQuotas(), []);
  const [showHrdModal, setShowHrdModal] = useState(false);

  const totalEmployees = demoUsers.length;
  const hadirCount = attendanceRecords.filter((r) => r.status === "hadir").length;
  const lateCount = attendanceRecords.filter((r) => r.status === "terlambat").length;
  const pendingLeaveCount = leaveRequests.filter((r) => r.status === "pending").length;
  const totalCutiUsed = leaveQuotas.reduce((sum, q) => sum + (q.used_days || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Dashboard SDM & Analytics Kehadiran</h1>
          <p className="mt-1 text-slate-400">Monitoring realtime statistik presensi PWA, pengajuan cuti, dan kuota karyawan.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowHrdModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-5 py-3 text-sm font-bold text-white shadow-lg hover:bg-brand-orange-dark transition-all"
          >
            <Printer size={18} /> Unduh PDF Laporan Bulanan HRD
          </button>
          <Link
            to="/admin/manajemen-absensi"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-navy-800 px-5 py-3 text-sm font-bold text-white hover:border-brand-orange transition-all"
          >
            <Calendar size={18} /> Kelola Absensi & Cuti
          </Link>
          <Link
            to="/admin/laporan-payroll"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-navy-800 px-5 py-3 text-sm font-bold text-white hover:border-brand-orange transition-all"
          >
            <FileText size={18} /> Rekap Payroll
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <HrdStatCard icon={Users} label="Total Karyawan" value={totalEmployees} tone="text-brand-orange" />
        <HrdStatCard icon={UserCheck} label="Hadir Tepat Waktu" value={hadirCount} tone="text-emerald-300" />
        <HrdStatCard icon={Clock} label="Terlambat Hari Ini" value={lateCount} tone="text-amber-300" />
        <HrdStatCard icon={Calendar} label="Pengajuan Cuti Pending" value={pendingLeaveCount} tone="text-rose-300" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Grafik & Statistik Kehadiran Per Karyawan */}
        <div className="rounded-2xl border border-white/10 bg-navy-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 size={20} className="text-brand-orange" /> Statistik Presensi PWA Karyawan
            </h2>
            <span className="text-xs text-slate-400">Live Status</span>
          </div>

          <div className="space-y-4">
            {demoUsers.map((emp) => {
              const record = attendanceRecords.find((r) => r.user_id === emp.id);
              const status = record?.status || "Belum Absen";
              const isHadir = status === "hadir";
              const isLate = status === "terlambat";

              return (
                <div key={emp.id} className="rounded-xl border border-white/5 bg-navy-900 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-sm">{emp.name}</div>
                      <div className="text-xs text-slate-400 uppercase tracking-wider">{ROLE_LABELS[emp.role] || emp.role}</div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                        isHadir
                          ? "bg-emerald-500/15 text-emerald-300"
                          : isLate
                          ? "bg-amber-500/15 text-amber-300"
                          : "bg-slate-500/15 text-slate-400"
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  {/* Visual Bar Indicator */}
                  <div className="w-full bg-navy-950 h-2.5 rounded-full overflow-hidden flex">
                    <div className={`h-full ${isHadir ? "w-full bg-emerald-500" : isLate ? "w-4/5 bg-amber-500" : "w-1/5 bg-slate-600"}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Analytics Kuota & Pengajuan Cuti */}
        <div className="rounded-2xl border border-white/10 bg-navy-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar size={20} className="text-brand-orange" /> Kuota & Penggunaan Cuti Tahunan
            </h2>
            <span className="text-xs text-slate-400">Total Digunakan: {totalCutiUsed} Hari</span>
          </div>

          <div className="space-y-4">
            {leaveQuotas.map((q) => {
              const usedPct = Math.round(((q.used_days || 0) / (q.total_quota || 12)) * 100);

              return (
                <div key={q.user_id} className="rounded-xl border border-white/5 bg-navy-900 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="font-bold text-white text-sm">{q.user_name}</div>
                    <div className="text-slate-400">
                      <span className="font-bold text-brand-orange">{q.used_days} Hari</span> terpakai / Sisa <span className="font-bold text-emerald-300">{q.remaining_days} Hari</span>
                    </div>
                  </div>

                  {/* Visual Kuota Progress Bar */}
                  <div className="w-full bg-navy-950 h-3 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-brand-orange transition-all"
                      style={{ width: `${Math.min(usedPct, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>Quota: {q.total_quota} Hari</span>
                    <span>{usedPct}% Terpakai</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <Link
              to="/admin/manajemen-absensi"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-xs font-bold text-white hover:bg-brand-orange transition-colors"
            >
              Lihat Detail & Persetujuan Cuti Karyawan <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {showHrdModal && (
        <HrdReportPdfModal
          users={demoUsers}
          suspendedUsers={[]}
          payroll={[]}
          onClose={() => setShowHrdModal(false)}
        />
      )}
    </div>
  );
}

function HrdStatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-navy-800 p-5">
      <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
        <Icon size={16} className={tone} /> {label}
      </div>
      <div className={`text-3xl font-black ${tone}`}>{value}</div>
    </div>
  );
}

function StatCard({ label, value, target, money, suffix = "" }) {
  const isPercent = suffix === "%";
  const displayVal = money ? formatRupiah(value) : isPercent ? `${value}${suffix}` : `${value}${suffix}`;
  const displayTarget = target ? (money ? formatRupiah(target) : target) : null;
  const good = target && value >= target;

  return (
    <div className="rounded-xl border border-white/10 bg-navy-800 p-5">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-white">{displayVal}</div>
      {displayTarget && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-slate-400">Target: {displayTarget}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${good ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
            {good ? "tercapai" : "proses"}
          </span>
        </div>
      )}
    </div>
  );
}
