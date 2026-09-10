import { Link } from "react-router-dom";

export const Logo = ({ dark = false, iconOnly = false, brandName, tagline }) => {
  const name = brandName || "Publish Inc.";
  const sub = tagline || "TERBIT CEPAT, TUMBUH HEBAT.";

  if (iconOnly) {
    return (
      <Link to="/" className="block" data-testid="brand-logo">
        <img src="/logo.webp" alt={name} className="h-10 w-10 rounded-full object-cover ring-1 ring-black/5" />
      </Link>
    );
  }

  return (
    <Link to="/" className="flex items-center gap-3 group" data-testid="brand-logo">
      <img src="/logo.webp" alt={name} className="h-9 w-9 rounded-full object-cover ring-1 ring-black/5" />
      <div className="leading-tight">
        <div className={`font-display font-extrabold text-base ${dark ? "text-navy-900" : "text-white"}`}>
          {name}
        </div>
        <div className={`text-[9px] tracking-[0.16em] font-semibold uppercase ${dark ? "text-navy-700" : "text-slate-400"}`}>
          {sub}
        </div>
      </div>
    </Link>
  );
};
