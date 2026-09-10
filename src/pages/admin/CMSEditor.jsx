import { useState, useEffect, useRef } from "react";
import { Save, Plus, Trash2, ChevronDown, Upload, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "../../lib/api";

const input = "w-full bg-navy-900 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-orange";
const labelCls = "text-sm text-slate-300 font-medium";

const SECTIONS = [
  { key: "rekap", label: "Rekap / Statistik" },
  { key: "tentang", label: "Tentang Kami" },
  { key: "layanan", label: "Layanan Kami" },
  { key: "paket_penerbitan", label: "Paket Penerbitan" },
  { key: "paket_konversi", label: "Paket Konversi" },
  { key: "paket_cetak", label: "Paket Cetak Buku" },
  { key: "paket_ebook", label: "Terbit Ebook" },
  { key: "promo", label: "Info Promo" },
  { key: "buku_pilihan", label: "Buku Pilihan" },
  { key: "testimoni", label: "Testimoni" },
  { key: "tim", label: "Tim Kami" },
  { key: "faq", label: "FAQ" },
];

const Section = ({ title, desc, children, defaultOpen }) => {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="bg-navy-900 border border-white/10 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-5 text-left">
        <div>
          <h3 className="font-display font-bold text-white text-lg">{title}</h3>
          {desc && <p className="text-slate-400 text-sm mt-0.5">{desc}</p>}
        </div>
        <ChevronDown className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-6 pb-6 space-y-4 border-t border-white/5 pt-5">{children}</div>}
    </div>
  );
};

const Field = ({ label, value, onChange, textarea, ...rest }) => (
  <div>
    <label className={labelCls}>{label}</label>
    {textarea ? (
      <textarea rows={3} className={input + " mt-1.5 resize-none"} value={value || ""} onChange={(e) => onChange(e.target.value)} {...rest} />
    ) : (
      <input className={input + " mt-1.5"} value={value || ""} onChange={(e) => onChange(e.target.value)} {...rest} />
    )}
  </div>
);

const ImageField = ({ label, value, onChange, category = "landing" }) => {
  const ref = useRef();
  const [busy, setBusy] = useState(false);
  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", category);
    try {
      const { data } = await api.post("/upload", fd);
      onChange(data.url);
      toast.success("Gambar berhasil diupload");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex items-center gap-4 mt-1.5">
        {value && <img src={value} alt="" className="h-16 w-16 object-cover rounded-lg border border-white/10" />}
        <div className="flex-1 space-y-2">
          <input type="file" accept="image/*" ref={ref} onChange={upload} className="hidden" />
          <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="inline-flex items-center gap-2 bg-navy-800 border border-white/10 text-white px-4 py-2 rounded-xl hover:border-brand-orange transition-colors text-sm">
            <Upload size={15} /> {busy ? "Mengupload..." : "Upload Gambar"}
          </button>
          <input placeholder="atau tempel URL gambar" className={input} value={value || ""} onChange={(e) => onChange(e.target.value)} />
        </div>
      </div>
    </div>
  );
};

