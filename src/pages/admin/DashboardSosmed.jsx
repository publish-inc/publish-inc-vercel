import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Calendar as CalendarIcon, Upload, Link2, Printer, Eye, ThumbsUp, MessageSquare, Edit3, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "../../lib/api";
import SosmedReportPdfModal from "../../components/SosmedReportPdfModal";

const PLATFORMS = ["Instagram", "TikTok", "Facebook", "Twitter/X", "Website/Blog"];

export default function DashboardSosmed({ mode = "combined" }) {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [editMetricsModal, setEditMetricsModal] = useState(null);
  const fileRef = useRef(null);
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], platform: "Instagram", title: "", description: "", asset_url: "", drive_url: "" });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("site_content").select("content").eq("key", "social").single();
      if (data?.content && data.content.length > 0) {
        setContent(data.content);
      } else {
        setContent([]);
      }
    } catch(err) {
      setContent([]);
    }
    setLoading(false);
  };

  const saveToDb = async (newContent) => {
    setSaving(true);
    try {
      await supabase.from("site_content").upsert({ key: "social", content: newContent, updated_at: new Date().toISOString() });
      setContent(newContent);
      toast.success("Tersimpan!");
    } catch (err) {
      toast.error("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = (e) => {
    e.preventDefault();
    const newItem = { id: Date.now().toString(), ...form };
    const newContent = [...content, newItem].sort((a, b) => new Date(a.date) - new Date(b.date));
    saveToDb(newContent);
    setForm({ ...form, title: "", description: "", asset_url: "", drive_url: "" });
  };

  const handleDel = (id) => {
    const newContent = content.filter((c) => c.id !== id);
    saveToDb(newContent);
  };

  const uploadAsset = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", "sosmed_content");
    try {
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm((current) => ({ ...current, asset_url: data.url, drive_url: data.drive_url || "" }));
      toast.success("Aset konten berhasil diupload.");
    } catch (error) {
      toast.error(formatApiErrorDetail(error.response?.data?.detail));
    } finally {
      setUploading(false);
    }
  };

  const grouped = content.reduce((acc, curr) => {
    const month = curr.date.substring(0, 7); // YYYY-MM
    if (!acc[month]) acc[month] = [];
    acc[month].push(curr);
    return acc;
  }, {});

  const months = Object.keys(grouped).sort().reverse(); // newest first

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">{mode === "input" ? "Input Konten Sosmed" : "Kalender Konten Sosmed"}</h1>
          <p className="mt-1 text-slate-400">Kelola dan jadwalkan konten untuk berbagai platform media sosial.</p>
        </div>
        <button
          onClick={() => setShowReportModal(true)}
          className="inline-flex items-center gap-2.5 bg-brand-orange hover:bg-brand-orange-dark text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg text-xs"
        >
          <Printer size={16} /> Unduh PDF Laporan Bulanan Sosmed
        </button>
      </div>

      <div className={`grid gap-6 ${mode === "input" ? "lg:grid-cols-1" : "lg:grid-cols-3"}`}>
        {(mode === "combined" || mode === "input") && (
        <div className="lg:col-span-1">
          <form onSubmit={handleAdd} className="bg-navy-800 rounded-3xl p-6 border border-white/10 space-y-4">
            <h2 className="font-bold text-white mb-4">Tambah Jadwal Konten</h2>
            <div>
              <label className="text-sm text-slate-300 block mb-1">Tanggal Posting</label>
              <input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full bg-navy-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand-orange" />
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-1">Platform</label>
              <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} className="w-full bg-navy-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand-orange">
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-1">Judul / Topik</label>
              <input required placeholder="Cth: Promo Buku Akhir Tahun" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-navy-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand-orange" />
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-1">Deskripsi / Caption</label>
              <textarea rows={3} placeholder="Caption atau catatan konten..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-navy-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand-orange resize-none" />
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-1">Aset Konten</label>
              <div className="flex items-center gap-3">
                {form.asset_url && <a href={form.drive_url || form.asset_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-brand-blue hover:underline">File siap</a>}
                <input type="file" accept="image/*,video/*,.pdf" ref={fileRef} onChange={uploadAsset} className="hidden" />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-navy-900 px-4 py-2.5 text-sm font-bold text-white hover:border-brand-orange disabled:opacity-60">
                  <Upload size={16} /> {uploading ? "Mengupload..." : "Upload Aset"}
                </button>
              </div>
            </div>
            <button disabled={saving} type="submit" className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
              {saving ? "Menyimpan..." : "Tambah ke Kalender"}
            </button>
          </form>
        </div>
        )}

        {(mode === "combined" || mode === "calendar") && (
        <div className={`${mode === "calendar" ? "lg:col-span-3" : "lg:col-span-2"} space-y-6`}>
          {loading ? (
            <div className="text-slate-400 py-10 text-center">Memuat kalender...</div>
          ) : months.length === 0 ? (
            <div className="bg-navy-800 rounded-3xl p-10 text-center border border-white/10">
              <CalendarIcon size={40} className="mx-auto text-slate-500 mb-4" />
              <p className="text-slate-400">Belum ada jadwal konten. Silakan buat baru.</p>
            </div>
          ) : (
            months.map(month => {
              const [y, m] = month.split("-");
              const monthName = new Date(y, m - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
              return (
                <div key={month} className="bg-navy-800 rounded-3xl border border-white/10 overflow-hidden">
                  <div className="bg-navy-900/80 px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="font-bold text-white text-lg">{monthName}</h3>
                    <span className="text-xs text-brand-orange font-bold bg-brand-orange/20 px-2.5 py-1 rounded-full">{grouped[month].length} Konten</span>
                  </div>
                  <div className="divide-y divide-white/5">
                    {grouped[month].map(item => {
                      const d = new Date(item.date).getDate();
                      return (
                        <div key={item.id} className="p-6 flex gap-4 hover:bg-white/5 transition-colors group">
                          <div className="flex flex-col items-center justify-center bg-navy-900 h-16 w-16 rounded-xl border border-white/10 shrink-0">
                            <span className="text-xs text-slate-400 uppercase font-bold">{new Date(item.date).toLocaleString('id-ID', { weekday: 'short' })}</span>
                            <span className="text-2xl font-display font-bold text-white leading-none">{d}</span>
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-brand-blue bg-brand-blue/20 px-2.5 py-0.5 rounded-full">{item.platform}</span>
                              <button
                                onClick={() => setEditMetricsModal(item)}
                                className="inline-flex items-center gap-1 bg-navy-900 border border-white/10 hover:border-brand-orange text-xs font-bold text-slate-300 px-2.5 py-1 rounded-lg transition-colors"
                              >
                                <Edit3 size={13} /> Input Views/Likes
                              </button>
                            </div>
                            <h4 className="font-bold text-white text-lg">{item.title}</h4>
                            <p className="text-slate-400 text-sm">{item.description}</p>
                            
                            {/* Metrics badges */}
                            <div className="flex flex-wrap gap-2 pt-1 text-xs font-bold">
                              <span className="bg-sky-500/10 text-sky-300 border border-sky-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                <Eye size={13} /> {item.views ? Number(item.views).toLocaleString('id-ID') : 0} Views
                              </span>
                              <span className="bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                <ThumbsUp size={13} /> {item.likes ? Number(item.likes).toLocaleString('id-ID') : 0} Likes
                              </span>
                              <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                <MessageSquare size={13} /> {item.comments ? Number(item.comments).toLocaleString('id-ID') : 0} Komentar
                              </span>
                            </div>

                            {(item.drive_url || item.asset_url) && (
                              <a href={item.drive_url || item.asset_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-brand-blue hover:underline">
                                <Link2 size={13} /> File Konten
                              </a>
                            )}
                          </div>
                          <button onClick={() => handleDel(item.id)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all self-start p-2">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
        )}
      </div>

      {/* Modal Edit Metrics (Views, Likes, Comments, Share) */}
      {editMetricsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-lg">Input Performa Konten</h3>
              <button onClick={() => setEditMetricsModal(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div>
              <div className="text-xs text-brand-orange font-bold uppercase">{editMetricsModal.platform}</div>
              <div className="text-white font-bold text-base mt-0.5">{editMetricsModal.title}</div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                const views = fd.get("views");
                const likes = fd.get("likes");
                const comments = fd.get("comments");
                const shares = fd.get("shares");

                const updated = content.map(c => {
                  if (c.id === editMetricsModal.id) {
                    return { ...c, views: Number(views) || 0, likes: Number(likes) || 0, comments: Number(comments) || 0, shares: Number(shares) || 0 };
                  }
                  return c;
                });
                saveToDb(updated);
                setEditMetricsModal(null);
                toast.success("Performa konten berhasil disimpan!");
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300">Views / Impresi</label>
                  <input type="number" name="views" defaultValue={editMetricsModal.views || 0} className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-white font-bold text-sm outline-none focus:border-brand-orange mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300">Likes</label>
                  <input type="number" name="likes" defaultValue={editMetricsModal.likes || 0} className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-white font-bold text-sm outline-none focus:border-brand-orange mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300">Komentar</label>
                  <input type="number" name="comments" defaultValue={editMetricsModal.comments || 0} className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-white font-bold text-sm outline-none focus:border-brand-orange mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300">Shares / Repost</label>
                  <input type="number" name="shares" defaultValue={editMetricsModal.shares || 0} className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-white font-bold text-sm outline-none focus:border-brand-orange mt-1" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button type="button" onClick={() => setEditMetricsModal(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-navy-950">Batal</button>
                <button type="submit" className="bg-brand-orange hover:bg-brand-orange-dark text-white font-bold px-5 py-2 rounded-xl text-xs transition-colors">Simpan Performa</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReportModal && (
        <SosmedReportPdfModal content={content} onClose={() => setShowReportModal(false)} />
      )}
    </div>
  );
}
