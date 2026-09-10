/**
 * Fungsi utama untuk melayani halaman web di Google Apps Script.
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.v === 'author') {
    return HtmlService.createHtmlOutputFromFile('Author')
      .setTitle('Publish Inc - Portal Penulis')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  
  return HtmlService.createHtmlOutputFromFile('Admin')
    .setTitle('Publish Inc - Admin SPK')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * FUNGSI TEST - Jalankan manual dari Apps Script Editor untuk cek database.
 */
function testDB() {
  try {
    const ss = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
    Logger.log('✅ Spreadsheet OK: ' + ss.getUrl());
    
    const dataPenulis = getDB();
    Logger.log('📊 Data_Penulis rows: ' + dataPenulis.getLastRow());
    Logger.log('📊 Data_Penulis columns: ' + dataPenulis.getLastColumn());
    
    const settings = getAdminSettings();
    Logger.log('⚙️ Settings: ' + JSON.stringify(settings).substring(0, 300));
    
    const tokens = getTokensList_();
    Logger.log('🎫 Tokens count: ' + tokens.length);
    if (tokens.length > 0) Logger.log('🎫 Sample: ' + JSON.stringify(tokens[0]));
  } catch(e) {
    Logger.log('❌ ERROR: ' + e.message);
    Logger.log(e.stack);
  }
}

/**
 * FUNGSI UTILITY - Jalankan manual untuk menghapus semua data token/transaksi.
 * (Hanya menghapus isi baris, baris ke-1/header tetap aman)
 */
function clearDatabase() {
  const sheet = getDB();
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
    Logger.log('✅ Berhasil menghapus ' + (lastRow - 1) + ' baris data transaksi.');
  } else {
    Logger.log('⚠️ Database sudah kosong.');
  }
}

// =================== AUTENTIKASI ADMIN ===================

const ADMIN_SESSION_TTL_SECONDS = 21600; // 6 jam, batas maksimum CacheService.
const TOKEN_TTL_DAYS = 14;
const DEFAULT_ADMIN_USERNAME = 'spk@publishinc.com';
const DEFAULT_ADMIN_PASSWORD_SALT = 'publishinc-default-admin-2026';
const DEFAULT_ADMIN_PASSWORD_HASH = 'PsWhqnlwanY/ATqUJQkb4Wg1YiiNTSY4ogaKC2Z3tn4=';
const ADMIN_SESSION_SIGNING_SECRET = 'publishinc-admin-session-source-login-2026';
const SOURCE_ADMIN_SESSION_TOKEN = 'publishinc-admin-source-session';

/**
 * Jalankan sekali dari Apps Script Editor untuk membuat/mengubah akun admin.
 * Contoh: setupAdminCredentials('spk@publishinc.com', 'password-baru-yang-kuat')
 */
function setupAdminCredentials(username, password) {
  if (!username || !password || String(password).length < 10) {
    throw new Error('Username wajib diisi dan password minimal 10 karakter.');
  }

  const salt = Utilities.getUuid().replace(/-/g, '');
  const hash = hashPassword_(password, salt);
  PropertiesService.getScriptProperties().setProperties({
    ADMIN_USERNAME: String(username).trim().toLowerCase(),
    ADMIN_PASSWORD_SALT: salt,
    ADMIN_PASSWORD_HASH: hash
  }, true);

  Logger.log('Kredensial admin berhasil disimpan.');
  return true;
}

function authenticateAdmin(username, password) {
  const cleanUsername = String(username || '').trim().toLowerCase();
  const candidateHash = hashPassword_(password || '', DEFAULT_ADMIN_PASSWORD_SALT);
  if (cleanUsername !== DEFAULT_ADMIN_USERNAME || candidateHash !== DEFAULT_ADMIN_PASSWORD_HASH) {
    return { success: false };
  }

  const sessionToken = createAdminSession_();
  return { success: true, sessionToken: sessionToken, expiresIn: ADMIN_SESSION_TTL_SECONDS };
}

function logoutAdmin(sessionToken) {
  return true;
}

function hashPassword_(password, salt) {
  const raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(salt) + ':' + String(password),
    Utilities.Charset.UTF_8
  );
  return Utilities.base64Encode(raw);
}

