import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);
const TOKEN_KEY = "publishinc_access_token";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // null = checking, false = anon, object = authed
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    api.get("/auth/me")
      .then((res) => {
        if (alive) setUser(res.data);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        if (alive) setUser(false);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      if (data?.token) localStorage.setItem(TOKEN_KEY, data.token);
      setUser(data);
      return { ok: true, user: data };
    } catch (e) {
      return { ok: false, error: e.response?.data?.detail || e.message };
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem(TOKEN_KEY);
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
