import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { Target, TrendingUp, TrendingDown, Users, BookOpen, Printer } from "lucide-react";
import { demoDashboardStats } from "../../lib/demoData";
import OperationalReportPdfModal from "../../components/OperationalReportPdfModal";

export default function DashboardGlobal() {
  const [stats, setStats] = useState({
    omzetDeal: 0,
    omzetMarketplace: 0,
    labaBersih: 0, // assuming 10% royalty deduction for marketplace
    naskahOnProcess: 0,
    kpiUsersTarget: 0,
    kpiUsersMet: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const startDate = new Date(currentYear, currentMonth - 1, 1).toISOString();
    const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59).toISOString();

    try {
      // 1. Fetch Deal Omzet
      const { data: deals } = await supabase
        .from("spk_deals")
        .select("total_price")
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      const omzetDeal = (deals || []).reduce((sum, d) => sum + (d.total_price || 0), 0);

      // 2. Fetch Marketplace Omzet
      const { data: penjualan } = await supabase
        .from("spk_penjualan")
        .select("qty, harga_jual")
        .gte("tanggal", startDate)
        .lte("tanggal", endDate);

      const omzetMarketplace = (penjualan || []).reduce((sum, p) => sum + ((p.qty || 0) * (p.harga_jual || 0)), 0);
      const labaBersih = omzetMarketplace * 0.9; // 10% royalty deduction assumed

      // 3. Fetch Naskah On Process
      const { count: naskahCount } = await supabase
        .from("spk_naskah")
        .select("*", { count: 'exact', head: true })
        .not("status", "eq", "selesai");

      // 4. Fetch KPI Achievements
      const { data: kpiTargets } = await supabase
        .from("spk_kpi_targets")
        .select("*")
        .eq("month", currentMonth)
        .eq("year", currentYear);
        
      const { data: tasks } = await supabase
        .from("spk_tasks")
        .select("assigned_to, points_reward")
        .eq("status", "done")
        .gte("completed_at", startDate)
        .lte("completed_at", endDate);

      let metCount = 0;
      let totalUsers = kpiTargets?.length || 0;
      
      kpiTargets?.forEach(t => {
        const userTasks = tasks?.filter(task => task.assigned_to === t.user_id) || [];
        const achieved = userTasks.reduce((sum, task) => sum + (task.points_reward || 0), 0);
        if (achieved >= t.target_points && t.target_points > 0) metCount++;
      });

      setStats({
        omzetDeal,
        omzetMarketplace,
        labaBersih,
        naskahOnProcess: naskahCount || 0,
        kpiUsersTarget: totalUsers,
        kpiUsersMet: metCount
      });
    } catch (err) {
      toast.error("Gagal mengambil data dashboard: " + err.message);
      setStats(demoDashboardStats);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatRp = (angka) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(angka);
  
  const kpiPercentage = stats.kpiUsersTarget > 0 
    ? Math.round((stats.kpiUsersMet / stats.kpiUsersTarget) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Dashboard Eksekutif</h1>
          <p className="text-slate-400 mt-1">Ringkasan Omzet, Performa, dan Produksi Bulan Ini.</p>
        </div>
        <button
          onClick={() => setShowReportModal(true)}
          className="inline-flex items-center gap-2.5 bg-brand-orange hover:bg-brand-orange-dark text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg text-xs"
        >
          <Printer size={16} /> Unduh PDF Laporan Operasional Bulanan
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Memuat data dashboard...</div>
      ) : (
        <>
          {/* Top Cards: Financials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-navy-800 p-6 rounded-2xl border border-brand-orange/30">
              <div className="text-[10px] font-black text-brand-orange uppercase tracking-widest mb-1">Omzet Deal (Penerbitan)</div>
              <div className="text-3xl font-black text-white">{formatRp(stats.omzetDeal)}</div>
            </div>
            
            <div className="bg-navy-800 p-6 rounded-2xl border border-blue-500/30">
              <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Omzet Marketplace</div>
              <div className="text-3xl font-black text-white">{formatRp(stats.omzetMarketplace)}</div>
            </div>

            <div className="bg-navy-800 p-6 rounded-2xl border border-green-500/30">
              <div className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">Laba Bersih Penjualan</div>
              <div className="text-3xl font-black text-white">{formatRp(stats.labaBersih)}</div>
              <div className="text-[9px] text-green-500/70 mt-1 italic">*Estimasi dipotong royalti global (10%)</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* KPI Achievement */}
            <div className="bg-navy-800 p-8 rounded-3xl border border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Target className="text-brand-blue" /> Capaian KPI Tim
                </h3>
                <p className="text-xs text-slate-400 mt-1">Tim yang berhasil memenuhi target poin.</p>
                
                <div className="flex gap-4 mt-6">
                  <div className="text-center bg-navy-900 p-4 rounded-xl border border-white/5">
                    <div className="text-2xl font-black text-white">{stats.kpiUsersTarget}</div>
                    <div className="text-[10px] uppercase text-slate-500 font-bold">Total Tim</div>
                  </div>
                  <div className="text-center bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                    <div className="text-2xl font-black text-green-500">{stats.kpiUsersMet}</div>
                    <div className="text-[10px] uppercase text-green-500/70 font-bold">Memenuhi</div>
                  </div>
                </div>
              </div>
              <div className="relative w-32 h-32 flex items-center justify-center rounded-full border-8 border-navy-900">
                <div 
                  className="absolute inset-0 rounded-full border-8 border-brand-blue transition-all"
                  style={{ 
                    clipPath: `polygon(50% 50%, -50% -50%, ${kpiPercentage > 25 ? '150% -50%' : '50% 0'}, ${kpiPercentage > 50 ? '150% 150%' : '150% -50%'}, ${kpiPercentage > 75 ? '-50% 150%' : '150% 150%'}, -50% -50%)`
                  }}
                />
                <div className="text-2xl font-black text-white">{kpiPercentage}%</div>
              </div>
            </div>

            {/* Production Stats */}
            <div className="bg-navy-800 p-8 rounded-3xl border border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
                <BookOpen className="text-amber-500" /> Status Produksi Naskah
              </h3>
              
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/30 shrink-0">
                  <div className="text-3xl font-black">{stats.naskahOnProcess}</div>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">Naskah On Process</h4>
                  <p className="text-sm text-slate-400 mt-1">Total naskah yang masih dalam tahap antrian, proses kreatif, atau penyelesaian administrasi.</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showReportModal && (
        <OperationalReportPdfModal stats={stats} onClose={() => setShowReportModal(false)} />
      )}
    </div>
  );
}
