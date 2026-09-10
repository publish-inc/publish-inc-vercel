# Laporan Analisis Modul & Role - Portal SPK

Berdasarkan analisis terhadap *source code* sistem Portal SPK (`JS_Core.html`, `JS_Auth_Utils.html`, dan *file* pendukung lainnya), berikut adalah laporan komprehensif mengenai pembagian *role*, fungsi setiap modul, serta hubungan antar modul dalam ekosistem aplikasi.

---

## 1. Role: Pimpinan
**Fungsi Utama:** Memantau kinerja perusahaan secara keseluruhan tanpa terlibat dalam operasional teknis harian.
* **Modul Laporan (`laporan`)**: Menampilkan statistik omset, proyeksi revenue, dan kinerja global dari seluruh divisi.
* **Modul Internal Memo (`memo`)**: Membuat atau membaca memo / kebijakan perusahaan yang akan dikirim secara *broadcast* ke seluruh karyawan operasional.
* **Relasi:** Hanya membaca data hilir dari proses produksi (Naskah, Deal, KPI). Berelasi langsung dengan Manajemen untuk komunikasi kebijakan.

## 2. Role: Manajemen
**Fungsi Utama:** Mengelola parameter sistem, menetapkan target, dan mengawasi jalannya operasional.
* **Modul Dashboard Manajemen (`dashboard_manajemen`)**: Memantau agregat KPI semua divisi dan status *bottleneck* produksi.
* **Modul Kelola KPI & Target (`kelola_jenis_kpi`, `target_kpi`, `koreksi_kpi`)**: Mendefinisikan poin dan target bulanan yang harus dicapai tim kreatif/operasional. Menyetujui atau menolak request koreksi poin KPI.
* **Modul Parameter Sistem (`kelola_penerbit`, `deadline_tracking`, `holiday_settings`)**: Mengatur master data, aturan hitung hari kerja, dan *Service Level Agreement* (SLA) pengerjaan naskah.
* **Modul Persuratan & Template (`spk_pengaturan`, `template_wa_tracking`)**: Menyiapkan templat surat kontrak dan notifikasi otomatis WhatsApp.
* **Relasi:** Merupakan otak dari operasional. Target yang disetel di sini akan muncul di *Dashboard KPI* tim kreatif. Template WA dipakai otomatis oleh modul *CS/Admin*.

## 3. Role: HRD
**Fungsi Utama:** Mengelola SDM, absensi, dan penggajian berbasis performa (KPI).
* **Modul Dashboard HRD (`payroll_hrd_dashboard`, `payroll_hrd_global`)**: Memantau rekap absensi dan tren gaji karyawan.
* **Modul Payroll & Slip Gaji (`payroll_hrd_config`, `payroll_hrd_slip`)**: Mengonversi poin KPI karyawan (dari tim produksi) menjadi nominal komisi/gaji sesuai formula yang ditetapkan.
* **Modul Kehadiran & Pengguna (`kehadiran_karyawan`, `pengguna_hrd`)**: Manajemen data karyawan aktif dan hak akses aplikasi.
* **Relasi:** Bergantung penuh pada input data kehadiran dan pencapaian KPI (poin) yang dihasilkan oleh *layouter*, *editor*, dan admin di modul KPI.

## 4. Role: CSS / CCO (Customer Care Officer)
**Fungsi Utama:** Menjadi gerbang awal masuknya proyek buku dari penulis.
* **Modul Dashboard CCO (`dashboard`)**: Melacak naskah yang menjadi tanggung jawab spesifik CCO tersebut.
* **Modul Kelola Deal (`kelola_deal`, `detail_deal_cs`)**: Menginput data *closing/deal* penjualan, menentukan paket dan penerbit, serta menghitung tagihan awal.
* **Modul Naskah Tracking (`naskah_baru`, `naskah`)**: Memantau perkembangan naskah yang ditangani dari awal hingga buku tercetak.
* **Relasi:** Awal dari *Supply Chain*. Deal yang diinput akan menciptakan data *Naskah Baru* yang diteruskan ke Administratif, PIC Editor, dan Layouter.

## 5. Role: Admin (Administrasi & Persuratan)
**Fungsi Utama:** Menyiapkan kelengkapan legalitas dan administrasi buku.
* **Modul Administrasi Naskah (`administrasi_naskah`)**: Mengurus pendaftaran ISBN, pembuatan SPK, dan kelengkapan dokumen naskah.
* **Modul SPK Penulis (`spk_penulis`)**: Memantau token persetujuan dari penulis dan mencetak PDF SPK (Surat Perjanjian Kerjasama).
* **Relasi:** Merupakan jembatan antara fase deal (CCO) dan fase produksi (Tim Kreatif). Data ISBN yang keluar akan diteruskan ke halaman buku.

