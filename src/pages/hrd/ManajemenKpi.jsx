import { useMemo, useState } from "react";
import { Plus, Save, Target, Trash2, Users, Coins, Percent, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_ROLE_KPIS, ROLE_LABELS, getRoleKpiTargets, saveRoleKpiTargets } from "../../lib/workflow";

const ROLE_ORDER = ["cs", "cco", "admin", "pic_editor", "pic_layouter", "editor", "layouter", "admin_marketplace", "campaign", "sosmed", "crm", "finance", "hrd", "master_admin"];
const INPUT_CLASS = "w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-white outline-none focus:border-brand-orange disabled:cursor-not-allowed disabled:opacity-60";

const emptyKpi = () => ({
  id: `manual-${Date.now()}`,
  name: "",
  metric: "manual",
  target: 0,
  unit: "poin",
  reward_type: "fixed",
  reward: 1000,
  fixed: false,
});

export default function ManajemenKpi() {
  const [activeRole, setActiveRole] = useState("cs");
  const [targets, setTargets] = useState(() => getRoleKpiTargets());
  const [draft, setDraft] = useState(emptyKpi());

  const activeTargets = targets[activeRole] || [];
  const fixedCount = useMemo(() => activeTargets.filter((item) => item.fixed).length, [activeTargets]);

  const updateTarget = (id, field, value) => {
    setTargets((current) => ({
      ...current,
      [activeRole]: (current[activeRole] || []).map((item) => (
        item.id === id
          ? {
              ...item,
              [field]: field === "target" || field === "reward" ? Math.max(Number(value) || 0, 0) : value,
            }
          : item
      )),
    }));
  };

  const addManual = () => {
    if (!draft.name.trim()) return toast.error("Nama KPI wajib diisi.");
    const isOmzet = draft.unit === "rupiah" || draft.metric.includes("omzet");
    const item = {
      ...draft,
      id: `manual-${activeRole}-${Date.now()}`,
      name: draft.name.trim(),
      metric: draft.metric.trim() || "manual",
      target: Math.max(Number(draft.target) || 0, 0),
      unit: draft.unit.trim() || "poin",
      reward_type: isOmzet ? "percentage" : draft.reward_type || "fixed",
      reward: Math.max(Number(draft.reward) || 0, 0),
      fixed: false,
    };
    setTargets((current) => ({ ...current, [activeRole]: [...(current[activeRole] || []), item] }));
    setDraft(emptyKpi());
    toast.success("KPI tambahan ditambahkan. Silakan simpan untuk memperbarui.");
  };

  const deleteTarget = (id) => {
    setTargets((current) => ({
      ...current,
      [activeRole]: (current[activeRole] || []).filter((item) => item.fixed || item.id !== id),
    }));
  };

  const saveRoleOnly = () => {
    saveRoleKpiTargets(targets);
    toast.success(`Target & Reward KPI untuk role ${ROLE_LABELS[activeRole]} berhasil disimpan!`);
  };

  const saveAll = () => {
    saveRoleKpiTargets(targets);
    toast.success("Semua Target & Reward KPI per role berhasil disimpan.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Kelola KPI & Reward (HRD)</h1>
          <p className="mt-1 text-slate-400">Atur target kinerja dan besaran nominal Reward (Rp atau %) untuk setiap KPI karyawan.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={saveRoleOnly} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-navy-800 px-4 py-3 font-bold text-white hover:border-brand-orange">
            <Save size={18} /> Simpan Role {ROLE_LABELS[activeRole]}
          </button>
          <button onClick={saveAll} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-orange px-5 py-3 font-bold text-white hover:bg-brand-orange-dark shadow-lg">
            <CheckCircle2 size={18} /> Simpan Semua Role
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard icon={Users} label="Role Diatur" value={ROLE_ORDER.length} />
        <SummaryCard icon={Target} label="KPI Tetap Role Ini" value={fixedCount} />
        <SummaryCard icon={Coins} label="Mode Kelola" value="Target & Reward KPI" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[270px_1fr]">
        <div className="rounded-2xl border border-white/10 bg-navy-800 p-3">
          {ROLE_ORDER.map((role) => (
            <button
              key={role}
              onClick={() => setActiveRole(role)}
              className={`mb-1 flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-bold transition-colors ${activeRole === role ? "bg-brand-orange text-white shadow-md" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
            >
              <span>{ROLE_LABELS[role] || role}</span>
              <span className="rounded-full bg-black/15 px-2 py-0.5 text-[10px]">{(targets[role] || DEFAULT_ROLE_KPIS[role] || []).length}</span>
            </button>
          ))}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-navy-800 p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-black text-white">Target & Reward: {ROLE_LABELS[activeRole]}</h2>
                <p className="text-sm text-slate-400">Atur nominal reward (Rp) atau persentase (%) omzet untuk role ini.</p>
              </div>
              <button onClick={saveRoleOnly} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/30 border border-emerald-500/40 px-3.5 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-600 hover:text-white transition-all">
                <Save size={14} /> Simpan Role {ROLE_LABELS[activeRole]}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {activeTargets.map((item) => {
                const isOmzet = item.unit === "rupiah" || item.metric.includes("omzet") || item.reward_type === "percentage";
                return (
                  <div key={item.id} className="grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-navy-900 p-4 lg:grid-cols-[1.2fr_110px_110px_200px_auto]">
                    <Field label="Nama KPI">
                      <input value={item.name} onChange={(e) => updateTarget(item.id, "name", e.target.value)} disabled={item.fixed} className={INPUT_CLASS} />
                    </Field>
                    <Field label="Target">
                      <input type="number" min="0" value={item.target} onChange={(e) => updateTarget(item.id, "target", e.target.value)} className={`${INPUT_CLASS} font-mono`} />
                    </Field>
                    <Field label="Satuan">
                      <input value={item.unit || "poin"} onChange={(e) => updateTarget(item.id, "unit", e.target.value)} disabled={item.fixed} className={INPUT_CLASS} />
                    </Field>
                    <Field label={isOmzet ? "Reward Persentase (%)" : "Reward Nominal (Rp)"}>
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          step={isOmzet ? "0.1" : "100"}
                          min="0"
                          value={item.reward ?? (isOmzet ? 2 : 1000)}
                          onChange={(e) => updateTarget(item.id, "reward", e.target.value)}
                          className={`${INPUT_CLASS} font-mono text-emerald-300 font-bold`}
                        />
                        <select
                          value={item.reward_type || (isOmzet ? "percentage" : "fixed")}
                          onChange={(e) => updateTarget(item.id, "reward_type", e.target.value)}
                          className="rounded-lg border border-white/10 bg-navy-950 px-2 text-xs font-bold text-slate-200 outline-none"
                        >
                          <option value="fixed">Rp</option>
                          <option value="percentage">%</option>
                        </select>
                      </div>
                    </Field>
                    <div className="flex items-end justify-between gap-2 lg:justify-end">
                      <span className={`rounded-full px-3 py-2 text-[10px] font-black uppercase ${item.fixed ? "bg-brand-blue/15 text-brand-blue" : "bg-emerald-500/15 text-emerald-300"}`}>
                        {item.fixed ? "Tetap" : "Manual"}
                      </span>
                      {!item.fixed && (
                        <button onClick={() => deleteTarget(item.id)} className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/10" title="Hapus KPI">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {!activeTargets.length && <div className="rounded-xl border border-dashed border-white/10 py-10 text-center text-slate-500">Role ini belum punya KPI tetap. Tambahkan KPI manual di bawah ini.</div>}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-navy-800 p-5">
            <h3 className="mb-4 text-lg font-bold text-white">Tambah KPI & Reward Manual untuk {ROLE_LABELS[activeRole]}</h3>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_110px_110px_200px_auto]">
              <Field label="Nama KPI">
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value, metric: e.target.value.toLowerCase().replace(/\s+/g, "_") })} placeholder="Contoh: Follow up" className={INPUT_CLASS} />
              </Field>
              <Field label="Target">
                <input type="number" min="0" value={draft.target} onChange={(e) => setDraft({ ...draft, target: e.target.value })} className={`${INPUT_CLASS} font-mono`} />
              </Field>
              <Field label="Satuan">
                <input value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} placeholder="poin / rupiah" className={INPUT_CLASS} />
              </Field>
              <Field label="Reward Rate">
                <div className="flex gap-1.5">
                  <input type="number" min="0" step="0.1" value={draft.reward} onChange={(e) => setDraft({ ...draft, reward: e.target.value })} className={`${INPUT_CLASS} font-mono text-emerald-300 font-bold`} />
                  <select value={draft.reward_type} onChange={(e) => setDraft({ ...draft, reward_type: e.target.value })} className="rounded-lg border border-white/10 bg-navy-950 px-2 text-xs font-bold text-slate-200 outline-none">
                    <option value="fixed">Rp</option>
                    <option value="percentage">%</option>
                  </select>
                </div>
              </Field>
              <div className="flex items-end">
                <button onClick={addManual} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 py-3 font-bold text-white hover:bg-blue-600">
                  <Plus size={18} /> Tambah
                </button>
              </div>
            </div>
          </div>

          {activeRole === "cs" && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-200 space-y-1">
              <div className="font-bold text-sm text-white flex items-center gap-1.5">
                <Coins size={16} className="text-emerald-400" /> Skema Reward Omzet CS (Persentase %)
              </div>
              <p>KPI Omzet CS menggunakan tipe reward <strong>Persentase (%)</strong>. Contoh: Jika diatur <strong>2%</strong> dan CS mencetak Omzet <strong>Rp 200.000.000</strong>, maka Bonus CS otomatis dikalkulasi <strong>Rp 4.000.000</strong> pada Rekap Payroll.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-navy-800 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-orange/15 text-brand-orange">
          <Icon size={20} />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</div>
          <div className="text-xl font-black text-white">{typeof value === "number" ? value.toLocaleString("id-ID") : value}</div>
        </div>
      </div>
    </div>
  );
}
