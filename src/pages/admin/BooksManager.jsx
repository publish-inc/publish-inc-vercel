import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Pencil, Trash2, X, Upload, Star, Search, EyeOff, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { api, formatRupiah, formatApiErrorDetail } from "../../lib/api";

const EMPTY = {
  title: "", author: "", description: "", price: 0, category: "Umum",
  cover_url: "", isbn: "", pages: 0, year: "", featured: false, marketplace_url: ""
};

const ctrlCls = "bg-navy-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange";

export default function BooksManager() {
  const [books, setBooks] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("Semua");
  const [showTakedown, setShowTakedown] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const fileRef = useRef();

  const load = useCallback(() => {
    setLoading(true);
    api.get("/admin/books", { params: { page, limit: 10, q, category, show_takedown: showTakedown } })
      .then((r) => { setBooks(r.data.items); setTotal(r.data.total); setPages(r.data.pages); })
      .catch((e) => toast.error(formatApiErrorDetail(e.response?.data?.detail)))
      .finally(() => setLoading(false));
  }, [page, q, category, showTakedown]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);
  useEffect(() => { api.get("/books/categories").then((r) => setCategories(r.data)).catch(() => {}); }, []);
  useEffect(() => { setPage(1); }, [q, category, showTakedown]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (b) => { setEditing(b.id); setForm({ ...EMPTY, ...b }); setModal(true); };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", "marketplace_covers");
    try {
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm((f) => ({ ...f, cover_url: data.url }));
      toast.success("Cover berhasil diupload");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setUploading(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, price: Number(form.price), pages: Number(form.pages) };
    try {
      if (editing) await api.put(`/books/${editing}`, payload);
      else await api.post("/books", payload);
      toast.success(editing ? "Buku diperbarui" : "Buku ditambahkan");
      setModal(false);
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    try {
      await api.delete(`/books/${id}`);
      toast.success("Buku dihapus");
      setConfirmDel(null);
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  const toggleTakedown = async (b) => {
    try {
      await api.put(`/books/${b.id}/takedown`, { is_takedown: !b.is_takedown });
      toast.success(b.is_takedown ? "Buku ditampilkan kembali" : "Buku di-takedown dari toko");
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  const input = "w-full bg-navy-900 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-orange";

  return (
    <div data-testid="books-manager">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="font-display font-extrabold text-white text-3xl">Kelola Buku</h1>
          <p className="text-slate-400 mt-1">Tambah, ubah, takedown, dan hapus buku di toko.</p>
        </div>
        <button onClick={openNew} data-testid="add-book-btn" className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white font-bold px-5 py-3 rounded-xl transition-colors active:scale-95">
          <Plus size={18} /> Tambah Buku
        </button>
      </div>

      <div className="flex items-center flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input data-testid="book-admin-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul atau penulis..." className={ctrlCls + " w-full pl-10"} />
        </div>
        <select data-testid="book-category-filter" value={category} onChange={(e) => setCategory(e.target.value)} className={ctrlCls}>
          <option value="Semua">Semua Kategori</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => setShowTakedown((v) => !v)} data-testid="toggle-takedown-books" className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border transition-colors ${showTakedown ? "bg-brand-orange/20 border-brand-orange/40 text-brand-orange" : "bg-navy-800 border-white/10 text-slate-300"}`}>
          {showTakedown ? <RotateCcw size={16} /> : <EyeOff size={16} />} {showTakedown ? "Tampilkan buku ditakedown" : "Tampilkan buku aktif"}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin h-10 w-10 border-2 border-brand-orange border-t-transparent rounded-full" /></div>
      ) : (
        <div className="bg-navy-900 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-navy-800 text-slate-400 text-sm">
              <tr>
                <th className="px-6 py-4 font-semibold">Buku</th>
                <th className="px-6 py-4 font-semibold hidden md:table-cell">Kategori</th>
                <th className="px-6 py-4 font-semibold hidden md:table-cell">Harga</th>
                <th className="px-6 py-4 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {books.map((b) => (
                <tr key={b.id} data-testid={`book-row-${b.id}`} className={`hover:bg-navy-800/50 transition-colors ${b.is_takedown ? "opacity-60" : ""}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={b.cover_url} alt="" className="h-14 w-11 object-cover rounded-md bg-navy-800" />
                      <div>
                        <div className="text-white font-semibold flex items-center gap-2">
                          {b.title}
                          {b.featured && <Star size={14} className="text-brand-orange fill-brand-orange" />}
                          {b.is_takedown && <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">TAKEDOWN</span>}
                        </div>
                        <div className="text-slate-400 text-sm">{b.author}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell text-slate-300">{b.category}</td>
                  <td className="px-6 py-4 hidden md:table-cell text-brand-orange font-semibold">{formatRupiah(b.price)}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(b)} data-testid={`edit-book-${b.id}`} className="p-2 rounded-lg bg-navy-800 text-slate-300 hover:text-brand-blue transition-colors"><Pencil size={16} /></button>
                      <button onClick={() => toggleTakedown(b)} data-testid={`takedown-book-${b.id}`} title={b.is_takedown ? "Tampilkan kembali" : "Takedown"} className="p-2 rounded-lg bg-navy-800 text-slate-300 hover:text-brand-orange transition-colors">{b.is_takedown ? <RotateCcw size={16} /> : <EyeOff size={16} />}</button>
                      <button onClick={() => setConfirmDel(b)} data-testid={`delete-book-${b.id}`} className="p-2 rounded-lg bg-navy-800 text-slate-300 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {books.length === 0 && <p className="text-slate-400 text-center py-16" data-testid="books-empty">{showTakedown ? "Tidak ada buku yang ditakedown." : "Belum ada buku. Tambahkan buku pertama Anda."}</p>}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3 mt-5">
        <p className="text-slate-500 text-sm" data-testid="books-total">Total {total} buku · Halaman {page} dari {pages}</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page <= 1} data-testid="books-prev" className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-navy-800 border border-white/10 text-slate-300 disabled:opacity-40 text-sm"><ChevronLeft size={16} /> Sebelumnya</button>
          <button onClick={() => setPage((p) => Math.min(p + 1, pages))} disabled={page >= pages} data-testid="books-next" className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-navy-800 border border-white/10 text-slate-300 disabled:opacity-40 text-sm">Berikutnya <ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Modal form */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-navy-900 border border-white/10 rounded-2xl w-full max-w-2xl my-8 p-7" onClick={(e) => e.stopPropagation()} data-testid="book-modal">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-white text-xl">{editing ? "Ubah Buku" : "Tambah Buku"}</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-white"><X /></button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-300">Judul *</label>
                  <input data-testid="form-title" required className={input + " mt-1.5"} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm text-slate-300">Penulis *</label>
                  <input data-testid="form-author" required className={input + " mt-1.5"} value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-300">Deskripsi</label>
                <textarea data-testid="form-description" rows={3} className={input + " mt-1.5 resize-none"} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-slate-300">Harga (Rp)</label>
                  <input data-testid="form-price" type="number" className={input + " mt-1.5"} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm text-slate-300">Kategori</label>
                  <input data-testid="form-category" className={input + " mt-1.5"} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm text-slate-300">Tahun</label>
                  <input className={input + " mt-1.5"} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-300">Jumlah Halaman</label>
                  <input type="number" className={input + " mt-1.5"} value={form.pages} onChange={(e) => setForm({ ...form, pages: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm text-slate-300">ISBN</label>
                  <input className={input + " mt-1.5"} value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-300">Link Marketplace (Shopee/Tokopedia dll.)</label>
                <input placeholder="https://shopee.co.id/..." className={input + " mt-1.5"} value={form.marketplace_url} onChange={(e) => setForm({ ...form, marketplace_url: e.target.value })} />
              </div>

              <div>
                <label className="text-sm text-slate-300">Cover Buku</label>
                <div className="flex items-center gap-4 mt-1.5">
                  {form.cover_url && <img src={form.cover_url} alt="" className="h-24 w-18 object-cover rounded-lg border border-white/10" />}
                  <div className="flex-1 space-y-2">
                    <input type="file" accept="image/*" ref={fileRef} onChange={upload} className="hidden" data-testid="cover-file-input" />
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 bg-navy-800 border border-white/10 text-white px-4 py-2.5 rounded-xl hover:border-brand-orange transition-colors">
                      <Upload size={16} /> {uploading ? "Mengupload..." : "Upload Cover"}
                    </button>
                    <input placeholder="atau tempel URL gambar" className={input} value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} />
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" data-testid="form-featured" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="h-5 w-5 accent-brand-orange" />
                <span className="text-slate-300">Tampilkan sebagai buku terlaris (featured)</span>
              </label>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setModal(false)} className="px-5 py-2.5 rounded-xl text-slate-300 hover:bg-navy-800 transition-colors">Batal</button>
                <button type="submit" disabled={saving} data-testid="save-book-btn" className="bg-brand-orange hover:bg-brand-orange-dark text-white font-bold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-60">
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-white/10 rounded-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-white text-lg">Hapus Buku?</h3>
            <p className="text-slate-400 mt-2">"{confirmDel.title}" akan dihapus permanen dari toko.</p>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setConfirmDel(null)} className="px-5 py-2.5 rounded-xl text-slate-300 hover:bg-navy-800">Batal</button>
              <button onClick={() => del(confirmDel.id)} data-testid="confirm-delete-btn" className="bg-red-500 hover:bg-red-600 text-white font-bold px-5 py-2.5 rounded-xl transition-colors">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
