import { useState, useEffect } from "react";
import { Printer, X, CreditCard, CheckCircle2 } from "lucide-react";
import { formatRupiah, formatDocNumber } from "../lib/api";
import { fetchCompanyProfile, DEFAULT_COMPANY_PROFILE, getCompanyBankAccounts } from "../lib/companySettings";

export default function InvoicePrintModal({ invoice, onClose }) {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [companyProfile, setCompanyProfile] = useState(DEFAULT_COMPANY_PROFILE);

  useEffect(() => {
    setBankAccounts(getCompanyBankAccounts());
    fetchCompanyProfile().then(setCompanyProfile);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const invDate = invoice.created_at
    ? new Date(invoice.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  const pkg = invoice.package || {};
  const isPaid = invoice.status === "paid" || invoice.status === "lunas";
  const isDP = invoice.status === "dp";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/85 p-4 overflow-y-auto">
      {/* Printable Container A4 */}
      <div className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 p-10 shadow-2xl relative my-6 rounded-xl border border-slate-300 print:m-0 print:border-none print:shadow-none print:w-full print:max-w-none">
        
        {/* Printable CSS Rules */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 15mm;
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
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-200 print:hidden">
          <div>
            <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Pratinjau Dokumen Invoice (A4)</span>
            <p className="text-xs text-slate-500">Siap dicetak atau disimpan sebagai PDF</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-orange-dark shadow-md"
            >
              <Printer size={18} /> Cetak / Download PDF (A4)
            </button>
            <button onClick={onClose} className="rounded-xl bg-slate-100 p-2.5 text-slate-600 hover:bg-slate-200">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Formal A4 Document Content */}
        <div className="space-y-6 relative">
          
          {/* RUBBER STAMP OVERLAY ACCORDING TO STATUS */}
          <div className="absolute top-16 right-6 pointer-events-none z-10 flex flex-col gap-2 items-end">
            {isPaid ? (
              <div className="transform -rotate-12 border-4 border-emerald-600 text-emerald-600 font-black text-2xl px-6 py-2 rounded-2xl tracking-widest uppercase opacity-90 shadow-sm border-double">
                ✓ LUNAS / PAID
              </div>
            ) : (
              <>
                <div className="transform -rotate-12 border-4 border-rose-600 text-rose-600 font-black text-xl px-5 py-1.5 rounded-2xl tracking-widest uppercase opacity-90 shadow-sm border-double">
                  ⚠️ SEGERA DIBAYAR
                </div>
                <div className="transform -rotate-6 border-4 border-amber-600 text-amber-600 font-black text-lg px-4 py-1 rounded-2xl tracking-widest uppercase opacity-90 shadow-sm border-double">
                  ✓ DISETUJUI {isDP ? "(DP)" : ""}
                </div>
              </>
            )}
          </div>

          {/* Header Company Logo & Document Info */}
          <div className="flex justify-between items-center border-b-2 border-slate-900 pb-5">
            <div className="flex items-center gap-4">
              <img src="/logo.webp" alt={companyProfile.brand} className="h-14 w-14 rounded-full object-cover ring-2 ring-slate-200" />
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">{companyProfile.brand.toUpperCase()}</h1>
                <p className="text-xs font-semibold text-slate-600">{companyProfile.tagline} &bull; {companyProfile.name}</p>
                <p className="text-[11px] text-slate-500">{companyProfile.address} &bull; Email: {companyProfile.email}</p>
              </div>
            </div>
            <div className="text-right pr-32">
              <div className="text-lg font-black uppercase tracking-wider text-brand-orange">INVOICE / TAGIHAN</div>
              <div className="text-xs font-mono font-bold text-slate-800 mt-1">NO: {formatDocNumber(invoice.number, invoice.service_type, "INV")}</div>
              <div className="text-[11px] font-medium text-slate-500">Tanggal: {invDate}</div>
            </div>
          </div>

          {/* Customer Receiver Information */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-xl text-xs border border-slate-200">
            <div className="space-y-1.5">
              <span className="text-slate-500 font-medium block">Ditagihkan Kepada:</span>
              <div className="font-bold text-slate-900 text-sm">{invoice.customer?.name || `Customer ${companyProfile.brand}`}</div>
              <div className="text-slate-700">{invoice.customer?.email || "-"}</div>
              <div className="text-slate-700">Telp/WA: {invoice.customer?.phone || "-"}</div>
            </div>
            <div className="space-y-1.5">
              <span className="text-slate-500 font-medium block">Detail Rincian:</span>
              <div>Layanan: <strong className="uppercase text-brand-orange">{invoice.service_type || "terbit"}</strong></div>
              <div>Judul Buku: <strong className="text-slate-900">{invoice.judul || pkg.judul || "Judul Buku"}</strong></div>
              <div>Status: <strong className="uppercase text-slate-900">{invoice.status}</strong></div>
            </div>
          </div>

          {/* Table Rincian Invoice */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase text-slate-700">Rincian Tagihan Layanan</div>
            <table className="w-full text-left text-xs border-collapse border border-slate-300">
              <thead className="bg-slate-100 text-slate-800 font-bold uppercase border-b border-slate-300">
                <tr>
                  <th className="p-3 border-r border-slate-300 w-10 text-center">No</th>
                  <th className="p-3 border-r border-slate-300">Deskripsi Item / Paket</th>
                  <th className="p-3 border-r border-slate-300 text-center">Qty</th>
                  <th className="p-3 border-r border-slate-300 text-right">Harga Satuan</th>
                  <th className="p-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                <tr>
                  <td className="p-3 border-r border-slate-300 text-center font-bold">1</td>
                  <td className="p-3 border-r border-slate-300">
                    {(() => {
                      const serviceType = invoice.service_type || "terbit";
                      const judul = invoice.judul || pkg.judul || "Judul Buku";
                      const eks = pkg.eks || invoice.eks || 10;
                      const hal = pkg.hal || invoice.hal || 150;
                      const spesifikasi = pkg.spesifikasi || invoice.spesifikasi || "A5, Bookpaper, Softcover";
                      const waktu = pkg.waktu || invoice.waktu || "30 Hari Kerja";
                      const packageName = pkg.name || "Paket Penerbitan";

                      if (serviceType === "terbit") {
                        return (
                          <div>
                            <div className="font-bold text-sm text-slate-900">{packageName}</div>
                            <div className="text-slate-700 font-medium text-xs mt-0.5">
                              Spesifikasi: {spesifikasi} &bull; {hal} Hal &bull; {eks} Eks
                            </div>
                            <div className="text-slate-500 text-[11px] mt-0.5">
                              Estimasi Pengerjaan: {waktu}
                            </div>
                          </div>
                        );
                      }

                      if (serviceType === "cetak") {
                        return (
                          <div>
                            <div className="font-bold text-sm text-slate-900">
                              Cetak Buku: <span className="italic font-extrabold text-brand-orange">"{judul}"</span>
                            </div>
                            <div className="text-slate-700 text-xs mt-1">
                              <strong>Spesifikasi Cetak:</strong> {spesifikasi} ({eks} Eks, {hal} Halaman)
                            </div>
                          </div>
                        );
                      }

                      // serviceType === 'lainnya'
                      return (
                        <div>
                          <div className="font-bold text-sm text-slate-900">
                            {spesifikasi !== "-" ? spesifikasi : packageName}
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="p-3 border-r border-slate-300 text-center font-mono font-bold">1</td>
                  <td className="p-3 border-r border-slate-300 text-right font-mono">{formatRupiah(invoice.grand_total)}</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">{formatRupiah(invoice.grand_total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment Financial Breakdown */}
          <div className="grid grid-cols-2 gap-6 pt-2">
            {/* Left: Master Admin Company Bank Accounts */}
            <div className="space-y-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-xs font-bold uppercase text-slate-800 flex items-center gap-1.5">
                <CreditCard size={15} className="text-brand-orange" /> Rekening Pembayaran Resmi Perusahaan:
              </div>
              <div className="space-y-2">
                {bankAccounts.map((b) => (
                  <div key={b.id} className="text-xs bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">{b.bank_name}</span>
                      <span className="text-[11px] text-slate-500">a.n. {b.account_holder}</span>
                    </div>
                    <span className="font-mono font-bold text-brand-orange text-sm">{b.account_number}</span>
                  </div>
                ))}
                {bankAccounts.length === 0 && (
                  <div className="text-xs text-slate-500 italic">BCA: 1234567890 a.n. {companyProfile.name}</div>
                )}
              </div>
            </div>

            {/* Right: Total Summary */}
            <div className="space-y-2 text-xs self-end">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600 font-medium">Grand Total Tagihan:</span>
                <span className="font-mono font-bold text-slate-900">{formatRupiah(invoice.grand_total)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600 font-medium">Pembayaran Terbayar / DP:</span>
                <span className="font-mono font-bold text-emerald-700">+{formatRupiah(invoice.paid_amount || (isPaid ? invoice.grand_total : 0))}</span>
              </div>
              <div className="flex justify-between py-2 bg-slate-900 text-white px-4 rounded-xl font-bold">
                <span className="text-slate-300">Sisa Tagihan (Remaining):</span>
                <span className="font-mono text-brand-orange text-sm font-black">{formatRupiah(invoice.remaining)}</span>
              </div>
            </div>
          </div>

          {/* Footer Notice (No CS Signature as requested) */}
          <div className="pt-6 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
            <div>
              * Dokumen Invoice ini diterbitkan secara resmi oleh sistem komputerisasi {companyProfile.name} tanpa memerlukan tanda tangan basah.
            </div>
            <div className="font-mono text-slate-400">Valid &bull; {companyProfile.name}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
