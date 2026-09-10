import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { api } from "../lib/api";

const links = [
  { label: "Beranda", hash: "#beranda" },
  { label: "Layanan", hash: "#layanan" },
  { label: "Tentang Kami", hash: "#tentang" },
  { label: "Agenda Event", hash: "#event" },
  { label: "FAQ", hash: "#faq" },
  { label: "Katalog Buku", to: "/toko" },
  { label: "Kontak", wa: true },
];

export const PublicNav = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [wa, setWa] = useState("6281234567890");
  const [brand, setBrand] = useState({ name: "Publish Inc.", tagline: "TERBIT CEPAT, TUMBUH HEBAT." });
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    api.get("/content").then((r) => {
      if (r.data?.whatsapp_number) setWa(r.data.whatsapp_number);
      if (r.data?.brand) setBrand({ name: r.data.brand.name || "Publish Inc.", tagline: r.data.brand.tagline || "TERBIT CEPAT, TUMBUH HEBAT." });
    }).catch(() => {});
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const waLink = `https://wa.me/${wa}?text=${encodeURIComponent("Halo Publish Inc., saya ingin bertanya.")}`;

  const go = (link) => {
    setOpen(false);
    if (link.wa) {
      window.open(waLink, "_blank");
    } else if (link.hash) {
      if (location.pathname !== "/") navigate("/" + link.hash);
      else document.querySelector(link.hash)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(link.to);
    }
  };

  const isActive = (link) => link.to === "/toko" && location.pathname.startsWith("/toko");

  return (
    <nav className={`fixed top-0 w-full z-50 bg-white border-b border-slate-200 transition-shadow ${scrolled ? "shadow-md" : ""}`} data-testid="public-navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Logo dark brandName={brand.name} tagline={brand.tagline} />
        <div className="hidden lg:flex items-center gap-7">
          {links.map((l) => (
            <button
              key={l.label}
              onClick={() => go(l)}
              data-testid={`nav-${l.label.toLowerCase().replace(/\s/g, "-")}`}
              className={`relative text-[15px] font-semibold transition-colors hover:text-brand-orange ${isActive(l) ? "text-brand-orange" : "text-navy-900"}`}
            >
              {l.label}
              {isActive(l) && <span className="absolute -bottom-2 left-0 w-full h-0.5 bg-brand-orange rounded-full" />}
            </button>
          ))}
        </div>
        <button className="lg:hidden text-navy-900" onClick={() => setOpen(!open)} data-testid="nav-mobile-toggle">
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className="lg:hidden bg-white border-t border-slate-200 px-6 py-4 flex flex-col gap-4" data-testid="mobile-menu">
          {links.map((l) => (
            <button key={l.label} onClick={() => go(l)} className="text-left font-semibold text-navy-900">{l.label}</button>
          ))}
        </div>
      )}
    </nav>
  );
};
