import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Landing from "./pages/Landing";
import Bookstore from "./pages/Bookstore";
import BookDetail from "./pages/BookDetail";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Login from "./pages/Login";
import AdminLayout from "./pages/admin/AdminLayout";
import BooksManager from "./pages/admin/BooksManager";
import CMSEditor from "./pages/admin/CMSEditor";
import UsersManager from "./pages/admin/UsersManager";
import CSInputan from "./pages/admin/CSInputan";
import CSCustomers from "./pages/admin/CSCustomers";
import CSOffers from "./pages/admin/CSOffers";
import CSInvoices from "./pages/admin/CSInvoices";
import KelolaDeal from "./pages/admin/KelolaDeal";
import RiwayatDeal from "./pages/admin/RiwayatDeal";
import NaskahDealCS from "./pages/admin/NaskahDealCS";
import AdministrasiSpk from "./pages/admin/AdministrasiSpk";
import AntrianNaskah from "./pages/admin/AntrianNaskah";
import CcoIntake from "./pages/admin/CcoIntake";
import DashboardTugas from "./pages/kreatif/DashboardTugas";
import ManajemenKpi from "./pages/hrd/ManajemenKpi";
import LaporanPayroll from "./pages/hrd/LaporanPayroll";
import InputKetidakhadiran from "./pages/hrd/InputKetidakhadiran";
import ArsipPayroll from "./pages/hrd/ArsipPayroll";
import SlipGaji from "./pages/hrd/SlipGaji";
import DashboardGlobal from "./pages/admin/DashboardGlobal";
import RoleKpiDashboard from "./pages/admin/RoleKpiDashboard";
import Marketplace from "./pages/admin/Marketplace";
import Campaign from "./pages/admin/Campaign";
import NaskahTracking from "./pages/admin/NaskahTracking";
import ReportDisplay from "./pages/admin/ReportDisplay";
import PengaturanSistem from "./pages/admin/PengaturanSistem";
import ManajemenNaskah from "./pages/admin/ManajemenNaskah";
import DeadlineKeterlambatan from "./pages/admin/DeadlineKeterlambatan";
import MarketplaceKalkulator from "./pages/admin/MarketplaceKalkulator";
import KelolaRoyalti from "./pages/admin/KelolaRoyalti";
import DashboardKpiPribadi from "./pages/kreatif/DashboardKpiPribadi";
import InputKpiManual from "./pages/kreatif/InputKpiManual";
import ApprovalKpiManual from "./pages/admin/ApprovalKpiManual";
import PublicTracking from "./pages/PublicTracking";
import PortalPenulis from "./pages/PortalPenulis";
import NotFound from "./pages/NotFound";
import DashboardProduksi from "./pages/admin/DashboardProduksi";
import DashboardCrm from "./pages/admin/DashboardCrm";
import DashboardCampaign from "./pages/admin/DashboardCampaign";
import DashboardSosmed from "./pages/admin/DashboardSosmed";
import DashboardFinance from "./pages/admin/DashboardFinance";
import PettyCash from "./pages/admin/PettyCash";
import TagihanPayroll from "./pages/admin/TagihanPayroll";
import Laba from "./pages/admin/Laba";
import ArsipCashFlow from "./pages/admin/ArsipCashFlow";
import PresensiPwa from "./pages/karyawan/PresensiPwa";
import ManajemenAbsensi from "./pages/hrd/ManajemenAbsensi";