## 6. Role: PIC Editor & PIC Layouter
**Fungsi Utama:** Koordinator tim produksi (redaksi & *layout*).
* **Modul Antrian Naskah & Distribusi Tugas (`antrian_naskah`, `naskah_baru`)**: Menarik naskah yang masuk dan mendistribusikannya (assign) ke Editor atau Layouter yang spesifik.
* **Modul Dashboard KPI (`dashboard_kpi`)**: Selain memantau kinerjanya sendiri, PIC dapat memantau capaian poin KPI tim di bawahnya.
* **Relasi:** Berperan sebagai router (pengatur lalu lintas) naskah dari Admin ke tim eksekutor.

## 7. Role: Editor & Layouter (Tim Kreatif / Produksi)
**Fungsi Utama:** Mengerjakan naskah dan mengumpulkan poin KPI.
* **Modul Dashboard KPI (`dashboard_kpi`)**: Halaman utama mereka, menampilkan *gauge chart* persentase pencapaian target bulanan dan *history* poin.
* **Modul Tugas Naskah (`tugas_naskah`)**: *To-do list* pekerjaan yang di-assign oleh PIC. Penyelesaian tugas di sini akan otomatis menambah poin KPI.
* **Modul Input KPI Manual (`input_kpi`)**: Menginput pekerjaan di luar tugas reguler (misal: revisi ekstra, tugas desain lainnya) agar terhitung ke penggajian.
* **Relasi:** Ujung tombak produksi. Output dari mereka adalah status "Selesai", yang men-trigger modul distribusi dan dikonversi menjadi gaji di modul HRD.

## 8. Role: Admin Marketplace
**Fungsi Utama:** Manajemen penjualan online dan stok buku.
* **Modul Dashboard Marketplace (`dashboard_marketplace`)**: Memantau *traffic* dan konversi toko online.
* **Modul Inventaris & Penjualan (`stok_buku`, `penjualan_marketplace`)**: Mencatat sirkulasi stok fisik buku dan data penjualan harian.
* **Modul Kalkulator Marketplace (`marketplace_calculator`)**: Menghitung HPP, biaya admin (Shopee/Tokopedia), margin, dan harga jual wajar.
* **Relasi:** Terhubung dengan Naskah yang sudah mencapai status "Distribusi/Selesai" untuk dipasarkan secara retail.

## 9. Role: Campaign / Mitra
**Fungsi Utama:** Mengelola program promosi, maklon cetak, dan jaringan afiliasi/mitra penjualan.
* **Modul Manajemen Campaign (`dashboard_campaign`, `manajemen_campaign`)**: Evaluasi jalannya promosi.
* **Modul Manajemen Mitra (`data_mitra`, `level_mitra`, `komisi_mitra`)**: Mengatur jenjang *reseller*/*dropshipper* dan pencairan komisi mereka.
* **Modul Input Cetak/Lainnya (`input_cetak`, `input_lainnya`)**: Mencatat pesanan cetak mandiri atau layanan lepas (bukan paket reguler).
* **Relasi:** Menyumbang aliran pendapatan (*revenue stream*) di luar *core business* penerbitan paket, yang hasilnya terakumulasi di Modul Laporan Pimpinan.

## 10. Role: Report (Display / Digital Signage)
**Fungsi Utama:** Berfungsi sebagai layar informasi transparan di area kantor.
* **Modul Report Display (`report_home`, `report_display`, `kalender_konten_report`)**: Antarmuka *read-only* yang melakukan transisi *slide* otomatis berisi *leaderboard* KPI, kutipan hari ini, kalender konten, dan pemberitahuan (Briefing Harian).
* **Relasi:** Menampilkan *live data* yang diekstrak dari seluruh sistem operasional sebagai bentuk transparansi dan motivasi kerja bagi karyawan di kantor.

---

### Kesimpulan Alur Kerja Sistem (Workflow Relation)
1. **Input Awal:** **CCO** memasukkan *Deal Baru* dari pelanggan.
2. **Administrasi:** **Admin** melengkapi SPK, ISBN, dan legalitas.
3. **Penugasan:** **PIC Editor/Layouter** mengalokasikan naskah kepada anggotanya.
4. **Eksekusi:** **Editor/Layouter** menyelesaikan *Tugas Naskah*, yang akan otomatis mengisi tabung *KPI*.
5. **Gaji & Penilaian:** **HRD** mengekspor *KPI* menjadi *Payroll*, sementara **Manajemen** & **Pimpinan** melihat hasil agregatnya pada *Dashboard* mereka.
6. **Pasca Produksi:** Buku diteruskan ke **Admin Marketplace** dan **Campaign** untuk dikomersialisasikan lebih lanjut.
7. **Komunikasi Lintas Divisi:** Semua aktivitas saling mengirimkan notifikasi *in-app* dan menggunakan *Internal Memo* (Pesan) untuk berkoordinasi.