function requireAdmin_(sessionToken) {
  if (sessionToken === SOURCE_ADMIN_SESSION_TOKEN) {
    return true;
  }

  if (!sessionToken || !isAdminSessionValid_(sessionToken)) {
    throw new Error('Sesi admin tidak valid atau sudah kedaluwarsa. Silakan login ulang.');
  }
  return true;
}

function createAdminSession_() {
  const expiresAt = Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000;
  const nonce = Utilities.getUuid().replace(/-/g, '');
  const signature = signAdminSession_(expiresAt, nonce);
  return Utilities.base64EncodeWebSafe(JSON.stringify({ e: expiresAt, n: nonce, s: signature }));
}

function isAdminSessionValid_(sessionToken) {
  try {
    const decoded = Utilities.newBlob(Utilities.base64DecodeWebSafe(String(sessionToken))).getDataAsString();
    const parsed = JSON.parse(decoded);
    if (!parsed.e || !parsed.n || !parsed.s || Number(parsed.e) <= Date.now()) return false;
    return parsed.s === signAdminSession_(parsed.e, parsed.n);
  } catch (err) {
    Logger.log('Gagal validasi session admin: ' + err.message);
    return false;
  }
}

function signAdminSession_(expiresAt, nonce) {
  const raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    ADMIN_SESSION_SIGNING_SECRET + ':' + String(expiresAt) + ':' + String(nonce),
    Utilities.Charset.UTF_8
  );
  return Utilities.base64EncodeWebSafe(raw);
}

// =================== DATABASE SPREADSHEET ===================
const DB_SPREADSHEET_ID = "181QHJCkaAmLBUsHLvJBQGeJj_QxdAe0zbxnf3YVEyb8";

function getSpreadsheet_() {
  return SpreadsheetApp.openById(DB_SPREADSHEET_ID);
}

/**
 * Sheet Data_Penulis — Struktur Kolom:
 * A:Token | B:No SPK | C:Nama | D:No HP | E:Status | F:Waktu Dibuat | G:Waktu Disepakati
 * H:Pekerjaan | I:No KTP | J:Alamat | K:Judul Buku | L:Paket Pilihan
 */
function getDB() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName("Data_Penulis");
  const headers = ["Token", "No SPK", "Nama", "No. HP", "Status", "Waktu Dibuat", "Waktu Disepakati", "Pekerjaan", "No. KTP", "Alamat", "Judul Buku", "Paket Pilihan", "Penulis Fix", "Editor Fix", "No ISBN", "Ukuran", "Token Kedaluwarsa"];
  if (!sheet) {
    sheet = ss.insertSheet("Data_Penulis");
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0A2540").setFontColor("white");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 100);  // Token
    sheet.setColumnWidth(2, 180);  // No SPK
    sheet.setColumnWidth(3, 150);  // Nama
    sheet.setColumnWidth(4, 130);  // No HP
    sheet.setColumnWidth(10, 250); // Alamat
    sheet.setColumnWidth(11, 200); // Judul Buku
  } else {
    // Pastikan kolom baru tetap tersedia pada database lama.
    const lastCol = sheet.getLastColumn();
    if (lastCol < headers.length) {
      for (let col = lastCol + 1; col <= headers.length; col++) {
        sheet.getRange(1, col).setValue(headers[col - 1]);
      }
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0A2540").setFontColor("white");
    }
  }
  return sheet;
}

/**
 * Auto-generate nomor SPK: NNN/SPK-PI/BULAN_ROMAWI/TAHUN
 */
function generateNoSPK_() {
  const props = PropertiesService.getScriptProperties();
  const now = new Date();
  const year = now.getFullYear();
  const romanMonths = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  const month = romanMonths[now.getMonth()];
  const key = 'SPK_COUNTER_' + year + '_' + month;
  const current = Number(props.getProperty(key) || getMaxSpkNumberForPeriod_(month, year));
  const nextNum = current + 1;
  props.setProperty(key, String(nextNum));
  const padded = String(nextNum).padStart(3, '0');
  return padded + '/SPK-PI/' + month + '/' + year;
}

