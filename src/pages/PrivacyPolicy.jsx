import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import { PublicNav } from "../components/PublicNav";
import { Footer } from "../components/Footer";

export default function PrivacyPolicy() {
  const [content, setContent] = useState(null);

  useEffect(() => { api.get("/content").then((r) => setContent(r.data)).catch(() => {}); }, []);

  const pp = content?.privacy_policy || {};

  return (
    <div className="bg-navy-900 min-h-screen" data-testid="privacy-policy-page">
      <PublicNav />
      <header className="pt-32 pb-12 px-4 sm:px-6 lg:px-8 bg-navy-950 border-b border-white/10">
        <div className="max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 text-brand-orange font-bold uppercase tracking-[0.2em] text-sm">
            <ShieldCheck size={16} /> KEBIJAKAN PRIVASI
          </span>
          <h1 className="font-display font-extrabold tracking-tighter text-white text-4xl lg:text-5xl mt-4">
            {pp.title || "Kebijakan Privasi"}
          </h1>
          {pp.updated_at && <p className="text-slate-400 mt-3 text-sm">Terakhir diperbarui: {pp.updated_at}</p>}
        </div>
      </header>

      <section className="py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {content === null ? (
            <div className="flex justify-center py-20"><div className="animate-spin h-10 w-10 border-2 border-brand-orange border-t-transparent rounded-full" /></div>
          ) : (
            <div data-testid="privacy-content" className="text-slate-300 leading-relaxed whitespace-pre-line text-base">
              {pp.content || "Kebijakan privasi belum tersedia."}
            </div>
          )}
          <Link to="/" data-testid="privacy-back-home" className="inline-flex items-center gap-2 text-brand-orange hover:text-brand-orange-dark transition-colors mt-12">
            <ArrowLeft size={18} /> Kembali ke Beranda
          </Link>
        </div>
      </section>
      <Footer content={content} />
    </div>
  );
}
