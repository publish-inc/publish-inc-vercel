import { useState, useEffect } from "react";
import { Printer, X, FileText } from "lucide-react";
import { formatRupiah } from "../lib/api";
import { fetchCompanyProfile, DEFAULT_COMPANY_PROFILE } from "../lib/companySettings";

export default function FinanceReportPdfModal({ totals, invoices, cashOut, pettyCash, payrollReleases, onClose }) {
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
              <FileText className="text-brand-orange" size={18} /> Pratinjau Laporan Keuangan Bulanan (A4)
            </span>
            <p className="text-xs text-slate-500">Siap dicetak atau diunduh sebagai dokumen PDF resmi.</p>
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
              Laporan Keuangan
            </div>
            <p className="text-xs font-bold text-slate-800 mt-2">Periode: {monthYearStr}</p>
            <p className="text-[11px] text-slate-500">Tanggal Cetak: {currentDateStr}</p>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">LAPORAN KEUANGAN & ARUS KAS BULANAN</h2>
          <p className="text-xs text-slate-500">Ringkasan Pemasukan (Cash In), Pengeluaran (Cash Out), Payroll, & Laba Bersih</p>
        </div>

        {/* Ringkasan Parameter Keuangan */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-emerald-800 block">Total Cash In</span>
            <span className="text-sm font-black text-emerald-700">{formatRupiah(totals.totalRevenue)}</span>
          </div>
          <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-rose-800 block">Total Cash Out</span>
            <span className="text-sm font-black text-rose-700">{formatRupiah(totals.totalOut)}</span>
          </div>
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-blue-800 block">Gaji & Payroll</span>
            <span className="text-sm font-black text-blue-700">{formatRupiah(totals.payrollPaid)}</span>
          </div>
          <div className="bg-amber-50 border border-amber-300 p-3 rounded-lg text-center">
            <span className="text-[10px] font-bold uppercase text-amber-900 block">Net Profit (Laba Bersih)</span>
            <span className="text-sm font-black text-amber-800">{formatRupiah(totals.net)}</span>
          </div>
        </div>

        {/* Section 1: Rincian Pemasukan (Cash In) */}
        <div className="mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1.5 mb-3">
            1. Rincian Pemasukan Utama (Cash In)
          </h3>
          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-2 border-b border-slate-200">No. Invoice</th>
                <th className="p-2 border-b border-slate-200">Customer / Keterangan</th>
                <th className="p-2 border-b border-slate-200 text-center">Status</th>
                <th className="p-2 border-b border-slate-200 text-right">Nominal Pemasukan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(invoices || []).map((inv) => (
                <tr key={inv.id} className="text-slate-800">
                  <td className="p-2 font-mono font-bold">{inv.number}</td>
                  <td className="p-2">{inv.customer?.name || "Customer Direct"}</td>
                  <td className="p-2 text-center">
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-2 text-right font-bold text-emerald-700">
                    {formatRupiah(inv.paid_amount || inv.grand_total)}
                  </td>
                </tr>
              ))}
              {(!invoices || invoices.length === 0) && (
                <tr><td colSpan={4} className="p-3 text-center text-slate-500">Tidak ada transaksi pemasukan terdaftar bulan ini.</td></tr>
              )}
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t border-slate-300">
              <tr>
                <td colSpan={3} className="p-2 text-right uppercase text-[10px] text-slate-700">Subtotal Cash In Invoice:</td>
                <td className="p-2 text-right text-emerald-800 font-black">{formatRupiah(totals.cashIn)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Section 2: Rincian Pengeluaran (Cash Out & Operasional) */}
        <div className="mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1.5 mb-3">
            2. Rincian Pengeluaran Operasional & Cash Out
          </h3>
          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-2 border-b border-slate-200">Kategori</th>
                <th className="p-2 border-b border-slate-200">Keterangan / Deskripsi</th>
                <th className="p-2 border-b border-slate-200 text-right">Nominal Pengeluaran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(cashOut || []).map((co, idx) => (
                <tr key={co.id || idx} className="text-slate-800">
                  <td className="p-2 font-bold uppercase text-[10px] text-slate-600">{co.category || "Operasional"}</td>
                  <td className="p-2">{co.description || "-"}</td>
                  <td className="p-2 text-right font-bold text-rose-700">{formatRupiah(co.amount)}</td>
                </tr>
              ))}
              <tr className="text-slate-800">
                <td className="p-2 font-bold uppercase text-[10px] text-slate-600">Payroll & Gaji</td>
                <td className="p-2">Pencairan Gaji & Bonus Karyawan Terkonfirmasi</td>
                <td className="p-2 text-right font-bold text-rose-700">{formatRupiah(totals.payrollPaid)}</td>
              </tr>
              <tr className="text-slate-800">
                <td className="p-2 font-bold uppercase text-[10px] text-slate-600">Petty Cash Out</td>
                <td className="p-2">Kas Kecil & Pengeluaran Harian Kantor</td>
                <td className="p-2 text-right font-bold text-rose-700">{formatRupiah(totals.pcOut)}</td>
              </tr>
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t border-slate-300">
              <tr>
                <td colSpan={2} className="p-2 text-right uppercase text-[10px] text-slate-700">Subtotal Cash Out:</td>
                <td className="p-2 text-right text-rose-800 font-black">{formatRupiah(totals.totalOut)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Signature Box */}
        <div className="mt-12 pt-6 border-t border-slate-200 grid grid-cols-2 text-center text-xs">
          <div>
            <p className="text-slate-500 font-medium">Dibuat Oleh,</p>
            <p className="font-bold text-slate-900 mt-1 uppercase">Divisi Finance & Keuangan</p>
            <div className="h-16 flex items-end justify-center">
              <span className="border-b border-slate-400 w-48 block font-bold text-slate-800 pb-1">( Manager Finance )</span>
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
          Dokumen Laporan Keuangan ini dicetak secara otomatis melalui Sistem Manajemen Internal Publish Inc. Indonesia.
        </div>

      </div>
    </div>
  );
}
