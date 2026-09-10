import React, { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import HrdReportPdfModal from "../../components/HrdReportPdfModal";

export default function DashboardHrd() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [suspendedUsers, setSuspendedUsers] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [activeTab, setActiveTab] = useState("users");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "cs", password: "", confirmPassword: "" });
  const [loadingForm, setLoadingForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      if (activeTab === "users") {
        const [uRes, sRes] = await Promise.all([
          api.get("/hrd/users"),
          api.get("/hrd/suspended-users")
        ]);
        setUsers(uRes.data || []);
        setSuspendedUsers(sRes.data || []);
      }
      if (activeTab === "payroll") {
        const { data } = await api.get("/hrd/payroll");
        setPayroll(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleUserStatus = async (userId, isCurrentlySuspended) => {
    if (!confirm(`Yakin ingin ${isCurrentlySuspended ? 'mengaktifkan' : 'men-suspend'} user ini?`)) return;
    try {
      await api.put(`/hrd/users/${userId}/status`, { status: isCurrentlySuspended ? "active" : "suspended" });
      fetchData();
    } catch (e) {
      alert("Gagal merubah status");
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      return alert("Password dan Ulangi Password tidak sama (saltik)!");
    }
    setLoadingForm(true);
    try {
      await api.post("/hrd/users", {
        name: form.name,
        email: form.email,
        role: form.role,
        password: form.password
      });
      alert("Karyawan berhasil ditambahkan!");
      setIsModalOpen(false);
      setForm({ name: "", email: "", role: "cs", password: "", confirmPassword: "" });
      fetchData();
    } catch (e) {
      alert(e.response?.data?.detail || "Gagal menambahkan karyawan");
    }
    setLoadingForm(false);
  };

  const formatRp = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num || 0);

  // Group payroll by user
  const groupedPayroll = payroll.reduce((acc, claim) => {
    const userEmail = claim.user_email || claim.created_by;
    if (!acc[userEmail]) {
      acc[userEmail] = { name: claim.user_name || userEmail, totalPoin: 0, claims: [] };
    }
    acc[userEmail].totalPoin += Number(claim.poin_diajukan || 0);
    acc[userEmail].claims.push(claim);
    return acc;
  }, {});

  const HARGA_PER_POIN = 1000; // Contoh rate konversi poin KPI ke Rupiah

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">HRD Dashboard</h1>
          <p className="text-gray-500">Manajemen Karyawan & Rekap Payroll/KPI</p>
        </div>
        <button
          onClick={() => setShowReportModal(true)}
          className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg text-xs"
        >
          <Printer size={16} /> Unduh PDF Laporan Bulanan HRD
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: "users", label: "Manajemen Akun" },
          { id: "payroll", label: "Rekap Payroll / KPI" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`py-2 px-4 font-medium text-sm ${
              activeTab === t.id
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "users" && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Daftar Karyawan / Akses</h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
            >
              + Tambah Karyawan
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="p-3 text-sm font-semibold text-gray-600">Nama Lengkap</th>
                  <th className="p-3 text-sm font-semibold text-gray-600">Email</th>
                  <th className="p-3 text-sm font-semibold text-gray-600">Role Divisi</th>
                  <th className="p-3 text-sm font-semibold text-gray-600">Status</th>
                  <th className="p-3 text-sm font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSuspended = suspendedUsers.includes(u.id);
                  return (
                    <tr key={u.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{u.name}</td>
                      <td className="p-3">{u.email}</td>
                      <td className="p-3 uppercase text-xs font-semibold text-gray-500">{u.role}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${isSuspended ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td className="p-3">
                        {u.role !== 'master_admin' && (
                          <button
                            onClick={() => toggleUserStatus(u.id, isSuspended)}
                            className={`text-sm px-3 py-1 rounded text-white ${isSuspended ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                          >
                            {isSuspended ? 'Aktifkan' : 'Suspend'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "payroll" && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <h2 className="text-xl font-bold mb-4">Rekap Payroll KPI (Disetujui)</h2>
          <p className="text-sm text-gray-500 mb-6">Rate Asumsi: Rp 1.000 / Poin KPI</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="p-3 text-sm font-semibold text-gray-600">Karyawan</th>
                  <th className="p-3 text-sm font-semibold text-gray-600">Total Tugas ACC</th>
                  <th className="p-3 text-sm font-semibold text-gray-600">Total Poin KPI</th>
                  <th className="p-3 text-sm font-semibold text-gray-600">Estimasi Insentif</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(groupedPayroll).length === 0 && <tr><td colSpan="4" className="p-4 text-center text-gray-500">Belum ada data KPI yang disetujui.</td></tr>}
                {Object.entries(groupedPayroll).map(([email, data]) => (
                  <tr key={email} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium">{data.name}</div>
                      <div className="text-xs text-gray-500">{email}</div>
                    </td>
                    <td className="p-3">{data.claims.length} Tugas</td>
                    <td className="p-3 font-semibold text-indigo-600">{data.totalPoin} Poin</td>
                    <td className="p-3 font-bold text-gray-900">{formatRp(data.totalPoin * HARGA_PER_POIN)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Tambah Karyawan Baru</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role / Divisi</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500">
                  <option value="cs">Customer Service (CS)</option>
                  <option value="cco">Chief Creative Officer (CCO)</option>
                  <option value="pic_editor">PIC Editor</option>
                  <option value="editor">Editor</option>
                  <option value="pic_layouter">PIC Layouter</option>
                  <option value="layouter">Layouter</option>
                  <option value="produksi">Tim Produksi Fisik</option>
                  <option value="campaign">Tim Campaign</option>
                  <option value="sosmed">Tim Sosmed</option>
                  <option value="finance">Finance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ulangi Password</label>
                <input required type="password" value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500" />
                {form.password && form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">Password tidak cocok!</p>
                )}
              </div>
              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">Batal</button>
                <button disabled={loadingForm} type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {loadingForm ? "Menyimpan..." : "Simpan Karyawan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      {showReportModal && (
        <HrdReportPdfModal
          users={users}
          suspendedUsers={suspendedUsers}
          payroll={payroll}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
