import { useMemo, useState } from "react";
import { CheckCircle2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { activeItems, completeAdministration, updateWorkflowItem } from "../../lib/workflow";
import { api, formatApiErrorDetail } from "../../lib/api";
import { DEFAULT_SPK_TEMPLATE, SPK_TEMPLATE_KEY } from "../../lib/spkTemplate";

const DOC_TEMPLATES = [
  { key: "spk_perjanjian", label: "SPK Publishinc", url: "" },
  { key: "keaslian_naskah", label: "Keaslian Naskah", url: "https://docs.google.com/document/d/1A9-6q_puexXHJ83gT-m4ic3FfNi-NkHKJJxvOkn5BpQ/edit?usp=sharing" },
  { key: "permohonan_isbn", label: "Permohonan ISBN", url: "https://docs.google.com/document/d/1QfUDL0awOPVKM4wcfj4u5PkyWUdYY4_jPF2QCEBqsOU/edit?usp=sharing" },
  { key: "loa", label: "LoA", url: "https://docs.google.com/document/d/1t96X19bu1ameuTTsdoNQnt6HwHDyz9uLy3T8QVj8Ag0/edit?usp=sharing" },
  { key: "sktt", label: "SKTT", url: "https://docs.google.com/document/d/1mSQTofjnRRffI2DMA9c4ep97YbTcQkBznPiEN2JICUA/edit?usp=sharing" },
];

export default function AdministrasiSpk() {
  const { user } = useAuth();
  const [items, setItems] = useState(() => activeItems());
  const [manual, setManual] = useState(false);
  const naskah = useMemo(() => items.filter((item) => item.stage === "admin_administrasi"), [items]);

  const refresh = () => setItems(activeItems());
  const documentVariables = (item) => ({
    nama_penulis: item.customer.name || item.manuscript.author || "",
    nomor_wa: item.customer.phone || item.manuscript.phone || "",
    judul_buku: item.manuscript.title || "",
    judul_naskah: item.manuscript.title || "",
    penerbit: item.manuscript.publisher || "",
    paket: item.manuscript.package_name || "",
    kota_penulis: item.customer.city || "",
    profesi_penulis: item.customer.profession || "",
    alamat_penulis: item.customer.address || "",
    no_ktp: item.customer.identity_number || "",
    kode_tracking: item.tracking_code || "",
    tanggal: new Date().toLocaleDateString("id-ID"),
    nama_editor: "..................",
    no_permohonan: `001/P-ISBN/Publish-Inc/${new Date().getMonth()+1}/${new Date().getFullYear()}`,
    link_penjualan: "https://publishinc.id",
    no_loa: `001/LoA/Publish-Inc/${new Date().getMonth()+1}/${new Date().getFullYear()}`,
    no_sktt: `001/SKTT/Publish-Inc/${new Date().getMonth()+1}/${new Date().getFullYear()}`,
    no_isbn: "..................",
    ukuran: "14.8 x 21 cm",
    jumlah_halaman: item.manuscript.estimated_pages || "",
    jumlah_kata: item.manuscript.estimated_words || "",
  });
  const generate = async (item, doc) => {
    const variables = documentVariables(item);
    const filename = `${doc.key}-${item.tracking_code}.pdf`;
    let generatedFileUrl = "";
    let generatedDriveUrl = "";
    let generatedStoragePath = "";
    try {
      const spkTemplate = doc.key === "spk_perjanjian" ? JSON.parse(localStorage.getItem(SPK_TEMPLATE_KEY) || "null") || DEFAULT_SPK_TEMPLATE : null;
      const response = await api.post("/admin-documents/pdf", { label: doc.label, variables, template: spkTemplate, template_url: doc.url, save_to_drive: true }, { responseType: "blob" });
      generatedFileUrl = response.headers["x-file-url"] || "";
      generatedDriveUrl = response.headers["x-drive-web-url"] || "";
      generatedStoragePath = response.headers["x-storage-path"] || "";
      const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(formatApiErrorDetail(error.response?.data?.detail));
      return;
    }
    updateWorkflowItem(item.id, (current) => ({
      ...current,
      spk_url: doc.key === "spk_perjanjian" ? (generatedDriveUrl || generatedFileUrl || current.spk_url || doc.url) : current.spk_url,
      admin_docs: {
        ...(current.admin_docs || {}),
        [doc.key]: {
          label: doc.label,
          template_url: doc.url,
          file_url: generatedFileUrl,
          drive_url: generatedDriveUrl,
          storage_path: generatedStoragePath,
          downloaded_filename: filename,
          variables,
          generated_at: new Date().toISOString(),
        },
      },
      history: [...(current.history || []), { at: new Date().toISOString(), text: `Admin generate dokumen ${doc.label}.` }],
    }));
    refresh();
    toast.success(`${doc.label} PDF berhasil diunduh.`);
  };
  const finish = (item) => {
    const generatedCount = Object.keys(item.admin_docs || {}).length;
    if (generatedCount < DOC_TEMPLATES.length) return toast.error("Generate semua dokumen administrasi dulu sebelum diselesaikan.");
    completeAdministration(item.id, user);
    refresh();
    toast.success("Administrasi selesai. Dokumen lengkap & CCO siap mulai produksi.");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Administrasi Naskah</h1>
          <p className="text-slate-400 mt-1">Naskah yang form penulisnya selesai masuk ke sini untuk dokumen administrasi.</p>
        </div>
        <button onClick={() => setManual(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-orange px-4 py-3 text-white font-bold"><Plus size={18} /> Input Naskah Manual</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {naskah.map((item) => (
          <div key={item.id} className="bg-navy-800 border border-white/10 rounded-xl p-5 space-y-4">
            <div>
              <div className="text-[10px] uppercase font-black tracking-widest text-brand-orange">{item.tracking_code}</div>
              <h2 className="text-lg font-black text-white leading-tight">{item.manuscript.title}</h2>
              <p className="text-sm text-slate-400">{item.customer.name} &bull; {item.customer.phone}</p>
            </div>
            <div className="rounded-lg bg-navy-900 border border-white/10 p-3 text-sm text-slate-300">
              <div className="font-bold text-white">{item.manuscript.publisher} / {item.manuscript.package_name}</div>
              <div>{item.manuscript.need_proofreading ? "Perlu proofreading" : "Langsung layout"} &bull; {item.manuscript.estimated_pages || 0} halaman</div>
            </div>
            <div className="space-y-2">
              {DOC_TEMPLATES.map((doc) => {
                const generated = item.admin_docs?.[doc.key];
                return (
                  <div key={doc.key} className="rounded-lg bg-navy-900 border border-white/10 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-bold text-white">{doc.label}</div>
                      {generated ? <button onClick={() => generate(item, doc)} className="text-xs font-bold text-brand-orange">Download PDF</button> : <button onClick={() => generate(item, doc)} className="text-xs font-bold text-brand-orange">Generate PDF</button>}
                    </div>
                    <div className="mt-2 text-[10px] text-slate-500">
                      Variabel dinamis: nama_penulis, judul_buku, nomor_wa, no_ktp, alamat_penulis, tanggal, dsb.
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button onClick={() => finish(item)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 px-3 py-2 text-xs font-bold text-emerald-300"><CheckCircle2 size={15} /> Selesai Administrasi</button>
            </div>
          </div>
        ))}
        {!naskah.length && <div className="xl:col-span-3 bg-navy-800/60 border border-dashed border-white/10 rounded-xl p-10 text-center text-slate-500">Belum ada naskah administrasi.</div>}
      </div>

      {manual && <ManualModal onClose={() => setManual(false)} onSaved={refresh} />}
    </div>
  );
}

function ManualModal({ onClose, onSaved }) {
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const save = () => {
    if (!title || !name) return toast.error("Judul dan nama penulis wajib diisi.");
    const id = `wf-admin-${Date.now()}`;
    const item = {
      id,
      service_type: "terbit",
      stage: "admin_administrasi",
      tracking_code: `TRK-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      token: Math.floor(100000 + Math.random() * 900000).toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      base_date: new Date().toISOString().slice(0, 10),
      customer: { name, phone: "", city: "", profession: "" },
      manuscript: { title, author: name, phone: "", publisher: "Publish Inc.", package_name: "Paket A", need_proofreading: true, estimated_words: 0, estimated_pages: 0, specs: "", notes: "Input manual dari administrasi." },
      financial: { total_price: 0, down_payment: 0, status_payment: "manual" },
      tasks: {},
      delays: {},
      history: [{ at: new Date().toISOString(), text: "Naskah input manual dari Admin." }],
    };
    const items = [item, ...activeItems()];
    localStorage.setItem("publishinc_workflow_items_v1", JSON.stringify(items));
    onSaved();
    onClose();
    toast.success("Naskah manual masuk administrasi.");
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-xl bg-navy-800 border border-white/10 p-5 space-y-4">
        <h2 className="text-xl font-black text-white">Input Naskah Manual</h2>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul naskah" className="w-full bg-navy-900 border border-white/10 rounded-lg px-3 py-2 text-white" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama penulis" className="w-full bg-navy-900 border border-white/10 rounded-lg px-3 py-2 text-white" />
        <div className="flex justify-end gap-2"><button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/5 text-white">Batal</button><button onClick={save} className="px-4 py-2 rounded-lg bg-brand-orange text-white font-bold">Simpan</button></div>
      </div>
    </div>
  );
}
