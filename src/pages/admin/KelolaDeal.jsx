import { useMemo, useState, useEffect } from "react";
import { Plus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail, formatRupiah } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { activeItems, createCsDeal } from "../../lib/workflow";
import { demoPenerbit } from "../../lib/demoData";

const EMPTY = {
  service_type: "terbit",
  customer_name: "",
  customer_phone: "",
  customer_city: "",
  customer_profession: "",
  title: "",
  publisher: "Publish Inc.",
  package_name: "Paket A",
  need_proofreading: true,
  specs: "",
  estimated_words: "",
  estimated_pages: "",
  total_price: "",
  down_payment: "",
  status_payment: "deal",
  notes: "",
  invoice_number: "",
  invoice_id: "",
};

const input = "w-full bg-navy-900 border border-white/10 rounded-lg px-3.5 py-2.5 text-white text-sm outline-none focus:border-brand-orange transition-colors";

export default function KelolaDeal() {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [items, setItems] = useState(() => activeItems());
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [publishers, setPublishers] = useState([]);

  useEffect(() => {
    api.get("/system/penerbit")
      .then((r) => setPublishers(r.data?.length ? r.data : demoPenerbit))
      .catch(() => setPublishers(demoPenerbit));
  }, []);

  const deals = useMemo(() => items.filter((item) => item.created_by === user?.id || user?.role === "cs"), [items, user]);
  const stats = useMemo(() => {
    const csDeals = deals.filter((item) => item.financial?.status_payment === "deal");
    return {
      dealTerbit: csDeals.filter((item) => item.service_type === "terbit").length,
      dealCetak: csDeals.filter((item) => item.service_type === "cetak").length,
      dealLainnya: csDeals.filter((item) => item.service_type === "lainnya").length,
      omzet: csDeals.reduce((sum, item) => sum + (Number(item.financial?.total_price) || 0), 0),
    };
  }, [deals]);

  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const lookupInvoice = async () => {
    if (!invoiceNumber.trim()) return toast.error("Masukkan nomor invoice dulu.");
    setInvoiceLoading(true);
    try {
      const { data } = await api.get("/invoices", { params: { q: invoiceNumber.trim(), status: "all", include_hidden: true, limit: 10 } });
      const needle = invoiceNumber.trim().toLowerCase();
      const invoice = (data.items || []).find((item) => String(item.number || "").toLowerCase() === needle) || data.items?.[0];
      if (!invoice) return toast.error("Invoice tidak ditemukan.");
      if (!["paid", "dp"].includes(invoice.status)) {
        return toast.error("Invoice ditemukan, tapi statusnya masih Unpaid. Belum bisa diklaim sebelum DP/Lunas.");
      }
      const pkg = invoice.package || {};
      const serviceType = invoice.service_type || "terbit";
      const durationStr = String(pkg.waktu || "").trim();
      const parsedDays = parseInt(durationStr, 10);
      const workingDays = !isNaN(parsedDays) && parsedDays > 0 ? parsedDays : (serviceType === "terbit" ? 30 : 14);

      const specs = pkg.spesifikasi || [
        pkg.ukuran && `Ukuran ${pkg.ukuran}`,
        pkg.eks && `${pkg.eks} eks`,
        pkg.hal && `${pkg.hal} halaman`,
        pkg.waktu && `Waktu ${pkg.waktu}`,
        ...(invoice.facilities || []).filter((f) => f.name).map((f) => `${f.name} ${f.total ? `(${formatRupiah(f.total)})` : ""}`),
      ].filter(Boolean).join(" | ");
      setSelectedInvoice(invoice);
      setForm({
        service_type: serviceType,
        customer_name: invoice.customer?.name || "",
        customer_phone: invoice.customer?.phone || "",
        customer_city: invoice.customer?.city || "",
        customer_profession: invoice.customer?.instansi || "",
        title: invoice.judul || pkg.name || "Layanan Publish Inc.",
        publisher: invoice.publisher || pkg.publisher || "Publish Inc.",
        package_name: serviceType === "terbit" ? (pkg.name || "Paket A") : serviceType === "cetak" ? (pkg.name || "Langsung Layout") : (pkg.name || "Layanan Lainnya"),
        working_days: workingDays,
        need_proofreading: serviceType === "terbit",
        specs,
        estimated_words: "",
        estimated_pages: pkg.hal || "",
        total_price: invoice.grand_total || 0,
        down_payment: invoice.paid_amount || 0,
        status_payment: "deal",
        notes: `Auto-fill dari invoice ${invoice.number}`,
        invoice_number: invoice.number,
        invoice_id: invoice.id,
      });
      toast.success("Data invoice berhasil dimuat ke form deal.");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail || e.message));
    } finally {
      setInvoiceLoading(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.customer_name || !form.customer_phone) return toast.error("Nama penulis dan nomor WA wajib diisi.");
    if (form.service_type !== "lainnya" && !form.title) return toast.error("Judul naskah wajib diisi untuk Terbit/Cetak.");
    if (!form.invoice_number) return toast.error("Ambil data dari nomor invoice dulu sebelum simpan deal.");
    createCsDeal(form, user);
    setItems(activeItems());
    setForm(EMPTY);
    setInvoiceNumber("");
    setSelectedInvoice(null);
    toast.success("Deal tersimpan! Naskah otomatis tercatat dan omzet CS terhitung.");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-5">
        <div>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            Form Klaim Deal CS
          </h1>
          <p className="text-slate-400 mt-1">
            Form khusus klaim deal CS berdasarkan invoice terbayar untuk menghitung KPI Terbit, Cetak, dan Omzet (termasuk Layanan Lainnya).
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2 min-w-[400px]">
          <Stat label="Deal Terbit" value={stats.dealTerbit} />
          <Stat label="Deal Cetak" value={stats.dealCetak} />
          <Stat label="Lainnya" value={stats.dealLainnya} />
          <Stat label="Total Omzet" value={formatRupiah(stats.omzet)} />
        </div>
      </div>

      <form onSubmit={submit} className="bg-navy-800 rounded-2xl p-6 border border-white/10 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Plus size={20} className="text-brand-orange" />
            <span>Klaim Deal Baru dari Invoice</span>
          </div>
          <span className="text-xs text-slate-400">KPI CS: Terbit, Cetak &amp; Total Omzet</span>
        </div>

        <Section title="1. Cari Invoice Deal">
          <div className="flex gap-2">
            <input
              className={input}
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Masukkan Nomor Invoice (Contoh: 1001/INV/Publish-Inc/09/2026)..."
            />
            <button
              type="button"
              onClick={lookupInvoice}
              disabled={invoiceLoading}
              className="rounded-lg bg-brand-blue hover:bg-blue-600 px-6 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-60 shrink-0"
            >
              {invoiceLoading ? "Memuat..." : "Ambil Data Invoice"}
            </button>
          </div>
          {selectedInvoice && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 flex items-center gap-3 text-xs text-emerald-300">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
              <div>
                Invoice <strong>{selectedInvoice.number}</strong> berhasil dimuat! Status: <span className="uppercase font-bold">{selectedInvoice.status}</span> &bull; Total: <strong>{formatRupiah(selectedInvoice.grand_total)}</strong>
              </div>
            </div>
          )}
        </Section>

        <div className="grid grid-cols-3 gap-3">
          {["terbit", "cetak", "lainnya"].map((type) => (
            <button
              key={type}
              type="button"
              disabled
              className={`rounded-xl py-3 px-4 text-xs font-black uppercase tracking-wider border transition-all ${
                form.service_type === type
                  ? "bg-brand-orange text-white border-brand-orange shadow-lg shadow-brand-orange/20"
                  : "bg-navy-900 text-slate-500 border-white/10 opacity-50"
              }`}
            >
              Layanan {type}
            </button>
          ))}
        </div>

        <Section title="2. Data Customer &amp; Penulis">
          <Field label="Nama Penulis / Customer">
            <input className={input} value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} readOnly />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="No. WhatsApp">
              <input className={input} value={form.customer_phone} onChange={(e) => set("customer_phone", e.target.value)} readOnly />
            </Field>
            <Field label="Kota Asal">
              <input className={input} value={form.customer_city} onChange={(e) => set("customer_city", e.target.value)} readOnly />
            </Field>
          </div>
          <Field label="Profesi / Instansi">
            <input className={input} value={form.customer_profession} onChange={(e) => set("customer_profession", e.target.value)} readOnly />
          </Field>
        </Section>

        <Section title="3. Data Naskah &amp; Paket">
          <Field label="Judul Naskah">
            <input className={input} value={form.title} onChange={(e) => set("title", e.target.value)} readOnly />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Penerbit">
              <select className={input} value={form.publisher} onChange={(e) => set("publisher", e.target.value)}>
                <option value="">-- Pilih Penerbit --</option>
                {publishers.map((p) => (
                  <option key={p.id || p.nama} value={p.nama || p.name}>
                    {p.nama || p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nama Paket">
              <input className={input} value={form.package_name} readOnly />
            </Field>
          </div>
          <Field label="Kebutuhan Pracetak">
            <select
              className={input}
              value={form.need_proofreading ? "true" : "false"}
              onChange={(e) => set("need_proofreading", e.target.value === "true")}
            >
              <option value="true">Perlu Proofreading</option>
              <option value="false">Langsung Layout</option>
            </select>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Estimasi Kata">
              <input type="number" className={input} value={form.estimated_words} onChange={(e) => set("estimated_words", e.target.value)} />
            </Field>
            <Field label="Estimasi Halaman">
              <input type="number" className={input} value={form.estimated_pages} onChange={(e) => set("estimated_pages", e.target.value)} readOnly />
            </Field>
          </div>
          <Field label="Spesifikasi / Catatan Tambahan">
            <textarea className={input} rows="2" value={form.specs} onChange={(e) => set("specs", e.target.value)} />
          </Field>
        </Section>

        <Section title="4. Rincian Invoice &amp; Omzet">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Total Nilai Invoice (Omzet)">
              <input type="number" className={input} value={form.total_price} onChange={(e) => set("total_price", e.target.value)} readOnly />
            </Field>
            <Field label="Jumlah Terbayar">
              <input type="number" className={input} value={form.down_payment} onChange={(e) => set("down_payment", e.target.value)} readOnly />
            </Field>
          </div>
          <Field label="Status Pembayaran">
            <input className={input} value="Deal" readOnly />
          </Field>
          <Field label="Catatan Internal CS">
            <textarea className={input} rows="2" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </Section>

        <button
          type="submit"
          className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white rounded-xl py-3.5 font-bold text-base shadow-lg shadow-brand-orange/20 transition-all hover:scale-[1.01]"
        >
          Klaim Deal &amp; Tambah Omzet KPI CS
        </button>
      </form>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-3.5">
      <div className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-white/10 pb-1.5">
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-300 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-navy-800 border border-white/10 rounded-xl p-3">
      <div className="text-[10px] text-slate-500 uppercase font-black tracking-wider">{label}</div>
      <div className="text-white font-black text-sm truncate mt-0.5">{value}</div>
    </div>
  );
}
