import { useEffect, useMemo, useState } from "react";
import { Calendar, Printer, Search, UserRound, X, CreditCard, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { api, formatRupiah } from "../../lib/api";
import { ROLE_LABELS } from "../../lib/workflow";
import { calculatePayrollSummary } from "../../lib/payroll";
import { fetchCompanyProfile, DEFAULT_COMPANY_PROFILE } from "../../lib/companySettings";

export default function SlipGaji() {
  const [searchParams] = useSearchParams();
  const initialUserParam = searchParams.get("user") || "";
  const initialPeriodParam = searchParams.get("period") || new Date().toISOString().slice(0, 7);

  const [users, setUsers] = useState([]);
  const [period, setPeriod] = useState(initialPeriodParam);
  const [search, setSearch] = useState(initialUserParam);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get("/hrd/users")
      .then((res) => setUsers(res.data || []))
      .catch(() => toast.error("Gagal mengambil data karyawan."));
  }, []);

  const rows = useMemo(() => {
    const summaryList = calculatePayrollSummary(users, period);
    return summaryList.filter((user) =>
      [user.name, user.email, user.role, user.nik, user.bank_account_number].some((val) =>
        String(val || "").toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [period, search, users]);

  useEffect(() => {
    if (initialUserParam && rows.length) {
      const match = rows.find((r) => r.name.toLowerCase() === initialUserParam.toLowerCase());
      if (match) setSelected(match);
    }
  }, [initialUserParam, rows]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Slip Gaji Karyawan (A4 Format)</h1>
          <p className="mt-1 text-slate-400">Pratinjau & cetak Slip Gaji resmi berformat A4 lengkap dengan logo dan data rekening.</p>
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-3 text-slate-400" size={18} />
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="h-11 rounded-xl border border-white/10 bg-navy-900 pl-10 pr-4 text-sm font-bold text-white outline-none focus:border-brand-orange"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-navy-800 p-5 space-y-6">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-4 top-3.5 text-slate-400" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari karyawan atau no rekening..."
            className="h-11 w-full rounded-xl border border-white/10 bg-navy-950 pl-11 pr-4 font-semibold text-white outline-none focus:border-brand-orange"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((emp) => (
            <div key={emp.id} className="rounded-2xl border border-white/10 bg-navy-900 p-5 flex flex-col justify-between hover:border-brand-orange/50 transition-all">
              <div>
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-orange/20 text-brand-orange font-bold">
                    <UserRound size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">{emp.name}</h3>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">
                      {ROLE_LABELS[emp.role] || emp.role}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-white/5 bg-navy-950 p-4">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>NIK:</span>
                    <span className="font-mono text-slate-200">{emp.nik || "-"}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Rekening:</span>
                    <span className="font-mono text-slate-200">{emp.bank_name || "Bank BCA"} - {emp.bank_account_number || "-"}</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-300">Take Home Pay:</span>
                    <span className="text-base font-black text-brand-orange">{formatRupiah(emp.net_salary)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelected(emp)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange py-3 text-sm font-bold text-white hover:bg-brand-orange-dark shadow-md transition-colors"
              >
                <Printer size={16} /> Pratinjau & Cetak Slip A4
              </button>
            </div>
          ))}

          {!rows.length && (
            <div className="col-span-full rounded-2xl border border-dashed border-white/10 py-16 text-center text-slate-500">
              Data karyawan tidak ditemukan.
            </div>
          )}
        </div>
      </div>

      {selected && <SlipModal employee={selected} period={period} onClose={() => setSelected(null)} />}
    </div>
  );
}

function SlipModal({ employee, period, onClose }) {
  const [companyProfile, setCompanyProfile] = useState(DEFAULT_COMPANY_PROFILE);

  useEffect(() => {
    fetchCompanyProfile().then(setCompanyProfile);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const slipDateFormatted = useMemo(() => {
    if (!period) {
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    const [year, month] = period.split("-").map(Number);
    const dateObj = new Date(year, month - 1, 1);
    return dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  }, [period]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/85 p-4 overflow-y-auto">
      {/* Printable Container formatted for A4 */}
      <div className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 p-10 shadow-2xl relative my-6 rounded-xl border border-slate-300 print:m-0 print:border-none print:shadow-none print:w-full print:max-w-none">
        
        {/* Printable CSS Rules for A4 Page */}
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

        {/* Action Header (Hidden in Print) */}
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-200 print:hidden">
          <div>
            <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Pratinjau Dokumen Slip Gaji A4</span>
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
          
          {/* Company Header */}
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
              <div className="text-lg font-black uppercase tracking-wider text-brand-orange">SLIP GAJI KARYAWAN</div>
              <div className="text-xs font-bold text-slate-700 mt-1">TANGGAL SLIP: {slipDateFormatted}</div>
              <div className="text-[11px] font-mono text-slate-500">Periode: {period}</div>
            </div>
          </div>

          {/* Employee & Bank Info Grid */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-xl text-xs border border-slate-200">
            <div className="space-y-2">
              <div>
                <span className="text-slate-500 block font-medium">Nama Karyawan:</span>
                <span className="font-bold text-slate-900 text-sm">{employee.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">NIK (KTP):</span>
                <span className="font-mono font-bold text-slate-800">{employee.nik || "-"}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Jabatan / Role:</span>
                <span className="font-bold text-slate-900 text-sm">{ROLE_LABELS[employee.role] || employee.role}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-slate-500 block font-medium">Email / WhatsApp:</span>
                <span className="font-semibold text-slate-800">{employee.email} / {employee.phone || "-"}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Bank & Nomor Rekening Tujuan:</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  {employee.bank_name || "Bank BCA"} - {employee.bank_account_number || "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Status Transfer Gaji:</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                  <CheckCircle2 size={13} /> Terverifikasi Ditransfer HRD & Finance
                </span>
              </div>
            </div>
          </div>

          {/* Rincian Komponen Penerimaan vs Potongan */}
          <div className="grid grid-cols-2 gap-6">
            {/* Column A: Penerimaan */}
            <div className="space-y-3">
              <div className="font-bold text-xs uppercase text-slate-700 border-b-2 border-slate-300 pb-1.5 flex justify-between">
                <span>A. PENERIMAAN (INCOME)</span>
                <span>JUMLAH</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Gaji Pokok:</span>
                  <span className="font-mono font-bold text-slate-900">{formatRupiah(employee.base_salary)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Tunjangan Tetap:</span>
                  <span className="font-mono font-bold text-slate-900">{formatRupiah(employee.allowance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Insentif / Bonus KPI:</span>
                  <span className="font-mono font-bold text-emerald-600">+{formatRupiah(employee.bonus_kpi)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900">
                  <span>Total Gross Income:</span>
                  <span className="font-mono">{formatRupiah(employee.gross_salary)}</span>
                </div>
              </div>
            </div>

            {/* Column B: Potongan */}
            <div className="space-y-3">
              <div className="font-bold text-xs uppercase text-slate-700 border-b-2 border-slate-300 pb-1.5 flex justify-between">
                <span>B. POTONGAN (DEDUCTIONS)</span>
                <span>JUMLAH</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Denda Keterlambatan / Kemnaker:</span>
                  <span className="font-mono text-rose-600">-{formatRupiah(employee.late_deduction)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Potongan Alpa / Mangkir:</span>
                  <span className="font-mono text-slate-500">Rp 0</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900">
                  <span>Total Deductions:</span>
                  <span className="font-mono text-rose-600">-{formatRupiah(employee.late_deduction)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Box Total Take Home Pay */}
          <div className="bg-slate-900 text-white p-5 rounded-xl flex justify-between items-center border border-slate-800 shadow-md">
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-300">TOTAL GAJI BERSIH (TAKE HOME PAY)</div>
              <div className="text-xs text-slate-400 mt-0.5">Penerimaan Bersih yang Ditransfer ke Rekening Karyawan</div>
            </div>
            <div className="text-3xl font-black text-brand-orange tracking-tight">{formatRupiah(employee.net_salary)}</div>
          </div>

          {/* Signature Footer */}
          <div className="pt-10 flex justify-between items-end text-xs text-slate-700 border-t border-slate-200 mt-8">
            <div className="text-center space-y-14">
              <div>Penerima (Karyawan),</div>
              <div className="font-bold text-slate-900 border-b border-slate-900 pb-1 min-w-[140px]">{employee.name}</div>
            </div>
            <div className="text-center space-y-14">
              <div>Makassar, {slipDateFormatted}<br />HRD Manager {companyProfile.brand}</div>
              <div className="font-bold text-slate-900 border-b border-slate-900 pb-1 min-w-[160px]">Tim HRD {companyProfile.brand}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
