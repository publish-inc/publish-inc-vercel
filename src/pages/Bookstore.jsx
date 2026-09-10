import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { api, formatRupiah } from "../lib/api";
import { PublicNav } from "../components/PublicNav";
import { Footer } from "../components/Footer";

export default function Bookstore() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [active, setActive] = useState("Semua");
  const [q, setQ] = useState("");
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/content").then((r) => setContent(r.data)).catch(() => {});
    api.get("/books/categories").then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get("/books", { params: active !== "Semua" ? { category: active } : {} })
      .then((r) => setBooks(r.data))
      .finally(() => setLoading(false));
  }, [active]);

  const filtered = books.filter(
    (b) => b.title.toLowerCase().includes(q.toLowerCase()) || b.author.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="bg-navy-900 min-h-screen" data-testid="bookstore-page">
      <PublicNav />
      <header className="pt-32 pb-14 px-4 sm:px-6 lg:px-8 bg-navy-950 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <p className="uppercase tracking-[0.2em] text-sm text-brand-orange font-bold mb-4">TOKO BUKU</p>
          <h1 className="font-display font-extrabold tracking-tighter text-white text-4xl lg:text-6xl">Katalog Buku</h1>
          <p className="text-slate-400 mt-4 max-w-xl">Jelajahi koleksi buku terbitan Publish Inc. Temukan bacaan berikutnya.</p>
          <div className="relative mt-8 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              data-testid="book-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari judul atau penulis..."
              className="w-full bg-navy-800 border border-white/10 rounded-full pl-11 pr-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-orange"
            />
          </div>
        </div>
      </header>

      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap gap-3 mb-10">
            {["Semua", ...categories].map((c) => (
              <button
                key={c}
                onClick={() => setActive(c)}
                data-testid={`category-${c}`}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
                  active === c ? "bg-brand-orange text-white" : "bg-navy-800 text-slate-300 hover:bg-navy-700 border border-white/10"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin h-10 w-10 border-2 border-brand-orange border-t-transparent rounded-full" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-slate-400 text-center py-20">Tidak ada buku ditemukan.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8" data-testid="books-grid">
              {filtered.map((b) => (
                <Link key={b.id} to={`/toko/${b.slug || b.id}`} data-testid={`book-card-${b.id}`} className="group">
                  <div className="aspect-[3/4] rounded-xl overflow-hidden bg-navy-800 border border-white/10 relative">
                    <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    {b.featured && <span className="absolute top-3 left-3 bg-brand-orange text-white text-xs font-bold px-2.5 py-1 rounded-full">Terlaris</span>}
                  </div>
                  <div className="mt-3">
                    <span className="text-xs text-brand-blue font-semibold">{b.category}</span>
                    <h3 className="font-semibold text-white line-clamp-1 mt-0.5">{b.title}</h3>
                    <p className="text-slate-400 text-sm">{b.author}</p>
                    <p className="text-brand-orange font-bold mt-1">{formatRupiah(b.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer content={content} />
    </div>
  );
}
