import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, FileDown, ReceiptText, Search, EyeOff, Eye, ChevronLeft, ChevronRight, Printer, User } from "lucide-react";
import { toast } from "sonner";
import { api, API, formatRupiah, formatApiErrorDetail, formatDocNumber } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import OfferForm from "./OfferForm";
import OfferPrintModal from "../../components/OfferPrintModal";

const STATUS = {
  penawaran: { label: "Penawaran", cls: "bg-slate-500/20 text-slate-300" },
  deal: { label: "Deal", cls: "bg-green-500/20 text-green-400" },
  revisi: { label: "Revisi", cls: "bg-yellow-500/20 text-yellow-400" },
  cancel: { label: "Cancel", cls: "bg-red-500/20 text-red-400" },
};
const SERVICE_LABELS = { terbit: "Terbit", cetak: "Cetak", lainnya: "Lainnya" };

const ctrlCls = "bg-navy-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange";

export default function CSOffers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [offers, setOffers] = useState([]);
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
  const [form, setForm] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [printOffer, setPrintOffer] = useState(null);

  const canManage = (item) => {
    if (!user) return true;
    if (user.role === "master_admin" || user.role === "pimpinan") return true;
    const ownerName = item.cs_name || item.created_by_name;
    const ownerId = item.cs_id || item.user_id;
    if (!ownerName && !ownerId) return true;
    return ownerId === user.id || (ownerName && user.name && ownerName.toLowerCase() === user.name.toLowerCase());
  };

  const load = useCallback(() => {
    api.get("/offers", { params: { page, limit: 10, status: statusFilter, q, include_hidden: includeHidden, service_type: serviceFilter } })
      .then((r) => { setOffers(r.data.items); setTotal(r.data.total); setPages(r.data.pages); })
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

  const create = async (payload) => {
    try { await api.post("/offers", payload); toast.success("Penawaran dibuat"); setForm(null); load(); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };
  const update = async (payload) => {
    try { await api.put(`/offers/${form.data.id}`, payload); toast.success("Penawaran diperbarui"); setForm(null); load(); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };
  const changeStatus = async (id, status) => {
    try { await api.put(`/offers/${id}/status`, { status }); load(); toast.success("Status diperbarui"); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };
  const makeInvoice = async (id) => {
    try { await api.post("/invoices", { offer_id: id }); toast.success("Invoice dibuat"); load(); navigate("/admin/invoice"); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };
  const toggleHide = async (o) => {
    try { await api.put(`/offers/${o.id}/hide`, { hidden: !o.hidden }); toast.success(o.hidden ? "Ditampilkan kembali" : "Disembunyikan"); load(); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };
  const del = async (id) => { await api.delete(`/offers/${id}`); setConfirmDel(null); load(); toast.success("Dihapus"); };

  return (
    <div data-testid="cs-offers">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="font-display font-extrabold text-white text-3xl">Penawaran</h1>
          <p className="text-slate-400 mt-1">Buat &amp; kelola penawaran untuk customer.</p>
        </div>
        <button onClick={() => setForm({ mode: "create", data: { judul: "Judul Buku Dummy", customer_id: customers.length > 0 ? customers[0].id : "", service_type: "terbit", package: { name: "Paket Eksklusif", price: 2500000, jumlah: 1, eks: 10, hal: 150, spesifikasi: "A5, Bookpaper, Softcover", waktu: "30 Hari Kerja" } } })} data-testid="add-offer-btn" className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white font-bold px-5 py-3 rounded-xl active:scale-95">
          <Plus size={18} /> Buat Penawaran
        </button>
      </div>

      <div className="flex items-center flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input data-testid="offer-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nomor / customer / judul..." className={ctrlCls + " w-full pl-10"} />
        </div>
        <select data-testid="offer-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={ctrlCls}>
          <option value="all">Semua Status</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className={ctrlCls}>
          <option value="all">Semua Jenis</option>
          <option value="terbit">Terbit</option>
          <option value="cetak">Cetak</option>
          <option value="lainnya">Lainnya</option>
        </select>
        <button onClick={() => setIncludeHidden((v) => !v)} data-testid="toggle-hidden-offers" className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border transition-colors ${includeHidden ? "bg-brand-orange/20 border-brand-orange/40 text-brand-orange" : "bg-navy-800 border-white/10 text-slate-300"}`}>
          {includeHidden ? <Eye size={16} /> : <EyeOff size={16} />} {includeHidden ? "Tampilkan tersembunyi" : "Sembunyikan tersembunyi"}
        </button>
      </div>

      <div className="bg-navy-900 border border-white/10 rounded-2xl overflow-x-auto">
        <table className="w-full text-left min-w-[820px]">
          <thead className="bg-navy-800 text-slate-400 text-sm">
            <tr>
              <th className="px-5 py-4">No. Penawaran</th>
              <th className="px-5 py-4">Customer</th>
              <th className="px-5 py-4">CS Penanggung Jawab</th>
              <th className="px-5 py-4">Jenis</th>
              <th className="px-5 py-4">Total</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {offers.map((o) => {
              const isOwner = canManage(o);
              const csNameDisplay = o.cs_name || o.created_by_name || "Tim CS";

              return (
                <tr key={o.id} data-testid={`offer-row-${o.id}`} className={`hover:bg-navy-800/50 ${o.hidden ? "opacity-50" : ""}`}>
                  <td className="px-5 py-4 text-white font-mono text-xs">{formatDocNumber(o.number, o.service_type, "OFF")}{o.hidden && <span className="ml-2 text-[10px] text-slate-500">(tersembunyi)</span>}</td>
                  <td className="px-5 py-4 text-slate-200">{o.customer?.name || "-"}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-navy-800 text-slate-300 text-xs font-semibold border border-white/10">
                      <User size={12} className="text-brand-orange" /> {csNameDisplay}
                    </span>
                  </td>
                  <td className="px-5 py-4"><span className="rounded-full bg-brand-orange/15 px-3 py-1 text-[10px] font-black uppercase text-brand-orange">{SERVICE_LABELS[o.service_type || "terbit"]}</span></td>
                  <td className="px-5 py-4 text-brand-orange font-semibold">{formatRupiah(o.grand_total)}</td>
                  <td className="px-5 py-4">
                    {isOwner ? (
                      <select data-testid={`offer-status-${o.id}`} value={o.status} onChange={(e) => changeStatus(o.id, e.target.value)} className={`text-xs font-bold px-3 py-1.5 rounded-full border-0 outline-none cursor-pointer ${STATUS[o.status]?.cls}`}>
                        {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k} className="bg-navy-900 text-white">{v.label}</option>)}
                      </select>
                    ) : (
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${STATUS[o.status]?.cls}`} title="Hanya CS Penanggung Jawab / Admin yang dapat mengubah status">
                        {STATUS[o.status]?.label}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPrintOffer(o)} data-testid={`offer-pdf-${o.id}`} title="Cetak PDF Penawaran A4 (Semua CS)" className="p-2 rounded-lg bg-navy-800 text-slate-300 hover:text-brand-blue flex items-center gap-1 text-xs font-bold"><Printer size={16} /> PDF A4</button>
                      {isOwner ? (
                        <>
                          <button onClick={() => setForm({ mode: "edit", data: o })} title="Edit" className="p-2 rounded-lg bg-navy-800 text-slate-300 hover:text-brand-blue"><Pencil size={16} /></button>
                          {o.status === "deal" && (
                            <button onClick={() => toggleHide(o)} data-testid={`offer-hide-${o.id}`} title={o.hidden ? "Tampilkan" : "Sembunyikan"} className="p-2 rounded-lg bg-navy-800 text-slate-300 hover:text-brand-orange">{o.hidden ? <Eye size={16} /> : <EyeOff size={16} />}</button>
                          )}
                          <button onClick={() => setConfirmDel(o)} title="Hapus" className="p-2 rounded-lg bg-navy-800 text-slate-300 hover:text-red-400"><Trash2 size={16} /></button>
                          {o.status === "deal" && !o.invoice_created && (
                            <button onClick={() => makeInvoice(o.id)} data-testid={`make-invoice-${o.id}`} className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-lg">
                              <ReceiptText size={14} /> Buat Invoice
                            </button>
                          )}
                          {o.invoice_created && <span className="text-xs text-slate-500">Invoice dibuat</span>}
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic" title="Aksi edit/hapus hanya diizinkan untuk CS penanggung jawab">Modus Lihat</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {offers.length === 0 && <p className="text-slate-400 text-center py-16" data-testid="offers-empty">Belum ada penawaran.</p>}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 mt-5">
        <p className="text-slate-500 text-sm" data-testid="offers-total">Total {total} penawaran · Halaman {page} dari {pages}</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page <= 1} data-testid="offers-prev" className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-navy-800 border border-white/10 text-slate-300 disabled:opacity-40 text-sm"><ChevronLeft size={16} /> Sebelumnya</button>
          <button onClick={() => setPage((p) => Math.min(p + 1, pages))} disabled={page >= pages} data-testid="offers-next" className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-navy-800 border border-white/10 text-slate-300 disabled:opacity-40 text-sm">Berikutnya <ChevronRight size={16} /></button>
        </div>
      </div>

      {printOffer && <OfferPrintModal offer={printOffer} onClose={() => setPrintOffer(null)} />}

      {form && (
        <OfferForm
          title={form.mode === "edit" ? "Ubah Penawaran" : "Buat Penawaran"}
          submitLabel={form.mode === "edit" ? "Update Penawaran" : "Simpan Penawaran"}
          initial={form.data}
          customers={customers} packages={packages} facilities={facilities} publishers={publishers}
          onSubmit={form.mode === "edit" ? update : create}
          onCancel={() => setForm(null)}
        />
      )}
      {confirmDel && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-white/10 rounded-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-white text-lg">Hapus Penawaran?</h3>
            <p className="text-slate-400 mt-2">{confirmDel.number} akan dihapus.</p>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setConfirmDel(null)} className="px-5 py-2.5 rounded-xl text-slate-300 hover:bg-navy-800">Batal</button>
              <button onClick={() => del(confirmDel.id)} className="bg-red-500 hover:bg-red-600 text-white font-bold px-5 py-2.5 rounded-xl">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
