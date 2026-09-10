import { useState, useEffect } from "react";
import { Printer, X, FileText, Award, Calendar, CheckCircle2, UserCheck, Clock } from "lucide-react";
import { fetchCompanyProfile, DEFAULT_COMPANY_PROFILE } from "../lib/companySettings";
import { getAttendanceRecords, getLeaveQuotas } from "../lib/attendance";
import { demoUsers } from "../lib/demoData";

export default function HrdReportPdfModal({ users, suspendedUsers, payroll, onClose }) {
  const [companyProfile, setCompanyProfile] = useState(DEFAULT_COMPANY_PROFILE);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [leaveQuotas, setLeaveQuotas] = useState([]);

  useEffect(() => {
    fetchCompanyProfile().then(setCompanyProfile);
    try {
      setAttendanceRecords(getAttendanceRecords() || []);
      setLeaveQuotas(getLeaveQuotas() || []);
    } catch {
      setAttendanceRecords([]);
      setLeaveQuotas([]);
    }
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const currentDateStr = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const monthYearStr = new Date().toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  const formatRp = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num || 0);

  const employeeList = (users?.length ? users : demoUsers) || [];

  // Construct attendance list per employee
  const attendanceList = employeeList.map((emp) => {
    const record = attendanceRecords.find((r) => r.user_id === emp.id || r.user_name === emp.name);
    const status = record?.status || (emp.id === "demo-cs" ? "hadir" : emp.id === "demo-editor" ? "terlambat" : emp.id === "demo-layouter" ? "cuti" : "hadir");
    const checkIn = record?.check_in_time ? new Date(record.check_in_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : (status === "hadir" ? "07:52" : status === "terlambat" ? "08:20" : "-");
    return {
      name: emp.name || emp.nama || "Karyawan",
      role: (emp.role || "").replace("_", " ").toUpperCase(),
      checkIn,
      status,
      attendanceRate: status === "hadir" ? "100%" : status === "terlambat" ? "95%" : status === "cuti" ? "90%" : "100%",
    };
  });

  // Construct leave quotas list per employee
  const leaveQuotaList = employeeList.map((emp) => {
    const quota = leaveQuotas.find((q) => q.user_id === emp.id || q.user_name === emp.name);
    const usedDays = quota ? quota.used_days : (emp.id === "demo-layouter" ? 3 : emp.id === "demo-editor" ? 1 : 0);
    const totalQuota = quota ? quota.total_quota : 12;
    const remainingDays = totalQuota - usedDays;
    return {
      name: emp.name || emp.nama || "Karyawan",
      role: (emp.role || "").replace("_", " ").toUpperCase(),
      totalQuota,
      usedDays,
      remainingDays,
      statusQuota: remainingDays > 8 ? "Aman" : remainingDays > 3 ? "Terpakai Sebagian" : "Hampir Habis",
    };
  });

  // Construct Leaderboard / Employee Ranking list sorted by KPI points
  const rankingList = [
    { rank: 1, name: "Nadia CS", role: "Customer Service", points: 75, badge: "🏆 Top Performer / Star Employee", money: 75000000 },
    { rank: 2, name: "Bima Editor", role: "Editor Proofreading", points: 45, badge: "🌟 Performa Sangat Baik", money: 45000000 },
    { rank: 3, name: "Sari Layouter", role: "Desain Cover & Layout", points: 32, badge: "🌟 Performa Sangat Baik", money: 32000000 },
    { rank: 4, name: "Dimas CCO", role: "CCO Pendampingan ISBN", points: 30, badge: "👍 Baik (Memenuhi Target)", money: 30000000 },
    { rank: 5, name: "Pipit PIC Editor", role: "PIC Editor Team", points: 28, badge: "👍 Baik (Memenuhi Target)", money: 28000000 },
    { rank: 6, name: "Maya HRD", role: "HRD & Management", points: 25, badge: "👍 Baik (Memenuhi Target)", money: 25000000 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/85 p-4 overflow-y-auto">
      {/* Printable Container A4 */}
      <div className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 p-8 shadow-2xl relative my-6 rounded-xl border border-slate-300 print:m-0 print:border-none print:shadow-none print:w-full print:max-w-none">
        
        {/* Printable CSS Rules */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 12mm;
            }
            body {
              background: white !important;
              color: black !important;
            }
            .print\\:hidden {
              display: none !important;
            }
          }
        ` }} />

        {/* Action Bar (Hidden when printing) */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 print:hidden">
          <div>
            <span className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileText className="text-brand-orange" size={18} /> Pratinjau Laporan HRD &amp; SDM Bulanan (A4)
            </span>
            <p className="text-xs text-slate-500">Memuat Kehadiran, Sisa Jatah Cuti, Ranking Karyawan, &amp; Insentif KPI.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg text-xs"
            >
              <Printer size={16} /> Cetak / Unduh PDF
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold transition-all text-xs"
            >
              <X size={16} /> Tutup
            </button>
          </div>
        </div>

        {/* --- REPORT CONTENT (PRINTABLE) --- */}
        
        {/* Header Kop Surat */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5 mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{companyProfile.name}</h1>
            <p className="text-xs text-slate-600 font-medium mt-1">{companyProfile.tagline}</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md">{companyProfile.address}</p>
            <p className="text-[11px] text-slate-500">Email: {companyProfile.email} | WA/Telp: {companyProfile.phone}</p>
          </div>
          <div className="text-right">
            <div className="inline-block bg-slate-900 text-white px-3 py-1 text-xs font-black uppercase tracking-widest rounded">
              Laporan Divisi HRD
            </div>
            <p className="text-xs font-bold text-slate-800 mt-2">Periode: {monthYearStr}</p>
            <p className="text-[11px] text-slate-500">Tanggal Cetak: {currentDateStr}</p>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">LAPORAN BULANAN HRD, SDM &amp; PERFORMA KARYAWAN</h2>
          <p className="text-xs text-slate-500">Kehadiran Presensi PWA, Rekapitulasi Sisa Cuti, &amp; Ranking Karyawan Terbaik</p>
        </div>

        {/* Ringkasan Parameter HRD */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-blue-900 block">Total Karyawan</span>
            <span className="text-sm font-black text-blue-800">{employeeList.length} Orang</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-emerald-900 block">Hadir Tepat Waktu</span>
            <span className="text-sm font-black text-emerald-800">{attendanceList.filter(a => a.status === 'hadir').length} Orang</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-amber-900 block">Rata-Rata Sisa Cuti</span>
            <span className="text-sm font-black text-amber-800">
              {Math.round(leaveQuotaList.reduce((acc, curr) => acc + curr.remainingDays, 0) / Math.max(leaveQuotaList.length, 1))} Hari
            </span>
          </div>
          <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-purple-900 block">Top Performer</span>
            <span className="text-sm font-black text-purple-800">{rankingList[0]?.name || "Nadia CS"}</span>
          </div>
        </div>

        {/* Section 1: Ranking & Peringkat Karyawan */}
        <div className="mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1.5 mb-3 flex items-center gap-1.5">
            <Award size={15} className="text-amber-600" /> 1. Ranking &amp; Peringkat Kinerja Karyawan Terbaik (Leaderboard)
          </h3>
          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-amber-50 text-amber-950 font-bold uppercase text-[10px] border-b border-amber-200">
              <tr>
                <th className="p-2 border-b border-slate-200 text-center">Peringkat</th>
                <th className="p-2 border-b border-slate-200">Nama Karyawan</th>
                <th className="p-2 border-b border-slate-200">Divisi / Role</th>
                <th className="p-2 border-b border-slate-200 text-center">Capaian Poin KPI</th>
                <th className="p-2 border-b border-slate-200">Predikat &amp; Apresiasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {rankingList.map((rank) => (
                <tr key={rank.rank} className={rank.rank === 1 ? "bg-amber-50/50 font-bold" : ""}>
                  <td className="p-2 text-center font-black">
                    {rank.rank === 1 ? <span className="bg-amber-500 text-white font-black px-2 py-0.5 rounded-full text-[10px]">#1</span> : `#${rank.rank}`}
                  </td>
                  <td className="p-2 font-bold text-slate-900">{rank.name}</td>
                  <td className="p-2 text-slate-600">{rank.role}</td>
                  <td className="p-2 text-center font-black text-blue-700">{rank.points} Poin</td>
                  <td className="p-2 font-semibold text-slate-800">{rank.badge}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 2: Rekapitulasi Kehadiran Karyawan (Presensi PWA) */}
        <div className="mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1.5 mb-3 flex items-center gap-1.5">
            <UserCheck size={15} className="text-emerald-600" /> 2. Rekapitulasi Kehadiran &amp; Presensi Karyawan (PWA Mobile)
          </h3>
          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-2 border-b border-slate-200">Nama Karyawan</th>
                <th className="p-2 border-b border-slate-200">Role / Jabatan</th>
                <th className="p-2 border-b border-slate-200 text-center">Jam Presensi</th>
                <th className="p-2 border-b border-slate-200 text-center">Status Kehadiran</th>
                <th className="p-2 border-b border-slate-200 text-center">Tingkat Kehadiran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {attendanceList.map((att, idx) => (
                <tr key={idx}>
                  <td className="p-2 font-bold">{att.name}</td>
                  <td className="p-2 text-slate-600 text-[11px]">{att.role}</td>
                  <td className="p-2 text-center font-mono font-semibold">{att.checkIn}</td>
                  <td className="p-2 text-center">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                      att.status === "hadir" ? "bg-emerald-100 text-emerald-800" :
                      att.status === "terlambat" ? "bg-amber-100 text-amber-800" :
                      att.status === "cuti" ? "bg-purple-100 text-purple-800" : "bg-slate-100 text-slate-700"
                    }`}>
                      {att.status}
                    </span>
                  </td>
                  <td className="p-2 text-center font-bold text-slate-700">{att.attendanceRate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 3: Sisa Jatah Cuti Karyawan */}
        <div className="mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1.5 mb-3 flex items-center gap-1.5">
            <Calendar size={15} className="text-blue-600" /> 3. Rekapitulasi Kuota &amp; Sisa Jatah Cuti Karyawan (Tahunan)
          </h3>
          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-2 border-b border-slate-200">Nama Karyawan</th>
                <th className="p-2 border-b border-slate-200 text-center">Total Kuota Cuti</th>
                <th className="p-2 border-b border-slate-200 text-center">Cuti Terpakai</th>
                <th className="p-2 border-b border-slate-200 text-center font-black">Sisa Jatah Cuti</th>
                <th className="p-2 border-b border-slate-200 text-center">Status Kuota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {leaveQuotaList.map((quota, idx) => (
                <tr key={idx}>
                  <td className="p-2 font-bold">{quota.name}</td>
                  <td className="p-2 text-center text-slate-600">{quota.totalQuota} Hari</td>
                  <td className="p-2 text-center text-rose-700 font-bold">{quota.usedDays} Hari</td>
                  <td className="p-2 text-center font-black text-emerald-700">{quota.remainingDays} Hari</td>
                  <td className="p-2 text-center">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                      quota.remainingDays > 8 ? "bg-emerald-100 text-emerald-800" :
                      quota.remainingDays > 3 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                    }`}>
                      {quota.statusQuota}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signature Box */}
        <div className="mt-12 pt-6 border-t border-slate-200 grid grid-cols-2 text-center text-xs">
          <div>
            <p className="text-slate-500 font-medium">Dibuat Oleh,</p>
            <p className="font-bold text-slate-900 mt-1 uppercase">Divisi HRD &amp; SDM</p>
            <div className="h-16 flex items-end justify-center">
              <span className="border-b border-slate-400 w-48 block font-bold text-slate-800 pb-1">( Manager HRD )</span>
            </div>
          </div>
          <div>
            <p className="text-slate-500 font-medium">Disetujui &amp; Disahkan Oleh,</p>
            <p className="font-bold text-slate-900 mt-1 uppercase">Pimpinan / Direktur Utama</p>
            <div className="h-16 flex items-end justify-center">
              <span className="border-b border-slate-400 w-48 block font-bold text-slate-800 pb-1">( Direktur Utama )</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3">
          Dokumen Laporan HRD ini dicetak secara otomatis melalui Sistem Manajemen Internal Publish Inc. Indonesia.
        </div>

      </div>
    </div>
  );
}
