import { useState, useEffect, useRef, useMemo } from "react";
import { Plus, Pencil, Trash2, X, ShieldCheck, Upload, Users, Search, CreditCard, Phone, MapPin, UserCheck, Eye } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { getEmployeeProfile, saveEmployeeProfile } from "../../lib/payroll";

const EMPTY = {
  name: "",
  email: "",
  password: "",
  role: "admin",
  photo_url: "",
  photo_drive_url: "",
  show_on_landing: true,
  signature_url: "",
  nik: "",
  alamat: "",
  phone: "",
  emergency_contact: "",
  bank_name: "Bank BCA",
  bank_account_number: "",
};

const ROLES = [
  ["master_admin", "Master Admin"],
  ["admin", "Admin Administrasi Naskah"],
  ["cs", "Customer Service"],
  ["pimpinan", "Pimpinan"],
  ["hrd", "HRD"],
  ["cco", "CCO"],
  ["pic_editor", "PIC Editor"],
  ["pic_layouter", "PIC Layouter"],
  ["editor", "Editor"],
  ["layouter", "Layouter"],
  ["admin_marketplace", "Admin Marketplace"],
  ["campaign", "Campaign"],
  ["sosmed", "Sosmed"],
  ["crm", "CRM"],
  ["produksi", "Produksi"],
  ["finance", "Finance"],
  ["report", "Report Display"],
];

const roleLabel = (r) => ROLES.find(([value]) => value === r)?.[1] || r;

