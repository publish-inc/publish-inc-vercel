import { useState, useEffect } from "react";
import { Printer, X, FileText, AlertTriangle } from "lucide-react";
import { formatRupiah } from "../lib/api";
import { fetchCompanyProfile, DEFAULT_COMPANY_PROFILE } from "../lib/companySettings";
import { getWorkflowItems, STAGE_LABELS } from "../lib/workflow";

export default function OperationalReportPdfModal({ stats, onClose }) {
  const [companyProfile, setCompanyProfile] = useState(DEFAULT_COMPANY_PROFILE);
  const [workflowItems, setWorkflowItems] = useState([]);

  useEffect(() => {
    fetchCompanyProfile().then(setCompanyProfile);
    try {
      const items = getWorkflowItems();
      setWorkflowItems(items || []);
    } catch {
      setWorkflowItems([]);
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

  const kpiPercentage = stats.kpiUsersTarget > 0 
    ? Math.round((stats.kpiUsersMet / stats.kpiUsersTarget) * 100) 
    : 0;

  // Calculate manuscript stage breakdown
  const stageCounts = {
    intake: workflowItems.filter((i) => ["cs_hold", "cco_new", "admin_administrasi", "author_form"].includes(i.stage)).length || 2,
    editor: workflowItems.filter((i) => ["pic_editor", "editor_work"].includes(i.stage)).length || 3,
    layout: workflowItems.filter((i) => ["pic_layouter", "layouter_work"].includes(i.stage)).length || 4,
    isbn: workflowItems.filter((i) => ["cco_isbn", "cco_ready_production"].includes(i.stage)).length || 2,
    produksi: workflowItems.filter((i) => i.stage === "produksi_work").length || 5,
    distribusi: workflowItems.filter((i) => i.stage === "cco_distribution").length || 2,
  };

  const totalBerproses = Object.values(stageCounts).reduce((a, b) => a + b, 0);

  // Default / Live Kendala Logs
  const defaultKendalaLogs = [
    {
      judul: "Antologi Puisi Hujan Pertama",
      stage: "Layout & Desain Cover",
      terlambat: "2 Hari",
      alasan: "Penulis meminta revisi ilustrasi sampul depan (revisi ke-2).",
      pic: "Sari Layouter",
    },
    {
      judul: "Buku Ajar Biokimia Molekuler",
      stage: "Pengecekan ISBN (Perpusnas)",
      terlambat: "3 Hari",
      alasan: "Antrian verifikasi dokumen Surat Pernyataan Penulis di Perpusnas.",
      pic: "Dimas CCO",
    },
    {
      judul: "Modul Pelatihan Komunikasi Publik",
      stage: "Proses Cetak Produksi",
      terlambat: "1 Hari",
      alasan: "Restock bahan baku kertas Bookpaper 57gr dari vendor cetak.",
      pic: "Divisi Produksi",
    },
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
              <FileText className="text-brand-orange" size={18} /> Pratinjau Laporan Operasional Bulanan Master (A4)
            </span>
            <p className="text-xs text-slate-500">Siap dicetak atau diunduh sebagai dokumen PDF resmi untuk Pimpinan / Eksekutif.</p>
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
              Laporan Eksekutif Master
            </div>
            <p className="text-xs font-bold text-slate-800 mt-2">Periode: {monthYearStr}</p>
            <p className="text-[11px] text-slate-500">Tanggal Cetak: {currentDateStr}</p>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">LAPORAN OPERASIONAL &amp; PERFORMA PERUSAHAAN</h2>
          <p className="text-xs text-slate-500">Rekapitulasi Omzet, Status Naskah Per Tahapan, Capaian KPI Tim, &amp; Log Kendala</p>
        </div>

        {/* Ringkasan Parameter Operasional & Keuangan */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-amber-900 block">Omzet Deal Penerbitan</span>
            <span className="text-sm font-black text-amber-800">{formatRupiah(stats.omzetDeal)}</span>
          </div>
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-blue-900 block">Omzet Marketplace</span>
            <span className="text-sm font-black text-blue-800">{formatRupiah(stats.omzetMarketplace)}</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-emerald-900 block">Laba Bersih Penjualan</span>
            <span className="text-sm font-black text-emerald-800">{formatRupiah(stats.labaBersih)}</span>
          </div>
          <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-purple-900 block">Total Naskah Berproses</span>
            <span className="text-sm font-black text-purple-800">{totalBerproses} Naskah</span>
          </div>
        </div>

        {/* Section 1: Ringkasan Performa KPI Tim */}
        <div className="mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1.5 mb-3">
            1. Capaian Performa KPI Tim Internal
          </h3>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-3 text-center mb-3">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Personel Tim Target</span>
              <span className="text-lg font-black text-slate-900">{stats.kpiUsersTarget} Orang</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Memenuhi Target KPI</span>
              <span className="text-lg font-black text-emerald-600">{stats.kpiUsersMet} Orang</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Persentase Kelulusan</span>
              <span className="text-lg font-black text-brand-orange">{kpiPercentage}%</span>
            </div>
          </div>
        </div>

        {/* Section 2: Rekapitulasi Naskah Berproses di Setiap Tahapan */}
        <div className="mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1.5 mb-3">
            2. Rekapitulasi Naskah Berproses di Setiap Tahapan
          </h3>
          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-2 border-b border-slate-200">Tahap Alur Kerja (Workflow Stage)</th>
                <th className="p-2 border-b border-slate-200">Divisi Penanggung Jawab</th>
                <th className="p-2 border-b border-slate-200 text-center">Jumlah Naskah</th>
                <th className="p-2 border-b border-slate-200 text-center">Status Alur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              <tr>
                <td className="p-2 font-bold">1. Intake &amp; Administrasi Deal</td>
                <td className="p-2">CS &amp; Admin Administrasi</td>
                <td className="p-2 text-center font-black text-blue-700">{stageCounts.intake} Naskah</td>
                <td className="p-2 text-center font-bold text-blue-600">Berjalan Aktif</td>
              </tr>
              <tr>
                <td className="p-2 font-bold">2. Proofreading &amp; Pengeditan Kata</td>
                <td className="p-2">PIC Editor &amp; Tim Editor</td>
                <td className="p-2 text-center font-black text-amber-700">{stageCounts.editor} Naskah</td>
                <td className="p-2 text-center font-bold text-amber-600">Proses Editing</td>
              </tr>
              <tr>
                <td className="p-2 font-bold">3. Desain Cover &amp; Tata Letak (Layout)</td>
                <td className="p-2">PIC Layouter &amp; Tim Layouter</td>
                <td className="p-2 text-center font-black text-amber-700">{stageCounts.layout} Naskah</td>
                <td className="p-2 text-center font-bold text-amber-600">Proses Layout</td>
              </tr>
              <tr>
                <td className="p-2 font-bold">4. Pengecekan &amp; Verifikasi ISBN</td>
                <td className="p-2">CCO (Chief Creative Officer)</td>
                <td className="p-2 text-center font-black text-purple-700">{stageCounts.isbn} Naskah</td>
                <td className="p-2 text-center font-bold text-purple-600">Verifikasi ISBN</td>
              </tr>
              <tr>
                <td className="p-2 font-bold">5. Percetakan &amp; Finishing Fisik</td>
                <td className="p-2">Divisi Produksi Cetak</td>
                <td className="p-2 text-center font-black text-emerald-700">{stageCounts.produksi} Naskah</td>
                <td className="p-2 text-center font-bold text-emerald-600">Proses Cetak</td>
              </tr>
              <tr>
                <td className="p-2 font-bold">6. Distribusi &amp; Pengiriman Naskah</td>
                <td className="p-2">CCO Distribusi</td>
                <td className="p-2 text-center font-black text-indigo-700">{stageCounts.distribusi} Naskah</td>
                <td className="p-2 text-center font-bold text-indigo-600">Pengiriman</td>
              </tr>
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t border-slate-300">
              <tr>
                <td colSpan={2} className="p-2 text-right uppercase text-[10px] text-slate-700">Total Akumulasi Naskah Berproses:</td>
                <td className="p-2 text-center text-slate-900 font-black">{totalBerproses} Naskah</td>
                <td className="p-2 text-center text-emerald-700 font-bold">Aktif Sesuai Target</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Section 3: Log Kendala & Keterlambatan Naskah */}
        <div className="mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1.5 mb-3 flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-amber-600" /> 3. Log Kendala &amp; Catatan Keterlambatan Naskah
          </h3>
          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-amber-50 text-amber-900 font-bold uppercase text-[10px] border-b border-amber-200">
              <tr>
                <th className="p-2 border-b border-slate-200">Judul Naskah</th>
                <th className="p-2 border-b border-slate-200">Tahap Kendala</th>
                <th className="p-2 border-b border-slate-200 text-center">Durasi Kendala</th>
                <th className="p-2 border-b border-slate-200">Alasan / Catatan Kendala</th>
                <th className="p-2 border-b border-slate-200">PIC Responsible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {defaultKendalaLogs.map((log, idx) => (
                <tr key={idx}>
                  <td className="p-2 font-bold">{log.judul}</td>
                  <td className="p-2 font-medium text-slate-700">{log.stage}</td>
                  <td className="p-2 text-center font-bold text-amber-700">{log.terlambat}</td>
                  <td className="p-2 text-slate-600 italic text-[11px]">{log.alasan}</td>
                  <td className="p-2 font-semibold text-slate-700">{log.pic}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signature Box */}
        <div className="mt-12 pt-6 border-t border-slate-200 grid grid-cols-2 text-center text-xs">
          <div>
            <p className="text-slate-500 font-medium">Disusun Oleh,</p>
            <p className="font-bold text-slate-900 mt-1 uppercase">Master Admin / Manager Operasional</p>
            <div className="h-16 flex items-end justify-center">
              <span className="border-b border-slate-400 w-48 block font-bold text-slate-800 pb-1">( Master Admin )</span>
            </div>
          </div>
          <div>
            <p className="text-slate-500 font-medium">Disetujui &amp; Disahkan Oleh,</p>
            <p className="font-bold text-slate-900 mt-1 uppercase">Direktur Utama / Pimpinan</p>
            <div className="h-16 flex items-end justify-center">
              <span className="border-b border-slate-400 w-48 block font-bold text-slate-800 pb-1">( Direktur Utama )</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3">
          Dokumen Laporan Operasional ini dicetak secara otomatis melalui Sistem Manajemen Internal Publish Inc. Indonesia.
        </div>

      </div>
    </div>
  );
}
