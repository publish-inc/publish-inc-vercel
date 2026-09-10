import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center text-center p-4">
      <div className="bg-navy-900 border border-white/10 rounded-3xl p-12 max-w-lg w-full shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-brand-orange/20 blur-3xl rounded-full"></div>
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-brand-blue/20 blur-3xl rounded-full"></div>
        
        <AlertCircle size={64} className="text-brand-orange mx-auto mb-6" />
        <h1 className="text-6xl font-black font-display text-white mb-2">404</h1>
        <h2 className="text-2xl font-bold text-white mb-4">Halaman Tidak Ditemukan</h2>
        <p className="text-slate-400 mb-8">
          Maaf, halaman yang Anda cari mungkin telah dihapus, diubah namanya, atau tidak pernah ada.
        </p>
        
        <Link 
          to="/" 
          className="inline-flex items-center justify-center px-8 py-3 bg-brand-blue hover:bg-blue-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-brand-blue/20"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
