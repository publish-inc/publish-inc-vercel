import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { LAYOUT_ACCESS_KEY, activeItems, assignCreativeTask, usersByRole } from "../../lib/workflow";

export default function AntrianNaskah() {
  const { user } = useAuth();
  const [items, setItems] = useState(() => activeItems());
  const [form, setForm] = useState({});
  const roleType = user?.role === "pic_layouter" ? "layouter" : "editor";
  const stage = roleType === "editor" ? "pic_editor" : "pic_layouter";
  const team = usersByRole(roleType === "editor" ? ["editor", "pic_editor"] : ["layouter", "pic_layouter"]);

  const queue = useMemo(() => items.filter((item) => {
    if (roleType === "editor") return item.stage === stage;
    return item.stage === "pic_layouter" || (item.manuscript.need_proofreading && ["pic_editor", "editor_work"].includes(item.stage));
  }), [items, roleType, stage]);
  const canAssignLayout = (item) => !item.manuscript.need_proofreading || item.tasks?.editor?.status === "complete";
  const refresh = () => setItems(activeItems());
  const setCard = (id, field, value) => setForm((current) => ({ ...current, [id]: { ...(current[id] || {}), [field]: value } }));
  const assign = (item) => {
    const state = form[item.id] || {};
    if (roleType === "layouter" && !canAssignLayout(item)) {
      const masterKey = localStorage.getItem(LAYOUT_ACCESS_KEY) || "";
      if (!masterKey || state.access_key !== masterKey) {
        toast.error("Layout masih terkunci. Isi kunci akses master untuk penugasan lebih awal.");
        return;
      }
    }
    const assignee = state.assignee_id || user?.id;
    assignCreativeTask(item.id, roleType, assignee, state.revision_limit ?? 2, user);
    refresh();
    toast.success(`Naskah ditugaskan ke ${roleType === "editor" ? "Editor" : "Layouter"}.`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-white">Naskah Baru PIC {roleType === "editor" ? "Editor" : "Layouter"}</h1>
        <p className="text-slate-400 mt-1">PIC memilih eksekutor, bisa menugaskan ke tim atau ke diri sendiri, sekaligus menentukan batas revisi.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {queue.map((item) => (
          <div key={item.id} className="bg-navy-800 border border-white/10 rounded-xl p-5 space-y-4">
            <div>
              <div className="text-[10px] uppercase font-black tracking-widest text-brand-orange">{item.tracking_code}</div>
              <h2 className="text-lg font-black text-white leading-tight">{item.manuscript.title}</h2>
              <p className="text-sm text-slate-400">{item.customer.name} &bull; {item.manuscript.package_name}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Info label="Kata" value={item.manuscript.estimated_words || 0} />
              <Info label="Halaman" value={item.manuscript.estimated_pages || 0} />
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <Info label="Editor" value={item.tasks?.editor?.assignee_name || "Belum ada penugasan"} />
              <Info label="Layouter" value={item.tasks?.layouter?.assignee_name || "Belum ada penugasan"} />
            </div>
            {roleType === "layouter" && !canAssignLayout(item) && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-300">
                Layout sudah masuk pantauan, tapi penugasan terkunci sampai editor complete.
              </div>
            )}
            <label className="block text-xs text-slate-300">
              Eksekutor
              <select value={form[item.id]?.assignee_id || user?.id || ""} onChange={(e) => setCard(item.id, "assignee_id", e.target.value)} className="mt-1 w-full bg-navy-900 border border-white/10 rounded-lg px-3 py-2 text-white">
                {team.map((person) => <option key={person.id} value={person.id}>{person.name} ({person.role.replace("_", " ")})</option>)}
              </select>
            </label>
            <label className="block text-xs text-slate-300">
              Jumlah Revisi Maksimal
              <input type="number" min="0" value={form[item.id]?.revision_limit ?? 2} onChange={(e) => setCard(item.id, "revision_limit", e.target.value)} className="mt-1 w-full bg-navy-900 border border-white/10 rounded-lg px-3 py-2 text-white" />
            </label>
            {roleType === "layouter" && !canAssignLayout(item) && (
              <label className="block text-xs text-slate-300">
                Kunci Akses Master
                <input type="password" value={form[item.id]?.access_key || ""} onChange={(e) => setCard(item.id, "access_key", e.target.value)} className="mt-1 w-full bg-navy-900 border border-white/10 rounded-lg px-3 py-2 text-white" placeholder="Isi untuk unlock penugasan awal" />
              </label>
            )}
            <button onClick={() => assign(item)} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-orange px-3 py-3 text-white font-bold hover:bg-brand-orange-dark">
              <Send size={16} /> Tugaskan
            </button>
          </div>
        ))}
        {!queue.length && <div className="xl:col-span-3 rounded-xl border border-dashed border-white/10 bg-navy-800/60 p-10 text-center text-slate-500">Tidak ada naskah baru untuk PIC ini.</div>}
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return <div className="rounded-lg bg-navy-900 border border-white/10 p-3"><div className="text-[10px] uppercase font-black text-slate-500">{label}</div><div className="text-white font-bold">{value}</div></div>;
}
