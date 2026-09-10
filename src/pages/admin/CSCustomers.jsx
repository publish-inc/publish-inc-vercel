import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "../../lib/api";

const EMPTY = { name: "Dummy Customer", phone: "081234567890", instansi: "Universitas Testing", city: "Jakarta" };
const inputCls = "w-full bg-navy-900 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-orange";

export default function CSCustomers() {
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmDel, setConfirmDel] = useState(null);

  const load = () => api.get("/customers").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (c) => { setEditing(c.id); setForm({ name: c.name, phone: c.phone, instansi: c.instansi, city: c.city }); setModal(true); };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/customers/${editing}`, form); else await api.post("/customers", form);
      toast.success("Tersimpan"); setModal(false); load();
    } catch (err) { toast.error(formatApiErrorDetail(err.response?.data?.detail)); }
  };
  const del = async (id) => { await api.delete(`/customers/${id}`); setConfirmDel(null); load(); toast.success("Dihapus"); };

  return (
    <div data-testid="cs-customers">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-display font-extrabold text-white text-3xl">Customer</h1>
          <p className="text-slate-400 mt-1">Kelola data customer.</p>
        </div>
        <button onClick={openNew} data-testid="add-customer-btn" className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white font-bold px-5 py-3 rounded-xl active:scale-95">
          <Plus size={18} /> Tambah Customer
        </button>
      </div>
      <div className="bg-navy-900 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-navy-800 text-slate-400 text-sm">
            <tr><th className="px-6 py-4">Nama</th><th className="px-6 py-4 hidden md:table-cell">No HP</th><th className="px-6 py-4 hidden md:table-cell">Instansi</th><th className="px-6 py-4 hidden md:table-cell">Kota</th><th className="px-6 py-4">Aksi</th></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items.map((c) => (
              <tr key={c.id} data-testid={`customer-row-${c.id}`} className="hover:bg-navy-800/50">
                <td className="px-6 py-4 text-white font-semibold">{c.name}</td>
                <td className="px-6 py-4 hidden md:table-cell text-slate-300">{c.phone}</td>
                <td className="px-6 py-4 hidden md:table-cell text-slate-300">{c.instansi}</td>
                <td className="px-6 py-4 hidden md:table-cell text-slate-300">{c.city}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(c)} data-testid={`edit-customer-${c.id}`} className="p-2 rounded-lg bg-navy-800 text-slate-300 hover:text-brand-blue"><Pencil size={16} /></button>
                    <button onClick={() => setConfirmDel(c)} data-testid={`delete-customer-${c.id}`} className="p-2 rounded-lg bg-navy-800 text-slate-300 hover:text-red-400"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p className="text-slate-400 text-center py-16">Belum ada customer.</p>}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-navy-900 border border-white/10 rounded-2xl w-full max-w-md my-8 p-7" onClick={(e) => e.stopPropagation()} data-testid="customer-modal">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-white text-xl">{editing ? "Ubah Customer" : "Tambah Customer"}</h2>
              <button onClick={() => setModal(false)} className="text-slate-400"><X /></button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div><label className="text-sm text-slate-300">Nama *</label><input data-testid="cust-name" required className={inputCls + " mt-1.5"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><label className="text-sm text-slate-300">No HP</label><input data-testid="cust-phone" className={inputCls + " mt-1.5"} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><label className="text-sm text-slate-300">Instansi</label><input data-testid="cust-instansi" className={inputCls + " mt-1.5"} value={form.instansi} onChange={(e) => setForm({ ...form, instansi: e.target.value })} /></div>
              <div><label className="text-sm text-slate-300">Kota Asal</label><input data-testid="cust-city" className={inputCls + " mt-1.5"} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="px-5 py-2.5 rounded-xl text-slate-300 hover:bg-navy-800">Batal</button>
                <button type="submit" data-testid="save-customer-btn" className="bg-brand-orange hover:bg-brand-orange-dark text-white font-bold px-6 py-2.5 rounded-xl">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirmDel && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-white/10 rounded-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-white text-lg">Hapus Customer?</h3>
            <p className="text-slate-400 mt-2">"{confirmDel.name}" akan dihapus.</p>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setConfirmDel(null)} className="px-5 py-2.5 rounded-xl text-slate-300 hover:bg-navy-800">Batal</button>
              <button onClick={() => del(confirmDel.id)} data-testid="confirm-delete-customer-btn" className="bg-red-500 hover:bg-red-600 text-white font-bold px-5 py-2.5 rounded-xl">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