const Protected = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading || user === null)
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center text-white">
        <div className="animate-spin h-10 w-10 border-2 border-brand-orange border-t-transparent rounded-full" />
      </div>
    );
  if (!user) return <Navigate to="/admin/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/admin" replace />;
  return children;
};

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <Toaster position="top-right" richColors theme="dark" />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/toko" element={<Bookstore />} />
            <Route path="/toko/:id" element={<BookDetail />} />
            <Route path="/kebijakan-privasi" element={<PrivacyPolicy />} />
            <Route path="/tracking-naskah" element={<PublicTracking />} />
            <Route path="/spk-approval" element={<PortalPenulis />} />
            <Route path="/presensi" element={<PresensiPwa />} />
            <Route path="/admin/login" element={<Login />} />
            <Route
              path="/admin"
              element={
                <Protected>
                  <AdminLayout />
                </Protected>
              }
            >
              <Route index element={<DashboardRedirect />} />
              <Route
                path="buku"
                element={
                  <Protected roles={["admin_marketplace", "master_admin"]}>
                    <BooksManager />
                  </Protected>
                }
              />
              <Route
                path="konten"
                element={
                  <Protected roles={["master_admin"]}>
                    <CMSEditor />
                  </Protected>
                }
              />
              <Route
                path="karyawan"
                element={
                  <Protected roles={["master_admin", "hrd"]}>
                    <UsersManager />
                  </Protected>
                }
              />
              <Route
                path="inputan-cs"
                element={
                  <Protected roles={["master_admin"]}>
                    <CSInputan />
                  </Protected>
                }
              />
              <Route
                path="customer"
                element={
                  <Protected roles={["cs"]}>
                    <CSCustomers />
                  </Protected>
                }
              />
              <Route
                path="penawaran"
                element={
                  <Protected roles={["cs"]}>
                    <CSOffers />
                  </Protected>
                }
              />
              <Route
                path="invoice"
                element={
                  <Protected roles={["cs"]}>
                    <CSInvoices />
                  </Protected>
                }
              />
              <Route
                path="deal-spk"
                element={
                  <Protected roles={["cs"]}>
                    <KelolaDeal />
                  </Protected>
                }
              />
              <Route
                path="riwayat-deal"
                element={
                  <Protected roles={["cs"]}>
                    <RiwayatDeal />
                  </Protected>
                }
              />
              <Route
                path="naskah-deal-cs"
                element={
                  <Protected roles={["cs"]}>
                    <NaskahDealCS />
                  </Protected>
                }
              />
              <Route
                path="administrasi-spk"
                element={
                  <Protected roles={["cco", "master_admin", "admin"]}>
                    <AdministrasiSpk />
                  </Protected>
                }
              />
              <Route
                path="antrian-naskah"
                element={
                  <Protected roles={["pic_editor", "pic_layouter"]}>
                    <AntrianNaskah />
                  </Protected>
                }
              />
              <Route
                path="tugas-produksi"
                element={
                  <Protected roles={["editor", "layouter", "pic_editor", "pic_layouter"]}>
                    <DashboardTugas />
                  </Protected>
                }
              />
              <Route
                path="dashboard-kpi"
                element={
                  <Protected roles={["cs", "admin", "cco", "pic_editor", "pic_layouter", "editor", "layouter", "hrd", "admin_marketplace", "campaign", "sosmed", "crm", "finance", "produksi"]}>
                    <RoleKpiDashboard />
                  </Protected>
                }
              />
              <Route
                path="manajemen-kpi"
                element={
                  <Protected roles={["hrd"]}>
                    <ManajemenKpi />
                  </Protected>
                }
              />
              <Route
                path="manajemen-absensi"
                element={
                  <Protected roles={["hrd", "master_admin"]}>
                    <ManajemenAbsensi />
                  </Protected>
                }
              />
              <Route
                path="laporan-payroll"
                element={
                  <Protected roles={["hrd"]}>
                    <LaporanPayroll />
                  </Protected>
                }
              />

              <Route
                path="arsip-payroll"
                element={
                  <Protected roles={["hrd"]}>
                    <ArsipPayroll />
                  </Protected>
                }
              />
              <Route
                path="slip-gaji"
                element={
                  <Protected roles={["hrd"]}>
                    <SlipGaji />
                  </Protected>
                }
              />
              <Route
                path="dashboard-global"
                element={
                  <Protected roles={["pimpinan", "master_admin"]}>
                    <DashboardGlobal />
                  </Protected>
                }
              />
              <Route
                path="input-kpi"
                element={
                  <Protected roles={["master_admin", "pimpinan", "admin", "cco", "pic_editor", "editor", "pic_layouter", "layouter", "hrd", "admin_marketplace", "campaign", "sosmed", "crm", "finance", "produksi"]}>
                    <InputKpiManual />
                  </Protected>
                }
              />
              <Route
                path="kpi-pribadi"
                element={
                  <Protected roles={["master_admin", "pimpinan", "admin", "cs", "cco", "pic_editor", "editor", "pic_layouter", "layouter", "hrd", "admin_marketplace", "campaign", "sosmed", "crm", "finance", "produksi"]}>
                    <DashboardKpiPribadi />
                  </Protected>
                }
              />
              <Route
                path="approval-kpi"
                element={
                  <Protected roles={["pic_editor", "pic_layouter", "master_admin"]}>
                    <ApprovalKpiManual />
                  </Protected>
                }
              />
              <Route
                path="pengaturan-sistem"
                element={
                  <Protected roles={["master_admin"]}>
                    <PengaturanSistem />
                  </Protected>
                }
              />
              <Route
                path="manajemen-naskah"
                element={
                  <Protected roles={["master_admin"]}>
                    <ManajemenNaskah />
                  </Protected>
                }
              />
              <Route
                path="master-antrian"
                element={
                  <Protected roles={["master_admin"]}>
                    <ManajemenNaskah forceTab="antrian" />
                  </Protected>
                }
              />
              <Route
                path="master-berjalan"
                element={
                  <Protected roles={["master_admin"]}>
                    <ManajemenNaskah forceTab="berjalan" />
                  </Protected>
                }
              />
              <Route
                path="master-hapus"
                element={
                  <Protected roles={["master_admin"]}>
                    <ManajemenNaskah forceTab="hapus" />
                  </Protected>
                }
              />
              <Route
                path="koreksi-kpi"
                element={
                  <Protected roles={["master_admin"]}>
                    <ApprovalKpiManual forceTab="correction" />
                  </Protected>
                }
              />
              <Route
                path="deadline-keterlambatan"
                element={
                  <Protected roles={["master_admin"]}>
                    <DeadlineKeterlambatan />
                  </Protected>
                }
              />
              <Route
                path="marketplace"
                element={
                  <Protected roles={["admin_marketplace", "pimpinan", "master_admin"]}>
                    <Marketplace />
                  </Protected>
                }
              />
              <Route
                path="marketplace-kalkulator"
                element={
                  <Protected roles={["admin_marketplace", "pimpinan", "master_admin"]}>
                    <MarketplaceKalkulator />
                  </Protected>
                }
              />
              <Route
                path="kelola-royalti"
                element={
                  <Protected roles={["admin_marketplace", "pimpinan", "master_admin"]}>
                    <KelolaRoyalti />
                  </Protected>
                }
              />
              <Route
                path="campaign"
                element={
                  <Protected roles={["campaign", "pimpinan", "master_admin"]}>
                    <Campaign />
                  </Protected>
                }
              />
              <Route
                path="campaign/input-event"
                element={
                  <Protected roles={["campaign", "master_admin"]}>
                    <DashboardCampaign mode="input" />
                  </Protected>
                }
              />
              <Route
                path="campaign/pendaftar"
                element={
                  <Protected roles={["campaign", "master_admin"]}>
                    <DashboardCampaign mode="registrants" />
                  </Protected>
                }
              />
              <Route
                path="naskah-tracking"
                element={
                  <Protected roles={["master_admin", "pimpinan"]}>
                    <NaskahTracking />
                  </Protected>
                }
              />
              <Route
                path="cco-tracking"
                element={
                  <Protected roles={["cco"]}>
                    <NaskahTracking />
                  </Protected>
                }
              />
              <Route
                path="cco-intake"
                element={
                  <Protected roles={["cco"]}>
                    <CcoIntake />
                  </Protected>
                }
              />
              <Route
                path="report-display"
                element={
                  <Protected roles={["report", "master_admin", "pimpinan"]}>
                    <ReportDisplay />
                  </Protected>
                }
              />
              <Route
                path="dashboard-produksi"
                element={
                  <Protected roles={["produksi", "master_admin", "pimpinan"]}>
                    <DashboardProduksi />
                  </Protected>
                }
              />
              <Route
                path="dashboard-crm"
                element={
                  <Protected roles={["crm", "master_admin", "pimpinan"]}>
                    <DashboardCrm />
                  </Protected>
                }
              />
              <Route
                path="dashboard-campaign"
                element={
                  <Protected roles={["campaign", "master_admin", "pimpinan"]}>
                    <DashboardCampaign mode="calendar" />
                  </Protected>
                }
              />
              <Route
                path="sosmed/input-konten"
                element={
                  <Protected roles={["sosmed", "master_admin"]}>
                    <DashboardSosmed mode="input" />
                  </Protected>
                }
              />
              <Route
                path="dashboard-sosmed"
                element={
                  <Protected roles={["sosmed", "master_admin", "pimpinan"]}>
                    <DashboardSosmed mode="calendar" />
                  </Protected>
                }
              />
              <Route
                path="dashboard-finance"
                element={
                  <Protected roles={["finance", "master_admin", "pimpinan"]}>
                    <DashboardFinance />
                  </Protected>
                }
              />
              <Route
                path="petty-cash"
                element={
                  <Protected roles={["finance", "master_admin", "pimpinan"]}>
                    <PettyCash />
                  </Protected>
                }
              />
              <Route
                path="tagihan-payroll"
                element={
                  <Protected roles={["finance", "master_admin", "pimpinan"]}>
                    <TagihanPayroll />
                  </Protected>
                }
              />
              <Route
                path="laba"
                element={
                  <Protected roles={["finance", "master_admin", "pimpinan"]}>
                    <Laba />
                  </Protected>
                }
              />
              <Route
                path="arsip-cash-flow"
                element={
                  <Protected roles={["finance", "master_admin", "pimpinan"]}>
                    <ArsipCashFlow />
                  </Protected>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

const DashboardRedirect = () => {
  const { user } = useAuth();
  if (user?.role === "master_admin" || user?.role === "pimpinan") return <Navigate to="/admin/dashboard-global" replace />;
  if (user?.role === "finance") return <Navigate to="/admin/dashboard-finance" replace />;
  if (["cs", "admin", "cco", "pic_editor", "pic_layouter", "editor", "layouter", "hrd", "admin_marketplace", "campaign", "sosmed", "crm", "produksi"].includes(user?.role)) return <Navigate to="/admin/dashboard-kpi" replace />;
  if (user?.role === "report") return <Navigate to="/admin/report-display" replace />;
  return <Navigate to="/admin/buku" replace />;
};

export default App;