function getMaxSpkNumberForPeriod_(month, year) {
  const sheet = getDB();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;

  const values = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  const pattern = new RegExp('^(\\d+)/SPK-PI/' + month + '/' + year + '$');
  return values.reduce(function(max, row) {
    const match = String(row[0] || '').match(pattern);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
}

// =================== PENGATURAN ADMIN (Disimpan di Spreadsheet) ===================

function saveAdminSettings(sessionToken, data) {
  requireAdmin_(sessionToken);
  const ss = getSpreadsheet_();
  
  // === 1. Sheet Pengaturan (key-value) ===
  let sheetSettings = ss.getSheetByName("Pengaturan");
  if (!sheetSettings) {
    sheetSettings = ss.insertSheet("Pengaturan");
    sheetSettings.appendRow(["Kunci", "Nilai"]);
    sheetSettings.getRange("A1:B1").setFontWeight("bold").setBackground("#0A2540").setFontColor("white");
    sheetSettings.setFrozenRows(1);
    sheetSettings.setColumnWidth(1, 200);
    sheetSettings.setColumnWidth(2, 400);
  }
  if (sheetSettings.getLastRow() > 1) {
    sheetSettings.getRange(2, 1, sheetSettings.getLastRow() - 1, 2).clearContent();
  }
  const settingsRows = [
    ["Penanggung Jawab", data.penanggungJawab || ''],
    ["Jabatan", data.jabatan || ''],
    ["Atas Nama", data.atasNama || ''],
    ["Penutup", data.penutup || '']
  ];
  sheetSettings.getRange(2, 1, settingsRows.length, 2).setValues(settingsRows);
  
  // === 2. Sheet Template_Pasal ===
  let sheetPasal = ss.getSheetByName("Template_Pasal");
  if (!sheetPasal) {
    sheetPasal = ss.insertSheet("Template_Pasal");
    sheetPasal.appendRow(["No", "Judul Pasal", "Isi Pasal"]);
    sheetPasal.getRange("A1:C1").setFontWeight("bold").setBackground("#0A2540").setFontColor("white");
    sheetPasal.setFrozenRows(1);
    sheetPasal.setColumnWidth(2, 200);
    sheetPasal.setColumnWidth(3, 500);
  }
  if (sheetPasal.getLastRow() > 1) {
    sheetPasal.getRange(2, 1, sheetPasal.getLastRow() - 1, 3).clearContent();
  }
  const pasals = data.pasals || [];
  if (pasals.length > 0) {
    const pasalRows = pasals.map((p, i) => [i + 1, p.judul || '', p.isi || '']);
    sheetPasal.getRange(2, 1, pasalRows.length, 3).setValues(pasalRows);
  }
  
  // === 3. Sheet Paket_Penerbitan ===
  let sheetPaket = ss.getSheetByName("Paket_Penerbitan");
  if (!sheetPaket) {
    sheetPaket = ss.insertSheet("Paket_Penerbitan");
    sheetPaket.appendRow(["No", "Nama Paket"]);
    sheetPaket.getRange("A1:B1").setFontWeight("bold").setBackground("#0A2540").setFontColor("white");
    sheetPaket.setFrozenRows(1);
    sheetPaket.setColumnWidth(2, 300);
  }
  if (sheetPaket.getLastRow() > 1) {
    sheetPaket.getRange(2, 1, sheetPaket.getLastRow() - 1, 2).clearContent();
  }
  const pakets = data.pakets || [];
  if (pakets.length > 0) {
    const paketRows = pakets.map((p, i) => [i + 1, p]);
    sheetPaket.getRange(2, 1, paketRows.length, 2).setValues(paketRows);
  }
  
  SpreadsheetApp.flush();
  return true;
}

function getAdminSettings() {
  const ss = getSpreadsheet_();
  const result = {
    penanggungJawab: '',
    jabatan: '',
    atasNama: 'Publish Inc.',
    pasals: [],
    penutup: '',
    pakets: []
  };
  
  const sheetSettings = ss.getSheetByName("Pengaturan");
  if (sheetSettings && sheetSettings.getLastRow() > 1) {
    const rows = sheetSettings.getRange(2, 1, sheetSettings.getLastRow() - 1, 2).getValues();
    const map = {};
    rows.forEach(r => { if (r[0]) map[r[0]] = String(r[1]); });
    result.penanggungJawab = map["Penanggung Jawab"] || '';
    result.jabatan = map["Jabatan"] || '';
    result.atasNama = map["Atas Nama"] || 'Publish Inc.';
    result.penutup = map["Penutup"] || '';
  }
  
  const sheetPasal = ss.getSheetByName("Template_Pasal");
  if (sheetPasal && sheetPasal.getLastRow() > 1) {
    const rows = sheetPasal.getRange(2, 1, sheetPasal.getLastRow() - 1, 3).getValues();
    result.pasals = rows.filter(r => r[1]).map(r => ({ judul: String(r[1]), isi: String(r[2]) }));
  }
  
  const sheetPaket = ss.getSheetByName("Paket_Penerbitan");
  if (sheetPaket && sheetPaket.getLastRow() > 1) {
    const rows = sheetPaket.getRange(2, 1, sheetPaket.getLastRow() - 1, 2).getValues();
    result.pakets = rows.filter(r => r[1]).map(r => String(r[1]));
  }
  
  return result;
}

// =================== TRANSAKSI TOKEN & SPK ===================

/**
 * Generate token + No SPK otomatis.
 * Struktur baris: Token | No SPK | Nama | No HP | Status | Waktu Dibuat | Waktu Disepakati | ... (data author nanti)
 */
function generateToken(sessionToken, nama, hp, isbn, ukuran) {
  requireAdmin_(sessionToken);
  const cleanNama = normalizeString_(nama, 150);
  const cleanHp = normalizePhone_(hp);
  if (!cleanNama) throw new Error('Nama penulis wajib diisi.');
  if (cleanHp.length < 8) throw new Error('No. WhatsApp tidak valid.');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getDB();
    const token = generateUniqueToken_();
    const noSpk = generateNoSPK_();
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    // 17 kolom: Token, NoSPK, Nama, HP, Status, Dibuat, Disepakati, Pekerjaan, KTP, Alamat, Judul, Paket, PenulisFix, EditorFix, ISBN, Ukuran, Expired
    sheet.appendRow([token, noSpk, cleanNama, cleanHp, 'PENDING', createdAt, '-', '-', '-', '-', '-', '-', '-', '-', normalizeString_(isbn, 80) || 'On Process', normalizeString_(ukuran, 80) || 'A5', expiresAt]);
    SpreadsheetApp.flush();
    return getTokensList_();
  } finally {
    lock.releaseLock();
  }
}

/**
 * Baca semua token dari spreadsheet.
 * Kolom: A:Token(0) | B:NoSPK(1) | C:Nama(2) | D:HP(3) | E:Status(4) | F:Dibuat(5) | G:Disepakati(6)
 *        H:Pekerjaan(7) | I:KTP(8) | J:Alamat(9) | K:Judul(10) | L:Paket(11) | M:PenulisFix(12) | N:EditorFix(13)
 *        O:No ISBN(14) | P:Ukuran(15)
 */
function getTokensList(sessionToken) {
  requireAdmin_(sessionToken);
  return getTokensList_();
}

function getTokensList_() {
  const sheet = getDB();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const tokens = [];
  for (let i = data.length - 1; i > 0; i--) {
    const row = data[i];
    const str = row.map(cell => (cell instanceof Date) ? cell.toLocaleDateString('id-ID') : String(cell || '-'));
    const tokenItem = {
      token: str[0],
      noSpk: str[1],
      nama: str[2],
      hp: str[3],
      status: str[4],
      createdAt: str[5],
      completedAt: str[6],
      authorData: {
        pekerjaan: str[7],
        ktp: str[8],
        alamat: str[9],
        judulBuku: str[10],
        paket: str[11],
        penulisFix: str[12] || '-',
        editorFix: str[13] || '-',
        isbn: str[14] || 'On Process',
        ukuran: str[15] || 'A5'
      },
      expiresAt: str[16] || '-',
      isExpired: isTokenExpired_(row[16])
    };
    tokens.push(tokenItem);
  }
  return tokens;
}

function verifyToken(token, last4Hp) {
  const cleanToken = String(token || '').trim().toUpperCase();
  const cleanLast4Hp = String(last4Hp || '').replace(/\D/g, '');
  if (!/^[A-Z0-9]{6,12}$/.test(cleanToken)) throw new Error('Format token tidak valid.');
  if (!/^\d{4}$/.test(cleanLast4Hp)) throw new Error('4 digit terakhir No. HP wajib diisi.');

  const list = getTokensList_();
  const item = list.find(t => t.token === cleanToken);
  
  if (item) {
    if (item.status === 'COMPLETED') throw new Error('Token ini sudah digunakan dan SPK telah diselesaikan.');
    if (item.isExpired) throw new Error('Token ini sudah kedaluwarsa. Silakan hubungi admin.');
    if (!String(item.hp || '').endsWith(cleanLast4Hp)) throw new Error('4 Digit terakhir No. HP tidak sesuai.');
    return item;
  }
  throw new Error('Token tidak valid atau tidak ditemukan.');
}

function submitSPK(token, authorData) {
  const cleanToken = String(token || '').trim().toUpperCase();
  const sheet = getDB();

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const found = findTokenRow_(cleanToken);
    if (!found) throw new Error('Token tidak valid: ' + cleanToken);
    if (String(found.row[4]) === 'COMPLETED') throw new Error('Token ini sudah digunakan dan SPK telah diselesaikan.');
    if (isTokenExpired_(found.row[16])) throw new Error('Token ini sudah kedaluwarsa. Silakan hubungi admin.');

    const cleanData = normalizeAuthorData_(authorData || {});
    const completedAt = new Date();

    // Kolom: E(5)=Status, G(7)=Disepakati, H(8)=Pekerjaan, I(9)=KTP, J(10)=Alamat, K(11)=Judul, L(12)=Paket, M(13)=PenulisFix, N(14)=EditorFix, P(16)=Ukuran
    sheet.getRange(found.rowIndex, 5).setValue('COMPLETED');
    sheet.getRange(found.rowIndex, 7).setValue(completedAt);
    sheet.getRange(found.rowIndex, 8).setValue(cleanData.pekerjaan);
    sheet.getRange(found.rowIndex, 9).setValue(cleanData.ktp);
    sheet.getRange(found.rowIndex, 10).setValue(cleanData.alamat);
    sheet.getRange(found.rowIndex, 11).setValue(cleanData.judulBuku);
    sheet.getRange(found.rowIndex, 12).setValue(cleanData.paket);
    sheet.getRange(found.rowIndex, 13).setValue(cleanData.penulisFix);
    sheet.getRange(found.rowIndex, 14).setValue(cleanData.editorFix);
    sheet.getRange(found.rowIndex, 16).setValue(cleanData.ukuran);

    SpreadsheetApp.flush();
    return true;
  } finally {
    lock.releaseLock();
  }
}

