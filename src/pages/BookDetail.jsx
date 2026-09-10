import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingCart, BookOpen, Calendar, Hash } from "lucide-react";
import { api, formatRupiah } from "../lib/api";
import { PublicNav } from "../components/PublicNav";
import { Footer } from "../components/Footer";

export default function BookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [content, setContent] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get("/content").then((r) => setContent(r.data)).catch(() => {});
    api.get(`/books/${id}`).then((r) => setBook(r.data)).catch(() => setNotFound(true));
  }, [id]);

  if (notFound)
    return (
      <div className="bg-navy-900 min-h-screen">
        <PublicNav />
        <div className="pt-40 text-center text-white">
          <p className="text-2xl font-display font-bold">Buku tidak ditemukan</p>
          <Link to="/toko" className="text-brand-orange mt-4 inline-block">← Kembali ke katalog</Link>
        </div>
      </div>
    );

  if (!book)
    return <div className="min-h-screen bg-navy-900 flex items-center justify-center"><div className="animate-spin h-10 w-10 border-2 border-brand-orange border-t-transparent rounded-full" /></div>;

  const wa = content?.whatsapp_number || "6281234567890";
  const waLink = `https://wa.me/${wa}?text=${encodeURIComponent(`Halo Publish Inc., saya ingin membeli buku "${book.title}" karya ${book.author}.`)}`;

  return (
    <div className="bg-navy-900 min-h-screen" data-testid="book-detail-page">
      <PublicNav />
      <div className="pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <button onClick={() => navigate("/toko")} data-testid="back-to-store" className="inline-flex items-center gap-2 text-slate-400 hover:text-brand-orange transition-colors mb-8">
            <ArrowLeft size={18} /> Kembali ke Katalog
          </button>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="max-w-sm mx-auto w-full">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
              </div>
            </div>
            <div>
              <span className="text-brand-blue font-semibold text-sm">{book.category}</span>
              <h1 className="font-display font-extrabold tracking-tight text-white text-3xl lg:text-5xl mt-2">{book.title}</h1>
              <p className="text-slate-400 mt-2 text-lg">oleh {book.author}</p>
              <p className="text-brand-orange font-display font-extrabold text-3xl mt-6">{formatRupiah(book.price)}</p>
              <p className="text-slate-300 mt-6 leading-relaxed">{book.description}</p>

              <div className="grid grid-cols-3 gap-4 mt-8">
                {book.pages > 0 && (
                  <div className="bg-navy-800 border border-white/10 rounded-xl p-4 text-center">
                    <BookOpen size={18} className="text-brand-orange mx-auto mb-1" />
                    <div className="text-white font-bold">{book.pages}</div>
                    <div className="text-slate-500 text-xs">Halaman</div>
                  </div>
                )}
                {book.year && (
                  <div className="bg-navy-800 border border-white/10 rounded-xl p-4 text-center">
                    <Calendar size={18} className="text-brand-orange mx-auto mb-1" />
                    <div className="text-white font-bold">{book.year}</div>
                    <div className="text-slate-500 text-xs">Terbit</div>
                  </div>
                )}
                {book.isbn && (
                  <div className="bg-navy-800 border border-white/10 rounded-xl p-4 text-center">
                    <Hash size={18} className="text-brand-orange mx-auto mb-1" />
                    <div className="text-white font-bold text-xs break-all">{book.isbn}</div>
                    <div className="text-slate-500 text-xs">ISBN</div>
                  </div>
                )}
              </div>

              {book.marketplace_url ? (
                <a href={book.marketplace_url} target="_blank" rel="noreferrer" data-testid="buy-marketplace" className="mt-8 inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white font-bold px-8 py-4 rounded-full transition-colors active:scale-95 w-full sm:w-auto justify-center">
                  <ShoppingCart size={20} /> Beli di Marketplace
                </a>
              ) : (
                <a href={waLink} target="_blank" rel="noreferrer" data-testid="buy-whatsapp" className="mt-8 inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white font-bold px-8 py-4 rounded-full transition-colors active:scale-95 w-full sm:w-auto justify-center">
                  <ShoppingCart size={20} /> Beli via WhatsApp
                </a>
              )}
              <p className="text-slate-500 text-sm mt-3">{book.marketplace_url ? "Pemesanan melalui marketplace resmi Publish Inc." : "Pemesanan diproses melalui WhatsApp. Pembayaran online akan hadir segera."}</p>
            </div>
          </div>
        </div>
      </div>
      <Footer content={content} />
    </div>
  );
}