export default function UsersManager() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [uploadingSig, setUploadingSig] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [search, setSearch] = useState("");
  const sigRef = useRef();
  const photoRef = useRef();

  const load = () => {
    setLoading(true);
    api.get("/users").then((r) => setUsers(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filteredUsers = useMemo(() => {
    return users.filter((u) =>
      [u.name, u.email, u.role].some((val) => String(val || "").toLowerCase().includes(search.toLowerCase()))
    );
  }, [search, users]);

  const groupedUsers = useMemo(() => {
    const groups = {};
    filteredUsers.forEach((u) => {
      if (!groups[u.role]) groups[u.role] = [];
      groups[u.role].push(u);
    });
    return Object.entries(groups).sort((a, b) => {
      const idxA = ROLES.findIndex((r) => r[0] === a[0]);
      const idxB = ROLES.findIndex((r) => r[0] === b[0]);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });
  }, [filteredUsers]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setModal(true);
  };

  const openEdit = (u) => {
    setEditing(u.id);
    const profile = getEmployeeProfile(u.id);
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role,
      photo_url: profile.photo_url || "",
      photo_drive_url: profile.photo_drive_url || "",
      show_on_landing: profile.show_on_landing !== false,
      signature_url: u.signature_url || "",
      nik: profile.nik || "",
      alamat: profile.alamat || "",
      phone: profile.phone || "",
      emergency_contact: profile.emergency_contact || "",
      bank_name: profile.bank_name || "Bank BCA",
      bank_account_number: profile.bank_account_number || "",
    });
    setModal(true);
  };

  const openView = (u) => {
    const profile = getEmployeeProfile(u.id);
    setViewModal({ ...u, profile });
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let savedUserId = editing;
      if (editing) {
        const payload = { name: form.name, email: form.email, role: form.role };
        if (form.password) payload.password = form.password;
        await api.put(`/users/${editing}`, payload);
      } else {
        const res = await api.post("/users", form);
        savedUserId = res.data?.id || `user-${Date.now()}`;
      }

      // Save extended profile data (NIK, Alamat, Phone, Bank, Rekening)
      const profileData = {
        name: form.name,
        role: roleLabel(form.role),
        nik: form.nik,
        alamat: form.alamat,
        phone: form.phone,
        emergency_contact: form.emergency_contact,
        bank_name: form.bank_name,
        bank_account_number: form.bank_account_number,
        photo_url: form.photo_url,
        photo_drive_url: form.photo_drive_url,
        show_on_landing: form.show_on_landing,
      };
      saveEmployeeProfile(savedUserId, profileData);
      await api.put("/content/team/employee", {
        employee_id: savedUserId,
        name: form.name,
        role: roleLabel(form.role),
        photo: form.photo_url,
        show: form.show_on_landing,
      });

      toast.success(editing ? "Data karyawan & profil berhasil diperbarui" : "Karyawan baru berhasil ditambahkan");
      setModal(false);
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const uploadSig = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploadingSig(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post(`/users/${editing}/signature`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm((f) => ({ ...f, signature_url: data.url }));
      toast.success("Tanda tangan berhasil diupload");
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setUploadingSig(false);
    }
  };

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", "employee_photo");
    try {
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm((f) => ({ ...f, photo_url: data.url, photo_drive_url: data.drive_url || "" }));
      toast.success("Foto karyawan berhasil diupload ke penyimpanan sistem.");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const del = async (id) => {
    try {
      await api.delete(`/users/${id}`);
      toast.success("Akun karyawan dihapus");
      setConfirmDel(null);
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  const inputClass = "w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-orange";

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display font-black text-white text-3xl">Kelola & Database Karyawan</h1>
          <p className="text-slate-400 mt-1">Atur data pokok, NIK, alamat, kontak darurat, & rekening penggajian karyawan.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={openNew} className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white font-bold px-5 py-3 rounded-xl transition-all shadow-lg">
            <Plus size={18} /> Tambah Karyawan Baru
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-white/10 bg-navy-800 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, atau role..."
            className="w-full bg-navy-950 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-white outline-none focus:border-brand-orange"
          />
        </div>
        <div className="text-xs font-bold text-slate-400">
          Total Karyawan Terdaftar: <span className="text-white text-sm font-black">{users.length} Orang</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin h-10 w-10 border-2 border-brand-orange border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {groupedUsers.length === 0 && (
            <div className="text-center py-16 text-slate-500 border border-dashed border-white/10 rounded-2xl bg-navy-800/40">
              Karyawan tidak ditemukan.
            </div>
          )}

          {groupedUsers.map(([roleKey, roleUsers]) => (
            <div key={roleKey} className="bg-navy-800 border border-white/10 rounded-2xl overflow-hidden shadow-lg">
              <div className="bg-navy-900 px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-brand-orange/20 flex items-center justify-center text-brand-orange font-bold">
                    <Users size={16} />
                  </div>
                  <h2 className="text-base font-black text-white tracking-wide">{roleLabel(roleKey)}</h2>
                  <span className="bg-white/10 text-slate-300 text-xs font-bold px-2.5 py-1 rounded-full">{roleUsers.length}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-navy-950 text-slate-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-bold">Karyawan</th>
                      <th className="px-6 py-4 font-bold">Email</th>
                      <th className="px-6 py-4 font-bold">Kontak & Bank Rekening</th>
                      <th className="px-6 py-4 font-bold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {roleUsers.map((u) => {
                      const profile = getEmployeeProfile(u.id);
                      return (
                        <tr key={u.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-brand-orange/20 flex items-center justify-center text-brand-orange font-black text-base shrink-0 overflow-hidden">
                                {profile.photo_url ? <img src={profile.photo_url} alt={u.name} className="h-full w-full object-cover" /> : u.name?.[0]?.toUpperCase()}
                              </div>
                              <div>
                                <div className="text-white font-bold">{u.name} {u.id === me?.id && <span className="text-brand-orange text-xs">(Anda)</span>}</div>
                                <div className="text-xs text-slate-400 font-mono">NIK: {profile.nik || "-"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-300">
                            <div>{u.email}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-300 text-xs">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                              <CreditCard size={14} className="text-emerald-400" /> {profile.bank_name || "Bank BCA"} - <span className="font-mono text-white font-bold">{profile.bank_account_number || "-"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                              <Phone size={13} /> {profile.phone || "-"}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => openView(u)} className="p-2 rounded-lg bg-navy-900 text-slate-300 hover:text-white hover:bg-navy-950 transition-colors" title="Lihat Detail Profil">
                                <Eye size={16} />
                              </button>
                              <button onClick={() => openEdit(u)} className="p-2 rounded-lg bg-navy-900 text-slate-300 hover:text-brand-blue hover:bg-navy-950 transition-colors" title="Edit Data Karyawan">
                                <Pencil size={16} />
                              </button>
                              <button onClick={() => setConfirmDel(u)} disabled={u.id === me?.id} className="p-2 rounded-lg bg-navy-900 text-slate-300 hover:text-red-400 hover:bg-navy-950 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Hapus Karyawan">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / New Employee Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-navy-900 border border-white/10 rounded-2xl w-full max-w-2xl my-8 p-7 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="font-display font-bold text-white text-xl">{editing ? `Edit Karyawan: ${form.name}` : "Tambah Karyawan Baru"}</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>

            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300">Nama Lengkap *</label>
                  <input required className={inputClass + " mt-1.5"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Siti Rahma" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300">Email *</label>
                  <input type="email" required className={inputClass + " mt-1.5"} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="rahma@publishinc.id" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300">{editing ? "Password Baru (Kosongkan jika tidak diubah)" : "Password *"}</label>
                  <input type="password" required={!editing} className={inputClass + " mt-1.5"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing ? "••••••" : "min. 6 karakter"} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300">Role / Jabatan *</label>
                  <select className={inputClass + " mt-1.5"} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    {ROLES.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Extended Profile Fields */}
              <div className="border-t border-white/10 pt-4 space-y-4">
                <h3 className="text-sm font-bold text-brand-orange uppercase tracking-wider">Detail Data Karyawan & Rekening</h3>

                <div>
                  <label className="text-xs font-bold text-slate-300">Foto Karyawan (Tampil di Landing Page Tim Kami)</label>
                  <div className="mt-2 flex items-center gap-4 rounded-xl border border-white/10 bg-navy-950 p-3">
                    <div className="h-20 w-20 overflow-hidden rounded-full bg-brand-orange/20 flex items-center justify-center text-brand-orange font-black text-2xl shrink-0">
                      {form.photo_url ? <img src={form.photo_url} alt={form.name || "Foto karyawan"} className="h-full w-full object-cover" /> : (form.name?.[0]?.toUpperCase() || "?")}
                    </div>
                    <div className="flex-1 space-y-2">
                      <input type="file" accept="image/*" ref={photoRef} onChange={uploadPhoto} className="hidden" />
                      <button type="button" onClick={() => photoRef.current?.click()} disabled={uploadingPhoto} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-navy-900 px-4 py-2 text-xs font-bold text-white hover:border-brand-orange disabled:opacity-60">
                        <Upload size={14} /> {uploadingPhoto ? "Mengupload..." : "Upload Foto"}
                      </button>
                      {form.photo_drive_url && <a href={form.photo_drive_url} target="_blank" rel="noreferrer" className="ml-3 text-xs font-bold text-brand-blue hover:underline">Lihat di Drive</a>}
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                        <input type="checkbox" checked={form.show_on_landing} onChange={(e) => setForm({ ...form, show_on_landing: e.target.checked })} className="h-4 w-4 accent-brand-orange" />
                        Tampilkan di section Tim Kami landing page
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300">NIK (Nomor Induk KTP)</label>
                    <input className={inputClass + " mt-1.5 font-mono"} value={form.nik} onChange={(e) => setForm({ ...form, nik: e.target.value })} placeholder="7371012903940001" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300">No. HP / WhatsApp</label>
                    <input className={inputClass + " mt-1.5 font-mono"} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="081234567890" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300">Alamat Lengkap</label>
                  <input className={inputClass + " mt-1.5"} value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} placeholder="Jl. Sultan Alauddin No. 128, Makassar" />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300">Kontak Darurat (Nama & Telp)</label>
                  <input className={inputClass + " mt-1.5"} value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} placeholder="Suami / Orang Tua (081987654321)" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300">Nama Bank</label>
                    <select className={inputClass + " mt-1.5"} value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })}>
                      <option value="Bank BCA">Bank BCA</option>
                      <option value="Bank Mandiri">Bank Mandiri</option>
                      <option value="Bank BRI">Bank BRI</option>
                      <option value="Bank BNI">Bank BNI</option>
                      <option value="Bank Syariah Indonesia (BSI)">Bank Syariah Indonesia (BSI)</option>
                      <option value="Bank CIMB Niaga">Bank CIMB Niaga</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300">Nomor Rekening Bank (Tampil di Slip Gaji)</label>
                    <input className={inputClass + " mt-1.5 font-mono text-emerald-300 font-bold"} value={form.bank_account_number} onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })} placeholder="1234567890" />
                  </div>
                </div>
              </div>

              {editing && form.role === "cs" && (
                <div className="border-t border-white/10 pt-4">
                  <label className="text-xs font-bold text-slate-300">Tanda Tangan Digital (PDF Penawaran)</label>
                  <div className="flex items-center gap-4 mt-2">
                    {form.signature_url && (
                      <div className="bg-slate-200 rounded-lg p-1.5"><img src={form.signature_url} alt="ttd" className="h-14" /></div>
                    )}
                    <input type="file" accept="image/*" ref={sigRef} onChange={uploadSig} className="hidden" />
                    <button type="button" onClick={() => sigRef.current?.click()} disabled={uploadingSig} className="inline-flex items-center gap-2 bg-navy-950 border border-white/10 text-white px-4 py-2 text-xs font-bold rounded-xl hover:border-brand-orange transition-colors">
                      <Upload size={14} /> {uploadingSig ? "Memproses..." : "Upload Tanda Tangan"}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button type="button" onClick={() => setModal(false)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-navy-950">Batal</button>
                <button type="submit" disabled={saving} className="bg-brand-orange hover:bg-brand-orange-dark text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-colors shadow-lg">
                  {saving ? "Menyimpan..." : "Simpan Data Karyawan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {viewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="font-bold text-white text-lg">Profil Karyawan</h2>
              <button onClick={() => setViewModal(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="flex items-center gap-4 bg-navy-950 p-4 rounded-xl border border-white/5">
              <div className="h-14 w-14 rounded-full bg-brand-orange text-white flex items-center justify-center font-black text-2xl shrink-0 shadow-lg overflow-hidden">
                {viewModal.profile?.photo_url ? <img src={viewModal.profile.photo_url} alt={viewModal.name} className="h-full w-full object-cover" /> : viewModal.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-black text-white">{viewModal.name}</h3>
                <div className="text-xs text-brand-orange font-bold uppercase tracking-wider">{roleLabel(viewModal.role)}</div>
                <div className="text-xs text-slate-400 mt-1">{viewModal.email}</div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <InfoRow label="NIK (KTP)" value={viewModal.profile?.nik || "-"} />
              <InfoRow label="No. HP / WhatsApp" value={viewModal.profile?.phone || "-"} />
              <InfoRow label="Alamat Lengkap" value={viewModal.profile?.alamat || "-"} />
              <InfoRow label="Kontak Darurat" value={viewModal.profile?.emergency_contact || "-"} />
              <InfoRow label="Bank Rekening" value={`${viewModal.profile?.bank_name || "Bank BCA"} - ${viewModal.profile?.bank_account_number || "-"}`} highlight />
            </div>

            <div className="pt-2 flex justify-end">
              <button onClick={() => setViewModal(null)} className="bg-brand-orange px-5 py-2 rounded-xl text-xs font-bold text-white">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-white/10 rounded-2xl max-w-sm w-full p-6">
            <h3 className="font-display font-bold text-white text-lg">Hapus Karyawan?</h3>
            <p className="text-slate-400 mt-2 text-sm">Akun {confirmDel.name} ({confirmDel.email}) akan dihapus permanen.</p>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setConfirmDel(null)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-navy-800">Batal</button>
              <button onClick={() => del(confirmDel.id)} className="bg-red-500 hover:bg-red-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, highlight }) {
  return (
    <div className="flex justify-between items-center bg-navy-950 p-3 rounded-xl border border-white/5">
      <span className="text-slate-400 font-medium">{label}:</span>
      <span className={`font-bold ${highlight ? "text-emerald-300 text-sm font-mono" : "text-white"}`}>{value}</span>
    </div>
  );
}
