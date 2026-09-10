import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Lock, Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/Logo";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/admin", { replace: true });
  }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.ok) {
      toast.success(`Selamat datang kembali!`);
      // Navigasi ditangani oleh useEffect saat state 'user' berubah
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center px-4 relative overflow-hidden" data-testid="login-page">
      <div className="absolute -top-40 -right-40 h-96 w-96 bg-brand-orange/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-96 w-96 bg-brand-blue/10 rounded-full blur-3xl" />
      <div className="relative w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-brand-orange mb-8 transition-colors">
          <ArrowLeft size={18} /> Kembali ke Website
        </Link>
        <div className="bg-navy-800/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="mb-8"><Logo /></div>
          <h1 className="font-display font-extrabold text-white text-2xl">Panel Internal</h1>
          <p className="text-slate-400 text-sm mt-1">Masuk untuk mengelola website & toko buku.</p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <div>
              <label className="text-sm text-slate-300 font-medium">Email</label>
              <div className="relative mt-2">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  data-testid="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-navy-900 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-orange"
                  placeholder="admin@publishinc.com"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-300 font-medium">Password</label>
              <div className="relative mt-2">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  data-testid="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-navy-900 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-orange"
                  placeholder="••••••••"
                />
              </div>
            </div>
            {error && <p data-testid="login-error" className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit"
              className="w-full bg-brand-orange hover:bg-brand-orange-dark disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-colors active:scale-95"
            >
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
