import { api } from "./api";

const COMPANY_BANK_ACCOUNTS_KEY = "publishinc_company_bank_accounts_v1";
export const COMPANY_PROFILE_KEY = "publishinc_company_profile_v1";

export const DEFAULT_COMPANY_PROFILE = {
  name: "PT Publish Inc. Indonesia",
  brand: "Publish Inc.",
  tagline: "Terbit Cepat, Tumbuh Hebat",
  address: "Jl. Sultan Alauddin No. 128, Makassar, Sulawesi Selatan",
  email: "cs@publishinc.id",
  phone: "081234567890",
  whatsapp: "6281234567890",
};

export const DEFAULT_COMPANY_BANKS = [
  { id: "bank-1", bank_name: "Bank BCA", account_number: "1234567890", account_holder: "PT Publish Inc. Indonesia" },
  { id: "bank-2", bank_name: "Bank Mandiri", account_number: "9876543210", account_holder: "PT Publish Inc. Indonesia" },
  { id: "bank-3", bank_name: "Bank BRI", account_number: "555444333222", account_holder: "PT Publish Inc. Indonesia" },
];

export function getCompanyProfile() {
  try {
    const raw = localStorage.getItem(COMPANY_PROFILE_KEY);
    if (raw) return { ...DEFAULT_COMPANY_PROFILE, ...JSON.parse(raw) };
  } catch {
    // fallback
  }
  return DEFAULT_COMPANY_PROFILE;
}

export function saveCompanyProfile(profile) {
  try {
    localStorage.setItem(COMPANY_PROFILE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error("Failed to save company profile:", err);
  }
}

export function getCompanyBankAccounts() {
  try {
    const raw = localStorage.getItem(COMPANY_BANK_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_COMPANY_BANKS;
  } catch {
    return DEFAULT_COMPANY_BANKS;
  }
}

export function saveCompanyBankAccounts(accounts) {
  try {
    localStorage.setItem(COMPANY_BANK_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.error("Failed to save company bank accounts:", err);
  }
}

export async function fetchCompanyProfile() {
  const localProfile = getCompanyProfile();
  try {
    const rawLocal = localStorage.getItem(COMPANY_PROFILE_KEY);
    if (rawLocal) {
      return localProfile;
    }
    const res = await api.get("/content");
    const data = res.data || {};
    return {
      name: data.brand?.name || localProfile.name,
      brand: data.brand?.name || localProfile.brand,
      tagline: data.brand?.tagline || localProfile.tagline,
      address: data.contact?.address || localProfile.address,
      email: data.contact?.email || localProfile.email,
      phone: data.contact?.phone || localProfile.phone,
      whatsapp: data.whatsapp_number || localProfile.whatsapp,
    };
  } catch {
    return localProfile;
  }
}

