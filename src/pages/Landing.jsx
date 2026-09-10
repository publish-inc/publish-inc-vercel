import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen, PenTool, Megaphone, GraduationCap, ArrowRight, Check, Quote, Sparkles,
  MessageCircle, Star, Tag, ChevronDown, Calendar as CalendarIcon, MapPin, Link2
} from "lucide-react";
import { api, formatRupiah } from "../lib/api";
import { supabase } from "../lib/supabase";
import { PublicNav } from "../components/PublicNav";
import { Footer } from "../components/Footer";
import { getEmployeeProfiles } from "../lib/payroll";

import { demoCampaigns } from "../lib/demoData";

const iconMap = { BookOpen, PenTool, Megaphone, GraduationCap, Sparkles };

const FloatingBooks = ({ image }) => {
  if (image)
    return (
      <div className="relative h-[420px] w-full hidden lg:flex items-center justify-center">
        <img src={image} alt="" className="max-h-[420px] rounded-2xl object-cover shadow-2xl animate-float" />
      </div>
    );
  return (
    <div className="relative h-[420px] w-full hidden lg:block" data-testid="hero-books">
      <div className="absolute top-4 right-10 h-64 w-48 rounded-2xl bg-gradient-to-br from-brand-orange to-brand-orange-dark shadow-[0_20px_60px_rgba(249,115,22,0.35)] rotate-[14deg] animate-float" style={{ animationDelay: "0s" }} />
      <div className="absolute top-16 right-32 h-64 w-48 rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.4)] rotate-[6deg] animate-float" style={{ animationDelay: "1.2s" }} />
      <div className="absolute top-32 right-52 h-64 w-48 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-blue-dark shadow-[0_20px_60px_rgba(59,130,246,0.35)] -rotate-[10deg] animate-float" style={{ animationDelay: "2.2s" }}>
        <div className="absolute left-3 top-0 h-full w-1 bg-white/20 rounded-full" />
      </div>
    </div>
  );
};

const SectionHead = ({ eyebrow, title, description, center }) => (
  <div className={`${center ? "text-center max-w-2xl mx-auto" : ""} mb-14`}>
    <p className="uppercase tracking-[0.2em] text-sm text-brand-orange font-bold mb-4">{eyebrow}</p>
    <h2 className="font-display font-extrabold tracking-tight text-white text-3xl lg:text-4xl">{title}</h2>
    {description && <p className="text-slate-400 mt-4">{description}</p>}
  </div>
);

