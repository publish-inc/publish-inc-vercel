import axios from "axios";

const configuredUrl = import.meta.env.VITE_API_URL;
export const API = configuredUrl || "/api";

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("publishinc_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Terjadi kesalahan. Silakan coba lagi.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export const formatRupiah = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n || 0);

export const SERVICE_CODES = {
  terbit: "TBT",
  cetak: "CTK",
  lainnya: "OTR",
};

export function formatDocNumber(number, serviceType = "terbit", type = "OFF") {
  const code = SERVICE_CODES[serviceType?.toLowerCase()] || "TBT";
  if (!number) {
    const year = new Date().getFullYear();
    return `${type}/${code}/${year}/001`;
  }
  if (number.includes("TBT") || number.includes("CTK") || number.includes("OTR")) {
    return number;
  }
  if (number.startsWith("OFF/")) {
    return number.replace(/^OFF\//, `OFF/${code}/`);
  }
  if (number.startsWith("INV/")) {
    return number.replace(/^INV\//, `INV/${code}/`);
  }
  return `${type}/${code}/${number}`;
}