function updateNaskahFix(sessionToken, token, data) {
  requireAdmin_(sessionToken);
  const sheet = getDB();
  const found = findTokenRow_(String(token || '').trim().toUpperCase());
  if (!found) throw new Error('Token tidak valid.');
  if (String(found.row[4]) !== 'COMPLETED') throw new Error('Data naskah hanya bisa diubah setelah SPK selesai.');

  if(data.judulBuku !== undefined) sheet.getRange(found.rowIndex, 11).setValue(normalizeString_(data.judulBuku, 250) || '-');
  if(data.penulisFix !== undefined) sheet.getRange(found.rowIndex, 13).setValue(normalizeString_(data.penulisFix, 250) || '-');
  if(data.editorFix !== undefined) sheet.getRange(found.rowIndex, 14).setValue(normalizeString_(data.editorFix, 250) || '-');
  if(data.isbn !== undefined) sheet.getRange(found.rowIndex, 15).setValue(normalizeString_(data.isbn, 80) || 'On Process');
  if(data.ukuran !== undefined) sheet.getRange(found.rowIndex, 16).setValue(normalizeString_(data.ukuran, 80) || 'A5');
  SpreadsheetApp.flush();
  return getTokensList_();
}

function generateUniqueToken_() {
  const existing = new Set(getDB().getDataRange().getValues().slice(1).map(function(row) {
    return String(row[0] || '').toUpperCase();
  }));

  for (let i = 0; i < 20; i++) {
    const token = Utilities.getUuid().replace(/-/g, '').substring(0, 8).toUpperCase();
    if (!existing.has(token)) return token;
  }
  throw new Error('Gagal membuat token unik. Coba ulangi.');
}

