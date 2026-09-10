import { useState, useEffect } from "react";
import { Printer, X, CheckCircle2 } from "lucide-react";
import { formatRupiah, formatDocNumber } from "../lib/api";
import { fetchCompanyProfile, DEFAULT_COMPANY_PROFILE } from "../lib/companySettings";

export default function OfferPrintModal({ offer, onClose }) {
  const [companyProfile, setCompanyProfile] = useState(DEFAULT_COMPANY_PROFILE);

  useEffect(() => {
    fetchCompanyProfile().then(setCompanyProfile);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const offerDate = offer.created_at
    ? new Date(offer.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  const pkg = offer.package || {};

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
            <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Pratinjau Dokumen Penawaran (A4)</span>
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
        <div className="space-y-6">
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
            <div className="text-right">
              <div className="text-lg font-black uppercase tracking-wider text-brand-orange">SURAT PENAWARAN HARGA</div>
              <div className="text-xs font-mono font-bold text-slate-800 mt-1">NO: {formatDocNumber(offer.number, offer.service_type, "OFF")}</div>
              <div className="text-[11px] font-medium text-slate-500">Tanggal: {offerDate}</div>
            </div>
          </div>

          {/* Customer Receiver Information */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-xl text-xs border border-slate-200">
            <div className="space-y-1.5">
              <span className="text-slate-500 font-medium block">Kepada Yth:</span>
              <div className="font-bold text-slate-900 text-sm">{offer.customer?.name || `Customer ${companyProfile.brand}`}</div>
              <div className="text-slate-700">{offer.customer?.email || "-"}</div>
              <div className="text-slate-700">Telp/WA: {offer.customer?.phone || "-"}</div>
            </div>
            <div className="space-y-1.5">
              <span className="text-slate-500 font-medium block">Detail Layanan:</span>
              <div>Kategori: <strong className="uppercase text-brand-orange">{offer.service_type || "terbit"}</strong></div>
              <div>Judul Naskah: <strong className="text-slate-900">{offer.judul || pkg.judul || "Judul Buku"}</strong></div>
              <div>Estimasi Pengerjaan: <strong className="text-slate-800">{pkg.waktu || "30 Hari Kerja"}</strong></div>
            </div>
          </div>

          {/* Table Rincian Paket & Layanan */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase text-slate-700">Rincian Paket Penawaran</div>
            <table className="w-full text-left text-xs border-collapse border border-slate-300">
              <thead className="bg-slate-100 text-slate-800 font-bold uppercase border-b border-slate-300">
                <tr>
                  <th className="p-3 border-r border-slate-300 w-10 text-center">No</th>
                  <th className="p-3 border-r border-slate-300">Deskripsi Item / Paket</th>
                  <th className="p-3 border-r border-slate-300 text-center">Jumlah Eks</th>
                  <th className="p-3 border-r border-slate-300 text-center">Halaman</th>
                  <th className="p-3 border-r border-slate-300 text-right">Harga Satuan</th>
                  <th className="p-3 text-right">Total Harga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                <tr>
                  <td className="p-3 border-r border-slate-300 text-center font-bold">1</td>
                  <td className="p-3 border-r border-slate-300">
                    {(() => {
                      const serviceType = offer.service_type || "terbit";
                      const judul = offer.judul || pkg.judul || "Judul Buku";
                      const eks = pkg.eks || offer.eks || 10;
                      const hal = pkg.hal || offer.hal || 150;
                      const spesifikasi = pkg.spesifikasi || offer.spesifikasi || "A5, Bookpaper, Softcover";
                      const waktu = pkg.waktu || offer.waktu || "30 Hari Kerja";
                      const packageName = pkg.name || "Paket Penerbitan";

                      if (serviceType === "terbit") {
                        return (
                          <div>
                            <div className="font-bold text-sm text-slate-900">{packageName}</div>
                            <div className="text-slate-700 font-medium text-xs mt-0.5">
                              Spesifikasi: {spesifikasi} &bull; {hal} Hal &bull; {eks} Eks
                            </div>
                            <div className="text-slate-500 text-[11px] mt-0.5">
                              Estimasi: {waktu}
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
                  <td className="p-3 border-r border-slate-300 text-center font-mono font-bold">{pkg.eks || offer.eks || 10} Eks</td>
                  <td className="p-3 border-r border-slate-300 text-center font-mono">{pkg.hal || offer.hal || 150} Hal</td>
                  <td className="p-3 border-r border-slate-300 text-right font-mono">{formatRupiah(pkg.price || offer.grand_total)}</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">{formatRupiah(offer.grand_total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Fasilitas Tambahan (If available) */}
          {offer.facilities && offer.facilities.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold uppercase text-slate-700">Fasilitas Layanan Termasuk:</div>
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                {offer.facilities.map((fac, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-slate-700">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>{typeof fac === "object" ? fac.name : fac}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financial Summary */}
          <div className="bg-slate-900 text-white p-5 rounded-xl flex justify-between items-center border border-slate-800 shadow-md">
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-300">TOTAL INVESTASI PENAWARAN</div>
              <div className="text-xs text-slate-400 mt-0.5">Sudah termasuk biaya penataan naskah, cover, &amp; distribusi.</div>
            </div>
            <div className="text-3xl font-black text-brand-orange tracking-tight">{formatRupiah(offer.grand_total)}</div>
          </div>

          {/* Terms & Signature CS */}
          <div className="pt-6 flex justify-between items-end text-xs text-slate-700 border-t border-slate-200 mt-6">
            <div className="max-w-xs space-y-1">
              <div className="font-bold text-slate-900">Catatan &amp; Ketentuan Penawaran:</div>
              <p className="text-[11px] text-slate-500">1. Penawaran ini berlaku selama 14 hari kerja sejak diterbitkan.</p>
              <p className="text-[11px] text-slate-500">2. Pembayaran DP dapat dilakukan setelah konfirmasi surat penawaran ini.</p>
            </div>

            {/* Signature CS */}
            <div className="text-center space-y-12">
              <div>
                Makassar, {offerDate}<br />
                <strong className="text-slate-900">Tim Customer Service {companyProfile.brand}</strong>
              </div>
              <div className="space-y-1">
                <div className="font-bold text-slate-900 border-b border-slate-900 pb-1 min-w-[160px]">
                  ( Customer Service )
                </div>
                <div className="text-[10px] text-slate-500">{companyProfile.name}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
