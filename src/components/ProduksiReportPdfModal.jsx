import { useState, useEffect } from "react";
import { Printer, X, FileText, Package, CheckCircle2, BookOpen, Layers } from "lucide-react";
import { fetchCompanyProfile, DEFAULT_COMPANY_PROFILE } from "../lib/companySettings";

export default function ProduksiReportPdfModal({ items = [], onClose }) {
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

  // Calculate totals from items array or provide fallback sample data if empty
  const defaultItems = items.length > 0 ? items : [
    { id: "p1", tracking_code: "TRK-A1B2C", title: "Menjadi Guru Kreatif di Era Digital", author: "Ratna Wijaya", publisher: "Publish Inc.", package_name: "Paket A", pages: 180, stage: "Selesai Cetak", specs: "Softcover Doff, Bookpaper 72gr" },
    { id: "p2", tracking_code: "TRK-D4E5F", title: "Strategi UMKM Naik Kelas", author: "Andi Saputra", publisher: "Nasmedia", package_name: "Paket B", pages: 240, stage: "Cetak Fisik", specs: "Hardcover Glossy, HVS 80gr" },
    { id: "p3", tracking_code: "TRK-G7H8I", title: "Antologi Puisi Hujan Pertama", author: "Laras Prameswari", publisher: "Publish Inc.", package_name: "Paket A", pages: 120, stage: "Selesai Cetak", specs: "Softcover Emboss, Bookpaper 72gr" },
    { id: "p4", tracking_code: "TRK-J9K0L", title: "Panduan Riset & Metodologi Penelitian", author: "Dr. Budi Santoso", publisher: "Publish Inc.", package_name: "Paket Premium", pages: 310, stage: "Cetak Fisik", specs: "Hardcover Doff, HVS 70gr" },
  ];

  const totalManuscripts = defaultItems.length;
  const totalPages = defaultItems.reduce((acc, i) => acc + (Number(i.pages) || Number(i.manuscript?.estimated_pages) || 150), 0);
  const totalCompleted = defaultItems.filter(i => i.stage === "Selesai Cetak" || i.stage === "done" || i.stage === "distribusi").length;
  const totalInProduction = totalManuscripts - totalCompleted;

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
              <FileText className="text-brand-orange" size={18} /> Pratinjau Laporan Produksi Cetak Bulanan (A4)
            </span>
            <p className="text-xs text-slate-500">Rekapitulasi Total Naskah Produksi, Total Halaman, &amp; Status Penyelesaian Cetak.</p>
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
              Laporan Produksi Cetak
            </div>
            <p className="text-xs font-bold text-slate-800 mt-2">Periode: {monthYearStr}</p>
            <p className="text-[11px] text-slate-500">Tanggal Cetak: {currentDateStr}</p>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">LAPORAN REKAPITULASI NASKAH &amp; PRODUKSI CETAK BULANAN</h2>
          <p className="text-xs text-slate-500">Rekapitulasi Total Naskah Masuk Produksi, Estimasi Halaman, &amp; Status Cetak Fisik</p>
        </div>

        {/* Parameter Summary Cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-slate-600 block flex items-center justify-center gap-1">
              <Package size={12} /> Total Naskah Produksi
            </span>
            <span className="text-sm font-black text-slate-900">{totalManuscripts} Judul Naskah</span>
          </div>
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-blue-900 block flex items-center justify-center gap-1">
              <Layers size={12} /> Total Halaman Cetak
            </span>
            <span className="text-sm font-black text-blue-800">{totalPages} Halaman</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-emerald-900 block flex items-center justify-center gap-1">
              <CheckCircle2 size={12} /> Selesai Dicetak
            </span>
            <span className="text-sm font-black text-emerald-800">{totalCompleted} Naskah</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-amber-900 block flex items-center justify-center gap-1">
              <BookOpen size={12} /> Dalam Proses Cetak
            </span>
            <span className="text-sm font-black text-amber-800">{totalInProduction} Naskah</span>
          </div>
        </div>

        {/* Table of Production Manuscripts */}
        <div className="mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1.5 mb-3 flex items-center gap-1.5">
            <Package size={15} className="text-brand-orange" /> Rincian Naskah Produksi Bulan Ini
          </h3>
          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-2 border-b border-slate-200">Kode &amp; Judul Naskah</th>
                <th className="p-2 border-b border-slate-200">Penulis &amp; Penerbit</th>
                <th className="p-2 border-b border-slate-200">Spesifikasi Cetak</th>
                <th className="p-2 border-b border-slate-200 text-center">Estimasi Halaman</th>
                <th className="p-2 border-b border-slate-200 text-center">Status Produksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {defaultItems.map((item) => {
                const title = item.title || item.manuscript?.title;
                const author = item.author || item.customer?.name;
                const publisher = item.publisher || item.manuscript?.publisher || "Publish Inc.";
                const pages = item.pages || item.manuscript?.estimated_pages || 150;
                const specs = item.specs || item.manuscript?.specs || "Softcover Doff, Bookpaper 72gr";
                const isDone = item.stage === "Selesai Cetak" || item.stage === "done" || item.stage === "distribusi";

                return (
                  <tr key={item.id}>
                    <td className="p-2">
                      <span className="font-mono text-[10px] font-bold text-brand-orange block">{item.tracking_code}</span>
                      <span className="font-bold text-slate-900">{title}</span>
                    </td>
                    <td className="p-2">
                      <span className="font-semibold block">{author}</span>
                      <span className="text-[11px] text-slate-500">{publisher}</span>
                    </td>
                    <td className="p-2 text-slate-600 text-[11px]">{specs}</td>
                    <td className="p-2 text-center font-bold text-slate-900">{pages} hal</td>
                    <td className="p-2 text-center">
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${isDone ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {isDone ? "Selesai Cetak" : "Proses Cetak"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t border-slate-300">
              <tr>
                <td colSpan={3} className="p-2 text-right uppercase text-[10px] text-slate-700">Total Akumulasi Halaman:</td>
                <td className="p-2 text-center text-blue-900 font-black">{totalPages} hal</td>
                <td className="p-2 text-center text-emerald-800 font-black">{totalCompleted} Selesai</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Signature Box */}
        <div className="mt-12 pt-6 border-t border-slate-200 grid grid-cols-2 text-center text-xs">
          <div>
            <p className="text-slate-500 font-medium">Disusun Oleh,</p>
            <p className="font-bold text-slate-900 mt-1 uppercase">Tim Produksi Fisik</p>
            <div className="h-16 flex items-end justify-center">
              <span className="border-b border-slate-400 w-48 block font-bold text-slate-800 pb-1">( Koordinator Produksi )</span>
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
          Dokumen Laporan Produksi Cetak ini dicetak secara otomatis melalui Sistem Manajemen Internal Publish Inc. Indonesia.
        </div>

      </div>
    </div>
  );
}