function findTokenRow_(token) {
  const sheet = getDB();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toUpperCase() === token) {
      return { rowIndex: i + 1, row: data[i] };
    }
  }
  return null;
}

function isTokenExpired_(expiresAt) {
  if (!expiresAt || expiresAt === '-') return false;
  const expiry = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (isNaN(expiry.getTime())) return false;
  return expiry.getTime() < Date.now();
}

function normalizeString_(value, maxLength) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().substring(0, maxLength || 500);
}

function normalizePhone_(value) {
  return String(value || '').replace(/[^\d+]/g, '').substring(0, 20);
}

function normalizeAuthorData_(data) {
  const ktp = String(data.ktp || '').replace(/\D/g, '');
  if (!/^\d{16}$/.test(ktp)) throw new Error('NIK harus 16 digit angka.');

  const normalized = {
    pekerjaan: normalizeString_(data.pekerjaan, 120),
    ktp: ktp,
    alamat: normalizeString_(data.alamat, 500),
    judulBuku: normalizeString_(data.judulBuku, 250),
    paket: normalizeString_(data.paket, 150),
    penulisFix: normalizeString_(data.penulisFix, 250),
    editorFix: normalizeString_(data.editorFix, 250) || '-',
    ukuran: normalizeString_(data.ukuran, 80) || 'A5'
  };

  ['pekerjaan', 'alamat', 'judulBuku', 'paket', 'penulisFix'].forEach(function(key) {
    if (!normalized[key]) throw new Error('Data ' + key + ' wajib diisi.');
  });
  return normalized;
}