const PackageCards = ({ data, waLink, testid }) => (
  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid={testid}>
    {(data.items || []).map((p, i) => (
      <div key={i} className={`relative rounded-2xl p-7 border flex flex-col ${p.popular ? "bg-navy-800 border-brand-orange shadow-[0_0_40px_rgba(249,115,22,0.2)]" : "bg-navy-800 border-white/10"}`}>
        {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-orange text-white text-xs font-bold px-4 py-1 rounded-full">TERPOPULER</span>}
        {p.image && <img src={p.image} alt={p.name} className="h-40 w-full object-cover rounded-xl mb-5" />}
        <h3 className="font-display font-bold text-white text-xl">{p.name}</h3>
        <p className="font-display font-extrabold text-brand-orange text-2xl mt-2">{p.price}</p>
        {p.description && <p className="text-slate-400 text-sm mt-2">{p.description}</p>}
        <ul className="mt-5 space-y-2.5 flex-1">
          {(p.features || []).map((f, x) => (
            <li key={x} className="flex items-start gap-2.5 text-slate-200 text-sm">
              <Check size={16} className="text-brand-orange mt-0.5 flex-shrink-0" /> {f}
            </li>
          ))}
        </ul>
        <a href={waLink} target="_blank" rel="noreferrer" className={`mt-6 text-center font-bold py-3 rounded-full transition-colors active:scale-95 ${p.popular ? "bg-brand-orange hover:bg-brand-orange-dark text-white" : "border border-white/20 hover:border-brand-orange text-white"}`}>
          Pesan Paket
        </a>
      </div>
    ))}
  </div>
);

const FaqItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-navy-800 border border-white/10 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left" data-testid="faq-item">
        <span className="font-semibold text-white">{q}</span>
        <ChevronDown className={`text-brand-orange flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="px-6 pb-5 text-slate-400 leading-relaxed">{a}</p>}
    </div>
  );
};

export default function Landing() {
  const [c, setC] = useState(null);
  const [featured, setFeatured] = useState([]);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api.get("/content").then((r) => setC(r.data)).catch(() => {
      setC({
        whatsapp_number: "6281234567890",
        brand: { name: "Publish Inc.", tagline: "TERBIT CEPAT, TUMBUH HEBAT." },
        hero: {
          eyebrow: "Penerbitan Buku Profesional & Terpercaya",
          title_line1: "Wujudkan Karya Impian Anda",
          title_line2: "Bersama Publish Inc.",
          description: "Layanan penerbitan buku lengkap mulai dari penyuntingan, tata letak (layout), desain sampul, pengurusan ISBN, hingga pencetakan dan distribusi ke seluruh Indonesia.",
          quote: "Buku adalah jendela dunia, dan setiap gagasan layak untuk dibaca.",
          cta_primary_text: "Konsultasi Gratis via WhatsApp",
          cta_secondary_text: "Lihat Layanan Kami",
        },
        about: {
          eyebrow: "Tentang Kami",
          title: "Mitra Terbaik Penulis & Akademisi",
          description: "Publish Inc. adalah rumah penerbitan profesional yang berdedikasi membantu para penulis, dosen, dan peneliti menerbitkan karya berkualitas tinggi sesuai standar nasional.",
          points: ["Pengurusan ISBN Resmi Perpustakaan Nasional", "Tim Editor & Layouter Profesional Berpengalaman", "Cetak Berkualitas Tinggi Presisi & Tepat Waktu", "Distribusi & Promosi Marketplace Nasional"]
        },
        services: [
          { icon: "BookOpen", title: "Penerbitan Buku Reguler & Cetak", description: "Paket penerbitan lengkap dengan fasilitas ISBN, editing, layout, dan cetak." },
          { icon: "PenTool", title: "Konversi Karya Ilmiah", description: "Ubah skripsi, tesis, atau disertasi menjadi buku referensi ber-ISBN." },
          { icon: "Megaphone", title: "Promosi & Distribusi", description: "Bantu promosi buku ke marketplace dan jaringan toko buku nasional." },
          { icon: "GraduationCap", title: "Penerbitan Buku Ajar / Dosen", description: "Layanan khusus buku ajar, monograf, dan buku referensi akademik." }
        ],
        stats: [
          { value: "1,500+", label: "Judul Buku Diterbitkan" },
          { value: "1,200+", label: "Penulis & Dosen Terdaftar" },
          { value: "99.8%", label: "Kepuasan Pelanggan" },
          { value: "50+", label: "Kota Jangkauan Distribusi" }
        ],
        contact: {
          email: "info@publishinc.com",
          phone: "+62 812-3456-7890",
          address: "Jl. Utama Penerbitan No. 88, Jakarta - Indonesia"
        },
        section_visibility: {}
      });
    });
    api.get("/books", { params: { featured: true } }).then((r) => {
      if (r.data && r.data.length > 0) {
        setFeatured(r.data.slice(0, 4));
      } else {
        api.get("/books").then((all) => setFeatured((all.data || []).slice(0, 4))).catch(() => {});
      }
    }).catch(() => { });
    
    // Fetch events from spk_campaigns, site_content, or fallback to demo data
    const mapEventItem = (item) => ({
      id: item.id || `evt-${Date.now()}`,
      title: item.title || item.name || "Event Workshop",
      date: item.date || new Date().toISOString().slice(0, 10),
      time: item.time || "09:00",
      location: item.platform_or_location || item.location || "Online / Offline",
      description: item.description || `Event ${item.title || "workshop"} diselenggarakan secara resmi oleh Publish Inc.`,
      link: item.link || item.url || "",
      status: item.status || "Upcoming"
    });

    supabase.from("spk_campaigns").select("*").eq("type", "Event").order("date", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setEvents(data.map(mapEventItem));
        } else {
          // Check site_content or fallback to demo campaigns
          supabase.from("site_content").select("content").eq("key", "events").single().then(({ data: siteData }) => {
            if (siteData?.content && Array.isArray(siteData.content) && siteData.content.length > 0) {
              setEvents(siteData.content.map(mapEventItem));
            } else {
              const demoEvents = demoCampaigns.filter((c) => c.type === "Event").map(mapEventItem);
              setEvents(demoEvents);
            }
          }).catch(() => {
            setEvents(demoCampaigns.filter((c) => c.type === "Event").map(mapEventItem));
          });
        }
      })
      .catch(() => {
        setEvents(demoCampaigns.filter((c) => c.type === "Event").map(mapEventItem));
      });
  }, []);

  if (!c)
    return <div className="min-h-screen bg-navy-900 flex items-center justify-center"><div className="animate-spin h-10 w-10 border-2 border-brand-orange border-t-transparent rounded-full" /></div>;

  const { hero = {}, about = {}, services = [], stats = [], testimonials = [], team = [], contact = {}, whatsapp_number = "" } = c;
  const sv = c.section_visibility || {};
  const waLink = `https://wa.me/${whatsapp_number}?text=${encodeURIComponent("Halo Publish Inc., saya ingin konsultasi penerbitan buku.")}`;

  const pkgPenerbitan = c.packages_penerbitan || { eyebrow: "PAKET PENERBITAN", title: "Pilihan Paket Terbit Sesuai Kebutuhan", description: "Pilih paket penerbitan buku yang paling tepat untuk karya Anda.", items: [] };
  const pkgKonversi = c.packages_konversi || { eyebrow: "PAKET KONVERSI", title: "Konversi Karya Tulis Ilmiah Menjadi Buku", description: "Ubah skripsi, tesis, disertasi, atau laporan penelitian Anda menjadi buku ber-ISBN.", items: [] };
  const pkgCetak = c.packages_cetak || { eyebrow: "PAKET CETAK", title: "Cetak Buku Kuantitas Fleksibel", description: "Cetak naskah yang sudah siap dengan kualitas kertas & jilid terbaik.", items: [] };
  const pkgEbook = c.packages_ebook || { eyebrow: "TERBIT EBOOK", title: "Publikasi Digital & Ebook", description: "Jangkau pembaca digital melalui platform ebook terkemuka.", items: [] };
  const promoData = c.promo || { eyebrow: "INFO PROMO", title: "Penawaran & Diskon Spesial", description: "Dapatkan penawaran terbatas untuk penerbitan buku bulan ini.", items: [] };
  const faqData = c.faq || { eyebrow: "PERTANYAAN UMUM", title: "Frequently Asked Questions", items: [] };

  const localProfiles = getEmployeeProfiles();
  const rawTeam = (team && team.length > 0)
    ? team
    : Object.entries(localProfiles)
        .filter(([_, prof]) => prof.show_on_landing !== false && (prof.name || prof.photo_url))
        .map(([id, prof]) => ({
          employee_id: id,
          name: prof.name || "Karyawan",
          role: prof.role || "Tim Publish Inc.",
          photo: prof.photo_url || ""
        }));

  const displayTeam = rawTeam.map((m) => {
    const profile = m.employee_id ? localProfiles[m.employee_id] : Object.values(localProfiles).find(p => p.name === m.name);
    return {
      ...m,
      photo: m.photo || profile?.photo_url || "",
    };
  });

  const scrollTo = (id) => document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });

  const parseEventDate = (e) => {
    if (!e?.date) return new Date();
    try {
      const cleanTime = String(e.time || "09:00").replace(/[^0-9:]/g, "") || "09:00";
      const dateStr = e.date.includes("T") ? e.date : `${e.date}T${cleanTime}`;
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? new Date(e.date) : d;
    } catch {
      return new Date(e.date || Date.now());
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvents = events.filter((e) => {
    const d = parseEventDate(e);
    return d >= today || e.status === "Upcoming" || e.status === "Ongoing";
  });
  const pastEvents = events.filter((e) => {
    const d = parseEventDate(e);
    return d < today && e.status !== "Upcoming" && e.status !== "Ongoing";
  }).reverse();

  return (
    <div className="bg-navy-900 min-h-screen" data-testid="landing-page">
      <PublicNav />

      {/* HERO */}
      <section id="beranda" className="relative min-h-[92vh] flex items-center pt-20 overflow-hidden bg-navy-900">
        <div className="absolute inset-0 grain-overlay pointer-events-none" />
        <div className="absolute -top-40 -left-40 h-96 w-96 bg-brand-orange/10 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-8 items-center relative z-10 w-full">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <p className="uppercase tracking-[0.22em] text-sm text-brand-orange font-bold mb-5">{hero.eyebrow}</p>
            <h1 className="font-display font-extrabold tracking-tighter text-white text-5xl sm:text-6xl lg:text-7xl leading-[0.95]">
              {hero.title_line1}<br /><span className="text-brand-orange">{hero.title_line2}</span>
            </h1>
            <p className="text-slate-300 text-lg mt-7 max-w-xl leading-relaxed">{hero.description}</p>
            {hero.quote && <p className="italic text-slate-400 mt-5">"{hero.quote}"</p>}
            <div className="flex flex-wrap gap-4 mt-9">
              <a href={waLink} target="_blank" rel="noreferrer" data-testid="hero-cta-consult" className="group inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white font-bold px-7 py-3.5 rounded-full transition-colors active:scale-95">
                <MessageCircle size={18} /> {hero.cta_primary_text || "Konsultasi Gratis via WhatsApp"}
              </a>
              <button onClick={() => scrollTo("#layanan")} data-testid="hero-cta-services" className="inline-flex items-center gap-2 border border-white/20 hover:border-brand-orange text-white font-bold px-7 py-3.5 rounded-full transition-colors">
                {hero.cta_secondary_text || "Lihat Layanan Kami"} <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
          <FloatingBooks image={hero.image || hero.hero_image_url} />
        </div>
      </section>

      {/* REKAP */}
      {sv.rekap !== false && (stats || []).length > 0 && (
        <section className="bg-navy-950 border-y border-white/10 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-8">
            {(stats || []).map((s, i) => (
              <div key={i} className="text-center" data-testid={`stat-${i}`}>
                <div className="font-display font-extrabold text-4xl text-brand-orange">{s.value || s.number}</div>
                <div className="text-slate-400 mt-1 text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TENTANG */}
      {sv.tentang !== false && (
        <section id="tentang" className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <p className="uppercase tracking-[0.2em] text-sm text-brand-orange font-bold mb-4">{about.eyebrow}</p>
              <h2 className="font-display font-extrabold tracking-tight text-white text-3xl lg:text-4xl">{about.title}</h2>
              <p className="text-slate-300 mt-5 leading-relaxed">{about.description}</p>
              <ul className="mt-7 space-y-3">
                {(about.points || []).map((p, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-200">
                    <span className="h-6 w-6 rounded-full bg-brand-orange/20 flex items-center justify-center flex-shrink-0"><Check size={14} className="text-brand-orange" /></span>{p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <img src={about.image} alt="Tentang" className="rounded-3xl shadow-2xl w-full object-cover h-[420px] border border-white/10" />
              <div className="absolute -bottom-6 -left-6 bg-brand-orange text-white rounded-2xl px-6 py-4 shadow-xl hidden md:block">
                <div className="font-display font-extrabold text-2xl">100%</div>
                <div className="text-xs">Berpihak pada Penulis</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* LAYANAN */}
      {sv.layanan !== false && (services || []).length > 0 && (
        <section id="layanan" className="py-24 px-4 sm:px-6 lg:px-8 bg-navy-950">
          <div className="max-w-7xl mx-auto">
            <SectionHead center eyebrow="LAYANAN KAMI" title="Semua yang Anda Butuhkan untuk Terbit" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {(services || []).map((s, i) => {
                const Icon = iconMap[s.icon] || BookOpen;
                return (
                  <div key={i} data-testid={`service-${i}`} className="bg-navy-800 border border-white/10 rounded-2xl overflow-hidden hover:-translate-y-2 transition-transform duration-300 group">
                    {s.image && <img src={s.image} alt={s.title} className="h-36 w-full object-cover" />}
                    <div className="p-7">
                      <div className="h-12 w-12 rounded-xl bg-brand-orange/15 flex items-center justify-center mb-5 group-hover:bg-brand-orange transition-colors">
                        <Icon className="text-brand-orange group-hover:text-white transition-colors" size={22} />
                      </div>
                      <h3 className="font-display font-bold text-white text-lg mb-2">{s.title}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">{s.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* PAKET PENERBITAN */}
      {sv.paket_penerbitan !== false && (pkgPenerbitan.items || []).length > 0 && (
        <section id="paket-penerbitan" className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <SectionHead center eyebrow={pkgPenerbitan.eyebrow} title={pkgPenerbitan.title} description={pkgPenerbitan.description} />
            <PackageCards data={pkgPenerbitan} waLink={waLink} testid="paket-penerbitan-cards" />
          </div>
        </section>
      )}

      {/* PAKET KONVERSI */}
      {sv.paket_konversi !== false && (pkgKonversi.items || []).length > 0 && (
        <section id="paket-konversi" className="py-24 px-4 sm:px-6 lg:px-8 bg-navy-950">
          <div className="max-w-7xl mx-auto">
            <SectionHead center eyebrow={pkgKonversi.eyebrow} title={pkgKonversi.title} description={pkgKonversi.description} />
            <PackageCards data={pkgKonversi} waLink={waLink} testid="paket-konversi-cards" />
          </div>
        </section>
      )}

      {/* PAKET CETAK */}
      {sv.paket_cetak !== false && (pkgCetak.items || []).length > 0 && (
        <section id="paket-cetak" className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <SectionHead center eyebrow={pkgCetak.eyebrow} title={pkgCetak.title} description={pkgCetak.description} />
            <PackageCards data={pkgCetak} waLink={waLink} testid="paket-cetak-cards" />
          </div>
        </section>
      )}

      {/* TERBIT EBOOK */}
      {sv.paket_ebook !== false && (pkgEbook.items || []).length > 0 && (
        <section id="paket-ebook" className="py-24 px-4 sm:px-6 lg:px-8 bg-navy-950">
          <div className="max-w-7xl mx-auto">
            <SectionHead center eyebrow={pkgEbook.eyebrow} title={pkgEbook.title} description={pkgEbook.description} />
            <PackageCards data={pkgEbook} waLink={waLink} testid="paket-ebook-cards" />
          </div>
        </section>
      )}

      {/* INFO PROMO */}
      {sv.promo !== false && (promoData.items || []).length > 0 && (
        <section id="promo" className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <SectionHead center eyebrow={promoData.eyebrow} title={promoData.title} description={promoData.description} />
            <div className="grid md:grid-cols-2 gap-6" data-testid="promo-cards">
              {(promoData.items || []).map((p, i) => (
                <div key={i} className="relative rounded-2xl overflow-hidden border border-white/10 bg-navy-800 group">
                  {p.image ? (
                    <img src={p.image} alt={p.title} className="h-56 w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="h-56 w-full bg-gradient-to-br from-brand-orange to-brand-orange-dark flex items-center justify-center">
                      <Tag className="text-white/40" size={64} />
                    </div>
                  )}
                  <div className="p-6">
                    {p.badge && <span className="inline-block bg-brand-orange text-white text-xs font-bold px-3 py-1 rounded-full mb-3">{p.badge}</span>}
                    <h3 className="font-display font-bold text-white text-xl">{p.title}</h3>
                    <p className="text-slate-400 text-sm mt-2">{p.description}</p>
                    <a href={waLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-brand-orange font-semibold mt-4 hover:gap-3 transition-all">
                      Ambil Promo <ArrowRight size={16} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* BUKU PILIHAN */}
      {sv.buku_pilihan !== false && Array.isArray(featured) && featured.length > 0 && (
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
              <div>
                <p className="uppercase tracking-[0.2em] text-sm text-brand-orange font-bold mb-4">TERLARIS</p>
                <h2 className="font-display font-extrabold tracking-tight text-white text-3xl lg:text-4xl">Buku Pilihan Kami</h2>
              </div>
              <Link to="/toko" className="text-brand-orange font-semibold inline-flex items-center gap-2 hover:gap-3 transition-all">Lihat semua <ArrowRight size={18} /></Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {featured.map((b) => (
                <Link key={b.id} to={`/toko/${b.slug || b.id}`} data-testid={`featured-book-${b.id}`} className="group">
                  <div className="aspect-[3/4] rounded-xl overflow-hidden bg-navy-800 border border-white/10">
                    <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <h3 className="font-semibold text-white mt-3 line-clamp-1">{b.title}</h3>
                  <p className="text-slate-400 text-sm">{b.author}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TESTIMONI */}
      {sv.testimoni !== false && (testimonials || []).length > 0 && (
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-navy-950">
          <div className="max-w-7xl mx-auto">
            <SectionHead center eyebrow="KATA MEREKA" title="Dipercaya Para Penulis" />
            <div className="grid md:grid-cols-2 gap-6">
              {testimonials.map((t, i) => (
                <div key={i} data-testid={`testimonial-${i}`} className="bg-navy-800 border border-white/10 rounded-2xl p-8">
                  <Quote className="text-brand-orange mb-4" size={28} />
                  <p className="text-slate-200 text-lg leading-relaxed italic">"{t.quote || t.content}"</p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-brand-orange/20 flex items-center justify-center text-brand-orange font-bold">{t.name?.[0]}</div>
                    <div>
                      <div className="font-semibold text-white">{t.name}</div>
                      <div className="text-slate-400 text-sm">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TIM */}
      {sv.tim !== false && (displayTeam || []).length > 0 && (
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <SectionHead center eyebrow="TIM KAMI" title="Orang-orang di Balik Publish Inc." />
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {displayTeam.map((m, i) => (
                <div key={i} data-testid={`team-${i}`} className="bg-navy-800 border border-white/10 rounded-2xl p-6 text-center">
                  <div className="h-20 w-20 rounded-full mx-auto bg-gradient-to-br from-brand-orange to-brand-blue flex items-center justify-center text-white font-display font-extrabold text-2xl mb-4 overflow-hidden shadow-lg">
                    {m.photo ? (
                      <img src={m.photo} alt={m.name} className="h-full w-full object-cover" />
                    ) : (
                      m.name?.[0]?.toUpperCase() || "?"
                    )}
                  </div>
                  <div className="font-display font-bold text-white">{m.name}</div>
                  <div className="text-slate-400 text-sm">{m.role}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* EVENTS */}
      {events && events.length > 0 && (
        <section id="event" className="py-24 px-4 sm:px-6 lg:px-8 bg-navy-900 border-t border-white/10">
          <div className="max-w-7xl mx-auto">
            <SectionHead center eyebrow="AGENDA" title="Event Kami" description="Ikuti berbagai event menarik yang diadakan oleh Publish Inc." />
            
            <div className="grid lg:grid-cols-2 gap-10">
              {/* Upcoming */}
              <div>
                <h3 className="font-display font-bold text-white text-xl mb-6 flex items-center gap-2">
                  <CalendarIcon size={20} className="text-brand-orange" /> Akan Datang
                </h3>
                {upcomingEvents.length === 0 ? (
                  <p className="text-slate-400 bg-navy-800 border border-white/10 rounded-2xl p-6 text-center">Belum ada event mendatang.</p>
                ) : (
                  <div className="grid gap-4">
                    {upcomingEvents.slice(0, 3).map(item => (
                      <div key={item.id} className="bg-navy-800 rounded-2xl border border-white/10 p-5 flex gap-5 hover:border-brand-orange transition-colors">
                        <div className="flex flex-col items-center justify-center bg-brand-orange h-20 w-20 rounded-xl text-white shrink-0 shadow-lg shadow-brand-orange/20">
                          <span className="text-xs font-bold uppercase">{new Date(item.date).toLocaleString('id-ID', { month: 'short' })}</span>
                          <span className="text-3xl font-display font-black leading-none my-1">{new Date(item.date).getDate()}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-white text-xl mb-1">{item.title}</h4>
                          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400 mb-2">
                            <span className="flex items-center gap-1"><CalendarIcon size={14} /> {item.time} WIB</span>
                            {item.location && <span className="flex items-center gap-1"><MapPin size={14} /> {item.location}</span>}
                          </div>
                          <p className="text-slate-300 text-sm line-clamp-2">{item.description}</p>
                          {item.link && <a href={item.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-orange font-semibold text-sm mt-3 hover:underline">Daftar Sekarang <ArrowRight size={14} /></a>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Past */}
              <div>
                <h3 className="font-display font-bold text-white text-xl mb-6 flex items-center gap-2 opacity-50">
                  <CalendarIcon size={20} /> Selesai
                </h3>
                {pastEvents.length === 0 ? (
                  <p className="text-slate-500 text-center py-6">Belum ada history event.</p>
                ) : (
                  <div className="grid gap-4 opacity-70">
                    {pastEvents.slice(0, 4).map(item => (
                      <div key={item.id} className="bg-navy-800/50 rounded-2xl border border-white/5 p-5 flex gap-5 hover:border-white/20 transition-colors">
                        <div className="flex flex-col items-center justify-center bg-navy-900 h-16 w-16 rounded-xl text-slate-400 shrink-0">
                          <span className="text-[10px] font-bold uppercase">{new Date(item.date).toLocaleString('id-ID', { month: 'short' })}</span>
                          <span className="text-xl font-display font-bold leading-none my-0.5">{new Date(item.date).getDate()}</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-300 text-lg mb-1">{item.title}</h4>
                          <p className="text-slate-500 text-xs mb-2">{item.date} • {item.time} WIB</p>
                          <p className="text-slate-400 text-sm line-clamp-1">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {sv.faq !== false && (faqData.items || []).length > 0 && (
        <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 bg-navy-950">
          <div className="max-w-3xl mx-auto">
            <SectionHead center eyebrow={faqData.eyebrow} title={faqData.title} />
            <div className="space-y-4">
              {(faqData.items || []).map((f, i) => <FaqItem key={i} q={f.question} a={f.answer} />)}
            </div>
          </div>
        </section>
      )}

      {/* CONTACT CTA */}
      <section id="kontak" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-brand-orange to-brand-orange-dark rounded-3xl p-10 lg:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 grain-overlay opacity-30" />
          <p className="uppercase tracking-[0.2em] text-sm text-white/80 font-bold mb-4 relative">{contact.eyebrow}</p>
          <h2 className="font-display font-extrabold tracking-tight text-white text-3xl lg:text-5xl relative">{contact.title}</h2>
          <p className="text-white/90 mt-5 max-w-xl mx-auto relative">{contact.description}</p>
          <div className="flex flex-wrap justify-center gap-4 mt-9 relative">
            <a href={waLink} target="_blank" rel="noreferrer" data-testid="contact-whatsapp" className="bg-navy-900 text-white font-bold px-8 py-4 rounded-full hover:bg-navy-950 transition-colors active:scale-95">Chat via WhatsApp</a>
            <a href={`mailto:${contact.email}`} className="bg-white text-navy-900 font-bold px-8 py-4 rounded-full hover:bg-slate-100 transition-colors">Kirim Email</a>
          </div>
        </div>
      </section>

      <Footer content={c} />
    </div>
  );
}
