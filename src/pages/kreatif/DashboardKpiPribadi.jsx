import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Target, TrendingUp } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { demoUsers } from "../../lib/demoData";
import { getKpiApprovals, getKpiEvents, getRoleKpiTargets, ROLE_LABELS } from "../../lib/workflow";

const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1);
const inThisMonth = (value) => value && new Date(value) >= startOfMonth();
const formatNumber = (value) => Number(value || 0).toLocaleString("id-ID");

const matchesPerson = (record, person) => {
  if (!person) return false;
  return record.user_id === person.id || record.user_email === person.email || record.user_name === person.name;
};

const demoPersonFor = (user) => demoUsers.find((person) => person.email === user?.email || person.role === user?.role);

export default function DashboardKpiPribadi() {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState("self");
  const [events, setEvents] = useState(() => getKpiEvents());
  const [approvals, setApprovals] = useState(() => getKpiApprovals());

  const isPic = user?.role === "pic_editor" || user?.role === "pic_layouter" || user?.role === "master_admin";
  const subordinates = useMemo(() => {
    if (user?.role === "pic_editor") return demoUsers.filter((person) => person.role === "editor");
    if (user?.role === "pic_layouter") return demoUsers.filter((person) => person.role === "layouter");
    if (user?.role === "master_admin") return demoUsers;
    return [];
  }, [user]);

  const selectedPerson = useMemo(() => {
    if (selectedId === "self") {
      const demo = demoPersonFor(user);
      return { id: user?.id || demo?.id, name: user?.name || demo?.name || user?.email, email: user?.email || demo?.email, role: user?.role || demo?.role };
    }
    return subordinates.find((person) => person.id === selectedId) || demoPersonFor(user);
  }, [selectedId, subordinates, user]);

  useEffect(() => {
    const refresh = () => {
      setEvents(getKpiEvents());
      setApprovals(getKpiApprovals());
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  const roleTargets = useMemo(() => {
    const targets = getRoleKpiTargets();
    return targets[selectedPerson?.role] || [];
  }, [selectedPerson]);

  const approvedEvents = useMemo(() => {
    const demoId = selectedPerson?.role ? `demo-${selectedPerson.role}` : "";
    return events
      .filter((event) => inThisMonth(event.at))
      .filter((event) => matchesPerson(event, selectedPerson) || event.user_id === demoId)
      .sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [events, selectedPerson]);

  const claimHistory = useMemo(() => {
    const demoId = selectedPerson?.role ? `demo-${selectedPerson.role}` : "";
    return approvals
      .filter((item) => item.type === "claim")
      .filter((item) => matchesPerson(item, selectedPerson) || item.user_id === demoId)
      .sort((a, b) => new Date(b.created_at || b.at) - new Date(a.created_at || a.at));
  }, [approvals, selectedPerson]);

  const targetRows = useMemo(() => {
    return roleTargets.map((target) => {
      const achieved = approvedEvents
        .filter((event) => event.metric === target.metric)
        .reduce((sum, event) => sum + (Number(event.value) || 0), 0);
      const percent = target.target ? Math.min(Math.round((achieved / Number(target.target)) * 100), 100) : 0;
      return { ...target, achieved, percent };
    });
  }, [approvedEvents, roleTargets]);

  const total = approvedEvents.reduce((sum, event) => sum + (Number(event.value) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Detail KPI</h1>
          <p className="mt-1 text-slate-400">Tabel capaian KPI view-only berdasarkan klaim yang sudah masuk approval.</p>
        </div>

        {isPic && (
          <select
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-navy-900 px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-brand-blue md:w-80"
          >
            <option value="self">Diri Sendiri ({user?.name || user?.email})</option>
            {subordinates.map((person) => (
              <option key={person.id} value={person.id}>{person.name} ({ROLE_LABELS[person.role] || person.role})</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard icon={Target} label="Role" value={ROLE_LABELS[selectedPerson?.role] || selectedPerson?.role || "-"} />
        <SummaryCard icon={TrendingUp} label="Capaian Bulan Ini" value={formatNumber(total)} />
        <SummaryCard icon={ClipboardList} label="Klaim Menunggu" value={claimHistory.filter((item) => item.status === "pending").length} />
      </div>

      <DataTable
        title="Ringkasan Target"
        empty="Belum ada target KPI untuk role ini."
        columns={["Target KPI", "Metrik", "Target", "Tercapai", "Progress"]}
        rows={targetRows.map((row) => [
          row.name,
          row.metric,
          `${formatNumber(row.target)} ${row.unit || ""}`,
          `${formatNumber(row.achieved)} ${row.unit || ""}`,
          `${row.percent}%`,
        ])}
      />

      <DataTable
        title="Capaian Approved Bulan Ini"
        empty="Belum ada capaian approved bulan ini."
        columns={["Tanggal", "KPI", "Metrik", "Nilai", "Catatan"]}
        rows={approvedEvents.map((event) => [
          new Date(event.at).toLocaleDateString("id-ID"),
          event.title || "-",
          event.metric || "-",
          `+${formatNumber(event.value)}`,
          event.note || event.approval_id || "-",
        ])}
      />

    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-navy-800 p-5">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
        <Icon size={16} className="text-brand-orange" /> {label}
      </div>
      <div className="truncate text-2xl font-black text-white">{value}</div>
    </div>
  );
}

function DataTable({ title, columns, rows, empty }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-navy-800">
      <div className="flex items-center gap-2 border-b border-white/10 p-5 font-bold text-white">
        <CheckCircle2 size={18} className="text-brand-orange" /> {title}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-navy-900 text-xs uppercase tracking-wider text-slate-500">
            <tr>{columns.map((column) => <th key={column} className="px-5 py-4">{column}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-300">
            {rows.map((row, index) => (
              <tr key={index} className="hover:bg-white/5">
                {row.map((cell, cellIndex) => (
                  <td key={`${index}-${cellIndex}`} className={`px-5 py-4 ${cellIndex === 0 ? "font-bold text-white" : ""}`}>{cell}</td>
                ))}
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={columns.length} className="px-5 py-12 text-center text-slate-500">{empty}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
