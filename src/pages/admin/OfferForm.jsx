import { useState, useMemo } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { formatRupiah } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

const inputCls = "w-full bg-navy-900 border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-orange text-sm";
const label = "text-xs text-slate-400 font-medium";
const UKURAN = ["A6", "A5", "B5 Unesco", "B5 ISO", "B5 STD", "A4", "Custom"];
const WAKTU = ["14 Hari Kerja", "21 Hari Kerja", "30 Hari Kerja", "Custom"];
const SERVICE_TYPES = [
  ["terbit", "Terbit"],
  ["cetak", "Cetak"],
  ["lainnya", "Lainnya"],
];

const num = (v) => Number(v) || 0;

const AdjRow = ({ name, state, setState, testid }) => (
  <div className="flex items-center gap-3">
    <label className="flex items-center gap-2 w-28">
      <input type="checkbox" data-testid={`${testid}-toggle`} checked={!!state.on} onChange={(e) => setState({ ...state, on: e.target.checked })} className="h-4 w-4 accent-brand-orange" />
      <span className="text-slate-300 text-sm">{name}</span>
    </label>
    <input type="number" data-testid={`${testid}-amount`} disabled={!state.on} className={inputCls + " max-w-[200px] disabled:opacity-40"} placeholder="Nominal (Rp)" value={state.amount || ""} onChange={(e) => setState({ ...state, amount: e.target.value })} />
  </div>
);

const facRowTotal = (f) => {
  const vol = num(f.volume), eks = num(f.eks), price = num(f.price);
  if (vol && eks) return vol * price * eks;
  if (vol) return vol * price;
  if (eks) return eks * price;
  return price;
};

