import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, BookMarked, LogOut, Users, SlidersHorizontal, 
  UserSquare2, FileText, ReceiptText, Briefcase, FileCheck, ClipboardList, 
  Target, Calculator, Store, Tv, Settings, FolderOpen, AlertTriangle, Coins, Percent,
  TrendingUp, CheckSquare, ShieldAlert, Trash2, Package, CalendarDays, Share2, Plus,
  Smartphone, Calendar
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { Logo } from "../../components/Logo";

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const doLogout = async () => {
    await logout();
    toast.success("Berhasil logout");
    navigate("/admin/login");
  };

  const roleLabel = (user?.role || "GUEST").replace("_", " ").toUpperCase();

  const linkClass = ({ isActive }) =>
    `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
      isActive ? "bg-brand-orange text-white shadow-lg shadow-brand-orange/15" : "text-slate-400 hover:bg-navy-800 hover:text-white"
    }`;

  const menuGroups = [
    {
      title: "Utama",
      items: [
        { key: "dashboard", to: "/admin/dashboard-global", icon: Target, label: "Dashboard Global", roles: ["pimpinan", "master_admin"] },
        { key: "dashboard-role", to: "/admin/dashboard-kpi", icon: TrendingUp, label: "Dashboard KPI", roles: ["cs", "admin", "cco", "pic_editor", "pic_layouter", "editor", "layouter", "hrd", "admin_marketplace", "campaign", "sosmed", "crm", "finance", "produksi"] },
        { key: "kpi-pribadi", to: "/admin/kpi-pribadi", icon: CheckSquare, label: "Detail KPI", roles: ["master_admin", "pimpinan", "admin", "cs", "cco", "pic_editor", "editor", "pic_layouter", "layouter", "hrd", "admin_marketplace", "campaign", "sosmed", "crm", "finance", "produksi"] },
        { key: "input-kpi", to: "/admin/input-kpi", icon: Target, label: "Klaim KPI", roles: ["master_admin", "pimpinan", "admin", "cco", "pic_editor", "editor", "pic_layouter", "layouter", "hrd", "admin_marketplace", "campaign", "sosmed", "crm", "finance", "produksi"] },
        { key: "cms", to: "/admin/konten", icon: LayoutDashboard, label: "Konten Landing", roles: ["master_admin"] },
        { key: "karyawan", to: "/admin/karyawan", icon: Users, label: "Kelola Karyawan", roles: ["master_admin"] },
      ],
    },
    {
      title: "CS & Penjualan",
      items: [
        { key: "inputan", to: "/admin/inputan-cs", icon: SlidersHorizontal, label: "Inputan CS", roles: ["master_admin"] },
        { key: "crm-dashboard", to: "/admin/dashboard-crm", icon: Users, label: "Database CRM", roles: ["crm", "master_admin"] },
        { key: "customer", to: "/admin/customer", icon: UserSquare2, label: "Customer", roles: ["cs"] },
        { key: "penawaran", to: "/admin/penawaran", icon: FileText, label: "Penawaran", roles: ["cs"] },
        { key: "invoice", to: "/admin/invoice", icon: ReceiptText, label: "Invoice", roles: ["cs"] },
        { key: "deal", to: "/admin/deal-spk", icon: Briefcase, label: "Kelola Deal", roles: ["cs"] },
        { key: "riwayat-deal", to: "/admin/riwayat-deal", icon: ReceiptText, label: "Riwayat Deal", roles: ["cs"] },
        { key: "naskah-deal", to: "/admin/naskah-deal-cs", icon: FileText, label: "Naskah Deal", roles: ["cs"] },
      ],
    },
    {
      title: "Naskah & Produksi",
      items: [
        { key: "tracking", to: "/admin/naskah-tracking", icon: BookMarked, label: "Tracking Naskah", roles: ["master_admin", "pimpinan"] },
        { key: "cco-tracking", to: "/admin/cco-tracking", icon: BookMarked, label: "Tracking Progress", roles: ["cco"] },
        { key: "cco-intake", to: "/admin/cco-intake", icon: ClipboardList, label: "Naskah Intake", roles: ["cco"] },
        { key: "buku", to: "/admin/buku", icon: BookMarked, label: "Katalog Buku", roles: ["admin_marketplace", "master_admin"] },
        { key: "admin-spk", to: "/admin/administrasi-spk", icon: FileCheck, label: "Administrasi Naskah", roles: ["cco", "master_admin", "admin"] },
        { key: "antrian", to: "/admin/antrian-naskah", icon: ClipboardList, label: "Distribusi Tugas", roles: ["pic_editor", "pic_layouter"] },
        { key: "tugas-produksi", to: "/admin/tugas-produksi", icon: ClipboardList, label: "Tugas Kreatif", roles: ["editor", "layouter", "pic_editor", "pic_layouter"] },
        { key: "produksi-cetak", to: "/admin/dashboard-produksi", icon: Package, label: "Antrian Produksi", roles: ["produksi", "master_admin"] },
      ],
    },
    {
      title: "KPI & Master",
      items: [
        { key: "approval-kpi", to: "/admin/approval-kpi", icon: CheckSquare, label: "Approval KPI", roles: ["pic_editor", "pic_layouter", "master_admin"] },
        { key: "pengawasan", to: "/admin/manajemen-naskah", icon: FolderOpen, label: "Pengawasan Naskah", roles: ["master_admin"] },
        { key: "deadline", to: "/admin/deadline-keterlambatan", icon: AlertTriangle, label: "Deadline Tracking", roles: ["master_admin"] },
        { key: "pengaturan", to: "/admin/pengaturan-sistem", icon: Settings, label: "Pengaturan Sistem", roles: ["master_admin"] },
      ],
    },
    {
      title: "Marketing & Report",
      items: [
        { key: "campaign-input", to: "/admin/campaign/input-event", icon: Plus, label: "Input Event", roles: ["campaign", "master_admin"] },
        { key: "campaign-dashboard", to: "/admin/dashboard-campaign", icon: CalendarDays, label: "Kalender Event", roles: ["campaign", "master_admin"] },
        { key: "campaign-registrants", to: "/admin/campaign/pendaftar", icon: Users, label: "Database Pendaftar", roles: ["campaign", "master_admin"] },
        { key: "sosmed-input", to: "/admin/sosmed/input-konten", icon: Plus, label: "Input Konten", roles: ["sosmed", "master_admin"] },
        { key: "sosmed-dashboard", to: "/admin/dashboard-sosmed", icon: Share2, label: "Kalender Konten", roles: ["sosmed", "master_admin"] },
        { key: "market", to: "/admin/marketplace", icon: Store, label: "Marketplace", roles: ["admin_marketplace", "pimpinan", "master_admin"] },
        { key: "kalkulator", to: "/admin/marketplace-kalkulator", icon: Percent, label: "Kalkulator Harga", roles: ["admin_marketplace", "pimpinan", "master_admin"] },
        { key: "royalti", to: "/admin/kelola-royalti", icon: Coins, label: "Kelola Royalti", roles: ["admin_marketplace", "pimpinan", "master_admin"] },
        { key: "report", to: "/admin/report-display", icon: Tv, label: "Report Display", roles: ["report", "master_admin", "pimpinan", "hrd"] },
      ],
    },
    {
      title: "Keuangan & SDM",
      items: [
        { key: "finance-dashboard", to: "/admin/dashboard-finance", icon: Briefcase, label: "Manajemen Finance", roles: ["finance"] },
      ],
    },
  ];

  const masterMenuGroups = [
    {
      title: "Utama",
      items: [
        { key: "dashboard", to: "/admin/dashboard-global", icon: Target, label: "Dashboard Global", roles: ["master_admin"] },
        { key: "cms", to: "/admin/konten", icon: LayoutDashboard, label: "Konten Landing Page", roles: ["master_admin"] },
      ],
    },
    {
      title: "CS & Penjualan",
      items: [
        { key: "inputan", to: "/admin/inputan-cs", icon: SlidersHorizontal, label: "Inputan CS", roles: ["master_admin"] },
      ],
    },
    {
      title: "Naskah",
      items: [
        { key: "tracking", to: "/admin/naskah-tracking", icon: BookMarked, label: "Tracking Naskah", roles: ["master_admin"] },
        { key: "antrian", to: "/admin/master-antrian", icon: ClipboardList, label: "Antrian Naskah", roles: ["master_admin"] },
        { key: "berjalan", to: "/admin/master-berjalan", icon: ClipboardList, label: "Naskah Berjalan", roles: ["master_admin"] },
        { key: "hapus", to: "/admin/master-hapus", icon: Trash2, label: "Approval Hapus", roles: ["master_admin"] },
      ],
    },
    {
      title: "KPI",
      items: [
        { key: "approval-kpi", to: "/admin/approval-kpi", icon: CheckSquare, label: "Approval KPI", roles: ["master_admin"] },
        { key: "koreksi-kpi", to: "/admin/koreksi-kpi", icon: ShieldAlert, label: "Koreksi KPI", roles: ["master_admin"] },
      ],
    },
    {
      title: "Pengaturan Sistem",
      items: [
        { key: "deadline", to: "/admin/deadline-keterlambatan", icon: AlertTriangle, label: "Deadline Tracking", roles: ["master_admin"] },
        { key: "pengaturan", to: "/admin/pengaturan-sistem", icon: Settings, label: "Pengaturan Sistem", roles: ["master_admin"] },
        { key: "kalkulator", to: "/admin/marketplace-kalkulator", icon: Calculator, label: "Kalkulator Harga", roles: ["master_admin"] },
      ],
    },
  ];

  const hrdMenuGroups = [
    {
      title: "Dashboard SDM & Analytics",
      items: [
        { key: "dashboard-role", to: "/admin/dashboard-kpi", icon: TrendingUp, label: "Dashboard HRD & Kehadiran", roles: ["hrd"] },
      ],
    },
    {
      title: "Manajemen Karyawan",
      items: [
        { key: "karyawan", to: "/admin/karyawan", icon: Users, label: "Database Karyawan", roles: ["hrd"] },
        { key: "absensi-hrd", to: "/admin/manajemen-absensi", icon: Calendar, label: "Manajemen Absensi", roles: ["hrd"] },
        { key: "kpi-target", to: "/admin/manajemen-kpi", icon: Target, label: "Kelola KPI & Reward", roles: ["hrd"] },
      ],
    },
    {
      title: "Penggajian",
      items: [
        { key: "payroll", to: "/admin/laporan-payroll", icon: Calculator, label: "Rekap Payroll", roles: ["hrd"] },
        { key: "arsip-payroll", to: "/admin/arsip-payroll", icon: FolderOpen, label: "Arsip Payroll", roles: ["hrd"] },
        { key: "slip-gaji", to: "/admin/slip-gaji", icon: ReceiptText, label: "Slip Gaji", roles: ["hrd"] },
      ],
    },
  ];

  const financeMenuGroups = [
    {
      title: "Utama & Analytics",
      items: [
        { key: "finance-dashboard", to: "/admin/dashboard-finance", icon: Briefcase, label: "Dashboard Finance", roles: ["finance"] },
        { key: "laba", to: "/admin/laba", icon: TrendingUp, label: "Laba", roles: ["finance"] },
      ],
    },
    {
      title: "Manajemen Keuangan",
      items: [
        { key: "petty-cash", to: "/admin/petty-cash", icon: Coins, label: "Petty Cash", roles: ["finance"] },
        { key: "tagihan-payroll", to: "/admin/tagihan-payroll", icon: ReceiptText, label: "Tagihan Payroll HRD", roles: ["finance"] },
        { key: "arsip-cashflow", to: "/admin/arsip-cash-flow", icon: FolderOpen, label: "Arsip Cash Flow", roles: ["finance"] },
      ],
    },
  ];

  const renderMenus = () => {
    const role = user?.role;
    let groupsToRender = menuGroups;
    if (role === "master_admin") groupsToRender = masterMenuGroups;
    else if (role === "hrd") groupsToRender = hrdMenuGroups;
    else if (role === "finance") groupsToRender = financeMenuGroups;
    
    return groupsToRender
      .map((group) => {
        const items = group.items.filter((item) => item.roles.includes(role));
        if (items.length === 0) return null;
        return (
          <div key={group.title} className="space-y-1.5">
            <div className="px-3 pt-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
              {group.title}
            </div>
            {items.map(({ key, to, icon: Icon, label }) => {
              return (
                <NavLink key={key} to={to} className={linkClass}>
                  <Icon size={18} className="shrink-0" />
                  <span className="truncate">{label}</span>
                </NavLink>
              );
            })}
          </div>
        );
      })
      .filter(Boolean);
  };

  return (
    <div className="min-h-screen bg-navy-950 flex" data-testid="admin-layout">
      <aside className="fixed left-0 top-0 flex h-screen w-72 flex-col border-r border-white/10 bg-navy-900">
        <div className="border-b border-white/10 p-5">
          <Logo />
        </div>
        <div className="mx-4 mt-4 rounded-xl border border-white/10 bg-navy-800/80 p-4">
          <div className="truncate text-sm font-semibold text-white">{user?.name || user?.email}</div>
          <div className="text-brand-orange text-xs font-bold uppercase tracking-wide mt-1">{roleLabel}</div>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {renderMenus()}
        </nav>
        <div className="space-y-2 border-t border-white/10 p-4">
          <a
            href="/presensi"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-orange/15 border border-brand-orange/30 px-3.5 py-2.5 text-xs font-bold text-brand-orange hover:bg-brand-orange hover:text-white transition-all shadow-md"
          >
            <Smartphone size={16} /> Presensi Mobile (PWA)
          </a>
          <button onClick={doLogout} data-testid="logout-btn" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10">
            <LogOut size={18} /> <span>Logout</span>
          </button>
        </div>
      </aside>
      <main className="ml-72 min-h-screen flex-1 overflow-x-hidden p-6 xl:p-8">
        <Outlet />
      </main>
    </div>
  );
}
