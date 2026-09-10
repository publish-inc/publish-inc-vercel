import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Calendar as CalendarIcon, MapPin, Link2, Printer, Upload } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "../../lib/api";
import CampaignReportPdfModal from "../../components/CampaignReportPdfModal";

export default function DashboardCampaign({ mode = "combined" }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const fileRef = useRef(null);
  const [form, setForm] = useState({ 
    date: new Date().toISOString().split("T")[0], 
    time: "10:00",
    title: "", 
    description: "", 
    location: "", 
    link: "",
    image_url: "",
    drive_url: "",
    status: "Upcoming",
    cancel_reason: "",
    target_peserta: 100,
    jumlah_peserta: 0,
  });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("site_content").select("content").eq("key", "events").single();
      if (data?.content && data.content.length > 0) {
        setEvents(data.content);
      } else {
        setEvents([]);
      }
    } catch(err) {
      setEvents([]);
    }
    setLoading(false);
  };

  const saveToDb = async (newEvents) => {
    setSaving(true);
    try {
      await supabase.from("site_content").upsert({ key: "events", content: newEvents, updated_at: new Date().toISOString() });
      setEvents(newEvents);
      toast.success("Tersimpan!");
    } catch (err) {
      toast.error("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = (id, newStatus, reason = "") => {
    const newEvents = events.map(e => {
      if (e.id === id) {
        return { ...e, status: newStatus, cancel_reason: reason || e.cancel_reason || "" };
      }
      return e;
    });
    saveToDb(newEvents);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    const newItem = { id: Date.now().toString(), ...form };
    const newEvents = [...events, newItem].sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
    saveToDb(newEvents);
    setForm({ ...form, title: "", description: "", location: "", link: "", image_url: "", drive_url: "", status: "Upcoming", cancel_reason: "", target_peserta: 100, jumlah_peserta: 0 });
  };

  const handleDel = (id) => {
    const newEvents = events.filter((e) => e.id !== id);
    saveToDb(newEvents);
  };

  const uploadPoster = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", "campaign_poster");
    try {
      const { data } = await api.post("/upload", fd);
      setForm((current) => ({ ...current, image_url: data.url, drive_url: data.drive_url || "" }));
      toast.success("Poster event berhasil diupload.");
    } catch (error) {
      toast.error(formatApiErrorDetail(error.response?.data?.detail));
    } finally {
      setUploading(false);
    }
  };

  const upcoming = events.filter(e => new Date(`${e.date}T${e.time}`) >= new Date());
  const past = events.filter(e => new Date(`${e.date}T${e.time}`) < new Date()).reverse();
  const registrants = events.flatMap((event) => (event.registrants || event.pendaftar || []).map((person, index) => ({ ...person, event_title: event.title, event_date: event.date, id: person.id || `${event.id}-${index}` })));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">{mode === "input" ? "Input Event" : mode === "registrants" ? "Database Pendaftar Event" : "Kalender Event"}</h1>
          <p className="mt-1 text-slate-400">Kelola jadwal event Publish Inc. Event yang diinput akan otomatis tampil di Landing Page.</p>
        </div>
        <button
          onClick={() => setShowReportModal(true)}
          className="inline-flex items-center gap-2.5 bg-brand-orange hover:bg-brand-orange-dark text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg text-xs"
        >
          <Printer size={16} /> Unduh PDF Laporan Bulanan Campaign
        </button>
      </div>

      {mode === "registrants" ? (
        <div className="bg-navy-800 rounded-3xl p-6 border border-white/10 overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-navy-900/50 text-[10px] uppercase tracking-widest text-slate-400">
              <tr><th className="px-6 py-4">Event</th><th className="px-6 py-4">Tanggal</th><th className="px-6 py-4">Nama</th><th className="px-6 py-4">Kontak</th><th className="px-6 py-4">Catatan</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {registrants.map((person) => (
                <tr key={person.id} className="hover:bg-white/5">
                  <td className="px-6 py-4 font-bold text-white">{person.event_title}</td>
                  <td className="px-6 py-4">{person.event_date}</td>
                  <td className="px-6 py-4">{person.name || person.nama || "-"}</td>
                  <td className="px-6 py-4">{person.phone || person.wa || person.email || "-"}</td>
                  <td className="px-6 py-4">{person.note || person.catatan || "-"}</td>
                </tr>
              ))}
              {!registrants.length && <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500">Belum ada data pendaftar event.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
      <div className={`grid gap-6 ${mode === "input" ? "lg:grid-cols-1" : "lg:grid-cols-3"}`}>
        {(mode === "combined" || mode === "input") && (
        <div className="lg:col-span-1">
          <form onSubmit={handleAdd} className="bg-navy-800 rounded-3xl p-6 border border-white/10 space-y-4 sticky top-6">
            <h2 className="font-bold text-white mb-4">Tambah Event Baru</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-300 block mb-1">Tanggal</label>
                <input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full bg-navy-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand-orange" />
              </div>
              <div>
                <label className="text-sm text-slate-300 block mb-1">Jam</label>
                <input required type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="w-full bg-navy-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand-orange" />
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-1">Nama Event</label>
              <input required placeholder="Cth: Bedah Buku XYZ" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-navy-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand-orange" />
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-1">Lokasi (Offline / Online)</label>
              <input placeholder="Cth: Zoom / Hotel ABC" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full bg-navy-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand-orange" />
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-1">Link Pendaftaran (Opsional)</label>
              <input type="url" placeholder="https://..." value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} className="w-full bg-navy-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand-orange" />
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-1">Poster / Lampiran Event</label>
              <div className="flex items-center gap-3">
                {form.image_url && <a href={form.drive_url || form.image_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-brand-blue hover:underline">File siap</a>}
                <input type="file" accept="image/*,.pdf" ref={fileRef} onChange={uploadPoster} className="hidden" />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-navy-900 px-4 py-2.5 text-sm font-bold text-white hover:border-brand-orange disabled:opacity-60">
                  <Upload size={16} /> {uploading ? "Mengupload..." : "Upload File"}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-1">Deskripsi Singkat</label>
              <textarea rows={3} placeholder="Membahas tentang..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-navy-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand-orange resize-none" />
            </div>
            <button disabled={saving} type="submit" className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
              {saving ? "Menyimpan..." : "Publish Event"}
            </button>
          </form>
        </div>
        )}

        {(mode === "combined" || mode === "calendar") && (
        <div className={`${mode === "calendar" ? "lg:col-span-3" : "lg:col-span-2"} space-y-8`}>
          {loading ? (
            <div className="text-slate-400 py-10 text-center">Memuat kalender...</div>
          ) : (
            <>
              {/* Upcoming */}
              <div>
                <h3 className="font-display font-bold text-white text-xl mb-4 flex items-center gap-2">
                  <CalendarIcon size={20} className="text-brand-orange" /> Event Akan Datang
                </h3>
                {upcoming.length === 0 ? (
                  <div className="bg-navy-800 rounded-2xl p-6 text-center border border-white/10 text-slate-400">Belum ada event mendatang.</div>
                ) : (
                  <div className="grid gap-4">
                    {upcoming.map(item => {
                      const itemStatus = item.status || "Upcoming";
                      return (
                        <div key={item.id} className="bg-navy-800 rounded-2xl border border-white/10 p-5 flex gap-5 hover:border-brand-orange transition-colors group">
                          <div className="flex flex-col items-center justify-center bg-brand-orange h-20 w-20 rounded-xl text-white shrink-0 shadow-lg shadow-brand-orange/20">
                            <span className="text-xs font-bold uppercase">{new Date(item.date).toLocaleString('id-ID', { month: 'short' })}</span>
                            <span className="text-3xl font-display font-black leading-none my-1">{new Date(item.date).getDate()}</span>
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <h4 className="font-bold text-white text-xl">{item.title}</h4>
                              <select
                                value={itemStatus}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "Cancelled") {
                                    const reason = prompt("Masukkan alasan pembatalan event:", item.cancel_reason || "Kendala lokasi & jadwal");
                                    handleStatusChange(item.id, val, reason);
                                  } else {
                                    handleStatusChange(item.id, val);
                                  }
                                }}
                                className="bg-navy-950 border border-white/10 text-xs font-bold rounded-lg px-3 py-1.5 text-white outline-none focus:border-brand-orange"
                              >
                                <option value="Upcoming">🟡 Akan Datang</option>
                                <option value="Ongoing">🟢 Berjalan</option>
                                <option value="Completed">🔵 Selesai</option>
                                <option value="Cancelled">🔴 Batal</option>
                              </select>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
                              <span className="flex items-center gap-1"><CalendarIcon size={14} /> {item.time} WIB</span>
                              {item.location && <span className="flex items-center gap-1"><MapPin size={14} /> {item.location}</span>}
                              {item.link && <a href={item.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand-blue hover:underline"><Link2 size={14} /> Link Daftar</a>}
                              {(item.drive_url || item.image_url) && <a href={item.drive_url || item.image_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand-blue hover:underline"><Link2 size={14} /> File Event</a>}
                            </div>
                            <p className="text-slate-300 text-sm line-clamp-2">{item.description}</p>
                            {itemStatus === "Cancelled" && item.cancel_reason && (
                              <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg italic">
                                Alasan Batal: {item.cancel_reason}
                              </div>
                            )}
                          </div>
                          <button onClick={() => handleDel(item.id)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all self-start p-2 bg-navy-900 rounded-lg">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Past */}
              {past.length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-white text-xl mb-4 flex items-center gap-2 opacity-50">
                    <CalendarIcon size={20} /> Event Selesai
                  </h3>
                  <div className="grid gap-4 opacity-70">
                    {past.map(item => (
                      <div key={item.id} className="bg-navy-800/50 rounded-2xl border border-white/5 p-5 flex gap-5 hover:border-white/20 transition-colors group">
                        <div className="flex flex-col items-center justify-center bg-navy-900 h-16 w-16 rounded-xl text-slate-400 shrink-0">
                          <span className="text-[10px] font-bold uppercase">{new Date(item.date).toLocaleString('id-ID', { month: 'short' })}</span>
                          <span className="text-xl font-display font-bold leading-none my-0.5">{new Date(item.date).getDate()}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-300 text-lg mb-1">{item.title}</h4>
                          <p className="text-slate-500 text-xs mb-2">{item.date} • {item.time} WIB</p>
                        </div>
                        <button onClick={() => handleDel(item.id)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all self-start p-2 bg-navy-900 rounded-lg">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        )}
      </div>
      )}

      {showReportModal && (
        <CampaignReportPdfModal events={events} onClose={() => setShowReportModal(false)} />
      )}
    </div>
  );
}
