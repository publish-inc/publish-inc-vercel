import { useState, useEffect } from "react";
import { Printer, X, FileText, Share2, ThumbsUp, MessageSquare, Eye } from "lucide-react";
import { fetchCompanyProfile, DEFAULT_COMPANY_PROFILE } from "../lib/companySettings";

export default function SosmedReportPdfModal({ content = [], onClose }) {
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

  // Calculate totals from content array or provide fallback sample data if empty
  const defaultItems = content.length > 0 ? content : [
    { id: "s1", platform: "Instagram", title: "Reels Tips Menulis Bab Pertama Buku Ajar", date: "2026-09-02", views: 12500, likes: 1420, comments: 185, shares: 94 },
    { id: "s2", platform: "TikTok", title: "Video Unboxing Paket Terbit Spesial Penulis", date: "2026-09-05", views: 28400, likes: 3120, comments: 410, shares: 255 },
    { id: "s3", platform: "Instagram", title: "Carousel Promo Paket Terbit Buku Edukasi", date: "2026-09-10", views: 8900, likes: 780, comments: 64, shares: 42 },
    { id: "s4", platform: "Facebook", title: "Artikel Tips Mencegah Plagiasi Karya Tulis", date: "2026-09-14", views: 4300, likes: 310, comments: 28, shares: 18 },
  ];

  const totalPosts = defaultItems.length;
  const totalViews = defaultItems.reduce((acc, c) => acc + (Number(c.views) || 0), 0);
  const totalLikes = defaultItems.reduce((acc, c) => acc + (Number(c.likes) || 0), 0);
  const totalComments = defaultItems.reduce((acc, c) => acc + (Number(c.comments) || 0), 0);
  const totalShares = defaultItems.reduce((acc, c) => acc + (Number(c.shares) || 0), 0);

  const formatNum = (num) => new Intl.NumberFormat("id-ID").format(num || 0);

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
              <FileText className="text-brand-orange" size={18} /> Pratinjau Laporan Performa Media Sosial (A4)
            </span>
            <p className="text-xs text-slate-500">Rekapitulasi Konten, Total Views, Likes, Komentar, &amp; Engagement Rate.</p>
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
              Laporan Media Sosial
            </div>
            <p className="text-xs font-bold text-slate-800 mt-2">Periode: {monthYearStr}</p>
            <p className="text-[11px] text-slate-500">Tanggal Cetak: {currentDateStr}</p>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">LAPORAN REKAPITULASI MEDIA SOSIAL &amp; KONTEN BULANAN</h2>
          <p className="text-xs text-slate-500">Rekapitulasi Tayangan (Views), Likes, Komentar, dan Engagement Konten Publikasi</p>
        </div>

        {/* Parameter Summary Cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-slate-600 block">Total Konten Dipublikasi</span>
            <span className="text-sm font-black text-slate-900">{totalPosts} Postingan</span>
          </div>
          <div className="bg-sky-50 border border-sky-200 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-sky-900 block flex items-center justify-center gap-1">
              <Eye size={12} /> Total Tayangan (Views)
            </span>
            <span className="text-sm font-black text-sky-800">{formatNum(totalViews)} Views</span>
          </div>
          <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-rose-900 block flex items-center justify-center gap-1">
              <ThumbsUp size={12} /> Total Likes
            </span>
            <span className="text-sm font-black text-rose-800">{formatNum(totalLikes)} Likes</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-emerald-900 block flex items-center justify-center gap-1">
              <MessageSquare size={12} /> Total Komentar
            </span>
            <span className="text-sm font-black text-emerald-800">{formatNum(totalComments)} Komentar</span>
          </div>
        </div>

        {/* Table of Social Media Posts */}
        <div className="mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1.5 mb-3 flex items-center gap-1.5">
            <Share2 size={15} className="text-brand-orange" /> Rincian Performa Konten per Platform
          </h3>
          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-2 border-b border-slate-200">Tanggal &amp; Platform</th>
                <th className="p-2 border-b border-slate-200">Judul / Topik Konten</th>
                <th className="p-2 border-b border-slate-200 text-center">Views (Impresi)</th>
                <th className="p-2 border-b border-slate-200 text-center">Likes</th>
                <th className="p-2 border-b border-slate-200 text-center">Komentar</th>
                <th className="p-2 border-b border-slate-200 text-center">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {defaultItems.map((item) => (
                <tr key={item.id}>
                  <td className="p-2">
                    <span className="bg-slate-900 text-white font-bold text-[9px] px-2 py-0.5 rounded mr-1.5">{item.platform}</span>
                    <span className="text-[11px] text-slate-500">{item.date}</span>
                  </td>
                  <td className="p-2 font-bold">{item.title}</td>
                  <td className="p-2 text-center font-bold text-sky-700">{formatNum(item.views)}</td>
                  <td className="p-2 text-center font-bold text-rose-700">{formatNum(item.likes)}</td>
                  <td className="p-2 text-center font-bold text-emerald-700">{formatNum(item.comments)}</td>
                  <td className="p-2 text-center text-slate-600">{formatNum(item.shares)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t border-slate-300">
              <tr>
                <td colSpan={2} className="p-2 text-right uppercase text-[10px] text-slate-700">Total Akumulasi:</td>
                <td className="p-2 text-center text-sky-800 font-black">{formatNum(totalViews)}</td>
                <td className="p-2 text-center text-rose-800 font-black">{formatNum(totalLikes)}</td>
                <td className="p-2 text-center text-emerald-800 font-black">{formatNum(totalComments)}</td>
                <td className="p-2 text-center text-slate-800 font-black">{formatNum(totalShares)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Signature Box */}
        <div className="mt-12 pt-6 border-t border-slate-200 grid grid-cols-2 text-center text-xs">
          <div>
            <p className="text-slate-500 font-medium">Disusun Oleh,</p>
            <p className="font-bold text-slate-900 mt-1 uppercase">Tim Social Media &amp; Konten</p>
            <div className="h-16 flex items-end justify-center">
              <span className="border-b border-slate-400 w-48 block font-bold text-slate-800 pb-1">( Social Media Specialist )</span>
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
          Dokumen Laporan Media Sosial ini dicetak secara otomatis melalui Sistem Manajemen Internal Publish Inc. Indonesia.
        </div>

      </div>
    </div>
  );
}