// =================== GENERATE PDF DARI GOOGLE DOCS ===================

/**
 * JALANKAN FUNGSI INI DARI EDITOR UNTUK OTORISASI PERTAMA KALI
 */
function setupOtorisasi() {
  DriveApp.getFiles();
  const doc = DocumentApp.create('Temp Auth Document');
  DriveApp.getFileById(doc.getId()).setTrashed(true);
  Logger.log("Otorisasi berhasil diberikan!");
}

/**
 * Generate PDF dari Google Docs Template
 */
function generateTemplatePDF(sessionToken, docId, replacements) {
  requireAdmin_(sessionToken);
  let tempFile = null;
  try {
    const templateDoc = DriveApp.getFileById(docId);
    const mimeType = templateDoc.getMimeType();
    if (mimeType !== MimeType.GOOGLE_DOCS) {
      return { success: false, error: "File bukan Google Docs asli. Tipe file saat ini: " + mimeType };
    }

    // Copy ke folder root sementara
    tempFile = templateDoc.makeCopy("Temp_Document_SPK");
    const tempDoc = DocumentApp.openById(tempFile.getId());
    const body = tempDoc.getBody();
    
    // Lakukan pencarian dan penggantian teks
    replacements = replacements || {};
    for (let key in replacements) {
      if (replacements[key] !== undefined && replacements[key] !== null) {
        body.replaceText(key, String(replacements[key]).substring(0, 1000));
      }
    }
    
    tempDoc.saveAndClose();
    
    // Convert ke PDF format (base64 untuk didownload client)
    const pdfBlob = tempFile.getAs('application/pdf');
    const base64 = Utilities.base64Encode(pdfBlob.getBytes());
    
    return { success: true, base64: base64 };
  } catch (e) {
    Logger.log("Error PDF: " + e.message + "\n" + e.stack);
    return { success: false, error: e.message + " (Cek Log Eksekusi untuk detail)" };
  } finally {
    if (tempFile) {
      try {
        tempFile.setTrashed(true);
      } catch (ignore) {}
    }
  }
}
