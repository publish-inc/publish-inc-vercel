import { useState, useEffect } from "react";
import { Printer, X, FileText, CalendarDays, Users, CheckCircle2, XCircle } from "lucide-react";
import { fetchCompanyProfile, DEFAULT_COMPANY_PROFILE } from "../lib/companySettings";

export default function CampaignReportPdfModal({ events, onClose }) {
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

  // Sample data fallback for events terselenggara, batal, and capaian peserta
  const defaultHeldEvents = [
    { id: "e1", title: "Workshop Menulis Buku Ajar & Diktat", date: "15 September 2026", location: "Zoom Online", target: 100, peserta: 145, status: "Terselenggara" },
    { id: "e2", title: "Bedah Buku & Talkshow Penulis Nasional", date: "20 September 2026", location: "Hotel Santika Makassar", target: 80, peserta: 98, status: "Terselenggara" },
    { id: "e3", title: "Live Masterclass Digital Publishing", date: "25 September 2026", location: "YouTube Live", target: 150, peserta: 210, status: "Terselenggara" },
    { id: "e4", title: "Webinar HKI & Hak Cipta Karya Ilmiah", date: "28 September 2026", location: "Zoom Online", target: 150, peserta: 180, status: "Terselenggara" },
  ];

  const defaultCancelledEvents = [
    { id: "e5", title: "Bazar Buku & Temu Penulis Regional", date: "10 September 2026", location: "Mall Panakkukang", alasan: "Kendala teknis perizinan & venue", status: "Batal" },
  ];

  const totalHeld = defaultHeldEvents.length;
  const totalCancelled = defaultCancelledEvents.length;
  const totalPeserta = defaultHeldEvents.reduce((acc, curr) => acc + curr.peserta, 0);
  const totalTarget = defaultHeldEvents.reduce((acc, curr) => acc + curr.target, 0);
  const avgCapaian = Math.round((totalPeserta / Math.max(totalTarget, 1)) * 100);

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
              <FileText className="text-brand-orange" size={18} /> Pratinjau Laporan Campaign &amp; Event Bulanan (A4)
            </span>
            <p className="text-xs text-slate-500">Event Terselenggara, Event Batal, &amp; Capaian Peserta per Event.</p>
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
              Laporan Campaign
            </div>
            <p className="text-xs font-bold text-slate-800 mt-2">Periode: {monthYearStr}</p>
            <p className="text-[11px] text-slate-500">Tanggal Cetak: {currentDateStr}</p>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">LAPORAN REKAPITULASI EVENT &amp; CAMPAIGN BULANAN</h2>
          <p className="text-xs text-slate-500">Rekapitulasi Event Terselenggara, Event Batal, &amp; Capaian Peserta Pendaftar</p>
        </div>

        {/* Parameter Cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-emerald-900 block">Event Terselenggara</span>
            <span className="text-sm font-black text-emerald-800">{totalHeld} Event</span>
          </div>
          <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-rose-900 block">Event Batal</span>
            <span className="text-sm font-black text-rose-800">{totalCancelled} Event</span>
          </div>
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-blue-900 block">Total Peserta Pendaftar</span>
            <span className="text-sm font-black text-blue-800">{totalPeserta} Peserta</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-amber-900 block">Rata-Rata Capaian Target</span>
            <span className="text-sm font-black text-amber-800">{avgCapaian}%</span>
          </div>
        </div>

        {/* Section 1: Event yang Terselenggara & Capaian Peserta */}
        <div className="mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1.5 mb-3 flex items-center gap-1.5">
            <CheckCircle2 size={15} className="text-emerald-600" /> 1. Daftar Event Terselenggara &amp; Capaian Peserta
          </h3>
          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-2 border-b border-slate-200">Nama Event</th>
                <th className="p-2 border-b border-slate-200">Tanggal &amp; Lokasi</th>
                <th className="p-2 border-b border-slate-200 text-center">Target Peserta</th>
                <th className="p-2 border-b border-slate-200 text-center font-bold">Capaian Peserta</th>
                <th className="p-2 border-b border-slate-200 text-center">% Capaian Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {defaultHeldEvents.map((evt) => {
                const pct = Math.round((evt.peserta / evt.target) * 100);
                return (
                  <tr key={evt.id}>
                    <td className="p-2 font-bold">{evt.title}</td>
                    <td className="p-2 text-slate-600">{evt.date} ({evt.location})</td>
                    <td className="p-2 text-center text-slate-600">{evt.target} Peserta</td>
                    <td className="p-2 text-center font-black text-emerald-700">{evt.peserta} Peserta</td>
                    <td className="p-2 text-center font-black text-blue-700">{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t border-slate-300">
              <tr>
                <td colSpan={2} className="p-2 text-right uppercase text-[10px] text-slate-700">Total Peserta Akumulasi:</td>
                <td className="p-2 text-center text-slate-600">{totalTarget} Peserta</td>
                <td className="p-2 text-center text-emerald-800 font-black">{totalPeserta} Peserta</td>
                <td className="p-2 text-center text-blue-800 font-black">{avgCapaian}%</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Section 2: Event yang Batal */}
        <div className="mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1.5 mb-3 flex items-center gap-1.5">
            <XCircle size={15} className="text-rose-600" /> 2. Daftar Event Batal / Dibatalkan
          </h3>
          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-rose-50 text-rose-950 font-bold uppercase text-[10px] border-b border-rose-200">
              <tr>
                <th className="p-2 border-b border-slate-200">Nama Event</th>
                <th className="p-2 border-b border-slate-200">Tanggal Rencana</th>
                <th className="p-2 border-b border-slate-200">Lokasi / Platform</th>
                <th className="p-2 border-b border-slate-200">Alasan Pembatalan</th>
                <th className="p-2 border-b border-slate-200 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {defaultCancelledEvents.map((evt) => (
                <tr key={evt.id}>
                  <td className="p-2 font-bold">{evt.title}</td>
                  <td className="p-2 text-slate-600">{evt.date}</td>
                  <td className="p-2 text-slate-600">{evt.location}</td>
                  <td className="p-2 text-rose-700 italic font-medium">{evt.alasan}</td>
                  <td className="p-2 text-center">
                    <span className="bg-rose-100 text-rose-800 font-bold text-[9px] px-2 py-0.5 rounded uppercase">Batal</span>
                  </td>
                </tr>
              ))}
              {defaultCancelledEvents.length === 0 && (
                <tr><td colSpan={5} className="p-3 text-center text-slate-500">Tidak ada event yang batal periode ini.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Signature Box */}
        <div className="mt-12 pt-6 border-t border-slate-200 grid grid-cols-2 text-center text-xs">
          <div>
            <p className="text-slate-500 font-medium">Disusun Oleh,</p>
            <p className="font-bold text-slate-900 mt-1 uppercase">Divisi Campaign &amp; Event</p>
            <div className="h-16 flex items-end justify-center">
              <span className="border-b border-slate-400 w-48 block font-bold text-slate-800 pb-1">( Manager Campaign )</span>
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
          Dokumen Laporan Campaign ini dicetak secara otomatis melalui Sistem Manajemen Internal Publish Inc. Indonesia.
        </div>

      </div>
    </div>
  );
}
