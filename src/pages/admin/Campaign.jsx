import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { CalendarCheck, Layers, Megaphone, Plus } from "lucide-react";
import { demoCampaigns } from "../../lib/demoData";

export default function Campaign() {
  const [activeTab, setActiveTab] = useState("Event"); // Event, Konten, Broadcast
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [form, setForm] = useState({ id: "", type: "Event", title: "", date: new Date().toISOString().split('T')[0], status: "Upcoming", platform_or_location: "" });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("spk_campaigns").select("*").order("date", { ascending: false });
    setCampaigns(!error && data?.length ? data : demoCampaigns);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title) return toast.error("Judul/Nama tidak boleh kosong");
    try {
      if (form.id) {
        await supabase.from("spk_campaigns").update({
          title: form.title,
          date: form.date,
          status: form.status,
          platform_or_location: form.platform_or_location
        }).eq("id", form.id);
      } else {
        await supabase.from("spk_campaigns").insert({
          type: form.type,
          title: form.title,
          date: form.date,
          status: form.status,
          platform_or_location: form.platform_or_location
        });
      }
      toast.success("Campaign berhasil disimpan");
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Hapus data campaign ini?")) {
      await supabase.from("spk_campaigns").delete().eq("id", id);
      fetchData();
    }
  };

  const openForm = (type) => {
    let initialStatus = type === "Event" ? "Upcoming" : type === "Konten" ? "Draft" : "Draft";
    setForm({ id: "", type, title: "", date: new Date().toISOString().split('T')[0], status: initialStatus, platform_or_location: "" });
    setIsModalOpen(true);
  };

  const editForm = (item) => {
    setForm({ ...item });
    setIsModalOpen(true);
  };

  const filteredCampaigns = campaigns.filter(c => c.type === activeTab);
  
  const getStatusColor = (status) => {
    if (["Done", "Published", "Sent"].includes(status)) return "bg-green-500/20 text-green-400";
    if (["Ongoing", "Scheduled"].includes(status)) return "bg-blue-500/20 text-blue-400";
    return "bg-slate-500/20 text-slate-400"; // Upcoming, Draft
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Campaign Workspace</h1>
          <p className="text-slate-400 mt-1">Kelola Event, Content, dan Broadcast dalam satu tampilan.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10 pb-4">
        <button 
          onClick={() => setActiveTab("Event")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'Event' ? 'bg-white text-navy-900 shadow-sm' : 'bg-navy-800 text-slate-400 hover:text-white'}`}
        >
          <CalendarCheck className="w-4 h-4" /> Event Campaign
          <span className="ml-2 px-2 py-0.5 rounded-full bg-navy-900 text-xs">{campaigns.filter(c => c.type === "Event").length}</span>
        </button>
        <button 
          onClick={() => setActiveTab("Konten")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'Konten' ? 'bg-white text-navy-900 shadow-sm' : 'bg-navy-800 text-slate-400 hover:text-white'}`}
        >
          <Layers className="w-4 h-4" /> Content Media
          <span className="ml-2 px-2 py-0.5 rounded-full bg-navy-900 text-xs">{campaigns.filter(c => c.type === "Konten").length}</span>
        </button>
        <button 
          onClick={() => setActiveTab("Broadcast")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'Broadcast' ? 'bg-white text-navy-900 shadow-sm' : 'bg-navy-800 text-slate-400 hover:text-white'}`}
        >
          <Megaphone className="w-4 h-4" /> Broadcast
          <span className="ml-2 px-2 py-0.5 rounded-full bg-navy-900 text-xs">{campaigns.filter(c => c.type === "Broadcast").length}</span>
        </button>
      </div>

      <div className="bg-navy-800 rounded-3xl p-6 border border-white/10">
        <div className="flex justify-end mb-4">
          <button 
            onClick={() => openForm(activeTab)}
            className="flex items-center gap-2 bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
          >
            <Plus className="w-4 h-4" /> New {activeTab}
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">Memuat data...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-navy-900/50 text-[10px] uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-bold">Judul / Nama</th>
                  <th className="px-6 py-4 font-bold">Tanggal</th>
                  <th className="px-6 py-4 font-bold">{activeTab === "Event" ? "Lokasi" : "Platform"}</th>
                  <th className="px-6 py-4 font-bold text-center">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCampaigns.map(c => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">{c.title}</td>
                    <td className="px-6 py-4 font-mono text-slate-400">{c.date}</td>
                    <td className="px-6 py-4 text-slate-400">{c.platform_or_location || "-"}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => editForm(c)} className="text-brand-blue hover:text-white transition">Edit</button>
                      <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-400 transition">Hapus</button>
                    </td>
                  </tr>
                ))}
                {filteredCampaigns.length === 0 && (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500">Belum ada {activeTab} yang dicatat.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-navy-900 border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">{form.id ? "Edit " + form.type : "Buat " + form.type + " Baru"}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Judul / Nama {form.type}</label>
                <input required type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-navy-800 border border-white/10 rounded-xl px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Tanggal</label>
                <input required type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full bg-navy-800 border border-white/10 rounded-xl px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">{form.type === "Event" ? "Lokasi" : "Platform"}</label>
                {form.type === "Event" ? (
                  <input type="text" value={form.platform_or_location} onChange={e => setForm({...form, platform_or_location: e.target.value})} className="w-full bg-navy-800 border border-white/10 rounded-xl px-4 py-2 text-white" />
                ) : (
                  <select value={form.platform_or_location} onChange={e => setForm({...form, platform_or_location: e.target.value})} className="w-full bg-navy-800 border border-white/10 rounded-xl px-4 py-2 text-white">
                    <option value="">-- Pilih --</option>
                    <option value="Instagram">Instagram</option>
                    <option value="TikTok">TikTok</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Email">Email</option>
                    <option value="LinkedIn">LinkedIn</option>
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full bg-navy-800 border border-white/10 rounded-xl px-4 py-2 text-white">
                  {form.type === "Event" ? (
                    <>
                      <option value="Upcoming">Upcoming</option>
                      <option value="Ongoing">Ongoing</option>
                      <option value="Done">Done</option>
                    </>
                  ) : form.type === "Konten" ? (
                    <>
                      <option value="Draft">Draft</option>
                      <option value="Scheduled">Scheduled</option>
                      <option value="Published">Published</option>
                    </>
                  ) : (
                    <>
                      <option value="Draft">Draft</option>
                      <option value="Scheduled">Scheduled</option>
                      <option value="Sent">Sent</option>
                    </>
                  )}
                </select>
              </div>
              <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-xl">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-brand-blue text-white rounded-xl font-bold">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
