import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Eye, Filter, Search, Phone, User, Building } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { formatRupiah } from "../../lib/api";

const DEMO_CRM_CUSTOMERS = [
  { id: "cust-1", name: "Ratna Wijaya, M.Pd.", phone: "081234567890", instansi: "SMA Negeri 1 Bandung", created_at: "2026-08-15" },
  { id: "cust-2", name: "Andi Saputra, S.E., M.M.", phone: "082233445566", instansi: "Universitas Hasanuddin Makassar", created_at: "2026-08-20" },
  { id: "cust-3", name: "Laras Prameswari, S.S.", phone: "085677889900", instansi: "Komunitas Penulis Muda Jogja", created_at: "2026-08-22" },
  { id: "cust-4", name: "Mira Safitri, S.Kom.", phone: "087812341234", instansi: "PT Media Nusantara Surabaya", created_at: "2026-08-25" },
  { id: "cust-5", name: "Dr. Hendra Gunawan", phone: "08119876543", instansi: "Fakultas Kedokteran UNHAS", created_at: "2026-08-28" },
  { id: "cust-6", name: "Rina Sastro, S.Psi.", phone: "081234112233", instansi: "Pusat Konseling Psikologi", created_at: "2026-09-01" },
  { id: "cust-7", name: "Budi Santoso, S.T.", phone: "081399887766", instansi: "Politeknik Negeri Malang", created_at: "2026-09-03" },
  { id: "cust-8", name: "Dewi Lestari, M.Hum.", phone: "085211223344", instansi: "Institut Seni Indonesia", created_at: "2026-09-05" },
];

const DEMO_CRM_NASKAH = [
  { customer_id: "cust-1", judul: "Menjadi Guru Kreatif di Era Digital", total_harga: 7500000, status: "Dikerjakan Editor" },
  { customer_id: "cust-1", judul: "Metode Pembelajaran Interaktif", total_harga: 6000000, status: "Selesai" },
  { customer_id: "cust-2", judul: "Strategi UMKM Naik Kelas", total_harga: 9800000, status: "Administrasi" },
  { customer_id: "cust-3", judul: "Antologi Puisi Hujan Pertama", total_harga: 5200000, status: "Dikerjakan Editor" },
  { customer_id: "cust-4", judul: "Modul Pelatihan Komunikasi Publik", total_harga: 12300000, status: "Antrian PIC Layouter" },
  { customer_id: "cust-5", judul: "Buku Ajar Biokimia Molekuler", total_harga: 14500000, status: "Proses Cetak Produksi" },
  { customer_id: "cust-6", judul: "Kisah di Ujung Musim Dingin", total_harga: 6800000, status: "Proses Cetak Produksi" },
];

