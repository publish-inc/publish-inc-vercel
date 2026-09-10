# Prompt Integrasi Sistem

Anda dapat menyalin teks di bawah ini dan memberikannya kepada AI (atau tim *developer*) yang akan membantu Anda menggabungkan sistem ini ke sistem target. Silakan isi bagian di dalam tanda kurung siku `[...]` dengan informasi sistem baru Anda.

***

**Salin mulai dari sini:**

---

**Role/Persona:**
Anda adalah seorang **Senior Full-Stack Developer** dan **System Architect** dengan keahlian mendalam dalam migrasi sistem, integrasi API, dan rekayasa perangkat lunak.

**Konteks Sistem Saat Ini (Source System):**
Saya memiliki sebuah sistem bernama **Portal SPK/KPI (Publish Inc.)** yang dibangun di atas platform **Google Apps Script (GAS)**. Sistem ini memiliki karakteristik sebagai berikut:
1. **Frontend:** Menggunakan HTML murni yang digabung dengan JavaScript (Vanilla) dan TailwindCSS (via CDN). Tidak ada *framework* reaktif seperti React/Vue, namun sistem dibangun secara modular dengan memecah antarmuka menjadi berbagai file seperti `JS_Core.html`, `JS_Auth_Utils.html`, `JS_Dashboard.html`, dll.
2. **Backend/Database:** Menggunakan Google Apps Script (`Code.js`) sebagai *backend* (API Controller) dan mengandalkan eksekusi `google.script.run` untuk komunikasi *client-server*. Datanya secara konseptual terhubung ke *spreadsheet* atau objek JSON internal.
3. **Role & Modul:** Sistem ini memiliki mekanisme *Role-Based Access Control* (RBAC) yang sangat kaya, meliputi *role*: Manajemen, Pimpinan, HRD, CSS (Customer Service), Tim Kreatif (Editor/Layouter), PIC, Admin Persuratan, Admin Marketplace, Campaign, dan Report (Display TV).
4. **Fitur Utama:** Manajemen *workflow* Naskah (dari Deal awal -> Eksekusi -> Distribusi), Manajemen KPI Karyawan (target dan *reward*), Manajemen Persuratan (SPK), dan Kalkulasi Payroll serta Stok Buku.

**Konteks Sistem Target (Destination System):**
Saya ingin menggabungkan/mengintegrasikan sistem Portal SPK di atas ke dalam sistem baru/sistem utama saya dengan detail berikut:
* **Stack Teknologi Target:** [Tuliskan stack teknologi Anda, misal: Laravel & MySQL / MERN Stack (MongoDB, Express, React, Node) / Firebase / Odoo ERP]
* **Tujuan Integrasi:** [Tuliskan tujuan utama, misal: Memindahkan seluruh fungsi KPI dan Payroll ke sistem HRIS yang sudah ada / Membuat satu portal *Super-App* / Sekadar menghubungkan API agar data Naskah dari GAS masuk ke database MySQL]

**Tugas Anda (Instruksi):**
Tolong buatkan **Rencana Integrasi dan Migrasi (Integration & Migration Blueprint)** yang terstruktur. Rencana tersebut harus mencakup:

1. **Analisis Arsitektur:** Bagaimana cara terbaik memetakan logika modular GAS (seperti `JS_Core.html` dan fungsi `google.script.run`) ke dalam arsitektur sistem target? 
2. **Desain Skema Database:** Buatkan usulan translasi entitas utama (seperti entitas *Users, Naskah, Deal, KPI Target, Messages*) dari bentuk *flat/sheet* menjadi skema relasional (RDBMS) atau NoSQL di sistem target.
3. **Mekanisme Autentikasi & RBAC:** Bagaimana cara menggabungkan sesi login dan manajemen role (CSS, Manajemen, Layouter, dsb.) agar tidak terjadi konflik dengan sistem autentikasi di sistem target?
4. **Strategi Pemindahan (Migration Strategy):** Berikan *step-by-step* (Fase 1, Fase 2, dst.) agar integrasi berjalan mulus tanpa menghentikan operasional perusahaan (contoh: apakah menggunakan *strangler fig pattern* atau pemindahan sekaligus).
5. **Rekomendasi API / Webhook:** Jika sistem lama tetap dipertahankan sebagian di GAS, rancang struktur *endpoint* REST API atau *Webhook* yang harus dibuat di sisi GAS dan sisi target agar keduanya bisa sinkron (misal: sinkronisasi status naskah).

Tolong berikan jawaban yang komprehensif, teknis, dan berorientasi pada *best practices* keamanan dan efisiensi *resource*.

---
**Berhenti menyalin di sini.**

***

### 💡 Tips Tambahan Sebelum Menjalankan Prompt:
* **Pilih Skala Integrasi:** Apakah Anda akan **membuang** Google Apps Script sepenuhnya (Migrasi Penuh), atau **menghubungkannya** dengan sistem lain melalui API (Integrasi Hibrida)? Jelaskan hal ini pada bagian `[Tujuan Integrasi]`.
* Jika sistem target Anda adalah *Node.js* atau *Next.js*, AI akan menyarankan Anda untuk membuat REST API. Jika Anda memindahkannya ke sistem ERP (seperti Odoo), AI akan menyarankan pendekatan integrasi modul.
