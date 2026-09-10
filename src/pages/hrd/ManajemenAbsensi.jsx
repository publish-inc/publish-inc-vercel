import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Settings,
  Save,
  Search,
  Eye,
  Check,
  X,
  FileText,
  Building,
  UserCheck,
  UserX,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAttendanceRecords,
  getLeaveQuotas,
  getLeaveRequests,
  getOfficeSettings,
  saveLeaveQuota,
  saveOfficeSettings,
  updateLeaveRequestStatus,
} from "../../lib/attendance";
import { demoUsers } from "../../lib/demoData";
import { formatRupiah } from "../../lib/api";

export default function ManajemenAbsensi() {
  const [activeTab, setActiveTab] = useState("today"); // 'today', 'approval', 'quotas', 'settings'
  const [records, setRecords] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveQuotas, setLeaveQuotas] = useState([]);
  const [officeSettings, setOfficeSettings] = useState(getOfficeSettings());
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  // HR Approval Note modal state
  const [activeRequest, setActiveRequest] = useState(null);
  const [hrNoteInput, setHrNoteInput] = useState("");

  const loadData = () => {
    setRecords(getAttendanceRecords());
    setLeaveRequests(getLeaveRequests());
    setLeaveQuotas(getLeaveQuotas());
    setOfficeSettings(getOfficeSettings());
  };

  useEffect(() => {
    loadData();
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecords = records.filter((r) => r.date === todayStr);

  const stats = {
    totalHadir: todayRecords.filter((r) => r.status === "hadir").length,
    totalTerlambat: todayRecords.filter((r) => r.status === "terlambat").length,
    totalIzinCuti: leaveRequests.filter((r) => r.status && r.status.startsWith("approved") && r.start_date <= todayStr && r.end_date >= todayStr).length,
    totalKaryawan: demoUsers.length,
  };

  const handleApproval = (reqId, statusType, defaultNote, successMsg) => {
    updateLeaveRequestStatus(reqId, statusType, hrNoteInput || defaultNote);
    toast.success(successMsg);
    setActiveRequest(null);
    setHrNoteInput("");
    loadData();
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case "approved_unpaid":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
            Approved (Potong Gaji)
          </span>
        );
      case "approved_cuti":
      case "approved":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
            Approved (Potong Cuti)
          </span>
        );
      case "approved_paid":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Approved Saja (Tanpa Potong)
          </span>
        );
      case "rejected":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
            Ditolak
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
            Menunggu HRD
          </span>
        );
    }
  };

  const handleSaveOfficeSettings = (e) => {
    e.preventDefault();
    saveOfficeSettings(officeSettings);
    toast.success("Pengaturan lokasi & jam kantor berhasil disimpan!");
  };

  const handleSaveQuota = (userId, quotaVal) => {
    saveLeaveQuota(userId, quotaVal);
    toast.success("Jatah cuti karyawan diperbarui!");
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Top Title & Stats */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <UserCheck className="text-brand-orange" size={32} /> Manajemen Absensi &amp; Cuti HRD
          </h1>
          <p className="text-slate-400 mt-1">
            Monitoring kehadiran real-time, persetujuan cuti/izin, dan pengaturan jatah cuti karyawan.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 min-w-[340px]">
          <StatCard label="Hadir Tepat Waktu" value={stats.totalHadir} highlight />
          <StatCard label="Terlambat" value={stats.totalTerlambat} />
          <StatCard label="Izin / Cuti" value={stats.totalIzinCuti} />
          <StatCard label="Total Karyawan" value={stats.totalKaryawan} />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {[
          { id: "today", label: "Absensi Hari Ini", icon: Clock },
          { id: "approval", label: `Approval Cuti (${leaveRequests.filter((r) => r.status === "pending").length})`, icon: Calendar },
          { id: "quotas", label: "Jatah Cuti Karyawan", icon: User },
          { id: "settings", label: "Pengaturan GPS & Jam Kantor", icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                activeTab === tab.id ? "bg-brand-orange text-white" : "bg-navy-800 text-slate-400 hover:bg-navy-700 hover:text-white"
              }`}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: MONITORING ABSENSI HARI INI */}
      {activeTab === "today" && (
        <div className="bg-navy-800 rounded-2xl border border-white/10 overflow-hidden shadow-xl space-y-4 p-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari karyawan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-navy-900 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white outline-none focus:border-brand-orange"
              />
            </div>
            <div className="text-xs text-slate-400 font-mono">Tanggal: {todayStr}</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-navy-900 text-xs uppercase tracking-wider text-slate-400 border-b border-white/10">
                <tr>
                  <th className="px-5 py-3">Nama Karyawan</th>
                  <th className="px-5 py-3">Jam Masuk</th>
                  <th className="px-5 py-3">Jam Pulang</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Jarak GPS</th>
                  <th className="px-5 py-3 text-center">Foto Selfie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {demoUsers
                  .filter((u) => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((u) => {
                    const rec = todayRecords.find((r) => r.user_id === u.id);
                    return (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-bold text-white">{u.name}</div>
                          <div className="text-xs text-slate-500 uppercase font-mono">{u.role}</div>
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-emerald-400">
                          {rec?.check_in_time ? new Date(rec.check_in_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-rose-400">
                          {rec?.check_out_time ? new Date(rec.check_out_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                              rec
                                ? rec.status === "hadir"
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-white/5 text-slate-500 border border-white/10"
                            }`}
                          >
                            {rec ? rec.status : "Belum Absen"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs font-mono text-slate-300">
                          {rec?.location?.distance_meters != null ? `${rec.location.distance_meters} meter` : "-"}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {rec?.photo_in ? (
                            <button
                              onClick={() => setSelectedPhoto(rec.photo_in)}
                              className="text-xs text-brand-orange hover:underline font-bold inline-flex items-center gap-1"
                            >
                              <Eye size={14} /> Lihat Foto
                            </button>
                          ) : (
                            <span className="text-xs text-slate-600">-</span>
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

      {/* TAB 2: APPROVAL CUTI & IZIN */}
      {activeTab === "approval" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leaveRequests.map((req) => (
              <div key={req.id} className="bg-navy-800 border border-white/10 rounded-2xl p-5 space-y-3 shadow-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-white text-base">{req.user_name}</div>
                    <div className="text-xs text-slate-500 uppercase font-mono">{req.user_role}</div>
                  </div>
                  {renderStatusBadge(req.status)}
                </div>

                <div className="bg-navy-900 rounded-xl p-3 text-xs space-y-1.5 border border-white/5">
                  <div className="text-slate-300">
                    Kategori: <strong className="text-brand-orange uppercase">{req.type}</strong> ({req.total_days} Hari)
                  </div>
                  <div className="text-slate-300">
                    Tanggal: <strong>{req.start_date}</strong> s/d <strong>{req.end_date}</strong>
                  </div>
                  <div className="text-slate-400 italic">"{req.reason}"</div>
                  {req.attachment_url && (
                    <div className="pt-1">
                      <a href={req.attachment_url} target="_blank" rel="noreferrer" className="text-brand-blue hover:underline text-[11px] font-bold">
                        📎 Lihat Surat / Bukti Lampiran
                      </a>
                    </div>
                  )}
                </div>

                {req.hr_notes && <div className="text-xs text-amber-300 italic">Catatan HRD: {req.hr_notes}</div>}

                {req.status === "pending" && (
                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Opsi Approval HRD:</div>
                    {req.type === "cuti" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleApproval(
                              req.id,
                              "approved_cuti",
                              "Disetujui: Potong Kuota Cuti Tahunan",
                              "Pengajuan cuti disetujui (Kuota cuti terpotong)!"
                            )
                          }
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md"
                        >
                          <Check size={16} /> Approve (Potong Cuti)
                        </button>
                        <button
                          onClick={() =>
                            handleApproval(
                              req.id,
                              "rejected",
                              "Ditolak oleh HRD",
                              "Pengajuan cuti ditolak oleh HRD!"
                            )
                          }
                          className="flex-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <X size={16} /> Tolak Cuti
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          onClick={() =>
                            handleApproval(
                              req.id,
                              "approved_unpaid",
                              "Disetujui: Potong Gaji (Kemnaker Unpaid Leave)",
                              "Pengajuan disetujui dengan Potong Gaji!"
                            )
                          }
                          className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold py-2.5 px-2 rounded-xl text-[11px] flex items-center justify-center gap-1 transition-colors"
                        >
                          <DollarSign size={14} className="text-amber-400" /> Approve Potong Gaji
                        </button>
                        <button
                          onClick={() =>
                            handleApproval(
                              req.id,
                              "approved_cuti",
                              "Disetujui: Potong Kuota Cuti Tahunan",
                              "Pengajuan disetujui dengan Potong Cuti!"
                            )
                          }
                          className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 font-bold py-2.5 px-2 rounded-xl text-[11px] flex items-center justify-center gap-1 transition-colors"
                        >
                          <Calendar size={14} className="text-blue-400" /> Approve Potong Cuti
                        </button>
                        <button
                          onClick={() =>
                            handleApproval(
                              req.id,
                              "approved_paid",
                              "Disetujui: Full Paid (Tanpa Potong)",
                              "Pengajuan disetujui tanpa potong gaji/cuti!"
                            )
                          }
                          className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold py-2.5 px-2 rounded-xl text-[11px] flex items-center justify-center gap-1 transition-colors"
                        >
                          <Check size={14} className="text-emerald-400" /> Approve Saja
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          {leaveRequests.length === 0 && (
            <div className="bg-navy-800 rounded-2xl p-12 text-center text-slate-500 border border-dashed border-white/10">
              Belum ada pengajuan cuti/izin.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: JATAH CUTI KARYAWAN */}
      {activeTab === "quotas" && (
        <div className="bg-navy-800 rounded-2xl border border-white/10 p-5 shadow-xl space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white">Atur Jatah Cuti Tahunan Karyawan</h3>
            <p className="text-slate-400 text-xs mt-0.5">Tentukan total kuota cuti per tahun untuk masing-masing karyawan.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-navy-900 text-xs uppercase tracking-wider text-slate-400 border-b border-white/10">
                <tr>
                  <th className="px-5 py-3">Nama Karyawan</th>
                  <th className="px-5 py-3">Total Jatah Cuti</th>
                  <th className="px-5 py-3">Cuti Terpakai</th>
                  <th className="px-5 py-3">Sisa Cuti</th>
                  <th className="px-5 py-3 w-36 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leaveQuotas.map((q) => (
                  <tr key={q.user_id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-white">{q.user_name}</div>
                      <div className="text-xs text-slate-500 uppercase font-mono">{q.user_role}</div>
                    </td>
                    <td className="px-5 py-4">
                      <input
                        type="number"
                        min="0"
                        value={q.total_quota}
                        onChange={(e) => handleSaveQuota(q.user_id, e.target.value)}
                        className="w-24 bg-navy-950 border border-white/10 rounded-lg px-3 py-1 text-brand-orange font-mono font-bold text-sm outline-none focus:border-brand-orange"
                      />
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-400">{q.used_days} Hari</td>
                    <td className="px-5 py-4 font-mono font-bold text-emerald-400">{q.remaining_days} Hari</td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-xs text-emerald-400 font-bold">✓ Saved</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PENGATURAN LOKASI GPS & JAM KANTOR */}
      {activeTab === "settings" && (
        <form onSubmit={handleSaveOfficeSettings} className="bg-navy-800 rounded-2xl border border-white/10 p-6 shadow-xl space-y-5 max-w-2xl">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Building size={20} className="text-brand-orange" /> Pengaturan Lokasi &amp; Radius Kantor GPS
            </h3>
            <p className="text-slate-400 text-xs mt-1">Atur titik GPS lokasi kantor dan toleransi keterlambatan untuk validasi PWA Mobile.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nama Kantor / Cabang</label>
              <input
                type="text"
                value={officeSettings.office_name}
                onChange={(e) => setOfficeSettings({ ...officeSettings, office_name: e.target.value })}
                className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-brand-orange"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Latitude Kantor *</label>
                <input
                  type="number"
                  step="any"
                  value={officeSettings.latitude}
                  onChange={(e) => setOfficeSettings({ ...officeSettings, latitude: Number(e.target.value) })}
                  className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-mono outline-none focus:border-brand-orange"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Longitude Kantor *</label>
                <input
                  type="number"
                  step="any"
                  value={officeSettings.longitude}
                  onChange={(e) => setOfficeSettings({ ...officeSettings, longitude: Number(e.target.value) })}
                  className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-mono outline-none focus:border-brand-orange"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Radius Absen (Meter)</label>
                <input
                  type="number"
                  value={officeSettings.radius_meters}
                  onChange={(e) => setOfficeSettings({ ...officeSettings, radius_meters: Number(e.target.value) })}
                  className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-brand-orange font-mono font-bold text-sm outline-none focus:border-brand-orange"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Jam Masuk (WIB/WITA)</label>
                <input
                  type="time"
                  value={officeSettings.work_start_time}
                  onChange={(e) => setOfficeSettings({ ...officeSettings, work_start_time: e.target.value })}
                  className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-brand-orange"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Toleransi Telat (Menit)</label>
                <input
                  type="number"
                  value={officeSettings.late_tolerance_mins}
                  onChange={(e) => setOfficeSettings({ ...officeSettings, late_tolerance_mins: Number(e.target.value) })}
                  className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-brand-orange"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="bg-brand-orange hover:bg-brand-orange-dark text-white font-bold px-6 py-3 rounded-xl shadow-lg transition-colors flex items-center gap-2 text-sm"
          >
            <Save size={18} /> Simpan Pengaturan Kantor
          </button>
        </form>
      )}

      {/* Selfie Photo Preview Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
          <div className="bg-navy-900 border border-white/10 rounded-2xl max-w-lg w-full p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-white font-bold text-sm">Foto Bukti Selfie Presensi</span>
              <button onClick={() => setSelectedPhoto(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <img src={selectedPhoto} alt="Bukti Selfie" className="w-full rounded-xl max-h-[70vh] object-contain bg-black" />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }) {
  return (
    <div className={`bg-navy-800 border border-white/10 rounded-xl p-3.5 ${highlight ? "bg-brand-orange/10 border-brand-orange/30" : ""}`}>
      <div className="text-[10px] text-slate-500 uppercase font-black tracking-wider">{label}</div>
      <div className={`font-black text-lg mt-0.5 truncate ${highlight ? "text-brand-orange font-mono" : "text-white"}`}>
        {value}
      </div>
    </div>
  );
}