export default function DashboardCrm() {
  const [customers, setCustomers] = useState([]);
  const [naskah, setNaskah] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: custData, error: e1 } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
        const { data: naskahData, error: e2 } = await supabase.from("spk_naskah").select("customer_id, judul, total_harga, status");
        
        if (e1 || e2 || !custData?.length) {
          setCustomers(DEMO_CRM_CUSTOMERS);
          setNaskah(DEMO_CRM_NASKAH);
        } else {
          setCustomers(custData || []);
          setNaskah(naskahData || []);
        }
      } catch (err) {
        setCustomers(DEMO_CRM_CUSTOMERS);
        setNaskah(DEMO_CRM_NASKAH);
      }
      setLoading(false);
    };
    load();
  }, []);

  const aggregated = useMemo(() => {
    return customers.map(c => {
      const cNaskah = naskah.filter(n => n.customer_id === c.id);
      const isDeal = cNaskah.length > 0;
      const totalOmzet = cNaskah.reduce((acc, curr) => acc + (Number(curr.total_harga) || 0), 0);
      
      return {
        ...c,
        isDeal,
        dealsCount: cNaskah.length,
        totalOmzet,
        titles: cNaskah.map(n => n.judul).filter(Boolean),
        deals: cNaskah,
      };
    });
  }, [customers, naskah]);

  const list = useMemo(() => {
    const needle = search.toLowerCase().trim();
    return aggregated.filter(c => 
      (statusFilter === "all" || (statusFilter === "deal" ? c.isDeal : !c.isDeal)) &&
      (!needle ||
      c.name?.toLowerCase().includes(needle) || 
      c.phone?.toLowerCase().includes(needle) || 
      c.instansi?.toLowerCase().includes(needle)
      )
    );
  }, [aggregated, search, statusFilter]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const pageSize = 10;
  const pages = Math.max(Math.ceil(list.length / pageSize), 1);
  const visible = list.slice((page - 1) * pageSize, page * pageSize);

  const waLink = (phone) => {
    let p = String(phone || "").replace(/\D/g, "");
    if (p.startsWith("0")) p = "62" + p.slice(1);
    return `https://wa.me/${p}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-white">Database CRM</h1>
        <p className="mt-1 text-slate-400">Pusat data pelanggan untuk kebutuhan follow-up, re-aktivasi, dan broadcast promo.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-navy-800 p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-3.5 text-slate-300" size={20} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, nomor HP, instansi..." className="h-12 w-full rounded-xl border border-white/10 bg-navy-950 pl-11 pr-4 font-semibold text-white outline-none focus:border-brand-orange" />
        </div>
        <div className="relative">
          <Filter className="pointer-events-none absolute left-4 top-3.5 text-slate-300" size={18} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-12 w-full rounded-xl border border-white/10 bg-navy-950 pl-11 pr-4 font-bold text-white outline-none focus:border-brand-orange">
            <option value="all">Semua Customer</option>
            <option value="deal">Pernah Deal</option>
            <option value="prospek">Prospek</option>
          </select>
        </div>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Memuat database customer...</div>
      ) : (
        <div className="bg-navy-800 rounded-3xl p-6 border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-navy-900/50 text-[10px] uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-bold">Data Pelanggan</th>
                  <th className="px-6 py-4 font-bold">Instansi</th>
                  <th className="px-6 py-4 font-bold text-right">Aksi Follow-Up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visible.map(c => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-brand-orange/20 flex items-center justify-center text-brand-orange shrink-0">
                          <User size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-white">{c.name}</div>
                          <div className="text-xs text-slate-400 mt-1">{c.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building size={14} className="text-slate-500" />
                        <span>{c.instansi || "-"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                      <button onClick={() => setDetail(c)} className="inline-flex items-center gap-2 bg-navy-900 border border-white/10 hover:border-brand-orange text-slate-200 px-4 py-2 rounded-lg font-bold transition-colors text-xs">
                        <Eye size={14} /> Detail
                      </button>
                      <a href={waLink(c.phone)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold transition-colors text-xs">
                        <Phone size={14} /> Hubungi via WA
                      </a>
                      </div>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr><td colSpan="3" className="px-6 py-12 text-center text-slate-500">Tidak ada data pelanggan yang cocok.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-slate-500">Total {list.length} customer - Halaman {page} dari {pages}</p>
        <div className="flex gap-2">
          <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page <= 1} className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-navy-800 px-4 py-2 text-sm text-slate-300 disabled:opacity-40"><ChevronLeft size={16} /> Sebelumnya</button>
          <button onClick={() => setPage((p) => Math.min(p + 1, pages))} disabled={page >= pages} className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-navy-800 px-4 py-2 text-sm text-slate-300 disabled:opacity-40">Berikutnya <ChevronRight size={16} /></button>
        </div>
      </div>

      {detail && <DetailModal customer={detail} waLink={waLink} onClose={() => setDetail(null)} />}
    </div>
  );
}

function DetailModal({ customer, waLink, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-navy-900 p-6">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-2xl font-black text-white">{customer.name}</h2>
            <p className="text-sm text-slate-400">{customer.phone} - {customer.instansi || "Tanpa instansi"}</p>
          </div>
          <button onClick={onClose} className="rounded-lg bg-white/5 px-4 py-2 text-white">Tutup</button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Info label="Status Deal" value={customer.isDeal ? `Pernah Deal (${customer.dealsCount}x)` : "Prospek"} />
          <Info label="Total Omzet" value={formatRupiah(customer.totalOmzet)} />
          <Info label="Kontak" value={customer.phone || "-"} />
        </div>
        <div className="mt-5 rounded-xl border border-white/10 bg-navy-950 p-4">
          <h3 className="mb-3 font-bold text-white">Riwayat Deal</h3>
          <div className="space-y-2">
            {(customer.deals || []).map((deal, index) => (
              <div key={`${deal.judul}-${index}`} className="rounded-lg bg-navy-800 p-3 text-sm text-slate-300">
                <div className="font-bold text-white">{deal.judul || "-"}</div>
                <div className="mt-1 text-xs text-slate-400">Status: {deal.status || "-"} - Omzet: {formatRupiah(deal.total_harga)}</div>
              </div>
            ))}
            {!customer.deals?.length && <div className="py-5 text-center text-sm text-slate-500">Belum ada riwayat deal.</div>}
          </div>
        </div>
        <a href={waLink(customer.phone)} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-blue px-5 py-3 font-bold text-white hover:bg-blue-600">
          <Phone size={16} /> Hubungi via WA
        </a>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return <div className="rounded-xl border border-white/10 bg-navy-950 p-4"><div className="text-[10px] font-black uppercase text-slate-500">{label}</div><div className="mt-1 font-bold text-white">{value}</div></div>;
}
