import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";
import { Logo } from "./Logo";

export const Footer = ({ content }) => {
  const contact = content?.contact || {};
  return (
    <footer className="bg-navy-950 border-t border-white/10 pt-16 pb-8" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <Logo />
          <p className="text-slate-400 mt-5 max-w-sm leading-relaxed">
            Rumah penerbitan modern yang menerbitkan gagasan Anda dengan cepat dan mengembangkan penulisnya
            melalui ekosistem author empowerment.
          </p>
        </div>
        <div>
          <h4 className="font-display font-bold text-white mb-4">Navigasi</h4>
          <ul className="space-y-3 text-slate-400">
            <li><Link to="/" className="hover:text-brand-orange transition-colors">Beranda</Link></li>
            <li><Link to="/toko" className="hover:text-brand-orange transition-colors">Katalog Buku</Link></li>
            <li><Link to="/#tentang" className="hover:text-brand-orange transition-colors">Tentang Kami</Link></li>
            <li><Link to="/kebijakan-privasi" data-testid="footer-privacy-link" className="hover:text-brand-orange transition-colors">Kebijakan Privasi</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-bold text-white mb-4">Kontak</h4>
          <ul className="space-y-3 text-slate-400 text-sm">
            {contact.email && <li className="flex items-start gap-2"><Mail size={16} className="mt-0.5 text-brand-orange" />{contact.email}</li>}
            {contact.phone && <li className="flex items-start gap-2"><Phone size={16} className="mt-0.5 text-brand-orange" />{contact.phone}</li>}
            {contact.address && <li className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 text-brand-orange" />{contact.address}</li>}
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-white/10 text-slate-500 text-sm">
        © {new Date().getFullYear()} Publish Inc. — Terbit Cepat, Tumbuh Hebat.
      </div>
    </footer>
  );
};
