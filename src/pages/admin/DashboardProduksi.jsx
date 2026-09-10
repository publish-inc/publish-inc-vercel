import { useMemo, useState } from "react";
import { Package, Check, Clipboard, Clock, Search, Printer } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { activeItems, finishProduksiStage, buildTimeline } from "../../lib/workflow";
import ProduksiReportPdfModal from "../../components/ProduksiReportPdfModal";

export default function DashboardProduksi() {
  const { user } = useAuth();
  const [items, setItems] = useState(() => activeItems());
  const [search, setSearch] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);

  const refresh = () => setItems(activeItems());

  const list = useMemo(() => {
    const needle = search.toLowerCase().trim();
    return items
      .filter((item) => item.stage === "produksi_work")
      .filter((item) => !needle || [item.manuscript?.title, item.customer?.name, item.tracking_code].some((v) => String(v || "").toLowerCase().includes(needle)));
  }, [items, search]);

  const copy = async (text, label) => {
    await navigator.clipboard.writeText(text || "");
    toast.success(`${label} disalin.`);
  };

  const action = (fn, message) => {
    fn();
    refresh();
    toast.success(message);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Antrian Produksi</h1>
          <p className="mt-1 text-slate-400">Daftar naskah yang siap untuk dicetak secara fisik.</p>
        </div>
        <button
          onClick={() => setShowReportModal(true)}
          className="inline-flex items-center gap-2.5 bg-brand-orange hover:bg-brand-orange-dark text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg text-xs"
        >
          <Printer size={16} /> Unduh PDF Laporan Bulanan Produksi
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-navy-800 p-5 shadow-sm">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-4 top-3.5 text-slate-300" size={20} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari judul, kode, penulis..." className="h-12 w-full rounded-xl border border-white/10 bg-navy-950 pl-11 pr-4 font-semibold text-white outline-none focus:border-brand-orange" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {list.map((item) => (
          <ProduksiCard key={item.id} item={item} user={user} copy={copy} action={action} />
        ))}
        {!list.length && <div className="col-span-full rounded-3xl border border-dashed border-white/10 bg-navy-800/60 p-12 text-center text-slate-500">Tidak ada antrian produksi saat ini.</div>}
      </div>

      {showReportModal && (
        <ProduksiReportPdfModal items={items} onClose={() => setShowReportModal(false)} />
      )}
    </div>
  );
}

function ProduksiCard({ item, copy, action }) {
  const timeline = buildTimeline(item);
  const prodStep = timeline.find((s) => s.key === "produksi");

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-navy-800 p-5 shadow-sm hover:border-brand-orange/50 transition-colors">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-brand-orange tracking-widest">{item.tracking_code}</span>
          <span className="rounded-full bg-rose-500/10 px-3 py-1 text-[10px] font-bold text-rose-400 border border-rose-500/20 flex items-center gap-1"><Package size={10} /> Produksi Aktif</span>
        </div>
        <h2 className="text-lg font-black text-white leading-tight mb-2">{item.manuscript?.title}</h2>
        <div className="text-sm text-slate-400 mb-4 line-clamp-1">{item.customer?.name}</div>

        <div className="space-y-3 mt-4 border-t border-white/10 pt-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-navy-900 p-2 border border-white/5">
              <div className="text-[10px] font-black uppercase text-slate-500">Target Selesai</div>
              <div className="text-sm font-bold text-white mt-1">{prodStep ? new Date(prodStep.end).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) : "-"}</div>
            </div>
            <div className="rounded-lg bg-navy-900 p-2 border border-white/5">
              <div className="text-[10px] font-black uppercase text-slate-500">Status</div>
              <div className="text-sm font-bold text-white mt-1">Cetak Fisik</div>
            </div>
          </div>
          
          <div className="rounded-lg bg-navy-900 p-3 border border-white/5">
             <div className="text-[10px] font-black uppercase text-slate-500 mb-1">Spesifikasi Cetak</div>
             <div className="text-sm font-medium text-slate-300">{item.manuscript?.specs || "Spesifikasi tidak tersedia."}</div>
             <div className="text-xs text-slate-400 mt-2">Paket: {item.manuscript?.package_name}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
        <button onClick={() => action(() => finishProduksiStage(item.id), "Selesai dicetak. Dikembalikan ke CCO untuk distribusi.")} className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-3 text-sm font-bold text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors">
          <Check size={16} /> Tandai Selesai Cetak
        </button>
      </div>
    </div>
  );
}
