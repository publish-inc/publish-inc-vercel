import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Clock, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { demoDeadlineRules, demoHolidays, demoLateLogs, demoNaskah, demoPenerbit } from "../../lib/demoData";
import { api } from "../../lib/api";

const EMPTY_RULE = {
  working_days: 14,
  label: "14 Hari Kerja",
  administrasi_start: 1,
  administrasi_end: 2,
  proofreading_start: 3,
  proofreading_end: 5,
  layout_start: 6,
  layout_end: 9,
  produksi_start: 10,
  produksi_end: 12,
  distribusi_start: 13,
  distribusi_end: 14,
  selesai_start: 14,
  selesai_end: 14,
};

const STAGES = [
  ["administrasi", "Administrasi"],
  ["proofreading", "Proofreading"],
  ["layout", "Layout"],
  ["produksi", "Produksi"],
  ["distribusi", "Distribusi"],
  ["selesai", "Selesai"],
];

const PRESET_WORKING_DAYS = [14, 21, 30, 45, 60];

const isoDate = (date) => date.toISOString().slice(0, 10);

function addBusinessDays(startDate, days, holidays) {
  const date = new Date(startDate);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6 && !holidays.includes(isoDate(date))) added += 1;
  }
  return date;
}

export default function DeadlineKeterlambatan() {
  const [activeTab, setActiveTab] = useState("timeline");
  const [rules, setRules] = useState(demoDeadlineRules);
  const [ruleForm, setRuleForm] = useState(EMPTY_RULE);
  const [holidays, setHolidays] = useState([]);
  const [naskah, setNaskah] = useState([]);
  const [keterlambatan, setKeterlambatan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingDays, setEditingDays] = useState(null);

  const fetchData = async () => {
    setLoading(true);

    const { data: settings, error: settingsError } = await supabase.from("spk_settings").select("*").in("key", ["deadline_rules", "holidays"]);
    if (settingsError) toast.error("Gagal mengambil pengaturan deadline: " + settingsError.message);
    const deadlineRules = settings?.find((item) => item.key === "deadline_rules")?.value;
    const holidayRows = settings?.find((item) => item.key === "holidays")?.value;
    const nextRules = Array.isArray(deadlineRules) && deadlineRules.length ? deadlineRules : demoDeadlineRules;
    setRules(nextRules.map((rule) => ({ ...EMPTY_RULE, ...rule })));
    setHolidays(Array.isArray(holidayRows) && holidayRows.length ? holidayRows.map((item) => item.date || item).filter(Boolean) : demoHolidays.map((item) => item.date));

    const { data: naskahData, error: naskahError } = await supabase
      .from("spk_naskah")
      .select("*, spk_deals(package_name, penerbit, customer_name, working_days)")
      .in("status", ["baru", "antrian", "proses", "revisi"])
      .order("created_at", { ascending: true });

    if (naskahError) toast.error("Gagal mengambil data naskah: " + naskahError.message);
    setNaskah(Array.isArray(naskahData) && naskahData.length ? naskahData : demoNaskah);

    const { data: lateData, error: lateError } = await supabase
      .from("spk_keterlambatan")
      .select("*, spk_tasks(task_type, spk_naskah(judul)), app_users(name)")
      .order("created_at", { ascending: false });

    if (lateError) toast.error("Gagal mengambil log keterlambatan: " + lateError.message);
    setKeterlambatan(Array.isArray(lateData) && lateData.length ? lateData : demoLateLogs);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveRules = async (nextRules) => {
    const sorted = [...nextRules].sort((a, b) => (Number(a.working_days) || 0) - (Number(b.working_days) || 0));
    const { error } = await supabase.from("spk_settings").upsert({ key: "deadline_rules", value: sorted });
    setRules(sorted);
    if (error) return toast.warning("Timeline tersimpan di tampilan lokal, tapi gagal sync database: " + error.message);
    toast.success("Timeline hari kerja disimpan");
  };

  const addRule = async (event) => {
    event.preventDefault();
    const days = Number(ruleForm.working_days);
    if (!days || days <= 0) return toast.error("Jumlah hari kerja harus lebih besar dari 0");
    
    const nextRules = [
      ...(Array.isArray(rules) ? rules : []).filter((rule) => Number(rule.working_days) !== days),
      {
        working_days: days,
        label: `${days} Hari Kerja`,
        ...Object.fromEntries(STAGES.flatMap(([key]) => [
          [`${key}_start`, Number(ruleForm[`${key}_start`]) || 0],
          [`${key}_end`, Number(ruleForm[`${key}_end`]) || 0],
        ])),
      },
    ];
    await saveRules(nextRules);
    setRuleForm(EMPTY_RULE);
    setEditingDays(null);
  };

  const deleteRule = async (days) => {
    await saveRules((Array.isArray(rules) ? rules : []).filter((rule) => Number(rule.working_days) !== Number(days)));
    if (editingDays === days) {
      setRuleForm(EMPTY_RULE);
      setEditingDays(null);
    }
  };

  const editRule = (rule) => {
    setRuleForm({ ...EMPTY_RULE, ...rule });
    setEditingDays(rule.working_days);
  };

  const trackedNaskah = useMemo(() => {
    if (!Array.isArray(naskah)) return [];
    return naskah.map((item) => {
      if (!item || typeof item !== "object") return null;
      const workingDays = Number(item.spk_deals?.working_days || item.working_days) || 30;
      const packageName = item.spk_deals?.package_name || "Manual";
      
      const safeRules = Array.isArray(rules) ? rules : [];
      let rule = safeRules.find((row) => Number(row.working_days) === workingDays);
      if (!rule && safeRules.length > 0) {
        rule = safeRules.reduce((prev, curr) =>
          Math.abs(Number(curr.working_days) - workingDays) < Math.abs(Number(prev.working_days) - workingDays) ? curr : prev
        );
      }
      
      const createdAt = item.created_at ? new Date(item.created_at) : new Date();
      return {
        ...item,
        workingDays,
        packageName,
        rule,
        timeline: Object.fromEntries(
          STAGES.map(([key]) => [
            key,
            rule ? addBusinessDays(createdAt, Number(rule[`${key}_end`]) || 0, Array.isArray(holidays) ? holidays : []) : null,
          ])
        ),
      };
    }).filter(Boolean);
  }, [naskah, rules, holidays]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-white">Deadline Tracking</h1>
        <p className="text-slate-400 mt-1">Atur timeline berdasarkan durasi Hari Kerja dan pantau log keterlambatan.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        <TabButton active={activeTab === "timeline"} onClick={() => setActiveTab("timeline")} icon={CalendarDays} label="Timeline Hari Kerja" />
        <TabButton active={activeTab === "tracking"} onClick={() => setActiveTab("tracking")} icon={Clock} label="Tracking Naskah" />
        <TabButton active={activeTab === "log"} onClick={() => setActiveTab("log")} icon={AlertTriangle} label="Log Keterlambatan" />
      </div>

      {activeTab === "timeline" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[440px_1fr]">
          <form onSubmit={addRule} className="rounded-2xl border border-white/10 bg-navy-800 p-5">
            <h2 className="mb-4 text-lg font-bold text-white">Atur Timeline Hari Kerja</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Target Hari Kerja *</span>
                <div className="flex gap-2">
                  <select
                    value={PRESET_WORKING_DAYS.includes(Number(ruleForm.working_days)) ? ruleForm.working_days : "custom"}
                    onChange={(event) => {
                      if (event.target.value !== "custom") {
                        setRuleForm({ ...ruleForm, working_days: Number(event.target.value) });
                      }
                    }}
                    className="w-1/2 rounded-xl border border-white/10 bg-navy-950 px-4 py-3 text-white outline-none focus:border-brand-orange text-sm"
                  >
                    {PRESET_WORKING_DAYS.map((d) => (
                      <option key={d} value={d}>{d} Hari Kerja</option>
                    ))}
                    <option value="custom">Kustom...</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    placeholder="Angka Hari Kerja"
                    value={ruleForm.working_days || ""}
                    onChange={(event) => setRuleForm({ ...ruleForm, working_days: event.target.value })}
                    className="w-1/2 rounded-xl border border-white/10 bg-navy-950 px-4 py-3 text-white outline-none focus:border-brand-orange font-bold text-brand-orange text-sm"
                  />
                </div>
              </label>

              <div className="grid grid-cols-1 gap-3">
                {STAGES.map(([key, label]) => (
                  <div key={key} className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-navy-900 p-3">
                    <div className="col-span-2 text-xs font-black uppercase tracking-wider text-slate-400">{label}</div>
                    <Input label="Mulai H+" type="number" value={ruleForm[`${key}_start`]} onChange={(value) => setRuleForm({ ...ruleForm, [`${key}_start`]: value })} />
                    <Input label="Selesai H+" type="number" value={ruleForm[`${key}_end`]} onChange={(value) => setRuleForm({ ...ruleForm, [`${key}_end`]: value })} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 py-3 font-bold text-white hover:bg-brand-orange-dark">
                  {editingDays ? <Save size={18} /> : <Plus size={18} />} {editingDays ? "Update Timeline" : "Simpan Timeline"}
                </button>
                {editingDays && (
                  <button type="button" onClick={() => { setRuleForm(EMPTY_RULE); setEditingDays(null); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-navy-900 px-4 py-3 font-bold text-slate-300 hover:bg-white/5">
                    <X size={18} /> Batal
                  </button>
                )}
              </div>
            </div>
          </form>

          <div className="space-y-4">
            {(Array.isArray(rules) ? rules : []).map((rule) => (
              <div key={rule.working_days || rule.package_name} className="rounded-2xl border border-white/10 bg-navy-800 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-brand-orange">Preset Timeline</div>
                    <h3 className="text-xl font-black text-white">{rule.working_days ? `${rule.working_days} Hari Kerja` : rule.package_name}</h3>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => editRule(rule)} className="rounded-lg p-2 text-brand-blue hover:bg-blue-500/10" title="Edit timeline"><Pencil size={17} /></button>
                    <button onClick={() => deleteRule(rule.working_days)} className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/10" title="Hapus timeline"><Trash2 size={17} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {STAGES.map(([key, label]) => (
                    <div key={key} className="rounded-xl border border-white/10 bg-navy-900 p-4">
                      <div className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</div>
                      <div className="mt-2 text-lg font-black text-white">H+{rule[`${key}_start`] || 0} - H+{rule[`${key}_end`] || 0}</div>
                      <div className="mt-1 text-xs text-slate-500">Dihitung hari kerja, tanggal merah dilewati.</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {(Array.isArray(rules) && rules.length === 0) && <div className="rounded-2xl border border-dashed border-white/10 bg-navy-800 py-14 text-center text-slate-500">Belum ada timeline hari kerja.</div>}
          </div>
        </div>
      )}

      {activeTab === "tracking" && (
        <div className="rounded-2xl border border-white/10 bg-navy-800">
          {loading ? <div className="py-16 text-center text-slate-400">Memuat tracking...</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-navy-900 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Naskah</th>
                    <th className="px-5 py-4">Durasi &amp; Paket</th>
                    {STAGES.map(([, label]) => <th key={label} className="px-5 py-4">{label}</th>)}
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {trackedNaskah.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-4">
                        <div className="font-bold text-white">{item.judul}</div>
                        <div className="font-mono text-xs text-brand-orange">{item.tracking_code || "-"}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-brand-orange">{item.workingDays} Hari Kerja</div>
                        <div className="text-xs text-slate-400">{item.packageName}</div>
                      </td>
                      {STAGES.map(([key]) => <td key={key} className="px-5 py-4">{item.timeline?.[key] ? item.timeline[key].toLocaleDateString("id-ID") : "Belum diatur"}</td>)}
                      <td className="px-5 py-4 uppercase">{item.status}</td>
                    </tr>
                  ))}
                  {trackedNaskah.length === 0 && <tr><td colSpan="9" className="px-5 py-12 text-center text-slate-500">Belum ada naskah berjalan.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "log" && (
        <div className="space-y-4">
          {keterlambatan.map((item) => (
            <div key={item.id} className="rounded-2xl border border-white/10 bg-navy-800 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-white">{item.spk_tasks?.spk_naskah?.judul || "Naskah"}</div>
                  <div className="text-sm text-slate-400">{item.app_users?.name || "Tim"} - {item.spk_tasks?.task_type || "tugas"}</div>
                </div>
                <span className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-black uppercase text-rose-400">Telat {item.hari_terlambat || 0} hari</span>
              </div>
              <p className="mt-4 text-sm italic text-slate-300">"{item.alasan}"</p>
            </div>
          ))}
          {keterlambatan.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-slate-500">Belum ada log keterlambatan.</div>
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${active ? "bg-brand-orange text-white" : "bg-navy-800 text-slate-400 hover:text-white"}`}>
      <Icon size={16} /> {label}
    </button>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <input type={type} min={type === "number" ? 0 : undefined} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-white/10 bg-navy-950 px-4 py-3 text-white outline-none focus:border-brand-orange" />
    </label>
  );
}
