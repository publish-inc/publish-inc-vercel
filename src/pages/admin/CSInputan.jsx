import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Pencil, Save, Upload, Check, X } from "lucide-react";
import { toast } from "sonner";
import { api, formatRupiah, formatApiErrorDetail } from "../../lib/api";

const inputCls = "w-full bg-navy-900 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-orange";

function NamePriceList({ title, endpoint, testid, hasPublisher = false, publishers = [] }) {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("Paket / Fasilitas Dummy");
  const [price, setPrice] = useState("50000");
  const [publisher, setPublisher] = useState("");
  const [editing, setEditing] = useState(null);

  const load = () => api.get(endpoint).then((r) => setItems(r.data));
  useEffect(() => { load(); }, [endpoint]);

  const save = async () => {
    if (!name.trim()) return;
    try {
      const payload = { name, price: Number(price) || 0 };
      if (hasPublisher) {
        payload.publisher = publisher || (publishers.length > 0 ? publishers[0].nama : "Publish Inc.");
      }
      if (editing) await api.put(`${endpoint}/${editing}`, payload);
      else await api.post(endpoint, payload);
      setName(""); setPrice(""); setPublisher(""); setEditing(null); load();
      toast.success("Tersimpan");
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };
  const del = async (id) => { await api.delete(`${endpoint}/${id}`); load(); toast.success("Dihapus"); };

  return (
    <div className="bg-navy-900 border border-white/10 rounded-2xl p-6" data-testid={testid}>
      <h3 className="font-display font-bold text-white text-lg mb-4">{title}</h3>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {hasPublisher && (
          <select data-testid={`${testid}-publisher`} className={inputCls + " sm:max-w-[200px]"} value={publisher} onChange={(e) => setPublisher(e.target.value)}>
            <option value="">- Pilih Penerbit -</option>
            {publishers.map((p) => (
              <option key={p.id || p.nama} value={p.nama}>{p.nama}</option>
            ))}
          </select>
        )}
        <input data-testid={`${testid}-name`} className={inputCls} placeholder="Nama" value={name} onChange={(e) => setName(e.target.value)} />
        <input data-testid={`${testid}-price`} type="number" className={inputCls + " sm:max-w-[200px]"} placeholder="Harga (Rp)" value={price} onChange={(e) => setPrice(e.target.value)} />
        <button data-testid={`${testid}-save`} onClick={save} className="bg-brand-orange hover:bg-brand-orange-dark text-white font-bold px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap inline-flex items-center gap-2">
          {editing ? <Check size={16} /> : <Plus size={16} />} {editing ? "Update" : "Tambah"}
        </button>
        {editing && <button onClick={() => { setEditing(null); setName(""); setPrice(""); }} className="text-slate-400 px-3"><X size={18} /></button>}
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} data-testid={`${testid}-row-${it.id}`} className="flex items-center justify-between bg-navy-800 rounded-xl px-4 py-3 border border-white/5">
            <div>
              <div className="text-white font-medium">{it.name}</div>
              {hasPublisher && <div className="text-xs text-slate-500">{it.publisher}</div>}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-brand-orange font-semibold">{formatRupiah(it.price)}</span>
              <button onClick={() => { setEditing(it.id); setName(it.name); setPrice(it.price); if (hasPublisher) setPublisher(it.publisher); }} className="text-slate-400 hover:text-brand-blue"><Pencil size={15} /></button>
              <button onClick={() => del(it.id)} className="text-slate-400 hover:text-red-400"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-slate-500 text-sm">Belum ada data.</p>}
      </div>
    </div>
  );
}

function SettingsPanel() {
  const [bank, setBank] = useState("");
  const [sig, setSig] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  useEffect(() => { api.get("/cs/settings").then((r) => { setBank(r.data.bank_account || ""); setSig(r.data.signature_url || ""); }); }, []);

  const save = async () => {
    setSaving(true);
    try { await api.put("/cs/settings", { bank_account: bank }); toast.success("Pengaturan tersimpan"); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };
  const upload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append("file", file);
    try {
      const { data } = await api.post("/cs/settings/signature", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setSig(data.url); toast.success("Tanda tangan diupload & background dibersihkan");
    } catch (e2) { toast.error(formatApiErrorDetail(e2.response?.data?.detail)); }
    finally { setUploading(false); }
  };

  return (
    <div className="bg-navy-900 border border-white/10 rounded-2xl p-6" data-testid="cs-settings">
      <h3 className="font-display font-bold text-white text-lg mb-4">Pengaturan</h3>
      <label className="text-sm text-slate-300">Nomor Rekening / Catatan Pembayaran (tampil di PDF)</label>
      <textarea data-testid="settings-bank" rows={4} className={inputCls + " mt-1.5 resize-none"} value={bank} onChange={(e) => setBank(e.target.value)} placeholder={"BCA 1234567890 a.n Publish Inc.\nCS: 0812-xxxx"} />
      <button data-testid="settings-save" onClick={save} disabled={saving} className="mt-3 bg-brand-orange hover:bg-brand-orange-dark text-white font-bold px-5 py-2.5 rounded-xl inline-flex items-center gap-2 disabled:opacity-60">
        <Save size={16} /> {saving ? "Menyimpan..." : "Simpan Pengaturan"}
      </button>

      <div className="mt-8">
        <label className="text-sm text-slate-300">Tanda Tangan CS (background otomatis dibersihkan)</label>
        <div className="flex items-center gap-4 mt-2">
          {sig && <div className="bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%2210%22><rect width=%225%22 height=%225%22 fill=%22%23ccc%22/><rect x=%225%22 y=%225%22 width=%225%22 height=%225%22 fill=%22%23ccc%22/></svg>')] rounded-lg p-1"><img src={sig} alt="ttd" className="h-20" /></div>}
          <input type="file" accept="image/*" ref={fileRef} onChange={upload} className="hidden" data-testid="settings-sig-input" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 bg-navy-800 border border-white/10 text-white px-4 py-2.5 rounded-xl hover:border-brand-orange">
            <Upload size={16} /> {uploading ? "Memproses..." : "Upload Tanda Tangan"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CSInputan() {
  const [tab, setTab] = useState("paket");
  const [publishers, setPublishers] = useState([]);
  
  useEffect(() => {
    api.get("/system/penerbit").then(r => setPublishers(r.data)).catch(() => {});
  }, []);

  const tabs = [{ k: "paket", l: "Paket Penerbitan" }, { k: "fasilitas", l: "Fasilitas Tambahan" }, { k: "pengaturan", l: "Pengaturan" }];
  return (
    <div data-testid="cs-inputan">
      <h1 className="font-display font-extrabold text-white text-3xl">Inputan CS</h1>
      <p className="text-slate-400 mt-1 mb-6">Master data untuk penawaran & invoice CS.</p>
      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button key={t.k} data-testid={`tab-${t.k}`} onClick={() => setTab(t.k)} className={`px-5 py-2.5 rounded-xl font-semibold transition-colors ${tab === t.k ? "bg-brand-orange text-white" : "bg-navy-800 text-slate-300 border border-white/10"}`}>{t.l}</button>
        ))}
      </div>
      {tab === "paket" && <NamePriceList title="Paket Penerbitan" endpoint="/cs/packages" testid="cs-packages" hasPublisher={true} publishers={publishers} />}
      {tab === "fasilitas" && <NamePriceList title="Fasilitas Tambahan" endpoint="/cs/facilities" testid="cs-facilities" />}
      {tab === "pengaturan" && <SettingsPanel />}
    </div>
  );
}
