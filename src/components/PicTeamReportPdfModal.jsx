import { useState, useEffect } from "react";
import { Printer, X, FileText } from "lucide-react";
import { fetchCompanyProfile, DEFAULT_COMPANY_PROFILE } from "../lib/companySettings";
import { ROLE_LABELS } from "../lib/workflow";

export default function PicTeamReportPdfModal({ role, stats, onClose }) {
  const [companyProfile, setCompanyProfile] = useState(DEFAULT_COMPANY_PROFILE);

  useEffect(() => {
    fetchCompanyProfile().then(setCompanyProfile);
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

  const picRoleLabel = ROLE_LABELS[role] || role || "PIC Team";
  const cards = stats?.cards || [];
  const rows = stats?.rows || [];

  const totalCapaianCard = cards.find(c => c.label === "Capaian All Team") || cards[0] || {};
  const memenuhiTargetCard = cards.find(c => c.label === "Memenuhi Target") || cards[1] || {};
  const persentaseCard = cards.find(c => c.label === "Persentase Tim") || cards[2] || {};
  const naskahAktifCard = cards.find(c => c.label === "Naskah Aktif") || cards[3] || {};

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
              <FileText className="text-brand-orange" size={18} /> Pratinjau Laporan Capaian Kerja Tim {picRoleLabel} (A4)
            </span>
            <p className="text-xs text-slate-500">Siap dicetak atau diunduh sebagai dokumen PDF evaluasi tim.</p>
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
              Laporan Evaluasi Tim
            </div>
            <p className="text-xs font-bold text-slate-800 mt-2">Periode: {monthYearStr}</p>
            <p className="text-[11px] text-slate-500">Tanggal Cetak: {currentDateStr}</p>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">LAPORAN CAPAIAN KERJA &amp; PERFORMA TIM</h2>
          <p className="text-xs text-slate-500">Divisi: <span className="font-bold text-slate-900">{picRoleLabel}</span></p>
        </div>

        {/* Ringkasan Parameter PIC */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-blue-900 block">Total Capaian Tim</span>
            <span className="text-sm font-black text-blue-800">{totalCapaianCard.value || 0}</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-emerald-900 block">Memenuhi Target</span>
            <span className="text-sm font-black text-emerald-800">{memenuhiTargetCard.value || 0} {memenuhiTargetCard.suffix || ""}</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-amber-900 block">Persentase Tim</span>
            <span className="text-sm font-black text-amber-800">{persentaseCard.value || 0}%</span>
          </div>
          <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-purple-900 block">Naskah Aktif</span>
            <span className="text-sm font-black text-purple-800">{naskahAktifCard.value || 0} Naskah</span>
          </div>
        </div>

        {/* Section 1: Rincian Performa Anggota Tim */}
        <div className="mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1.5 mb-3">
            1. Rincian Capaian Kinerja Anggota Tim
          </h3>
          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-2 border-b border-slate-200">Nama Anggota Tim</th>
                <th className="p-2 border-b border-slate-200">Jabatan / Role</th>
                <th className="p-2 border-b border-slate-200 text-center">Capaian Poin / Satuan</th>
                <th className="p-2 border-b border-slate-200 text-center">Status Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {(rows || []).map((row, idx) => (
                <tr key={row.id || idx}>
                  <td className="p-2 font-bold">{row.title || "-"}</td>
                  <td className="p-2 font-semibold uppercase text-[10px] text-slate-600">{row.subtitle || "-"}</td>
                  <td className="p-2 text-center font-black text-blue-700">{row.value}</td>
                  <td className="p-2 text-center">
                    {row.achieved ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded uppercase">Memenuhi Target</span>
                    ) : (
                      <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded uppercase">Belum Memenuhi</span>
                    )}
                  </td>
                </tr>
              ))}
              {(!rows || rows.length === 0) && (
                <tr><td colSpan={4} className="p-3 text-center text-slate-500">Tidak ada anggota tim terdaftar.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Signature Box */}
        <div className="mt-12 pt-6 border-t border-slate-200 grid grid-cols-2 text-center text-xs">
          <div>
            <p className="text-slate-500 font-medium">Disusun Oleh,</p>
            <p className="font-bold text-slate-900 mt-1 uppercase">{picRoleLabel}</p>
            <div className="h-16 flex items-end justify-center">
              <span className="border-b border-slate-400 w-48 block font-bold text-slate-800 pb-1">( {picRoleLabel} )</span>
            </div>
          </div>
          <div>
            <p className="text-slate-500 font-medium">Disetujui &amp; Disahkan Oleh,</p>
            <p className="font-bold text-slate-900 mt-1 uppercase">Pimpinan / Master Admin</p>
            <div className="h-16 flex items-end justify-center">
              <span className="border-b border-slate-400 w-48 block font-bold text-slate-800 pb-1">( Pimpinan / Master )</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3">
          Dokumen Laporan Capaian Kerja Tim ini dicetak secara otomatis melalui Sistem Manajemen Internal Publish Inc. Indonesia.
        </div>

      </div>
    </div>
  );
}
