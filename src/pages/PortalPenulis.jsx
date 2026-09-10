import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Lock, FileText, CheckCircle2, AlertTriangle, Loader2, Plus, Trash2, UserPlus, ArrowRight, BookOpen } from "lucide-react";
import { Logo } from "../components/Logo";
import { DEFAULT_SPK_TEMPLATE } from "../lib/spkTemplate";
import { activeItems, saveWorkflowItems } from "../lib/workflow";

export default function PortalPenulis() {
  const [step, setStep] = useState("token"); // 'token' | 'data_confirmation' | 'spk_approval'
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [naskah, setNaskah] = useState(null);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [spkTemplate, setSpkTemplate] = useState(DEFAULT_SPK_TEMPLATE);

  // Author & Editor Correction Form State
  const [judulInput, setJudulInput] = useState("");
  const [authors, setAuthors] = useState([""]);
  const [editors, setEditors] = useState([""]);
  const [dataConfirmed, setDataConfirmed] = useState(false);

  useEffect(() => {
    supabase
      .from("spk_settings")
      .select("value")
      .eq("key", "spk_template")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setSpkTemplate(data.value);
      });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (token.length !== 6) {
      return setError("Token harus 6 digit angka.");
    }
    
    setLoading(true);
    setError("");
    
    try {
      let foundData = null;

      // 1. Cek di local workflow items (demo / offline mode)
      const localItem = activeItems().find((item) => String(item.token) === String(token));
      if (localItem) {
        foundData = {
          id: localItem.id,
          judul: localItem.manuscript?.title || "Naskah Buku",
          penulis: localItem.customer?.name || localItem.manuscript?.author || "Penulis",
          editor: localItem.manuscript?.editor || "",
          spk_url: localItem.spk_url || "#",
          spk_approved_at: localItem.spk_approved_at || null,
          spk_deals: {
            package_name: localItem.manuscript?.package_name || "Paket A",
            penerbit: localItem.manuscript?.publisher || "Publish Inc.",
          },
        };
      } else {
        // 2. Cek di Supabase database
        const { data, error: fetchErr } = await supabase
          .from("spk_naskah")
          .select("id, judul, penulis, editor, spk_url, spk_approved_at, spk_deals(package_name, penerbit)")
          .eq("spk_token", token)
          .single();
          
        if (fetchErr || !data) {
          throw new Error("Token tidak valid atau SPK belum diterbitkan.");
        }
        foundData = data;
      }
      
      setNaskah(foundData);
      setJudulInput(foundData.judul || "");
      
      // Parse authors list (separated by semicolon)
      const authorList = (foundData.penulis || "").split(";").map((s) => s.trim()).filter(Boolean);
      setAuthors(authorList.length ? authorList : [""]);

      // Parse editors list (separated by semicolon)
      const editorList = (foundData.editor || "").split(";").map((s) => s.trim()).filter(Boolean);
      setEditors(editorList.length ? editorList : [""]);

      if (foundData.spk_approved_at) {
        setApproved(true);
        setStep("spk_approval");
      } else {
        setStep("data_confirmation");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Author Management (Max 100)
  const addAuthor = () => {
    if (authors.length >= 100) return;
    setAuthors([...authors, ""]);
  };
  const updateAuthor = (index, value) => {
    setAuthors(authors.map((a, i) => (i === index ? value : a)));
  };
  const removeAuthor = (index) => {
    if (authors.length <= 1) return;
    setAuthors(authors.filter((_, i) => i !== index));
  };

  // Editor Management (Max 100)
  const addEditor = () => {
    if (editors.length >= 100) return;
    setEditors([...editors, ""]);
  };
  const updateEditor = (index, value) => {
    setEditors(editors.map((e, i) => (i === index ? value : e)));
  };
  const removeEditor = (index) => {
    if (editors.length <= 1) return;
    setEditors(editors.filter((_, i) => i !== index));
  };

  // Submit Data Confirmation Step
  const handleSaveDataConfirmation = (e) => {
    e.preventDefault();
    if (!judulInput.trim()) return alert("Judul naskah wajib diisi.");

    const validAuthors = authors.map((a) => a.trim()).filter(Boolean);
    if (!validAuthors.length) return alert("Minimal 1 nama penulis wajib diisi.");

    const validEditors = editors.map((e) => e.trim()).filter(Boolean);

    if (!dataConfirmed) {
      return alert("Anda harus menyetujui pernyataan konfirmasi data terlebih dahulu.");
    }

    const finalPenulis = validAuthors.join("; ");
    const finalEditor = validEditors.join("; ");

    // Update local state and workflow item
    const updatedNaskah = {
      ...naskah,
      judul: judulInput.trim(),
      penulis: finalPenulis,
      editor: finalEditor,
    };
    setNaskah(updatedNaskah);

    if (naskah.id?.startsWith("wf-")) {
      const items = activeItems();
      const updated = items.map((item) => {
        if (item.id === naskah.id) {
          return {
            ...item,
            manuscript: {
              ...item.manuscript,
              title: judulInput.trim(),
              author: finalPenulis,
              editor: finalEditor,
            },
          };
        }
        return item;
      });
      saveWorkflowItems(updated);
    } else {
      supabase
        .from("spk_naskah")
        .update({ judul: judulInput.trim(), penulis: finalPenulis, editor: finalEditor })
        .eq("id", naskah.id)
        .then();
    }

    setStep("spk_approval");
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      if (naskah.id?.startsWith("wf-")) {
        const items = activeItems();
        const updated = items.map((item) =>
          item.id === naskah.id ? { ...item, spk_approved_at: new Date().toISOString() } : item
        );
        saveWorkflowItems(updated);
        setApproved(true);
      } else {
        const { error } = await supabase
          .from("spk_naskah")
          .update({ spk_approved_at: new Date().toISOString() })
          .eq("id", naskah.id);
          
        if (error) throw error;
        setApproved(true);
      }
    } catch (err) {
      alert("Gagal menyetujui SPK: " + err.message);
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Header Hero */}
        <div className="bg-navy-950 text-white p-8 border-b-4 border-brand-orange flex items-center gap-6">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center p-2 shadow-lg shrink-0">
            <Logo iconOnly />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Portal Penulis &amp; SPK</h1>
            <p className="text-slate-400 font-medium text-sm mt-1">Publish Inc. - Verifikasi Data &amp; Approval SPK</p>
          </div>
        </div>

        <div className="p-8">
          {/* STEP 1: MASUKKAN TOKEN */}
          {step === "token" && (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2 text-center max-w-md mx-auto">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <Lock size={32} />
                </div>
                <h2 className="text-2xl font-black text-slate-800">Masukkan Token</h2>
                <p className="text-slate-500 text-sm">Silakan masukkan 6 digit PIN / Token yang telah diberikan oleh tim Customer Service kami untuk mengakses Surat Perjanjian Anda.</p>
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl flex items-center gap-3 text-sm font-medium justify-center">
                  <AlertTriangle size={18} /> {error}
                </div>
              )}

              <div className="max-w-xs mx-auto">
                <input 
                  type="text" 
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;" 
                  className="w-full text-center text-4xl tracking-[1em] bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-4 font-black text-slate-800 outline-none focus:border-brand-orange focus:bg-white transition-colors"
                  required
                />
              </div>

              <div className="max-w-xs mx-auto">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-brand-orange hover:bg-orange-600 text-white font-black py-4 rounded-xl shadow-lg shadow-orange-500/20 transition-all flex justify-center items-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : "Akses Dokumen"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: FORM VERIFIKASI & KOREKSI DATA NASKAH (SEBELUM SPK APPROVAL) */}
          {step === "data_confirmation" && (
            <form onSubmit={handleSaveDataConfirmation} className="space-y-6">
              <div className="text-center max-w-lg mx-auto space-y-2">
                <div className="w-12 h-12 bg-orange-100 text-brand-orange rounded-full flex items-center justify-center mx-auto mb-2 font-bold">
                  1/2
                </div>
                <h2 className="text-2xl font-black text-slate-800">Verifikasi &amp; Koreksi Data Naskah</h2>
                <p className="text-slate-500 text-xs">
                  Silakan periksa dan benarkan Judul Naskah, Penulis, serta Editor sebelum melanjutkan ke Surat Perjanjian Kerja (SPK). Data ini akan dipakai untuk pengajuan ISBN &amp; Sertifikat.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-5">
                {/* Judul Buku */}
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-1.5">
                    Judul Naskah Buku *
                  </label>
                  <input
                    type="text"
                    value={judulInput}
                    onChange={(e) => setJudulInput(e.target.value)}
                    placeholder="Masukkan judul naskah yang benar..."
                    className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold text-sm outline-none focus:border-brand-orange"
                    required
                  />
                </div>

                {/* List Penulis (Max 100) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase text-slate-500 tracking-wider">
                      Daftar Nama Penulis * <span className="text-slate-400 font-normal">({authors.length}/100)</span>
                    </label>
                    <button
                      type="button"
                      onClick={addAuthor}
                      disabled={authors.length >= 100}
                      className="text-xs text-brand-orange font-bold hover:underline inline-flex items-center gap-1 disabled:opacity-40"
                    >
                      <Plus size={14} /> Tambah Penulis
                    </button>
                  </div>
                  {authors.map((authorName, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <span className="text-xs font-mono font-bold text-slate-400 w-6 text-right">{index + 1}.</span>
                      <input
                        type="text"
                        value={authorName}
                        onChange={(e) => updateAuthor(index, e.target.value)}
                        placeholder={`Nama Penulis ${index + 1}`}
                        className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-800 text-sm font-semibold outline-none focus:border-brand-orange"
                        required={index === 0}
                      />
                      {authors.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAuthor(index)}
                          className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors"
                          title="Hapus Penulis"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="text-[11px] text-slate-400 italic">
                    * Jika terdapat lebih dari 1 penulis, nama akan otomatis dipisahkan dengan tanda titik koma (;) pada sistem administrasi.
                  </div>
                </div>

                {/* List Editor (Max 100) */}
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase text-slate-500 tracking-wider">
                      Daftar Nama Editor / Penyunting <span className="text-slate-400 font-normal">({editors.length}/100)</span>
                    </label>
                    <button
                      type="button"
                      onClick={addEditor}
                      disabled={editors.length >= 100}
                      className="text-xs text-brand-orange font-bold hover:underline inline-flex items-center gap-1 disabled:opacity-40"
                    >
                      <Plus size={14} /> Tambah Editor
                    </button>
                  </div>
                  {editors.map((editorName, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <span className="text-xs font-mono font-bold text-slate-400 w-6 text-right">{index + 1}.</span>
                      <input
                        type="text"
                        value={editorName}
                        onChange={(e) => updateEditor(index, e.target.value)}
                        placeholder={`Nama Editor ${index + 1} (Opsional)`}
                        className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-800 text-sm font-semibold outline-none focus:border-brand-orange"
                      />
                      {editors.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEditor(index)}
                          className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors"
                          title="Hapus Editor"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Checkbox Pernyataan Kesesuaian Data */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="dataAgree"
                  checked={dataConfirmed}
                  onChange={(e) => setDataConfirmed(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-amber-400 text-brand-orange focus:ring-brand-orange shrink-0 cursor-pointer"
                />
                <label htmlFor="dataAgree" className="text-xs text-amber-900 leading-relaxed cursor-pointer font-medium">
                  Saya menyatakan bahwa data Judul Naskah, Nama Penulis, dan Editor di atas sudah <strong>BENAR &amp; FINAL</strong> untuk keperluan administrasi penerbitan, cetak, sertifikat, dan pengajuan ISBN.
                </label>
              </div>

              <button
                type="submit"
                className="w-full bg-brand-orange hover:bg-orange-600 text-white font-black py-4 rounded-xl shadow-lg shadow-orange-500/20 transition-all flex justify-center items-center gap-2 text-sm uppercase tracking-wider"
              >
                Simpan &amp; Lanjut ke Approval SPK <ArrowRight size={18} />
              </button>
            </form>
          )}

          {/* STEP 3: HALAMAN APPROVAL SPK */}
          {step === "spk_approval" && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-2xl font-black text-slate-800">Detail Surat Perjanjian Kerjasama (SPK)</h2>
                <p className="text-slate-500 text-sm mt-1">Harap baca dengan saksama sebelum memberikan persetujuan.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-200 p-4 rounded-xl bg-slate-50">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Judul Naskah (Fix)</span>
                  <strong className="text-slate-800 text-sm">{naskah.judul}</strong>
                </div>
                <div className="border border-slate-200 p-4 rounded-xl bg-slate-50">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Penulis (Fix)</span>
                  <strong className="text-slate-800 text-sm">{naskah.penulis}</strong>
                </div>
                <div className="border border-slate-200 p-4 rounded-xl bg-slate-50">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Penerbit</span>
                  <strong className="text-slate-800 text-sm">{naskah.spk_deals?.penerbit || "-"}</strong>
                </div>
                <div className="border border-slate-200 p-4 rounded-xl bg-slate-50">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Paket</span>
                  <strong className="text-slate-800 text-sm">{naskah.spk_deals?.package_name || "-"}</strong>
                </div>
                {naskah.editor && (
                  <div className="col-span-2 border border-slate-200 p-4 rounded-xl bg-slate-50">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Editor / Penyunting (Fix)</span>
                    <strong className="text-slate-800 text-sm">{naskah.editor}</strong>
                  </div>
                )}
              </div>

              <div className="border border-slate-200 rounded-2xl p-6">
                <h3 className="text-lg font-black text-slate-800 text-center">Isi Perjanjian SPK</h3>
                <div className="mt-5 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                  <Info label="Pihak Pertama" value={spkTemplate.pihak_pertama?.nama || "-"} />
                  <Info label="Jabatan" value={spkTemplate.pihak_pertama?.jabatan || "-"} />
                  <Info label="Bertindak Atas Nama" value={spkTemplate.pihak_pertama?.bertindak_atas_nama || "-"} />
                  <Info label="Pihak Kedua" value={naskah.penulis || "-"} />
                </div>
                <p className="mt-5 text-sm leading-6 text-slate-600">
                  {(spkTemplate.pembuka || DEFAULT_SPK_TEMPLATE.pembuka)
                    .replaceAll("{judul_naskah}", naskah.judul || "-")
                    .replaceAll("{paket}", naskah.spk_deals?.package_name || "-")}
                </p>
                <div className="mt-5 space-y-4">
                  {(spkTemplate.clauses || []).map((clause, index) => (
                    <div key={index} className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                      <div className="text-center font-black text-slate-800">Pasal {index + 1}</div>
                      <div className="text-center text-sm font-black text-slate-800 uppercase mt-1">{clause.title || "-"}</div>
                      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{clause.body || "-"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {approved ? (
                <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center flex flex-col items-center">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle2 size={24} />
                  </div>
                  <h3 className="font-black text-emerald-800 text-lg">SPK Telah Disetujui!</h3>
                  <p className="text-emerald-600 text-sm mt-1">Anda telah memberikan persetujuan pada {new Date(naskah.spk_approved_at).toLocaleString("id-ID")}.</p>
                  <p className="text-slate-500 text-xs mt-4">Naskah Anda kini akan segera diproses oleh tim produksi kami.</p>
                </div>
              ) : (
                <div className="border-t border-slate-200 pt-6">
                  <div className="flex items-start gap-4 mb-6">
                    <input type="checkbox" id="agree" className="mt-1 w-5 h-5 rounded border-slate-300 text-brand-orange focus:ring-brand-orange cursor-pointer" />
                    <label htmlFor="agree" className="text-sm text-slate-600 cursor-pointer">
                      Saya telah membaca, memahami, dan menyetujui seluruh syarat &amp; ketentuan yang tertulis dalam dokumen Surat Perjanjian Kerjasama di atas. Persetujuan digital ini sah berkekuatan hukum.
                    </label>
                  </div>
                  <button 
                    onClick={() => {
                      if (!document.getElementById("agree").checked) return alert("Anda harus mencentang kotak persetujuan terlebih dahulu.");
                      handleApprove();
                    }}
                    disabled={approving}
                    className="w-full bg-brand-orange hover:bg-orange-600 text-white font-black py-4 rounded-xl shadow-lg shadow-orange-500/20 transition-all flex justify-center items-center gap-2"
                  >
                    {approving ? <Loader2 className="animate-spin" size={20} /> : "SAYA SETUJU & TANDATANGANI DIGITAL"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{label}</span>
      <strong className="text-slate-800 text-sm">{value}</strong>
    </div>
  );
}
