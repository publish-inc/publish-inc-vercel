import { useState } from "react";
import { Search, Save, Calendar, UserX, AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

// Dummy data
const DUMMY_EMPLOYEES = [
  { id: "e1", name: "Budi Santoso", role: "Editor", alpa: 0, izin: 1, sakit: 0, cuti: 2 },
  { id: "e2", name: "Siti Aminah", role: "Layouter", alpa: 1, izin: 0, sakit: 2, cuti: 0 },
  { id: "e3", name: "Agus Pratama", role: "Customer Service", alpa: 0, izin: 0, sakit: 0, cuti: 0 },
  { id: "e4", name: "Rina Wati", role: "Admin", alpa: 0, izin: 2, sakit: 1, cuti: 1 },
];

export default function InputKetidakhadiran() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [search, setSearch] = useState("");
  const [data, setData] = useState(DUMMY_EMPLOYEES);

  const handleInput = (id, field, value) => {
    setData((prev) =>
      prev.map((emp) =>
        emp.id === id ? { ...emp, [field]: Math.max(0, parseInt(value) || 0) } : emp
      )
    );
  };

  const handleSave = () => {
    toast.success("Data ketidakhadiran bulan ini berhasil disimpan (MOCKUP)");
  };

  const filteredData = data.filter((emp) =>
    emp.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Input Ketidakhadiran</h1>
          <p className="mt-1 text-slate-400">Catat jumlah Alpa, Izin, Sakit, dan Cuti karyawan per bulan.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-11 rounded-xl border border-white/10 bg-navy-900 pl-10 pr-4 text-sm font-bold text-white outline-none focus:border-brand-orange"
            />
          </div>
          <button onClick={handleSave} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-orange px-5 font-bold text-white hover:bg-brand-orange-dark transition-colors">
            <Save size={18} /> Simpan Data
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-navy-800 p-5 shadow-sm">
        <div className="relative max-w-sm mb-6">
          <Search className="absolute left-4 top-3.5 text-slate-300 pointer-events-none" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama karyawan..."
            className="h-11 w-full rounded-xl border border-white/10 bg-navy-950 pl-11 pr-4 font-semibold text-white outline-none focus:border-brand-orange"
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-900 text-slate-300">
              <tr>
                <th className="px-6 py-4 font-bold border-b border-white/10">Karyawan</th>
                <th className="px-4 py-4 font-bold border-b border-white/10 text-center text-rose-400"><div className="flex items-center justify-center gap-2"><UserX size={16}/> Alpa</div></th>
                <th className="px-4 py-4 font-bold border-b border-white/10 text-center text-amber-400"><div className="flex items-center justify-center gap-2"><AlertCircle size={16}/> Izin</div></th>
                <th className="px-4 py-4 font-bold border-b border-white/10 text-center text-blue-400"><div className="flex items-center justify-center gap-2"><FileText size={16}/> Sakit</div></th>
                <th className="px-4 py-4 font-bold border-b border-white/10 text-center text-emerald-400"><div className="flex items-center justify-center gap-2"><CheckCircle2 size={16}/> Cuti</div></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredData.map((emp) => (
                <tr key={emp.id} className="hover:bg-navy-900/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{emp.name}</div>
                    <div className="text-xs text-slate-400">{emp.role}</div>
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" min="0" value={emp.alpa} onChange={(e) => handleInput(emp.id, 'alpa', e.target.value)} className="w-20 mx-auto block rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-center font-bold text-white outline-none focus:border-rose-400" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" min="0" value={emp.izin} onChange={(e) => handleInput(emp.id, 'izin', e.target.value)} className="w-20 mx-auto block rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-center font-bold text-white outline-none focus:border-amber-400" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" min="0" value={emp.sakit} onChange={(e) => handleInput(emp.id, 'sakit', e.target.value)} className="w-20 mx-auto block rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-center font-bold text-white outline-none focus:border-blue-400" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" min="0" value={emp.cuti} onChange={(e) => handleInput(emp.id, 'cuti', e.target.value)} className="w-20 mx-auto block rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-center font-bold text-white outline-none focus:border-emerald-400" />
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">Tidak ada data karyawan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 rounded-xl bg-brand-orange/10 border border-brand-orange/20 p-4">
          <h3 className="font-bold text-brand-orange text-sm mb-1">Catatan HRD:</h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            Data ketidakhadiran akan digunakan sebagai variabel perhitungan pemotongan gaji (jika ada) di sistem Payroll.
            Pastikan seluruh data sudah di-input dengan benar sebelum masuk periode cut-off.
          </p>
        </div>
      </div>
    </div>
  );
}