const PackageEditor = ({ pkgKey, c, set }) => {
  const pkg = c[pkgKey] || { items: [] };
  const upItem = (idx, field, val) => set([pkgKey, "items", idx, field], val);
  return (
    <>
      <Field label="Eyebrow" value={pkg.eyebrow} onChange={(v) => set([pkgKey, "eyebrow"], v)} />
      <Field label="Judul" value={pkg.title} onChange={(v) => set([pkgKey, "title"], v)} />
      <Field label="Deskripsi" textarea value={pkg.description} onChange={(v) => set([pkgKey, "description"], v)} />
      {(pkg.items || []).map((p, i) => (
        <div key={i} className="bg-navy-800 rounded-xl p-4 space-y-3 border border-white/5">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm font-semibold">Paket #{i + 1}</span>
            <button onClick={() => set([pkgKey, "items"], pkg.items.filter((_, x) => x !== i))} className="text-red-400"><Trash2 size={16} /></button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Nama Paket" value={p.name} onChange={(v) => upItem(i, "name", v)} />
            <Field label="Harga" value={p.price} onChange={(v) => upItem(i, "price", v)} />
          </div>
          <Field label="Deskripsi" value={p.description} onChange={(v) => upItem(i, "description", v)} />
          <div>
            <label className={labelCls}>Fasilitas / Fitur (satu per baris)</label>
            <textarea rows={4} className={input + " mt-1.5 resize-none"} value={(p.features || []).join("\n")} onChange={(e) => upItem(i, "features", e.target.value.split("\n"))} />
          </div>
          <ImageField label="Gambar Paket (opsional)" value={p.image} onChange={(v) => upItem(i, "image", v)} category="landing_packages" />
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={!!p.popular} onChange={(e) => upItem(i, "popular", e.target.checked)} className="h-5 w-5 accent-brand-orange" />
            <span className="text-slate-300 text-sm">Tandai sebagai paket terpopuler</span>
          </label>
        </div>
      ))}
      <button onClick={() => set([pkgKey, "items"], [...(pkg.items || []), { name: "", price: "", description: "", features: [""], image: "", popular: false }])} className="inline-flex items-center gap-2 text-brand-orange font-semibold"><Plus size={16} /> Tambah Paket</button>
    </>
  );
};

