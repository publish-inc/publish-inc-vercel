import { useState, useEffect, useCallback } from "react";
import { Clipboard, Pencil, Trash2, FileDown, Wallet, Search, EyeOff, Eye, ChevronLeft, ChevronRight, Printer, User, Calendar } from "lucide-react";
import { toast } from "sonner";
import { api, API, formatRupiah, formatApiErrorDetail, formatDocNumber } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import OfferForm from "./OfferForm";
import InvoicePrintModal from "../../components/InvoicePrintModal";

const STATUS = {
  unpaid: { label: "Unpaid", cls: "bg-red-500/20 text-red-400" },
  dp: { label: "DP", cls: "bg-yellow-500/20 text-yellow-400" },
  paid: { label: "Paid", cls: "bg-green-500/20 text-green-400" },
};
const SERVICE_LABELS = { terbit: "Terbit", cetak: "Cetak", lainnya: "Lainnya" };

const ctrlCls = "bg-navy-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange";

export default function CSInvoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [q, setQ] = useState("");
  const [includeHidden, setIncludeHidden] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [editForm, setEditForm] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [printInvoice, setPrintInvoice] = useState(null);

  const canManage = (item) => {
    if (!user) return true;
    if (user.role === "master_admin" || user.role === "pimpinan" || user.role === "finance") return true;
    const ownerName = item.cs_name || item.created_by_name;
    const ownerId = item.cs_id || item.user_id;
    if (!ownerName && !ownerId) return true;
    return ownerId === user.id || (ownerName && user.name && ownerName.toLowerCase() === user.name.toLowerCase());
  };

  const load = useCallback(() => {
    api.get("/invoices", { params: { page, limit: 10, status: statusFilter, q, include_hidden: includeHidden, service_type: serviceFilter } })
      .then((r) => { setInvoices(r.data.items); setTotal(r.data.total); setPages(r.data.pages); })
      .catch((e) => toast.error(formatApiErrorDetail(e.response?.data?.detail)));
  }, [page, statusFilter, q, includeHidden, serviceFilter]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);
  useEffect(() => {
    api.get("/customers").then((r) => setCustomers(r.data));
    api.get("/cs/packages").then((r) => setPackages(r.data));
    api.get("/cs/facilities").then((r) => setFacilities(r.data));
    api.get("/system/penerbit").then((r) => setPublishers(r.data)).catch(() => setPublishers([]));
  }, []);
  useEffect(() => { setPage(1); }, [statusFilter, serviceFilter, q, includeHidden]);

  const copyInvoice = async (number) => {
    await navigator.clipboard.writeText(number || "");
    toast.success("Nomor invoice disalin.");
  };
  const update = async (payload) => {
    try { await api.put(`/invoices/${editForm.id}`, payload); toast.success("Invoice diperbarui"); setEditForm(null); load(); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };
  const del = async (id) => { await api.delete(`/invoices/${id}`); setConfirmDel(null); load(); toast.success("Dihapus"); };
  const toggleHide = async (inv) => {
    try { await api.put(`/invoices/${inv.id}/hide`, { hidden: !inv.hidden }); toast.success(inv.hidden ? "Ditampilkan kembali" : "Disembunyikan"); load(); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  const setDP = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0 || amt >= statusModal.inv.grand_total) { toast.error("Nominal DP harus di atas 0 dan di bawah total"); return; }
    try {
      await api.put(`/invoices/${statusModal.inv.id}/status`, { status: "dp", amount: amt, paid_at: paymentDate });
      toast.success(`Status jadi DP (Tgl Uang Masuk: ${paymentDate})`);
      setStatusModal(null); setAmount(""); load();
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };
  const setPaid = async () => {
    try {
      await api.put(`/invoices/${statusModal.inv.id}/status`, { status: "paid", paid_at: paymentDate });
      toast.success(`Status jadi Lunas (Tgl Pelunasan: ${paymentDate})`);
      setStatusModal(null); setAmount(""); load();
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  const openStatus = (inv) => {
    setStatusModal({ inv });
    setAmount(inv.status === "dp" ? String(inv.remaining) : "");
    setPaymentDate(new Date().toISOString().slice(0, 10));
  };

  return (
    <div data-testid="cs-invoices">
      <h1 className="font-display font-extrabold text-white text-3xl">Invoice</h1>
      <p className="text-slate-400 mt-1 mb-6">Kelola invoice &amp; pencatatan pembayaran DP/Pelunasan.</p>

      <div className="flex items-center flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input data-testid="invoice-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nomor / customer / judul..." className={ctrlCls + " w-full pl-10"} />
        </div>
        <select data-testid="invoice-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={ctrlCls}>
          <option value="all">Semua Status</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className={ctrlCls}>
          <option value="all">Semua Jenis</option>
          <option value="terbit">Terbit</option>
          <option value="cetak">Cetak</option>
          <option value="lainnya">Lainnya</option>
        </select>
        <button onClick={() => setIncludeHidden((v) => !v)} data-testid="toggle-hidden-invoices" className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border transition-colors ${includeHidden ? "bg-brand-orange/20 border-brand-orange/40 text-brand-orange" : "bg-navy-800 border-white/10 text-slate-300"}`}>
          {includeHidden ? <Eye size={16} /> : <EyeOff size={16} />} {includeHidden ? "Tampilkan tersembunyi" : "Sembunyikan tersembunyi"}
        </button>
      </div>

      <div className="bg-navy-900 border border-white/10 rounded-2xl overflow-x-auto">
        <table className="w-full text-left min-w-[900px]">
          <thead className="bg-navy-800 text-slate-400 text-sm">
            <tr>
              <th className="px-5 py-4">No. Invoice</th>
              <th className="px-5 py-4">Customer</th>
              <th className="px-5 py-4">CS Penanggung Jawab</th>
              <th className="px-5 py-4">Jenis</th>
              <th className="px-5 py-4">Total</th>
              <th className="px-5 py-4">Sisa</th>
              <th className="px-5 py-4">Status &amp; Riwayat Pembayaran</th>
              <th className="px-5 py-4">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {invoices.map((inv) => {
              const isOwner = canManage(inv);
              const csNameDisplay = inv.cs_name || inv.created_by_name || "Tim CS";

              return (
                <tr key={inv.id} data-testid={`invoice-row-${inv.id}`} className={`hover:bg-navy-800/50 ${inv.hidden ? "opacity-50" : ""}`}>
                  <td className="px-5 py-4 text-white font-mono text-xs">{formatDocNumber(inv.number, inv.service_type, "INV")}{inv.hidden && <span className="ml-2 text-[10px] text-slate-500">(tersembunyi)</span>}</td>
                  <td className="px-5 py-4 text-slate-200">{inv.customer?.name || "-"}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-navy-800 text-slate-300 text-xs font-semibold border border-white/10">
                      <User size={12} className="text-brand-orange" /> {csNameDisplay}
                    </span>
                  </td>
                  <td className="px-5 py-4"><span className="rounded-full bg-brand-orange/15 px-3 py-1 text-[10px] font-black uppercase text-brand-orange">{SERVICE_LABELS[inv.service_type || "terbit"]}</span></td>
                  <td className="px-5 py-4 text-brand-orange font-semibold">{formatRupiah(inv.grand_total)}</td>
                  <td className="px-5 py-4 text-slate-300">{formatRupiah(inv.remaining)}</td>
                  <td className="px-5 py-4 space-y-1">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full inline-block ${STATUS[inv.status]?.cls}`}>{STATUS[inv.status]?.label}</span>
                    {inv.paid_at && (
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Calendar size={11} className="text-brand-orange" /> {inv.paid_at}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPrintInvoice(inv)} data-testid={`invoice-pdf-${inv.id}`} title="Cetak PDF Invoice A4 (Semua CS)" className="p-2 rounded-lg bg-navy-800 text-slate-300 hover:text-brand-blue flex items-center gap-1 text-xs font-bold"><Printer size={16} /> PDF A4</button>
                      <button onClick={() => copyInvoice(inv.number)} data-testid={`invoice-copy-${inv.id}`} title="Copy No Invoice" className="p-2 rounded-lg bg-navy-800 text-slate-300 hover:text-brand-orange"><Clipboard size={16} /></button>
                      {isOwner ? (
                        <>
                          {inv.status !== "paid" && (
                            <>
                              <button onClick={() => setEditForm(inv)} data-testid={`invoice-edit-${inv.id}`} title="Update Data" className="p-2 rounded-lg bg-navy-800 text-slate-300 hover:text-brand-blue"><Pencil size={16} /></button>
                              <button onClick={() => openStatus(inv)} data-testid={`invoice-status-${inv.id}`} className="inline-flex items-center gap-1.5 bg-navy-800 text-slate-200 hover:text-brand-orange text-xs font-bold px-3 py-2 rounded-lg"><Wallet size={14} /> Edit Status / Pelunasan</button>
                            </>
                          )}
                          {inv.status === "paid" && (
                            <button onClick={() => toggleHide(inv)} data-testid={`invoice-hide-${inv.id}`} title={inv.hidden ? "Tampilkan" : "Sembunyikan"} className="p-2 rounded-lg bg-navy-800 text-slate-300 hover:text-brand-orange">{inv.hidden ? <Eye size={16} /> : <EyeOff size={16} />}</button>
                          )}
                          <button onClick={() => setConfirmDel(inv)} data-testid={`invoice-delete-${inv.id}`} title="Hapus" className="p-2 rounded-lg bg-navy-800 text-slate-300 hover:text-red-400"><Trash2 size={16} /></button>
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic" title="Aksi edit/pelunasan hanya diizinkan untuk CS penanggung jawab">Modus Lihat</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {invoices.length === 0 && <p className="text-slate-400 text-center py-16" data-testid="invoices-empty">Belum ada invoice. Buat dari penawaran berstatus Deal.</p>}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 mt-5">
        <p className="text-slate-500 text-sm" data-testid="invoices-total">Total {total} invoice · Halaman {page} dari {pages}</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page <= 1} data-testid="invoices-prev" className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-navy-800 border border-white/10 text-slate-300 disabled:opacity-40 text-sm"><ChevronLeft size={16} /> Sebelumnya</button>
          <button onClick={() => setPage((p) => Math.min(p + 1, pages))} disabled={page >= pages} data-testid="invoices-next" className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-navy-800 border border-white/10 text-slate-300 disabled:opacity-40 text-sm">Berikutnya <ChevronRight size={16} /></button>
        </div>
      </div>

      {printInvoice && <InvoicePrintModal invoice={printInvoice} onClose={() => setPrintInvoice(null)} />}

      {editForm && (
        <OfferForm
          title={`Update Invoice ${editForm.number}`} submitLabel="Update Invoice"
          initial={editForm} customers={customers} packages={packages} facilities={facilities} publishers={publishers}
          onSubmit={update} onCancel={() => setEditForm(null)}
        />
      )}

      {statusModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()} data-testid="status-modal">
            <div>
              <h3 className="font-display font-bold text-white text-lg">Input Status &amp; Tanggal Pembayaran</h3>
              <p className="text-slate-400 text-xs mt-0.5">Total tagihan: <b className="text-brand-orange">{formatRupiah(statusModal.inv.grand_total)}</b> · Sisa: <b>{formatRupiah(statusModal.inv.remaining)}</b></p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tanggal Transaksi / Uang Masuk</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-brand-orange font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">Sangat penting: Tanggal ini digunakan untuk menentukan capaian omzet CS pada bulan berjalan.</p>
            </div>

            {statusModal.inv.status === "unpaid" && (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Nominal DP (di bawah total)</label>
                  <input data-testid="dp-amount" type="number" className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-brand-orange font-mono" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="cth: 1000000" />
                </div>
                <div className="flex gap-3">
                  <button onClick={setDP} data-testid="confirm-dp-btn" className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2.5 rounded-xl text-xs">Set DP &amp; Catat Uang Masuk</button>
                  <button onClick={setPaid} data-testid="confirm-paid-btn" className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl text-xs">Langsung Lunas</button>
                </div>
              </div>
            )}
            {statusModal.inv.status === "dp" && (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Nominal Pelunasan</label>
                  <input data-testid="pelunasan-amount" type="number" className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-brand-orange font-mono" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  <p className="text-slate-400 text-xs mt-1">Sisa yang harus dilunasi: <b>{formatRupiah(statusModal.inv.remaining)}</b></p>
                </div>
                <button onClick={setPaid} data-testid="confirm-paid-btn" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl text-xs">Simpan Pelunasan &amp; Catat Omzet Bulan Ini</button>
              </div>
            )}
            <button onClick={() => setStatusModal(null)} className="w-full text-slate-400 py-1.5 text-xs hover:text-white">Batal</button>
          </div>
        </div>
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-white/10 rounded-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-white text-lg">Hapus Invoice?</h3>
            <p className="text-slate-400 mt-2">{confirmDel.number} akan dihapus.</p>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setConfirmDel(null)} className="px-5 py-2.5 rounded-xl text-slate-300 hover:bg-navy-800">Batal</button>
              <button onClick={() => del(confirmDel.id)} data-testid="confirm-delete-invoice-btn" className="bg-red-500 hover:bg-red-600 text-white font-bold px-5 py-2.5 rounded-xl">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
