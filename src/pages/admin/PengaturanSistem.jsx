import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { BookOpen, Calendar, MessageSquare, Pencil, Plus, Save, Trash2, ShieldAlert, X, Clock, CreditCard } from "lucide-react";
import { demoHolidays } from "../../lib/demoData";
import { api, formatApiErrorDetail, formatRupiah } from "../../lib/api";
import { DEFAULT_SPK_TEMPLATE, SPK_TEMPLATE_KEY } from "../../lib/spkTemplate";
import { LAYOUT_ACCESS_KEY } from "../../lib/workflow";
import { getCompanyBankAccounts, saveCompanyBankAccounts, getCompanyProfile, saveCompanyProfile } from "../../lib/companySettings";

const readTemplate = () => {
  try {
    return JSON.parse(localStorage.getItem(SPK_TEMPLATE_KEY)) || DEFAULT_SPK_TEMPLATE;
  } catch {
    return DEFAULT_SPK_TEMPLATE;
  }
};

export default function PengaturanSistem() {
  const [activeTab, setActiveTab] = useState("penerbit");
  const [penerbit, setPenerbit] = useState([]);
  const [newPenerbitName, setNewPenerbitName] = useState("");
  const [newPaketList, setNewPaketList] = useState([{ name: "", price: 0 }]);
  const [editingPenerbit, setEditingPenerbit] = useState(null);
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayNote, setHolidayNote] = useState("");
  const [layoutKey, setLayoutKey] = useState(() => localStorage.getItem(LAYOUT_ACCESS_KEY) || "");
  const [bankAccounts, setBankAccounts] = useState(() => getCompanyBankAccounts());
  const [newBank, setNewBank] = useState({ bank_name: "Bank BCA", account_number: "", account_holder: "PT Publish Inc. Indonesia" });
  const [companyProfile, setCompanyProfile] = useState(() => getCompanyProfile());

  const handleSaveCompanyProfile = () => {
    if (!companyProfile.address.trim()) return toast.error("Alamat perusahaan wajib diisi");
    saveCompanyProfile(companyProfile);
    toast.success("Profil & Alamat Perusahaan disimpan! Semua PDF Penawaran, Invoice, dan Slip Gaji kini diperbarui.");
  };
  
  const [settings, setSettings] = useState({
    wa_template_selesai: "Halo Kak, naskah Kakak sudah selesai dicetak!",
    holidays: [],
    spk_template: readTemplate(),
    delay_reasons: {},
  });

  const handleAddBank = () => {
    if (!newBank.account_number.trim()) return toast.error("Nomor rekening wajib diisi");
    const updated = [...bankAccounts, { id: `bank-${Date.now()}`, ...newBank }];
    setBankAccounts(updated);
    saveCompanyBankAccounts(updated);
    setNewBank({ bank_name: "Bank BCA", account_number: "", account_holder: "PT Publish Inc. Indonesia" });
    toast.success("Nomor rekening perusahaan ditambahkan");
  };

  const handleDeleteBank = (id) => {
    const updated = bankAccounts.filter((b) => b.id !== id);
    setBankAccounts(updated);
    saveCompanyBankAccounts(updated);
    toast.success("Nomor rekening dihapus");
  };

  const fetchPenerbit = async () => {
    try {
      const { data } = await api.get("/system/penerbit");
      setPenerbit(data || []);
    } catch {
      setPenerbit([]);
    }
  };

  const fetchSettings = async () => {
    const { data, error } = await supabase.from("spk_settings").select("*");
    if (!error && data) {
      const parsed = { ...settings };
      data.forEach(item => {
        parsed[item.key] = item.value;
      });
      if (!parsed.holidays?.length) parsed.holidays = demoHolidays;
      parsed.spk_template = parsed.spk_template || readTemplate();
      setSettings(parsed);
    } else {
      setSettings((current) => ({ ...current, holidays: demoHolidays, spk_template: readTemplate() }));
    }
  };

  useEffect(() => {
    fetchPenerbit();
    fetchSettings();
  }, []);

  const addNewPaketRow = () => setNewPaketList((prev) => [...prev, { name: "", price: 0 }]);
  const removeNewPaketRow = (idx) => setNewPaketList((prev) => prev.filter((_, i) => i !== idx));
  const updateNewPaketRow = (idx, field, value) =>
    setNewPaketList((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));

  const addEditPaketRow = () =>
    setEditingPenerbit((prev) => ({ ...prev, paket: [...(prev.paket || []), { name: "", price: 0 }] }));
  const removeEditPaketRow = (idx) =>
    setEditingPenerbit((prev) => ({ ...prev, paket: prev.paket.filter((_, i) => i !== idx) }));
  const updateEditPaketRow = (idx, field, value) =>
    setEditingPenerbit((prev) => ({
      ...prev,
      paket: prev.paket.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    }));

  const addPenerbit = async () => {
    if (!newPenerbitName.trim()) return toast.error("Nama penerbit harus diisi");
    const validPaket = newPaketList
      .filter((p) => p.name.trim())
      .map((p) => ({ name: p.name.trim(), price: Number(p.price) || 0 }));

    try {
      await api.post("/system/penerbit", { nama: newPenerbitName.trim(), paket: validPaket });
      for (const pkt of validPaket) {
        try {
          await api.post("/cs/packages", {
            publisher: newPenerbitName.trim(),
            name: pkt.name,
            price: pkt.price,
          });
        } catch {
          // ignore duplicate
        }
      }
      toast.success("Penerbit & paket ditambahkan");
      setNewPenerbitName("");
      setNewPaketList([{ name: "", price: 0 }]);
      fetchPenerbit();
    } catch (error) {
      toast.error(formatApiErrorDetail(error.response?.data?.detail));
    }
  };

  const deletePenerbit = async (id) => {
    try {
      await api.delete(`/system/penerbit/${id}`);
      toast.success("Penerbit dihapus");
      fetchPenerbit();
    } catch (error) {
      toast.error(formatApiErrorDetail(error.response?.data?.detail));
    }
  };

  const startEditPenerbit = (row) => {
    const rawPaketList = Array.isArray(row.paket)
      ? row.paket
      : typeof row.paket === "string"
      ? row.paket.split(",")
      : [];
    const formattedPaket = rawPaketList.map((p) => {
      if (typeof p === "object" && p !== null) {
        return { name: p.name || "", price: Number(p.price) || 0 };
      }
      const str = String(p || "").trim();
      if (str.includes(":")) {
        const [n, pr] = str.split(":");
        return { name: n.trim(), price: Number(pr.trim()) || 0 };
      }
      return { name: str, price: 0 };
    });
    setEditingPenerbit({
      id: row.id,
      nama: row.nama || "",
      paket: formattedPaket.length ? formattedPaket : [{ name: "", price: 0 }],
    });
  };

  const saveEditPenerbit = async () => {
    if (!editingPenerbit?.nama?.trim()) return toast.error("Nama penerbit harus diisi");
    const validPaket = editingPenerbit.paket
      .filter((p) => p.name.trim())
      .map((p) => ({ name: p.name.trim(), price: Number(p.price) || 0 }));

    try {
      await api.put(`/system/penerbit/${editingPenerbit.id}`, { nama: editingPenerbit.nama.trim(), paket: validPaket });
      for (const pkt of validPaket) {
        try {
          await api.post("/cs/packages", {
            publisher: editingPenerbit.nama.trim(),
            name: pkt.name,
            price: pkt.price,
          });
        } catch {
          // ignore
        }
      }
      toast.success("Penerbit & paket diperbarui");
      setEditingPenerbit(null);
      fetchPenerbit();
    } catch (error) {
      toast.error(formatApiErrorDetail(error.response?.data?.detail));
    }
  };

  const saveSettings = async (key, value) => {
    const { error } = await supabase.from("spk_settings").upsert({ key, value });
    if (error) return toast.error(error.message);
    toast.success("Pengaturan disimpan");
  };

  const saveHolidays = async (nextHolidays) => {
    setSettings({ ...settings, holidays: nextHolidays });
    await saveSettings("holidays", nextHolidays);
  };

  const addHoliday = async () => {
    if (!holidayDate) return toast.error("Tanggal merah harus diisi");
    const nextHolidays = [
      ...settings.holidays.filter((item) => (item.date || item) !== holidayDate),
      { date: holidayDate, note: holidayNote.trim() || "Tanggal merah" },
    ].sort((a, b) => (a.date || a).localeCompare(b.date || b));
    setHolidayDate("");
    setHolidayNote("");
    await saveHolidays(nextHolidays);
  };

  const deleteHoliday = async (date) => {
    const nextHolidays = settings.holidays.filter((item) => (item.date || item) !== date);
    await saveHolidays(nextHolidays);
  };

  const [delayStage, setDelayStage] = useState("administrasi");
  const [delayReason, setDelayReason] = useState("");
  
  const saveDelayReasons = async (nextReasons) => {
    setSettings({ ...settings, delay_reasons: nextReasons });
    await saveSettings("delay_reasons", nextReasons);
  };
  
  const addDelayReason = async () => {
    if (!delayReason.trim()) return toast.error("Alasan harus diisi");
    const stageReasons = settings.delay_reasons?.[delayStage] || [];
    const nextReasons = {
      ...(settings.delay_reasons || {}),
      [delayStage]: [...stageReasons.filter(r => r.toLowerCase() !== delayReason.toLowerCase().trim()), delayReason.trim()]
    };
    setDelayReason("");
    await saveDelayReasons(nextReasons);
  };
  
  const deleteDelayReason = async (stage, reason) => {
    const stageReasons = settings.delay_reasons?.[stage] || [];
    const nextReasons = {
      ...(settings.delay_reasons || {}),
      [stage]: stageReasons.filter(r => r !== reason)
    };
    await saveDelayReasons(nextReasons);
  };

  const setSpkTemplate = (updater) => {
    setSettings((current) => {
      const nextTemplate = typeof updater === "function" ? updater(current.spk_template || DEFAULT_SPK_TEMPLATE) : updater;
      return { ...current, spk_template: nextTemplate };
    });
  };

  const updateFirstParty = (field, value) => {
    setSpkTemplate((template) => ({ ...template, pihak_pertama: { ...(template.pihak_pertama || {}), [field]: value } }));
  };

  const updateClause = (index, field, value) => {
    setSpkTemplate((template) => ({
      ...template,
      clauses: (template.clauses || []).map((clause, i) => (i === index ? { ...clause, [field]: value } : clause)),
    }));
  };

  const addClause = () => {
    setSpkTemplate((template) => ({
      ...template,
      clauses: [...(template.clauses || []), { title: "", body: "" }],
    }));
  };

  const deleteClause = (index) => {
    setSpkTemplate((template) => ({
      ...template,
      clauses: (template.clauses || []).filter((_, i) => i !== index),
    }));
  };

  const saveSpkTemplate = async () => {
    const template = settings.spk_template || DEFAULT_SPK_TEMPLATE;
    localStorage.setItem(SPK_TEMPLATE_KEY, JSON.stringify(template));
    await saveSettings("spk_template", template);
  };

  const saveLayoutKey = () => {
    localStorage.setItem(LAYOUT_ACCESS_KEY, layoutKey.trim());
    toast.success("Kunci akses layout disimpan.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-white">Pengaturan Sistem</h1>
        <p className="text-slate-400 mt-1">Kelola master penerbit, tanggal merah, dan template sistem.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {[
          { id: "penerbit", label: "Master Penerbit", icon: <BookOpen size={16} /> },
          { id: "rekening-bank", label: "Rekening & Profil Perusahaan", icon: <CreditCard size={16} /> },
          { id: "tanggal-merah", label: "Tanggal Merah", icon: <Calendar size={16} /> },
          { id: "template", label: "Template SPK", icon: <MessageSquare size={16} /> },
          { id: "delay-reasons", label: "Alasan Kemunduran", icon: <Clock size={16} /> },
          { id: "akses-layout", label: "Kunci Layout", icon: <ShieldAlert size={16} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === tab.id ? "bg-brand-orange text-white" : "bg-navy-800 text-slate-400 hover:bg-navy-700"}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-navy-800 rounded-3xl p-6 border border-white/10">
        {/* TAB REKENING PERUSAHAAN */}
        {activeTab === "rekening-bank" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Kelola Nomor Rekening Bank Perusahaan</h2>
              <p className="text-slate-400 text-xs mt-1">
                Nomor rekening ini akan tampil secara resmi pada setiap Invoice pembayaran customer.
              </p>
            </div>

            <div className="bg-navy-900 border border-white/10 rounded-2xl p-5 space-y-4">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Plus size={16} className="text-brand-orange" /> Tambah Rekening Bank
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nama Bank *</label>
                  <input
                    type="text"
                    placeholder="Contoh: Bank BCA / Mandiri / BRI"
                    value={newBank.bank_name}
                    onChange={(e) => setNewBank({ ...newBank, bank_name: e.target.value })}
                    className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nomor Rekening *</label>
                  <input
                    type="text"
                    placeholder="Contoh: 1234567890"
                    value={newBank.account_number}
                    onChange={(e) => setNewBank({ ...newBank, account_number: e.target.value })}
                    className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2 font-mono font-bold text-white text-sm outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Atas Nama (A/N) *</label>
                  <input
                    type="text"
                    placeholder="Contoh: PT Publish Inc. Indonesia"
                    value={newBank.account_holder}
                    onChange={(e) => setNewBank({ ...newBank, account_holder: e.target.value })}
                    className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-brand-orange"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddBank}
                className="bg-brand-orange hover:bg-brand-orange-dark text-white rounded-xl px-6 py-2.5 font-bold text-xs shadow-md transition-colors flex items-center gap-1.5"
              >
                <Plus size={16} /> Simpan Rekening Perusahaan
              </button>
            </div>

            <div className="border border-white/10 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-navy-900 text-xs uppercase tracking-wider text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="px-5 py-3">Nama Bank</th>
                    <th className="px-5 py-3">Nomor Rekening</th>
                    <th className="px-5 py-3">Atas Nama (A/N)</th>
                    <th className="px-5 py-3 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {bankAccounts.map((b) => (
                    <tr key={b.id} className="hover:bg-white/5">
                      <td className="px-5 py-4 font-bold text-white">{b.bank_name}</td>
                      <td className="px-5 py-4 font-mono font-bold text-brand-orange text-base">{b.account_number}</td>
                      <td className="px-5 py-4 text-slate-200">{b.account_holder}</td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => handleDeleteBank(b.id)}
                          className="text-rose-400 hover:text-rose-300 p-1"
                          title="Hapus Rekening"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {bankAccounts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">
                        Belum ada nomor rekening perusahaan tersimpan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Profil & Alamat Perusahaan */}
            <div className="bg-navy-900 border border-white/10 rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <Save size={18} className="text-brand-orange" /> Profil &amp; Alamat Perusahaan (Kop PDF)
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Alamat dan identitas perusahaan di bawah ini akan otomatis tercetak di header Dokumen Surat Penawaran, Invoice, dan Slip Gaji A4.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nama PT / Legal Perusahaan</label>
                  <input
                    type="text"
                    value={companyProfile.name}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, name: e.target.value })}
                    className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nama Brand / Merk</label>
                  <input
                    type="text"
                    value={companyProfile.brand}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, brand: e.target.value })}
                    className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tagline Perusahaan</label>
                  <input
                    type="text"
                    value={companyProfile.tagline}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, tagline: e.target.value })}
                    className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email Resmi CS</label>
                  <input
                    type="email"
                    value={companyProfile.email}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, email: e.target.value })}
                    className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">No. HP / WhatsApp CS</label>
                  <input
                    type="text"
                    value={companyProfile.phone}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, phone: e.target.value, whatsapp: e.target.value })}
                    className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Alamat Lengkap Perusahaan (Kantor) *</label>
                  <input
                    type="text"
                    value={companyProfile.address}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, address: e.target.value })}
                    placeholder="Masukkan Alamat Terbaru Perusahaan..."
                    className="w-full bg-navy-950 border border-brand-orange/40 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-brand-orange font-medium"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveCompanyProfile}
                  className="bg-brand-orange hover:bg-brand-orange-dark text-white rounded-xl px-6 py-2.5 font-bold text-xs shadow-md transition-colors flex items-center gap-1.5"
                >
                  <Save size={16} /> Simpan Profil &amp; Alamat Perusahaan
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* TAB PENERBIT */}
        {activeTab === "penerbit" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Kelola Daftar Penerbit &amp; Paket Harga</h2>
              <p className="text-slate-400 text-xs mt-1">Kelola nama penerbit beserta rincian nama paket dan nominal harganya masing-masing.</p>
            </div>

            {/* Form Tambah Penerbit & Paket Baru */}
            <div className="bg-navy-900 border border-white/10 rounded-2xl p-5 space-y-4">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Plus size={16} className="text-brand-orange" /> Tambah Penerbit Baru
              </h3>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nama Penerbit *</label>
                <input
                  type="text"
                  placeholder="Contoh: Publish Inc."
                  value={newPenerbitName}
                  onChange={(e) => setNewPenerbitName(e.target.value)}
                  className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-brand-orange"
                />
              </div>

              <div className="space-y-2 pt-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-bold text-slate-400 uppercase px-1">
                  <div className="col-span-6">Nama Paket</div>
                  <div className="col-span-5">Harga Paket (Rp)</div>
                  <div className="col-span-1 text-center">Aksi</div>
                </div>
                {newPaketList.map((pkt, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6">
                      <input
                        type="text"
                        placeholder="Contoh: Paket A"
                        value={pkt.name}
                        onChange={(e) => updateNewPaketRow(idx, "name", e.target.value)}
                        className="w-full bg-navy-950 border border-white/10 rounded-xl px-3.5 py-2 text-white text-sm outline-none focus:border-brand-orange"
                      />
                    </div>
                    <div className="col-span-5">
                      <input
                        type="number"
                        placeholder="Contoh: 2500000"
                        value={pkt.price || ""}
                        onChange={(e) => updateNewPaketRow(idx, "price", e.target.value)}
                        className="w-full bg-navy-950 border border-white/10 rounded-xl px-3.5 py-2 text-brand-orange font-mono font-bold text-sm outline-none focus:border-brand-orange"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {newPaketList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeNewPaketRow(idx)}
                          className="text-rose-400 hover:bg-rose-500/10 p-2 rounded-lg"
                          title="Hapus Baris"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3">
                  <button
                    type="button"
                    onClick={addNewPaketRow}
                    className="text-brand-orange hover:underline text-xs font-bold inline-flex items-center gap-1"
                  >
                    <Plus size={14} /> Tambah Baris Paket
                  </button>
                  <button
                    type="button"
                    onClick={addPenerbit}
                    className="bg-brand-blue hover:bg-blue-600 text-white rounded-xl px-6 py-2.5 font-bold text-sm shadow-md transition-colors"
                  >
                    Simpan Master Penerbit
                  </button>
                </div>
              </div>
            </div>

            {/* Tabel Master Penerbit & Paket */}
            <div className="mt-6 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left">
                <thead className="bg-navy-900 text-slate-400 text-xs uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="px-5 py-3">Nama Penerbit</th>
                    <th className="px-5 py-3">Nama Paket</th>
                    <th className="px-5 py-3">Harga Paket (Rp)</th>
                    <th className="px-5 py-3 w-28 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(Array.isArray(penerbit) ? penerbit : []).map((p) => {
                    if (!p || typeof p !== "object") return null;
                    const editing = editingPenerbit?.id === p.id;
                    const rawPaket = Array.isArray(p.paket)
                      ? p.paket
                      : typeof p.paket === "string"
                      ? p.paket.split(",")
                      : [];
                    const parsedPaketList = rawPaket.map((pkt) => {
                      if (typeof pkt === "object" && pkt !== null) {
                        return { name: pkt.name || "", price: Number(pkt.price) || 0 };
                      }
                      const str = String(pkt || "").trim();
                      if (str.includes(":")) {
                        const [n, pr] = str.split(":");
                        return { name: n.trim(), price: Number(pr.trim()) || 0 };
                      }
                      return { name: str, price: 0 };
                    });

                    if (editing) {
                      return (
                        <tr key={p.id} className="bg-navy-900/80">
                          <td className="px-5 py-4 align-top">
                            <input
                              value={editingPenerbit.nama}
                              onChange={(e) => setEditingPenerbit({ ...editingPenerbit, nama: e.target.value })}
                              className="w-full rounded-xl border border-white/10 bg-navy-950 px-3.5 py-2 text-white text-sm"
                            />
                          </td>
                          <td colSpan="2" className="px-5 py-4">
                            <div className="space-y-2">
                              <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase">
                                <div className="col-span-6">Nama Paket</div>
                                <div className="col-span-5">Harga (Rp)</div>
                              </div>
                              {(Array.isArray(editingPenerbit?.paket) ? editingPenerbit.paket : []).map((pkt, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                  <input
                                    placeholder="Nama Paket"
                                    value={pkt.name}
                                    onChange={(e) => updateEditPaketRow(idx, "name", e.target.value)}
                                    className="col-span-6 rounded-lg border border-white/10 bg-navy-950 px-3 py-1.5 text-white text-xs"
                                  />
                                  <input
                                    type="number"
                                    placeholder="Harga (Rp)"
                                    value={pkt.price || ""}
                                    onChange={(e) => updateEditPaketRow(idx, "price", e.target.value)}
                                    className="col-span-5 rounded-lg border border-white/10 bg-navy-950 px-3 py-1.5 text-brand-orange font-mono font-bold text-xs"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeEditPaketRow(idx)}
                                    className="col-span-1 text-rose-400 p-1 flex justify-center hover:bg-rose-500/10 rounded"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={addEditPaketRow}
                                className="text-xs text-brand-orange font-bold hover:underline inline-flex items-center gap-1 pt-1"
                              >
                                <Plus size={12} /> Tambah Baris Paket
                              </button>
                            </div>
                          </td>
                          <td className="px-5 py-4 align-top text-center">
                            <div className="flex justify-center gap-1">
                              <button onClick={saveEditPenerbit} className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-lg" title="Simpan"><Save size={16} /></button>
                              <button onClick={() => setEditingPenerbit(null)} className="p-2 text-slate-400 hover:bg-white/10 rounded-lg" title="Batal"><X size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={p.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-5 py-4 text-white font-bold align-top">
                          {p.nama}
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="space-y-1.5">
                            {parsedPaketList.map((pkt, i) => (
                              <div key={i} className="text-sm font-semibold text-slate-200">
                                {pkt.name || "-"}
                              </div>
                            ))}
                            {!parsedPaketList.length && <span className="text-xs text-slate-500">-</span>}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="space-y-1.5">
                            {parsedPaketList.map((pkt, i) => (
                              <div key={i} className="text-sm font-mono font-bold text-brand-orange">
                                {pkt.price > 0 ? formatRupiah(pkt.price) : "Rp 0"}
                              </div>
                            ))}
                            {!parsedPaketList.length && <span className="text-xs text-slate-500">-</span>}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top text-center">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => startEditPenerbit(p)} className="p-2 text-brand-blue hover:bg-blue-500/20 rounded-lg" title="Edit"><Pencil size={16} /></button>
                            <button onClick={() => deletePenerbit(p.id)} className="p-2 text-rose-400 hover:bg-rose-500/20 rounded-lg" title="Hapus"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!penerbit.length && (
                    <tr>
                      <td colSpan="4" className="px-5 py-8 text-center text-slate-500">
                        Belum ada data penerbit dan paket.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB TANGGAL MERAH */}
        {activeTab === "tanggal-merah" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Tanggal Merah</h2>
              <p className="text-sm text-slate-400 mt-1">Tanggal ini akan dilewati dalam perhitungan H+ hari kerja progres naskah.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-white/10 bg-navy-900 p-4 md:grid-cols-[180px_1fr_auto]">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Tanggal</label>
                <input type="date" value={holidayDate} onChange={e => setHolidayDate(e.target.value)} className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-3 text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Keterangan</label>
                <input type="text" value={holidayNote} onChange={e => setHolidayNote(e.target.value)} placeholder="Contoh: Idul Fitri" className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-3 text-white" />
              </div>
              <div className="flex items-end">
                <button onClick={addHoliday} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-5 py-3 font-bold text-white hover:bg-brand-orange-dark">
                  <Plus size={18} /> Tambah
                </button>
              </div>
            </div>

            <div className="border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-navy-900 text-slate-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Keterangan</th>
                    <th className="px-4 py-3 w-24 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(Array.isArray(settings?.holidays) ? settings.holidays : []).map((item) => {
                    const date = item.date || item;
                    return (
                      <tr key={date} className="hover:bg-white/5">
                        <td className="px-4 py-3 text-white font-bold">{new Date(date).toLocaleDateString("id-ID")}</td>
                        <td className="px-4 py-3 text-slate-300">{item.note || "Tanggal merah"}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => deleteHoliday(date)} className="p-2 text-rose-400 hover:bg-rose-500/20 rounded-lg"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    );
                  })}
                  {!(settings?.holidays?.length) && <tr><td colSpan="3" className="px-4 py-8 text-center text-slate-500">Belum ada tanggal merah.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB TEMPLATE */}
        {activeTab === "template" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Template SPK PDF</h2>
              <p className="mt-1 text-sm text-slate-400">Konten ini tampil di form persetujuan penulis dan menjadi dasar PDF SPK yang digenerate admin.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Input label="Format Nomor SPK" value={settings.spk_template?.nomor_format || ""} onChange={(value) => setSpkTemplate((template) => ({ ...template, nomor_format: value }))} />
              <Input label="Nama Pihak Pertama" value={settings.spk_template?.pihak_pertama?.nama || ""} onChange={(value) => updateFirstParty("nama", value)} />
              <Input label="Jabatan Pihak Pertama" value={settings.spk_template?.pihak_pertama?.jabatan || ""} onChange={(value) => updateFirstParty("jabatan", value)} />
              <Input label="Bertindak Atas Nama" value={settings.spk_template?.pihak_pertama?.bertindak_atas_nama || ""} onChange={(value) => updateFirstParty("bertindak_atas_nama", value)} />
            </div>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Pembuka Perjanjian</span>
              <textarea value={settings.spk_template?.pembuka || ""} onChange={(e) => setSpkTemplate((template) => ({ ...template, pembuka: e.target.value }))} className="h-28 w-full resize-none rounded-xl border border-white/10 bg-navy-950 p-4 text-white outline-none focus:border-brand-orange" />
            </label>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-white">Pasal Perjanjian</h3>
                <button onClick={addClause} className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-sm font-bold text-white hover:bg-blue-600"><Plus size={16} /> Tambah Pasal</button>
              </div>
              {(settings.spk_template?.clauses || []).map((clause, index) => (
                <div key={index} className="rounded-2xl border border-white/10 bg-navy-900 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="font-black text-brand-orange">Pasal {index + 1}</div>
                    {index > 0 && <button onClick={() => deleteClause(index)} className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/10"><Trash2 size={16} /></button>}
                  </div>
                  <div className="space-y-3">
                    <Input label="Judul Pasal" value={clause.title} onChange={(value) => updateClause(index, "title", value)} />
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Isi Pasal</span>
                      <textarea value={clause.body} onChange={(e) => updateClause(index, "body", e.target.value)} className="h-36 w-full resize-none rounded-xl border border-white/10 bg-navy-950 p-4 text-white outline-none focus:border-brand-orange" />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={saveSpkTemplate} className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-5 py-3 font-bold text-white hover:bg-brand-orange-dark"><Save size={18} /> Simpan Template SPK</button>
          </div>
        )}

        {/* TAB DELAY REASONS */}
        {activeTab === "delay-reasons" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white mb-4">Pengaturan Alasan Kemunduran</h2>
            <div className="bg-navy-900 border border-white/10 rounded-2xl p-5 mb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <select value={delayStage} onChange={(e) => setDelayStage(e.target.value)} className="w-full sm:w-1/3 bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand-orange">
                  <option value="administrasi">Administrasi</option>
                  <option value="proofreading">Proofreading</option>
                  <option value="layout">Layout</option>
                  <option value="produksi">Produksi</option>
                  <option value="distribusi">Distribusi</option>
                  <option value="selesai">Selesai</option>
                </select>
                <input value={delayReason} onChange={(e) => setDelayReason(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addDelayReason()} placeholder="Tulis alasan kemunduran baru..." className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 outline-none focus:border-brand-orange" />
                <button onClick={addDelayReason} className="bg-brand-orange hover:bg-brand-orange-dark text-white font-bold px-6 py-2.5 rounded-xl whitespace-nowrap flex items-center gap-2"><Plus size={18}/> Tambah</button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[
                { k: "administrasi", l: "Administrasi" },
                { k: "proofreading", l: "Proofreading" },
                { k: "layout", l: "Layout" },
                { k: "produksi", l: "Produksi" },
                { k: "distribusi", l: "Distribusi" },
                { k: "selesai", l: "Selesai" },
              ].map((st) => (
                <div key={st.k} className="bg-navy-800 border border-white/10 rounded-2xl p-5">
                  <h3 className="font-bold text-brand-orange uppercase text-sm mb-3 tracking-wider border-b border-white/10 pb-2">{st.l}</h3>
                  <div className="space-y-2">
                    {(settings.delay_reasons?.[st.k] || []).map((reason) => (
                      <div key={reason} className="flex items-start justify-between bg-navy-900 rounded-lg p-3 text-sm text-slate-300 gap-3 border border-white/5">
                        <span className="leading-5">{reason}</span>
                        <button onClick={() => deleteDelayReason(st.k, reason)} className="text-slate-500 hover:text-rose-400 mt-0.5"><Trash2 size={14} /></button>
                      </div>
                    ))}
                    {!(settings.delay_reasons?.[st.k] || []).length && <div className="text-slate-500 text-sm text-center py-4">Belum ada alasan.</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "akses-layout" && (
          <div className="max-w-xl space-y-4">
            <h2 className="text-xl font-bold text-white">Kunci Akses Penugasan Layout</h2>
            <p className="text-sm text-slate-400">Kunci ini dipakai PIC Layouter untuk membuka penugasan layout lebih awal ketika editor belum complete.</p>
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Password Otoritas Master</span>
              <input type="password" value={layoutKey} onChange={(event) => setLayoutKey(event.target.value)} className="w-full rounded-xl border border-white/10 bg-navy-950 px-4 py-3 text-white outline-none focus:border-brand-orange" placeholder="Isi kunci akses" />
            </label>
            <button onClick={saveLayoutKey} className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-5 py-3 font-bold text-white hover:bg-brand-orange-dark">
              <Save size={18} /> Simpan Kunci
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-navy-950 px-4 py-3 text-white outline-none focus:border-brand-orange"
      />
    </label>
  );
}