export default function CMSEditor() {
  const [c, setC] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get("/content").then((r) => setC(r.data)); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/content", c, { timeout: 30000 });
      setC(data);
      toast.success("Konten landing page disimpan");
    } catch (err) {
      console.error("Save CMS Error:", err);
      const detail = err.response?.data?.detail || (err.code === "ECONNABORTED" ? "Koneksi lambat (timeout). Silakan coba lagi." : "Gagal menyimpan konten landing page.");
      toast.error(formatApiErrorDetail(detail));
    } finally {
      setSaving(false);
    }
  };

  if (!c) return <div className="flex justify-center py-20"><div className="animate-spin h-10 w-10 border-2 border-brand-orange border-t-transparent rounded-full" /></div>;

  const set = (path, val) => {
    setC((prev) => {
      const next = structuredClone(prev);
      let o = next;
      for (let i = 0; i < path.length - 1; i++) { if (o[path[i]] == null) o[path[i]] = {}; o = o[path[i]]; }
      o[path[path.length - 1]] = val;
      return next;
    });
  };
  const updateArr = (key, idx, field, val) => setC((prev) => { const n = structuredClone(prev); n[key][idx][field] = val; return n; });
  const addArr = (key, item) => setC((prev) => ({ ...prev, [key]: [...(prev[key] || []), item] }));
  const removeArr = (key, idx) => setC((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== idx) }));

  const sv = c.section_visibility || {};
  const toggleVis = (key) => set(["section_visibility", key], sv[key] === false ? true : false);

  return (
    <div data-testid="cms-editor" className="max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8 sticky top-0 z-10 bg-navy-950/90 backdrop-blur py-2">
        <div>
          <h1 className="font-display font-extrabold text-white text-3xl">Konten Landing Page</h1>
          <p className="text-slate-400 mt-1">Atur seluruh tampilan, teks, gambar & section yang ditampilkan.</p>
        </div>
        <button onClick={save} disabled={saving} data-testid="save-content-btn" className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white font-bold px-6 py-3 rounded-xl transition-colors active:scale-95 disabled:opacity-60">
          <Save size={18} /> {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>

      <div className="space-y-5">
        <Section title="Tampilkan / Sembunyikan Section" desc="Nonaktifkan section yang sedang tidak tersedia." defaultOpen>
          <div className="grid sm:grid-cols-2 gap-3" data-testid="visibility-toggles">
            {SECTIONS.map((s) => {
              const visible = sv[s.key] !== false;
              return (
                <button key={s.key} onClick={() => toggleVis(s.key)} data-testid={`toggle-${s.key}`} className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${visible ? "bg-navy-800 border-white/10 text-white" : "bg-navy-950 border-white/5 text-slate-500"}`}>
                  <span className="font-medium">{s.label}</span>
                  {visible ? <Eye size={18} className="text-brand-orange" /> : <EyeOff size={18} />}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Brand & Kontak WhatsApp" defaultOpen>
          <Field label="Nama Brand" value={c.brand?.name} onChange={(v) => set(["brand", "name"], v)} />
          <Field label="Tagline" value={c.brand?.tagline} onChange={(v) => set(["brand", "tagline"], v)} />
          <Field label="Nomor WhatsApp (contoh: 6281234567890)" value={c.whatsapp_number} onChange={(v) => set(["whatsapp_number"], v)} />
        </Section>

        <Section title="Hero Section">
          <Field label="Eyebrow" value={c.hero?.eyebrow} onChange={(v) => set(["hero", "eyebrow"], v)} />
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Judul Baris 1" value={c.hero?.title_line1} onChange={(v) => set(["hero", "title_line1"], v)} />
            <Field label="Judul Baris 2 (oranye)" value={c.hero?.title_line2} onChange={(v) => set(["hero", "title_line2"], v)} />
          </div>
          <Field label="Deskripsi" textarea value={c.hero?.description} onChange={(v) => set(["hero", "description"], v)} />
          <Field label="Kutipan" value={c.hero?.quote} onChange={(v) => set(["hero", "quote"], v)} />
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Tombol Konsultasi (WA)" value={c.hero?.cta_primary_text} onChange={(v) => set(["hero", "cta_primary_text"], v)} />
            <Field label="Tombol Layanan" value={c.hero?.cta_secondary_text} onChange={(v) => set(["hero", "cta_secondary_text"], v)} />
          </div>
          <ImageField label="Gambar Hero (opsional, kosongkan untuk animasi buku)" value={c.hero?.image} onChange={(v) => set(["hero", "image"], v)} category="landing_hero" />
        </Section>

        <Section title="Statistik (Rekap)">
          {(c.stats || []).map((s, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
              <Field label="Angka" value={s.value} onChange={(v) => updateArr("stats", i, "value", v)} />
              <Field label="Label" value={s.label} onChange={(v) => updateArr("stats", i, "label", v)} />
              <button onClick={() => removeArr("stats", i)} className="p-2.5 rounded-xl bg-navy-800 text-red-400 hover:bg-red-500/10 mb-0.5"><Trash2 size={18} /></button>
            </div>
          ))}
          <button onClick={() => addArr("stats", { value: "", label: "" })} className="inline-flex items-center gap-2 text-brand-orange font-semibold"><Plus size={16} /> Tambah Statistik</button>
        </Section>

        <Section title="Tentang Kami">
          <Field label="Eyebrow" value={c.about?.eyebrow} onChange={(v) => set(["about", "eyebrow"], v)} />
          <Field label="Judul" value={c.about?.title} onChange={(v) => set(["about", "title"], v)} />
          <Field label="Deskripsi" textarea value={c.about?.description} onChange={(v) => set(["about", "description"], v)} />
          <ImageField label="Gambar Tentang Kami" value={c.about?.image} onChange={(v) => set(["about", "image"], v)} category="landing_about" />
          <label className={labelCls}>Poin-poin Keunggulan</label>
          {(c.about?.points || []).map((p, i) => (
            <div key={i} className="flex gap-3 items-center">
              <input className={input} value={p} onChange={(e) => set(["about", "points", i], e.target.value)} />
              <button onClick={() => set(["about", "points"], c.about.points.filter((_, x) => x !== i))} className="p-2.5 rounded-xl bg-navy-800 text-red-400 hover:bg-red-500/10"><Trash2 size={18} /></button>
            </div>
          ))}
          <button onClick={() => set(["about", "points"], [...(c.about?.points || []), ""])} className="inline-flex items-center gap-2 text-brand-orange font-semibold"><Plus size={16} /> Tambah Poin</button>
        </Section>

        <Section title="Layanan Kami">
          {(c.services || []).map((s, i) => (
            <div key={i} className="bg-navy-800 rounded-xl p-4 space-y-3 border border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm font-semibold">Layanan #{i + 1}</span>
                <button onClick={() => removeArr("services", i)} className="text-red-400"><Trash2 size={16} /></button>
              </div>
              <Field label="Ikon (BookOpen, PenTool, Megaphone, GraduationCap, Sparkles)" value={s.icon} onChange={(v) => updateArr("services", i, "icon", v)} />
              <Field label="Judul" value={s.title} onChange={(v) => updateArr("services", i, "title", v)} />
              <Field label="Deskripsi" textarea value={s.description} onChange={(v) => updateArr("services", i, "description", v)} />
              <ImageField label="Gambar Layanan (opsional)" value={s.image} onChange={(v) => updateArr("services", i, "image", v)} category="landing_services" />
            </div>
          ))}
          <button onClick={() => addArr("services", { icon: "BookOpen", title: "", description: "", image: "" })} className="inline-flex items-center gap-2 text-brand-orange font-semibold"><Plus size={16} /> Tambah Layanan</button>
        </Section>

        <Section title="Paket Penerbitan"><PackageEditor pkgKey="packages_penerbitan" c={c} set={set} /></Section>
        <Section title="Paket Konversi"><PackageEditor pkgKey="packages_konversi" c={c} set={set} /></Section>
        <Section title="Paket Cetak Buku"><PackageEditor pkgKey="packages_cetak" c={c} set={set} /></Section>
        <Section title="Terbit Ebook"><PackageEditor pkgKey="packages_ebook" c={c} set={set} /></Section>

        <Section title="Info Promo">
          <Field label="Eyebrow" value={c.promo?.eyebrow} onChange={(v) => set(["promo", "eyebrow"], v)} />
          <Field label="Judul" value={c.promo?.title} onChange={(v) => set(["promo", "title"], v)} />
          <Field label="Deskripsi" textarea value={c.promo?.description} onChange={(v) => set(["promo", "description"], v)} />
          {(c.promo?.items || []).map((p, i) => (
            <div key={i} className="bg-navy-800 rounded-xl p-4 space-y-3 border border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm font-semibold">Promo #{i + 1}</span>
                <button onClick={() => set(["promo", "items"], c.promo.items.filter((_, x) => x !== i))} className="text-red-400"><Trash2 size={16} /></button>
              </div>
              <Field label="Judul Promo" value={p.title} onChange={(v) => set(["promo", "items", i, "title"], v)} />
              <Field label="Badge (mis. HEMAT 20%)" value={p.badge} onChange={(v) => set(["promo", "items", i, "badge"], v)} />
              <Field label="Deskripsi" textarea value={p.description} onChange={(v) => set(["promo", "items", i, "description"], v)} />
              <ImageField label="Gambar Promo" value={p.image} onChange={(v) => set(["promo", "items", i, "image"], v)} category="landing_promo" />
            </div>
          ))}
          <button onClick={() => set(["promo", "items"], [...(c.promo?.items || []), { title: "", description: "", image: "", badge: "" }])} className="inline-flex items-center gap-2 text-brand-orange font-semibold"><Plus size={16} /> Tambah Promo</button>
        </Section>

        <Section title="Testimoni">
          {(c.testimonials || []).map((t, i) => (
            <div key={i} className="bg-navy-800 rounded-xl p-4 space-y-3 border border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm font-semibold">Testimoni #{i + 1}</span>
                <button onClick={() => removeArr("testimonials", i)} className="text-red-400"><Trash2 size={16} /></button>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Nama" value={t.name} onChange={(v) => updateArr("testimonials", i, "name", v)} />
                <Field label="Peran" value={t.role} onChange={(v) => updateArr("testimonials", i, "role", v)} />
              </div>
              <Field label="Kutipan" textarea value={t.quote} onChange={(v) => updateArr("testimonials", i, "quote", v)} />
            </div>
          ))}
          <button onClick={() => addArr("testimonials", { name: "", role: "", quote: "" })} className="inline-flex items-center gap-2 text-brand-orange font-semibold"><Plus size={16} /> Tambah Testimoni</button>
        </Section>

        <Section title="Tim">
          {(c.team || []).map((m, i) => (
            <div key={i} className="bg-navy-800 rounded-xl p-4 space-y-3 border border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm font-semibold">Anggota #{i + 1}</span>
                <button onClick={() => removeArr("team", i)} className="text-red-400"><Trash2 size={16} /></button>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Nama" value={m.name} onChange={(v) => updateArr("team", i, "name", v)} />
                <Field label="Peran" value={m.role} onChange={(v) => updateArr("team", i, "role", v)} />
              </div>
              <ImageField label="Foto Anggota (opsional)" value={m.photo} onChange={(v) => updateArr("team", i, "photo", v)} category="landing_team" />
            </div>
          ))}
          <button onClick={() => addArr("team", { name: "", role: "", photo: "" })} className="inline-flex items-center gap-2 text-brand-orange font-semibold"><Plus size={16} /> Tambah Anggota</button>
        </Section>

        <Section title="FAQ">
          <Field label="Eyebrow" value={c.faq?.eyebrow} onChange={(v) => set(["faq", "eyebrow"], v)} />
          <Field label="Judul" value={c.faq?.title} onChange={(v) => set(["faq", "title"], v)} />
          {(c.faq?.items || []).map((f, i) => (
            <div key={i} className="bg-navy-800 rounded-xl p-4 space-y-3 border border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm font-semibold">FAQ #{i + 1}</span>
                <button onClick={() => set(["faq", "items"], c.faq.items.filter((_, x) => x !== i))} className="text-red-400"><Trash2 size={16} /></button>
              </div>
              <Field label="Pertanyaan" value={f.question} onChange={(v) => set(["faq", "items", i, "question"], v)} />
              <Field label="Jawaban" textarea value={f.answer} onChange={(v) => set(["faq", "items", i, "answer"], v)} />
            </div>
          ))}
          <button onClick={() => set(["faq", "items"], [...(c.faq?.items || []), { question: "", answer: "" }])} className="inline-flex items-center gap-2 text-brand-orange font-semibold"><Plus size={16} /> Tambah FAQ</button>
        </Section>

        <Section title="Kontak (Bagian Bawah)">
          <Field label="Eyebrow" value={c.contact?.eyebrow} onChange={(v) => set(["contact", "eyebrow"], v)} />
          <Field label="Judul" value={c.contact?.title} onChange={(v) => set(["contact", "title"], v)} />
          <Field label="Deskripsi" textarea value={c.contact?.description} onChange={(v) => set(["contact", "description"], v)} />
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Email" value={c.contact?.email} onChange={(v) => set(["contact", "email"], v)} />
            <Field label="Telepon" value={c.contact?.phone} onChange={(v) => set(["contact", "phone"], v)} />
          </div>
          <Field label="Alamat" value={c.contact?.address} onChange={(v) => set(["contact", "address"], v)} />
        </Section>

        <Section title="Kebijakan Privasi" desc="Teks ini tampil publik di halaman /kebijakan-privasi.">
          <Field label="Judul Halaman" value={c.privacy_policy?.title} onChange={(v) => set(["privacy_policy", "title"], v)} />
          <Field label="Terakhir Diperbarui (opsional, cth: 1 Juli 2026)" value={c.privacy_policy?.updated_at} onChange={(v) => set(["privacy_policy", "updated_at"], v)} />
          <div>
            <label className={labelCls}>Isi Kebijakan Privasi</label>
            <textarea data-testid="privacy-content-input" rows={16} className={input + " mt-1.5 resize-y"} value={c.privacy_policy?.content || ""} onChange={(e) => set(["privacy_policy", "content"], e.target.value)} placeholder="Tulis kebijakan privasi di sini. Gunakan baris baru untuk memisahkan paragraf." />
          </div>
        </Section>
      </div>
    </div>
  );
}
