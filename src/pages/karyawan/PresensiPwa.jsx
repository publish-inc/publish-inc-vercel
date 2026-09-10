import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import {
  Camera,
  Upload,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Send,
  User,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Smartphone,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { api, formatApiErrorDetail } from "../../lib/api";
import {
  calculateDistanceMeters,
  getAttendanceRecords,
  getLeaveQuotas,
  getLeaveRequests,
  getOfficeSettings,
  recordCheckIn,
  recordCheckOut,
  submitLeaveRequest,
} from "../../lib/attendance";

export default function PresensiPwa() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("absen"); // 'absen', 'izin', 'riwayat'
  const [now, setNow] = useState(new Date());
  const [officeSettings, setOfficeSettings] = useState(getOfficeSettings());
  const [todayRecord, setTodayRecord] = useState(null);

  // GPS state
  const [userLocation, setUserLocation] = useState(null);
  const [distanceMeters, setDistanceMeters] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");

  // Camera & Photo state
  const [cameraActive, setCameraActive] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Leave Form state
  const [leaveQuotas, setLeaveQuotas] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [uploadingLeaveAttachment, setUploadingLeaveAttachment] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    type: "cuti",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
    reason: "",
    attachment_url: "",
  });
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  // Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Attendance Records & Leave Quotas
  const loadData = () => {
    const records = getAttendanceRecords();
    const todayStr = new Date().toISOString().slice(0, 10);
    const rec = records.find((r) => r.user_id === (user?.id || "demo-cs") && r.date === todayStr);
    setTodayRecord(rec || null);

    setOfficeSettings(getOfficeSettings());
    setLeaveQuotas(getLeaveQuotas());
    setLeaveRequests(getLeaveRequests());
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Request GPS Location
  const detectGps = () => {
    if (!navigator.geolocation) {
      setGpsError("Browser Anda tidak mendukung fitur lokasi GPS.");
      return;
    }

    setGpsLoading(true);
    setGpsError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const dist = calculateDistanceMeters(lat, lng, officeSettings.latitude, officeSettings.longitude);

        setUserLocation({ latitude: lat, longitude: lng });
        setDistanceMeters(dist);
        setGpsLoading(false);
        toast.success(`Lokasi terdeteksi (${dist}m dari kantor)`);
      },
      (err) => {
        setGpsLoading(false);
        setGpsError("Gagal mengambil posisi GPS. Pastikan Izin Lokasi diizinkan pada HP Anda.");
        toast.error("Gagal mendapatkan koordinat GPS.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    detectGps();
  }, []);

  // Camera Management
  const startCamera = async () => {
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast.error("Gagal membuka kamera. Anda dapat memilih foto dari galeri HP.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setPhotoDataUrl(dataUrl);
    stopCamera();
    toast.success("Foto selfie diambil!");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoDataUrl(event.target?.result);
      toast.success("Foto berhasil diunggah!");
    };
    reader.readAsDataURL(file);
  };

  const uploadDataUrl = async (dataUrl, category, filename) => {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const fd = new FormData();
    fd.append("file", blob, filename);
    fd.append("category", category);
    const { data } = await api.post("/upload", fd);
    return data.url;
  };

  // Submit Check In / Check Out
  const handleCheckIn = async () => {
    if (!photoDataUrl) return toast.error("Foto selfie wajib diambil/diunggah terlebih dahulu.");
    if (distanceMeters !== null && distanceMeters > officeSettings.radius_meters) {
      toast.warning(`Lokasi Anda (${distanceMeters}m) berada di luar radius kantor (${officeSettings.radius_meters}m). Absen tetap dicatat dengan catatan.`);
    }

    const loc = {
      latitude: userLocation?.latitude || officeSettings.latitude,
      longitude: userLocation?.longitude || officeSettings.longitude,
      address: distanceMeters !== null ? `GPS: ${distanceMeters}m dari kantor` : "Lokasi Kantor",
      distance_meters: distanceMeters || 0,
    };

    let photoUrl = photoDataUrl;
    try {
      photoUrl = await uploadDataUrl(photoDataUrl, "hrd_attendance_in", `absen-masuk-${user?.id || "karyawan"}.jpg`);
    } catch (error) {
      toast.error(formatApiErrorDetail(error.response?.data?.detail || error.message));
      return;
    }
    const rec = recordCheckIn(user || { id: "demo-cs", name: "Karyawan PI", role: "cs" }, loc, photoUrl, "Absen via PWA Mobile");
    setTodayRecord(rec);
    setPhotoDataUrl(null);
    toast.success("Absen Masuk Berhasil!");
    loadData();
  };

  const handleCheckOut = async () => {
    if (!todayRecord) return toast.error("Anda belum melakukan Absen Masuk hari ini.");
    let photoUrl = photoDataUrl;
    if (photoDataUrl) {
      try {
        photoUrl = await uploadDataUrl(photoDataUrl, "hrd_attendance_out", `absen-pulang-${user?.id || "karyawan"}.jpg`);
      } catch (error) {
        toast.error(formatApiErrorDetail(error.response?.data?.detail || error.message));
        return;
      }
    }
    const rec = recordCheckOut(user || { id: "demo-cs", name: "Karyawan PI", role: "cs" }, photoUrl);
    setTodayRecord(rec);
    setPhotoDataUrl(null);
    toast.success("Absen Pulang Berhasil! Sampai jumpa besok.");
    loadData();
  };

  // User Leave Quota
  const userQuota = leaveQuotas.find((q) => q.user_id === (user?.id || "demo-cs")) || {
    total_quota: 12,
    used_days: 0,
    remaining_days: 12,
  };

  const userLeaveHistory = leaveRequests.filter((r) => r.user_id === (user?.id || "demo-cs"));

  // Handle Leave Request Submission
  const handleLeaveSubmit = (e) => {
    e.preventDefault();
    if (!leaveForm.reason.trim()) return toast.error("Alasan pengajuan wajib diisi.");

    const start = new Date(leaveForm.start_date);
    const end = new Date(leaveForm.end_date);
    if (end < start) return toast.error("Tanggal selesai tidak boleh sebelum tanggal mulai.");

    const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (leaveForm.type === "cuti" && diffDays > userQuota.remaining_days) {
      return toast.error(`Pengajuan cuti (${diffDays} hari) melebihi sisa jatah cuti Anda (${userQuota.remaining_days} hari).`);
    }

    setLeaveSubmitting(true);
    submitLeaveRequest(user || { id: "demo-cs", name: "Karyawan PI", role: "cs" }, leaveForm);
    toast.success("Pengajuan berhasil dikirim! Menunggu persetujuan HRD.");

    setLeaveForm({
      type: "cuti",
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
      reason: "",
      attachment_url: "",
    });
    setLeaveSubmitting(false);
    loadData();
  };

  const uploadLeaveAttachment = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingLeaveAttachment(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", "hrd_leave");
    try {
      const { data } = await api.post("/upload", fd);
      setLeaveForm((current) => ({ ...current, attachment_url: data.drive_url || data.url }));
      toast.success("Lampiran berhasil diupload.");
    } catch (error) {
      toast.error(formatApiErrorDetail(error.response?.data?.detail || error.message));
    } finally {
      setUploadingLeaveAttachment(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 text-white font-sans pb-24 max-w-md mx-auto relative border-x border-white/10 shadow-2xl">
      {/* Mobile Top App Header */}
      <div className="bg-gradient-to-b from-navy-900 via-navy-900 to-navy-950 p-5 border-b border-white/10 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange font-bold font-display text-lg shadow-md">
              {user?.name?.[0] || "P"}
            </div>
            <div>
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Presensi PWA Mobile</div>
              <div className="text-base font-bold text-white leading-tight">{user?.name || "Karyawan Publish Inc."}</div>
            </div>
          </div>
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> ONLINE
          </span>
        </div>

        {/* Live Digital Clock & Status Badge */}
        <div className="mt-5 bg-navy-900/90 border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-xl">
          <div>
            <div className="text-3xl font-display font-black text-white font-mono tracking-tight">
              {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
            <div className="text-xs text-slate-400 mt-0.5 font-medium">
              {now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Status Hari Ini</div>
            <span
              className={`inline-block mt-1 px-3 py-1 rounded-lg text-xs font-black uppercase ${
                todayRecord
                  ? todayRecord.status === "hadir"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-navy-800 text-slate-400 border border-white/10"
              }`}
            >
              {todayRecord ? (todayRecord.status === "hadir" ? "Hadir" : "Terlambat") : "Belum Absen"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Container Content */}
      <div className="p-4 space-y-5">
        {/* TAB 1: ABSENSI GPS & SELFIE */}
        {activeTab === "absen" && (
          <div className="space-y-4">
            {/* GPS Geofencing Widget */}
            <div className="bg-navy-900 rounded-2xl p-4 border border-white/10 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                  <MapPin size={18} className="text-brand-orange" />
                  <span>Deteksi Radius GPS Kantor</span>
                </div>
                <button
                  onClick={detectGps}
                  disabled={gpsLoading}
                  className="p-1.5 text-xs text-brand-orange hover:bg-brand-orange/10 rounded-lg flex items-center gap-1 font-bold"
                >
                  <RefreshCw size={14} className={gpsLoading ? "animate-spin" : ""} /> Refresh
                </button>
              </div>

              {gpsLoading ? (
                <div className="text-xs text-slate-400 py-2 flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-brand-orange" /> Menghitung posisi GPS...
                </div>
              ) : gpsError ? (
                <div className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{gpsError}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                      distanceMeters !== null && distanceMeters <= officeSettings.radius_meters
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="shrink-0" />
                      <span>
                        {distanceMeters !== null
                          ? distanceMeters <= officeSettings.radius_meters
                            ? `Di Dalam Radius Kantor (${distanceMeters}m)`
                            : `Di Luar Radius Kantor (${distanceMeters}m)`
                          : "Lokasi Siap"}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">Max {officeSettings.radius_meters}m</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Titik Kantor: {officeSettings.office_name} (Jam kerja {officeSettings.work_start_time} - {officeSettings.work_end_time})
                  </div>
                </div>
              )}
            </div>

            {/* Selfie Photo Camera Widget */}
            <div className="bg-navy-900 rounded-2xl p-4 border border-white/10 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                  <Camera size={18} className="text-brand-orange" />
                  <span>Foto Selfie Bukti Absen</span>
                </div>
                {photoDataUrl && (
                  <button onClick={() => setPhotoDataUrl(null)} className="text-xs text-rose-400 font-bold hover:underline">
                    Hapus Foto
                  </button>
                )}
              </div>

              {/* Camera Preview / Photo Display */}
              <div className="relative rounded-2xl overflow-hidden bg-navy-950 border border-white/10 aspect-[4/3] flex items-center justify-center">
                {photoDataUrl ? (
                  <img src={photoDataUrl} alt="Selfie Absen" className="w-full h-full object-cover" />
                ) : cameraActive ? (
                  <div className="relative w-full h-full">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <button
                      onClick={capturePhoto}
                      className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-brand-orange hover:bg-brand-orange-dark text-white font-bold px-6 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-sm border-2 border-white/20"
                    >
                      <Camera size={18} /> Ambil Foto
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-6 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-navy-900 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                      <Camera size={32} />
                    </div>
                    <div className="text-xs text-slate-400">Silakan ambil foto selfie langsung atau upload file foto HP.</div>
                    <div className="flex justify-center gap-2 pt-1">
                      <button
                        onClick={startCamera}
                        className="bg-brand-orange hover:bg-brand-orange-dark text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md"
                      >
                        <Camera size={14} /> Buka Kamera
                      </button>
                      <label className="bg-navy-800 hover:bg-navy-700 text-slate-300 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 border border-white/10 cursor-pointer">
                        <FileText size={14} /> Upload Foto
                        <input type="file" accept="image/*" capture="user" onChange={handleFileUpload} className="hidden" />
                      </label>
                    </div>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
            </div>

            {/* Attendance Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleCheckIn}
                disabled={!!todayRecord}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-display font-black py-4 px-4 rounded-2xl shadow-xl flex flex-col items-center justify-center gap-1 transition-transform active:scale-95"
              >
                <div className="flex items-center gap-2 text-lg">
                  <CheckCircle2 size={22} /> Absen Masuk
                </div>
                <span className="text-[11px] font-sans font-normal opacity-90">
                  {todayRecord ? `Jam ${new Date(todayRecord.check_in_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}` : "Mulai Jam Kerja"}
                </span>
              </button>

              <button
                onClick={handleCheckOut}
                disabled={!todayRecord || !!todayRecord.check_out_time}
                className="bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white font-display font-black py-4 px-4 rounded-2xl shadow-xl flex flex-col items-center justify-center gap-1 transition-transform active:scale-95"
              >
                <div className="flex items-center gap-2 text-lg">
                  <LogOut size={22} /> Absen Pulang
                </div>
                <span className="text-[11px] font-sans font-normal opacity-90">
                  {todayRecord?.check_out_time ? `Jam ${new Date(todayRecord.check_out_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}` : "Selesai Jam Kerja"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: PENGAJUAN CUTI / IZIN / SAKIT / DINAS */}
        {activeTab === "izin" && (
          <div className="space-y-5">
            {/* User Leave Quota Badge */}
            <div className="bg-gradient-to-r from-brand-orange/20 to-brand-blue/20 rounded-2xl p-4 border border-white/10 flex items-center justify-between shadow-xl">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Jatah Cuti Tahunan Anda</div>
                <div className="text-xl font-black text-white mt-0.5">
                  <span className="text-brand-orange font-mono">{userQuota.remaining_days}</span> / {userQuota.total_quota} Hari Tersisa
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-brand-orange/20 border border-brand-orange/30 flex items-center justify-center text-brand-orange font-bold">
                <Calendar size={24} />
              </div>
            </div>

            {/* Leave Form */}
            <form onSubmit={handleLeaveSubmit} className="bg-navy-900 rounded-2xl p-4 border border-white/10 shadow-lg space-y-4">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Send size={16} className="text-brand-orange" /> Form Pengajuan Izin / Cuti
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Kategori Pengajuan *</label>
                <select
                  value={leaveForm.type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
                  className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-semibold outline-none focus:border-brand-orange"
                >
                  <option value="cuti">🏖️ Cuti Tahunan</option>
                  <option value="sakit">🤒 Sakit (Membutuhkan Surat Dokter)</option>
                  <option value="izin">✉️ Izin Kepentingan Pribadi</option>
                  <option value="dinas">🚗 Dinas Luar / Tugas Lapangan</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mulai *</label>
                  <input
                    type="date"
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Selesai *</label>
                  <input
                    type="date"
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-brand-orange"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Alasan / Keterangan *</label>
                <textarea
                  rows="3"
                  placeholder="Tuliskan alasan pengajuan secara jelas..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full bg-navy-950 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-brand-orange resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">URL / Link Lampiran (Opsional)</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Link foto surat dokter / lampiran..."
                    value={leaveForm.attachment_url}
                    onChange={(e) => setLeaveForm({ ...leaveForm, attachment_url: e.target.value })}
                    className="w-full bg-navy-950 border border-white/10 rounded-xl px-3.5 py-2 text-white text-xs outline-none focus:border-brand-orange"
                  />
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-navy-950 px-3.5 py-2 text-xs font-bold text-white hover:border-brand-orange">
                    <Upload size={14} /> {uploadingLeaveAttachment ? "Mengupload..." : "Upload Lampiran"}
                    <input type="file" accept="image/*,.pdf,.doc,.docx" onChange={uploadLeaveAttachment} className="hidden" />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={leaveSubmitting}
                className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-bold py-3 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Send size={16} /> Kirim Pengajuan ke HRD
              </button>
            </form>

            {/* Past Leave Requests History */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Riwayat Pengajuan Anda</h4>
              {userLeaveHistory.map((item) => (
                <div key={item.id} className="bg-navy-900 border border-white/10 rounded-xl p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white capitalize">
                      {item.type === "cuti" ? "🏖️ Cuti" : item.type === "sakit" ? "🤒 Sakit" : item.type === "izin" ? "✉️ Izin" : "🚗 Dinas"}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        item.status && item.status.startsWith("approved")
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : item.status === "rejected"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {item.status === "approved_unpaid"
                        ? "Disetujui (Potong Gaji)"
                        : item.status === "approved_cuti" || item.status === "approved"
                        ? "Disetujui (Potong Cuti)"
                        : item.status === "approved_paid"
                        ? "Disetujui (Tanpa Potong)"
                        : item.status === "rejected"
                        ? "Ditolak"
                        : "Pending HRD"}
                    </span>
                  </div>
                  <div className="text-slate-300">
                    Tangal: <strong>{item.start_date}</strong> s/d <strong>{item.end_date}</strong> ({item.total_days} Hari)
                  </div>
                  <div className="text-slate-400 italic">"{item.reason}"</div>
                  {item.hr_notes && <div className="text-[11px] text-amber-300 pt-1 border-t border-white/5">Catatan HRD: {item.hr_notes}</div>}
                </div>
              ))}
              {userLeaveHistory.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-xs bg-navy-900/50 rounded-xl border border-dashed border-white/10">
                  Belum ada riwayat pengajuan.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: RIWAYAT ABSENSI SAYA */}
        {activeTab === "riwayat" && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Riwayat Kehadiran Bulan Ini</h3>
            <div className="space-y-2">
              {getAttendanceRecords()
                .filter((r) => r.user_id === (user?.id || "demo-cs"))
                .map((rec) => (
                  <div key={rec.id} className="bg-navy-900 border border-white/10 rounded-xl p-3.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">{rec.date}</div>
                      <div className="text-slate-400 mt-0.5">
                        Masuk: <span className="text-emerald-400 font-mono font-bold">{rec.check_in_time ? new Date(rec.check_in_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</span> &bull; Pulang: <span className="text-rose-400 font-mono font-bold">{rec.check_out_time ? new Date(rec.check_out_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                        rec.status === "hadir" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {rec.status}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Tab Navigation */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-navy-900/95 border-t border-white/10 backdrop-blur-lg px-6 py-2 flex items-center justify-around z-40">
        <button
          onClick={() => setActiveTab("absen")}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === "absen" ? "text-brand-orange font-bold scale-105" : "text-slate-400"
          }`}
        >
          <Camera size={20} />
          <span className="text-[10px]">Absensi</span>
        </button>

        <button
          onClick={() => setActiveTab("izin")}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === "izin" ? "text-brand-orange font-bold scale-105" : "text-slate-400"
          }`}
        >
          <Calendar size={20} />
          <span className="text-[10px]">Izin / Cuti</span>
        </button>

        <button
          onClick={() => setActiveTab("riwayat")}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === "riwayat" ? "text-brand-orange font-bold scale-105" : "text-slate-400"
          }`}
        >
          <Clock size={20} />
          <span className="text-[10px]">Riwayat</span>
        </button>
      </div>
    </div>
  );
}