export default function OfferForm({ title, submitLabel, initial, customers, packages = [], facilities = [], publishers = [], onSubmit, onCancel }) {
  const { user } = useAuth();
  const init = initial || {};
  const initPkg = init.package || {};
  const [serviceType, setServiceType] = useState(init.service_type || "terbit");
  const [customerId, setCustomerId] = useState(init.customer_id || "");
  const [customerSearch, setCustomerSearch] = useState(() => {
    const selected = customers.find((c) => c.id === init.customer_id);
    return selected ? `${selected.name}${selected.instansi ? ` - ${selected.instansi}` : ""}` : "";
  });
  const [judul, setJudul] = useState(init.judul || "");

  const firstPubName = publishers[0]?.nama || publishers[0]?.name || "Publish Inc.";
  const defaultPublisher = init.publisher || initPkg.publisher || firstPubName;
  const [publisher, setPublisher] = useState(defaultPublisher);
  const [pkg, setPkg] = useState({
    name: initPkg.name || "",
    price: initPkg.price || 0,
    eks: initPkg.eks || "",
    hal: initPkg.hal || "",
    jumlah: initPkg.jumlah || 1,
    spesifikasi: initPkg.spesifikasi || initPkg.spec || "",
  });
  const [waktuSel, setWaktuSel] = useState(WAKTU.includes(initPkg.waktu) ? initPkg.waktu : (initPkg.waktu ? "Custom" : "30 Hari Kerja"));
  const [waktuCustom, setWaktuCustom] = useState(WAKTU.includes(initPkg.waktu) ? "" : (initPkg.waktu || ""));
  const [ukuranSel, setUkuranSel] = useState(UKURAN.includes(initPkg.ukuran) ? initPkg.ukuran : (initPkg.ukuran ? "Custom" : "B5 Unesco"));
  const [ukuranCustom, setUkuranCustom] = useState(UKURAN.includes(initPkg.ukuran) ? "" : (initPkg.ukuran || ""));
  const [fac, setFac] = useState(init.facilities || []);
  const adj0 = init.adjustments || {};
  const [ppn, setPpn] = useState(adj0.ppn || { on: false, amount: 0 });
  const [diskon, setDiskon] = useState(adj0.diskon || { on: false, amount: 0 });
  const [ongkir, setOngkir] = useState(adj0.ongkir || { on: false, amount: 0 });

  const availablePackages = useMemo(() => {
    const currentPubObj = (publishers || []).find(p => (p?.nama || p?.name) === publisher);
    const pubPaketList = Array.isArray(currentPubObj?.paket)
      ? currentPubObj.paket
      : typeof currentPubObj?.paket === "string"
      ? currentPubObj.paket.split(",")
      : [];

    const fromPub = pubPaketList.map(item => {
      if (typeof item === 'object' && item !== null) {
        return { id: `pub-${item.id || item.name}`, name: item.name, price: num(item.price), publisher };
      }
      const str = String(item || "").trim();
      if (str.includes(":")) {
        const [n, p] = str.split(":");
        return { id: `pub-${n.trim()}`, name: n.trim(), price: num(p.trim()), publisher };
      }
      return { id: `pub-${str}`, name: str, price: 0, publisher };
    }).filter(p => p.name);

    const fromPackages = packages
      .filter(p => (p.publisher || "Publish Inc.") === publisher || !p.publisher)
      .map(p => ({ id: p.id, name: p.name, price: num(p.price), publisher: p.publisher || publisher }));

    const combinedMap = new Map();
    [...fromPub, ...fromPackages].forEach(p => {
      if (!combinedMap.has(p.name) || (p.price > 0 && combinedMap.get(p.name).price === 0)) {
        combinedMap.set(p.name, p);
      }
    });

    return Array.from(combinedMap.values());
  }, [packages, publisher, publishers]);

  const selectPackage = (id) => {
    const p = availablePackages.find((x) => x.id === id || x.name === id);
    if (p) setPkg((s) => ({ ...s, name: p.name, price: p.price }));
  };

  const addFac = () => setFac((f) => [...f, { name: "", spec: "Tidak Ada", volume: 0, eks: 0, price: 0 }]);
  const updFac = (i, field, val) => setFac((f) => f.map((x, idx) => idx === i ? { ...x, [field]: val } : x));
  const setFacName = (i, name) => {
    const f = facilities.find((x) => x.name === name);
    updFac(i, "name", name);
    if (f) updFac(i, "price", f.price);
  };

  const cleanFacilities = serviceType === "terbit" ? fac : [];
  const pkgTotal = num(pkg.price) * (num(pkg.jumlah) || 1);
  const facTotal = cleanFacilities.reduce((s, f) => s + facRowTotal(f), 0);
  const subtotal = pkgTotal + facTotal;
  const grand = Math.max(subtotal + (ppn.on ? num(ppn.amount) : 0) + (ongkir.on ? num(ongkir.amount) : 0) - (diskon.on ? num(diskon.amount) : 0), 0);

  const submit = () => {
    const selectedCustomer = customers.find((c) => c.id === customerId || `${c.name}${c.instansi ? ` - ${c.instansi}` : ""}` === customerSearch);
    if (!selectedCustomer) return;
    if (serviceType !== "lainnya" && !judul.trim()) return;
    onSubmit({
      service_type: serviceType,
      publisher,
      customer_id: selectedCustomer.id,
      judul,
      cs_name: init.cs_name || user?.name || user?.email || "CS",
      cs_id: init.cs_id || user?.id || "",
      package: {
        name: serviceType === "terbit" ? pkg.name : serviceType === "cetak" ? "Cetak Buku" : "Layanan Lainnya",
        publisher,
        price: num(pkg.price),
        waktu: serviceType === "terbit" ? (waktuSel === "Custom" ? waktuCustom : waktuSel) : "",
        ukuran: serviceType === "terbit" ? (ukuranSel === "Custom" ? ukuranCustom : ukuranSel) : "",
        eks: serviceType === "cetak" ? num(pkg.jumlah) : num(pkg.eks),
        hal: num(pkg.hal),
        jumlah: num(pkg.jumlah) || 1,
        spesifikasi: pkg.spesifikasi,
      },
      facilities: cleanFacilities.map((f) => ({ name: f.name, spec: f.spec, volume: num(f.volume), eks: num(f.eks), price: num(f.price) })),
      adjustments: { ppn: { on: !!ppn.on, amount: num(ppn.amount) }, diskon: { on: !!diskon.on, amount: num(diskon.amount) }, ongkir: { on: !!ongkir.on, amount: num(ongkir.amount) } },
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-navy-900 border border-white/10 rounded-2xl w-full max-w-3xl my-8 p-7" onClick={(e) => e.stopPropagation()} data-testid="offer-form">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-bold text-white text-xl">{title}</h2>
          <button onClick={onCancel} className="text-slate-400"><X /></button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          {SERVICE_TYPES.map(([value, text]) => (
            <button key={value} type="button" onClick={() => setServiceType(value)} className={`rounded-xl px-4 py-2.5 text-sm font-black uppercase ${serviceType === value ? "bg-brand-orange text-white" : "bg-navy-800 text-slate-300 border border-white/10"}`}>
              {text}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-5">
          <div><label className={label}>Customer *</label>
            <input
              data-testid="offer-customer"
              list="offer-customer-options"
              className={inputCls + " mt-1"}
              value={customerSearch}
              onChange={(e) => {
                const value = e.target.value;
                setCustomerSearch(value);
                const selected = customers.find((c) => `${c.name}${c.instansi ? ` - ${c.instansi}` : ""}` === value);
                setCustomerId(selected?.id || "");
              }}
              placeholder="Ketik nama / instansi customer"
            />
            <datalist id="offer-customer-options">
              {customers.map((c) => <option key={c.id} value={`${c.name}${c.instansi ? ` - ${c.instansi}` : ""}`} />)}
            </datalist>
          </div>
          <div><label className={label}>{serviceType === "lainnya" ? "Judul / Nama Layanan (opsional)" : "Judul Buku *"}</label>
            <input data-testid="offer-judul" className={inputCls + " mt-1"} value={judul} onChange={(e) => setJudul(e.target.value)} />
          </div>
        </div>

        {serviceType === "terbit" ? (
          <TerbitFields
            publishers={publishers}
            publisher={publisher}
            setPublisher={setPublisher}
            availablePackages={availablePackages}
            pkg={pkg}
            setPkg={setPkg}
            selectPackage={selectPackage}
            waktuSel={waktuSel}
            setWaktuSel={setWaktuSel}
            waktuCustom={waktuCustom}
            setWaktuCustom={setWaktuCustom}
            ukuranSel={ukuranSel}
            setUkuranSel={setUkuranSel}
            ukuranCustom={ukuranCustom}
            setUkuranCustom={setUkuranCustom}
          />
        ) : (
          <SimpleServiceFields serviceType={serviceType} publishers={publishers} publisher={publisher} setPublisher={setPublisher} pkg={pkg} setPkg={setPkg} />
        )}

        {serviceType === "terbit" && (
          <div className="bg-navy-800 rounded-xl p-4 border border-white/5 mb-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-sm">Layanan Tambahan</h3>
              <button onClick={addFac} data-testid="add-facility" className="text-brand-orange text-sm font-semibold inline-flex items-center gap-1"><Plus size={14} /> Tambah</button>
            </div>
            {fac.map((f, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-end">
                <div className="col-span-3"><label className={label}>Fasilitas</label>
                  <select className={inputCls + " mt-1"} value={f.name} onChange={(e) => setFacName(i, e.target.value)}>
                    <option value="">- Pilih -</option>
                    {facilities.map((x) => <option key={x.id} value={x.name}>{x.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2"><label className={label}>Vol/Hal</label><input type="number" className={inputCls + " mt-1"} value={f.volume} onChange={(e) => updFac(i, "volume", e.target.value)} /></div>
                <div className="col-span-2"><label className={label}>Eks</label><input type="number" className={inputCls + " mt-1"} value={f.eks} onChange={(e) => updFac(i, "eks", e.target.value)} /></div>
                <div className="col-span-2"><label className={label}>Harga Satuan</label><input type="number" className={inputCls + " mt-1"} value={f.price} onChange={(e) => updFac(i, "price", e.target.value)} /></div>
                <div className="col-span-2"><label className={label}>Total</label><div data-testid={`fac-total-${i}`} className="mt-1 px-3 py-2 rounded-xl bg-navy-950 border border-white/10 text-brand-orange text-sm font-semibold truncate">{formatRupiah(facRowTotal(f))}</div></div>
                <div className="col-span-1"><button onClick={() => setFac(fac.filter((_, x) => x !== i))} className="text-red-400 p-2"><Trash2 size={15} /></button></div>
              </div>
            ))}
            {fac.length === 0 && <p className="text-slate-500 text-sm">Belum ada layanan tambahan.</p>}
          </div>
        )}

        <div className="bg-navy-800 rounded-xl p-4 border border-white/5 mb-5 space-y-3">
          <h3 className="text-white font-semibold text-sm">Penyesuaian</h3>
          <AdjRow name="PPN" state={ppn} setState={setPpn} testid="adj-ppn" />
          <AdjRow name="Diskon" state={diskon} setState={setDiskon} testid="adj-diskon" />
          <AdjRow name="Ongkir" state={ongkir} setState={setOngkir} testid="adj-ongkir" />
        </div>

        <div className="bg-navy-950 rounded-xl px-5 py-4 mb-5 border border-brand-orange/30 space-y-2">
          <div className="flex items-center justify-between text-sm"><span className="text-slate-400">{serviceType === "cetak" ? "Total Cetak" : serviceType === "lainnya" ? "Total Layanan" : `Total Paket (${num(pkg.jumlah) || 1}x)`}</span><span className="text-slate-200">{formatRupiah(pkgTotal)}</span></div>
          {serviceType === "terbit" && <div className="flex items-center justify-between text-sm"><span className="text-slate-400">Total Layanan Tambahan</span><span className="text-slate-200">{formatRupiah(facTotal)}</span></div>}
          {ppn.on && <div className="flex items-center justify-between text-sm"><span className="text-slate-400">PPN</span><span className="text-slate-200">+ {formatRupiah(num(ppn.amount))}</span></div>}
          {ongkir.on && <div className="flex items-center justify-between text-sm"><span className="text-slate-400">Ongkir</span><span className="text-slate-200">+ {formatRupiah(num(ongkir.amount))}</span></div>}
          {diskon.on && <div className="flex items-center justify-between text-sm"><span className="text-slate-400">Diskon</span><span className="text-red-400">- {formatRupiah(num(diskon.amount))}</span></div>}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <span className="text-slate-300 font-semibold">Total Biaya Keseluruhan</span>
            <span data-testid="offer-grand-total" className="font-display font-extrabold text-brand-orange text-2xl">{formatRupiah(grand)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-5 py-2.5 rounded-xl text-slate-300 hover:bg-navy-800">Batal</button>
          <button onClick={submit} disabled={!customerSearch || (serviceType !== "lainnya" && !judul.trim())} data-testid="submit-offer-btn" className="bg-brand-orange hover:bg-brand-orange-dark text-white font-bold px-6 py-2.5 rounded-xl disabled:opacity-50">{submitLabel}</button>
        </div>
      </div>
    </div>
  );
}

function TerbitFields({ publishers, publisher, setPublisher, availablePackages, pkg, setPkg, selectPackage, waktuSel, setWaktuSel, waktuCustom, setWaktuCustom, ukuranSel, setUkuranSel, ukuranCustom, setUkuranCustom }) {
  return (
    <div className="bg-navy-800 rounded-xl p-4 border border-white/5 mb-5">
      <h3 className="text-white font-semibold mb-3 text-sm">Estimasi Biaya Terbit</h3>
      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <label className={label}>Penerbit *</label>
          <select
            data-testid="offer-publisher-select"
            className={inputCls + " mt-1 font-semibold text-white"}
            value={publisher}
            onChange={(e) => {
              const val = e.target.value;
              setPublisher(val);
              setPkg((prev) => ({ ...prev, name: "", price: 0 }));
            }}
          >
            <option value="">-- Pilih Penerbit Master --</option>
            {publishers.map((item) => {
              const name = item.nama || item.name;
              return <option key={item.id || name} value={name}>{name}</option>;
            })}
          </select>
        </div>
        <div>
          <label className={label}>Paket Penerbit *</label>
          <select
            data-testid="offer-package-select"
            className={inputCls + " mt-1 font-semibold text-white"}
            value={pkg.name}
            onChange={(e) => {
              const val = e.target.value;
              const matched = availablePackages.find((p) => p.name === val);
              setPkg((prev) => ({
                ...prev,
                name: val,
                price: matched ? matched.price : prev.price,
              }));
            }}
          >
            <option value="">-- Pilih Paket --</option>
            {availablePackages.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name} {p.price > 0 ? `(${formatRupiah(p.price)})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Biaya Paket (Rp)</label>
          <input
            className={inputCls + " mt-1 font-mono font-bold text-brand-orange"}
            type="number"
            value={pkg.price}
            onChange={(e) => setPkg({ ...pkg, price: Number(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className={label}>Waktu Pengerjaan</label>
          <select data-testid="offer-waktu" className={inputCls + " mt-1"} value={waktuSel} onChange={(e) => setWaktuSel(e.target.value)}>
            {WAKTU.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
          {waktuSel === "Custom" && <input className={inputCls + " mt-2"} placeholder="cth: 45 hari kerja" value={waktuCustom} onChange={(e) => setWaktuCustom(e.target.value)} />}
        </div>
        <div>
          <label className={label}>Ukuran</label>
          <select data-testid="offer-ukuran" className={inputCls + " mt-1"} value={ukuranSel} onChange={(e) => setUkuranSel(e.target.value)}>
            {UKURAN.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          {ukuranSel === "Custom" && <input className={inputCls + " mt-2"} placeholder="cth: 20 x 25 cm" value={ukuranCustom} onChange={(e) => setUkuranCustom(e.target.value)} />}
        </div>
        <div><label className={label}>Eks</label><input data-testid="offer-eks" type="number" className={inputCls + " mt-1"} value={pkg.eks} onChange={(e) => setPkg({ ...pkg, eks: e.target.value })} /></div>
        <div><label className={label}>Hlm</label><input data-testid="offer-hal" type="number" className={inputCls + " mt-1"} value={pkg.hal} onChange={(e) => setPkg({ ...pkg, hal: e.target.value })} /></div>
        <div><label className={label}>Jumlah Paket</label><input data-testid="offer-jumlah" type="number" className={inputCls + " mt-1"} value={pkg.jumlah} onChange={(e) => setPkg({ ...pkg, jumlah: e.target.value })} /></div>
      </div>
    </div>
  );
}

function SimpleServiceFields({ serviceType, publishers, publisher, setPublisher, pkg, setPkg }) {
  const qtyLabel = serviceType === "cetak" ? "Jumlah Eks" : "Jumlah";
  const priceLabel = serviceType === "cetak" ? "Harga / Eks" : "Harga Satuan";
  return (
    <div className="bg-navy-800 rounded-xl p-4 border border-white/5 mb-5">
      <h3 className="text-white font-semibold mb-3 text-sm">{serviceType === "cetak" ? "Penawaran Cetak" : "Penawaran Lainnya"}</h3>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className={label}>Penerbit *</label>
          <select
            data-testid="offer-publisher-select-simple"
            className={inputCls + " mt-1 font-semibold text-white"}
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
          >
            <option value="">-- Pilih Penerbit Master --</option>
            {publishers.map((item) => {
              const name = item.nama || item.name;
              return <option key={item.id || name} value={name}>{name}</option>;
            })}
          </select>
        </div>
        <div className="md:col-span-2"><label className={label}>Spesifikasi</label><textarea className={inputCls + " mt-1"} rows="3" value={pkg.spesifikasi} onChange={(e) => setPkg({ ...pkg, spesifikasi: e.target.value })} placeholder={serviceType === "cetak" ? "Contoh: A5, BW, bookpaper, soft cover" : "Contoh: HAKI, ISBN, desain cover, konsultasi"} /></div>
        <div><label className={label}>{qtyLabel}</label><input data-testid="offer-jumlah" type="number" min="1" className={inputCls + " mt-1"} value={pkg.jumlah} onChange={(e) => setPkg({ ...pkg, jumlah: e.target.value })} /></div>
        <div><label className={label}>{priceLabel}</label><input type="number" min="0" className={inputCls + " mt-1"} value={pkg.price} onChange={(e) => setPkg({ ...pkg, price: e.target.value })} /></div>
      </div>
      <div className="mt-3 rounded-xl bg-navy-950 border border-white/10 px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-slate-400">Total {qtyLabel} x {priceLabel}</span>
        <span className="text-brand-orange font-black">{formatRupiah(num(pkg.jumlah) * num(pkg.price))}</span>
      </div>
    </div>
  );
}
