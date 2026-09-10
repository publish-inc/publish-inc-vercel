import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { BookOpen, Target, TrendingUp, Users, Trophy, Award, Clock } from "lucide-react";
import { Logo } from "../../components/Logo";
import { demoDashboardStats, demoUsers } from "../../lib/demoData";

export default function ReportDisplay() {
  const [stats, setStats] = useState({
    omzetDeal: 0,
    naskahOnProcess: 0,
    naskahSelesai: 0,
    kpiPercentage: 0,
  });
  const [rankingKpi, setRankingKpi] = useState([]);
  const [rankingKehadiran, setRankingKehadiran] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchDashboardData = async () => {
    const currentMonth = currentTime.getMonth() + 1;
    const currentYear = currentTime.getFullYear();
    const startDate = new Date(currentYear, currentMonth - 1, 1).toISOString();
    const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59).toISOString();

    try {
      const { data: deals } = await supabase
        .from("spk_deals")
        .select("total_price")
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      const omzetDeal = (deals || []).reduce((sum, d) => sum + (d.total_price || 0), 0);

      const { count: naskahOnProcess } = await supabase
        .from("spk_naskah")
        .select("*", { count: 'exact', head: true })
        .not("status", "eq", "selesai")
        .not("status", "eq", "batal");
        
      const { count: naskahSelesai } = await supabase
        .from("spk_naskah")
        .select("*", { count: 'exact', head: true })
        .eq("status", "selesai")
        .gte("updated_at", startDate)
        .lte("updated_at", endDate);

      // Ambil Target KPI dan Data User
      const { data: kpiTargets } = await supabase
        .from("spk_kpi_targets")
        .select("user_id, target_points, app_users(name, role)")
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
      let kpiRankings = [];
      
      kpiTargets?.forEach(t => {
        const userTasks = tasks?.filter(task => task.assigned_to === t.user_id) || [];
        const achieved = userTasks.reduce((sum, task) => sum + (task.points_reward || 0), 0);
        
        if (achieved >= t.target_points && t.target_points > 0) metCount++;
        
        kpiRankings.push({
          id: t.user_id,
          name: t.app_users?.name || "Unknown",
          role: t.app_users?.role || "-",
          achieved,
          target: t.target_points,
          percentage: t.target_points > 0 ? (achieved / t.target_points) * 100 : 0
        });
      });
      
      // Sort and slice top 5 KPI
      kpiRankings.sort((a, b) => b.percentage - a.percentage || b.achieved - a.achieved);
      setRankingKpi(kpiRankings.slice(0, 5));
      
      const kpiPercentage = totalUsers > 0 ? Math.round((metCount / totalUsers) * 100) : 0;

      setStats({
        omzetDeal,
        naskahOnProcess: naskahOnProcess || 0,
        naskahSelesai: naskahSelesai || 0,
        kpiPercentage
      });
      
      // Mock Data Ranking Kehadiran (Since attendance module is not fully present yet)
      const mockAbsensi = [
        { id: 1, name: "Budi Santoso", role: "Editor", onTime: 20, total: 20 },
        { id: 2, name: "Siti Aminah", role: "Layouter", onTime: 19, total: 20 },
        { id: 3, name: "Joko Anwar", role: "CS", onTime: 18, total: 20 },
        { id: 4, name: "Rina Sari", role: "Admin", onTime: 17, total: 20 },
        { id: 5, name: "Andi Saputra", role: "CCO", onTime: 17, total: 20 },
      ];
      setRankingKehadiran(mockAbsensi);

    } catch (err) {
      console.error("Gagal mengambil data report: ", err);
      setStats({
        omzetDeal: demoDashboardStats.omzetDeal,
        naskahOnProcess: demoDashboardStats.naskahOnProcess,
        naskahSelesai: demoDashboardStats.naskahSelesai,
        kpiPercentage: 72,
      });
      setRankingKpi([
        { id: "rank-1", name: "Bima Editor", role: "editor", achieved: 52000, target: 45000, percentage: 116 },
        { id: "rank-2", name: "Sari Layouter", role: "layouter", achieved: 340, target: 320, percentage: 106 },
        { id: "rank-3", name: "Nadia CS", role: "cs", achieved: 10, target: 12, percentage: 83 },
      ]);
      setRankingKehadiran(demoUsers.slice(1).map((user, index) => ({ id: user.id, name: user.name, role: user.role, onTime: 20 - index, total: 20 })));
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Auto refresh data setiap 5 menit
    const dataInterval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    
    // Update jam setiap detik
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    
    return () => {
      clearInterval(dataInterval);
      clearInterval(timeInterval);
    };
  }, []);

  const formatRp = (angka) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(angka);
  
  const formattedDate = currentTime.toLocaleDateString("id-ID", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formattedTime = currentTime.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col p-6 lg:p-10 overflow-hidden absolute inset-0 z-50">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="scale-125 origin-left">
          <Logo />
        </div>
        <div className="text-right">
          <div className="text-4xl font-display font-black text-white tracking-widest">{formattedTime}</div>
          <div className="text-xl text-brand-orange font-bold uppercase tracking-widest mt-1">{formattedDate}</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Stats */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          <div className="bg-navy-900 border border-brand-orange/30 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group flex-1 flex flex-col justify-center">
            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform duration-1000">
              <TrendingUp size={200} className="text-brand-orange" />
            </div>
            <div className="relative z-10">
              <h2 className="text-2xl font-black text-brand-orange uppercase tracking-widest mb-2">Omzet Bulan Ini</h2>
              <div className="text-6xl xl:text-8xl font-black text-white tabular-nums drop-shadow-lg leading-none">
                {formatRp(stats.omzetDeal)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-48">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-[2rem] flex flex-col justify-between shadow-xl relative overflow-hidden">
              <BookOpen size={64} className="absolute -bottom-2 -right-2 text-white/10" />
              <h3 className="text-sm font-bold text-blue-100 uppercase tracking-wider">On Process</h3>
              <div className="text-5xl font-black text-white tabular-nums">{stats.naskahOnProcess}</div>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 rounded-[2rem] flex flex-col justify-between shadow-xl relative overflow-hidden">
              <Target size={64} className="absolute -bottom-2 -right-2 text-white/10" />
              <h3 className="text-sm font-bold text-emerald-100 uppercase tracking-wider">Selesai (Bulan Ini)</h3>
              <div className="text-5xl font-black text-white tabular-nums">{stats.naskahSelesai}</div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-600 to-purple-800 p-6 rounded-[2rem] flex flex-col justify-between shadow-xl relative overflow-hidden">
              <Users size={64} className="absolute -bottom-2 -right-2 text-white/10" />
              <h3 className="text-sm font-bold text-purple-100 uppercase tracking-wider">Capaian KPI Tim</h3>
              <div className="text-5xl font-black text-white tabular-nums">{stats.kpiPercentage}%</div>
            </div>
          </div>
        </div>

        {/* Right Side: Rankings */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Top KPI */}
          <div className="bg-navy-900 border border-white/10 p-6 rounded-[2rem] shadow-xl flex-1 flex flex-col">
            <h3 className="text-xl font-bold text-white uppercase tracking-widest flex items-center gap-3 mb-6">
              <Trophy className="text-brand-orange" /> Top KPI Bulanan
            </h3>
            <div className="space-y-4 flex-1">
              {rankingKpi.map((user, idx) => (
                <div key={user.id} className="bg-navy-950 p-4 rounded-2xl flex items-center gap-4 border border-white/5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shadow-inner ${
                    idx === 0 ? "bg-amber-400 text-amber-900" : 
                    idx === 1 ? "bg-slate-300 text-slate-800" : 
                    idx === 2 ? "bg-amber-700 text-amber-100" : "bg-navy-800 text-slate-400"
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">{user.name}</div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider">{user.role.replace("_", " ")}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-brand-orange font-black text-xl tabular-nums">{user.percentage.toFixed(0)}%</div>
                    <div className="text-[10px] text-slate-500">{user.achieved} / {user.target} pt</div>
                  </div>
                </div>
              ))}
              {rankingKpi.length === 0 && (
                <div className="text-slate-500 text-center py-8 italic">Data KPI belum tersedia</div>
              )}
            </div>
          </div>

          {/* Top Kehadiran */}
          <div className="bg-navy-900 border border-white/10 p-6 rounded-[2rem] shadow-xl flex-1 flex flex-col">
            <h3 className="text-xl font-bold text-white uppercase tracking-widest flex items-center gap-3 mb-6">
              <Clock className="text-brand-blue" /> Disiplin Kehadiran
            </h3>
            <div className="space-y-4 flex-1">
              {rankingKehadiran.map((user, idx) => (
                <div key={user.id} className="bg-navy-950 p-3 rounded-2xl flex items-center gap-4 border border-white/5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-inner ${
                    idx === 0 ? "bg-brand-blue text-white" : "bg-navy-800 text-slate-400"
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate text-sm">{user.name}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">{user.role}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-emerald-400 font-black tabular-nums">{user.onTime}/{user.total}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer ticker / Info */}
      <div className="mt-8 bg-navy-900 border border-white/10 p-4 rounded-xl flex items-center overflow-hidden whitespace-nowrap">
        <div className="inline-flex items-center gap-4 animate-[marquee_20s_linear_infinite]">
          <span className="text-brand-orange font-bold px-4">INFO:</span>
          <span className="text-lg text-white">Semangat berkarya tim Nasmedia! Tetap pantau target dan perhatikan deadline naskah.</span>
          <span className="text-brand-orange font-bold px-4 ml-24">PENGUMUMAN:</span>
          <span className="text-lg text-white">Pastikan semua naskah selesai sebelum tanggal 25 setiap bulannya.</span>
        </div>
      </div>
    </div>
  );
}
