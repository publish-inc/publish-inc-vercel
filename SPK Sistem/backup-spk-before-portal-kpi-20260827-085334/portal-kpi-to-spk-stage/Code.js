function doGet(e) {
  var apiParam = e && e.parameter && String(e.parameter.api || '').toLowerCase();
  if (apiParam === 'debug_users') return ContentService.createTextOutput(JSON.stringify(getAllData('Users', H.Users))).setMimeType(ContentService.MimeType.JSON);
  if (apiParam === 'tracking') {
    return createJsonResponse_(getPublicTrackingData(e.parameter.code || '', e.parameter.phone4 || e.parameter.hp4 || ''));
  }
function debugGetAllUsers() {
  return getAllData('Users', H.Users);
}
  if (apiParam === 'final-data') {
    var apiTemplate = HtmlService.createTemplateFromFile('PublicFinalData');
    apiTemplate.publicCode = (e && e.parameter && (e.parameter.code || e.parameter.c)) || '';
    apiTemplate.publicToken = (e && e.parameter && (e.parameter.token || e.parameter.t)) || '';
    return apiTemplate
      .evaluate()
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setTitle('Finalisasi Data Naskah')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  var pageParam = (e && e.parameter && (e.parameter.page || e.parameter.p)) || '';
  if (String(pageParam || '').toLowerCase() === 'fd') pageParam = 'final-data';
  var publicCode = (e && e.parameter && (e.parameter.code || e.parameter.c)) || '';
  var publicToken = (e && e.parameter && (e.parameter.token || e.parameter.t)) || '';
  if (String(pageParam || '').toLowerCase() === 'final-data' || publicCode || publicToken) {
    var currentUrl = ScriptApp.getService().getUrl();
    var webAppUrl = currentUrl.replace(/\/dev$/, '/exec');
    var publicTemplate = HtmlService.createTemplateFromFile('PublicFinalData');
    publicTemplate.publicCode = publicCode;
    publicTemplate.publicToken = publicToken;
    publicTemplate.webAppUrl = webAppUrl;
    return publicTemplate
      .evaluate()
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setTitle('Finalisasi Data Naskah')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  var currentUrl = ScriptApp.getService().getUrl();
  var webAppUrl = currentUrl.replace(/\/dev$/, '/exec');
  var template = HtmlService.createTemplateFromFile('Index');
  template.page = pageParam;
  template.publicCode = publicCode;
  template.publicToken = publicToken;
  template.webAppUrl = webAppUrl;
  return template
    .evaluate()
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setTitle('PortaDok - Modern Document Portal')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function createJsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload || {}))
    .setMimeType(ContentService.MimeType.JSON);
}

function include(filename) {
  var template = HtmlService.createTemplateFromFile(filename);
  if (typeof template.getRawContent === 'function') {
    return template.getRawContent();
  }
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function includeCss(filename) {
  var content = include(filename);
  return String(content || '')
    .replace(/^\s*<style[^>]*>\s*/i, '')
    .replace(/\s*<\/style>\s*$/i, '');
}

// ==========================================
// SELF-HEALING DATABASE ENGINE
// ==========================================
var PORTAL_DATABASE_ID = '1ar7C6aQLGmydZiPnZ2nRhhIYNaLuDwM0paHcHuG3YWw';

function getDB() {
  if (PORTAL_DATABASE_ID) {
    try {
      return SpreadsheetApp.openById(PORTAL_DATABASE_ID);
    } catch(e) {
      throw new Error('Database utama tidak bisa diakses: ' + PORTAL_DATABASE_ID + '. Detail: ' + e);
    }
  }
  
  // Jika script dibuat standalone (bukan dari dalam Spreadsheet)
  var props = PropertiesService.getScriptProperties();
  var dbId = props.getProperty('DB_ID');
  if (dbId) {
    try {
      return SpreadsheetApp.openById(dbId);
    } catch(e) {}
  }
  
  // Auto-create database Spreadsheet jika belum ada
  var newSs = SpreadsheetApp.create('Database PortaDok');
  props.setProperty('DB_ID', newSs.getId());
  return newSs;
}

function getDBTimezone() {
  return getDB().getSpreadsheetTimeZone();
}

function dbCacheKey_(sheetName) {
  return 'DB_' + (PORTAL_DATABASE_ID || 'ACTIVE_SPREADSHEET') + '_' + sheetName;
}

function clearDBCache_(sheetName) {
  var cache = CacheService.getScriptCache();
  cache.remove(dbCacheKey_(sheetName));
  cache.remove('DB_' + sheetName);
}

function ensureSheet(sheetName, headers) {
  var ss = getDB();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  } else {
    var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
    if (existingHeaders.length === 0 || existingHeaders[0] === "") {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
        var missingHeaders = [];
        headers.forEach(function(h) {
            if (existingHeaders.indexOf(h) === -1) missingHeaders.push(h);
        });
        if (missingHeaders.length > 0) {
            sheet.getRange(1, existingHeaders.length + 1, 1, missingHeaders.length).setValues([missingHeaders]);
        }
    }
  }
  return sheet;
}

function getAllData(sheetName, headers) {
  var cache = CacheService.getScriptCache();
  var cacheKey = dbCacheKey_(sheetName);
  var cached = cache.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch(e) {}
  }

  var sheet = ensureSheet(sheetName, headers || []);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var result = [];
  var currentHeaders = data[0];
  var tz = getDBTimezone();
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < currentHeaders.length; j++) {
      var val = data[i][j];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, tz, "yyyy-MM-dd");
      }
      if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try { val = JSON.parse(val); } catch(e) {}
      }
      obj[currentHeaders[j]] = val;
    }
    result.push(obj);
  }

  try {
    var jsonString = JSON.stringify(result);
    if (jsonString.length < 100000) { // Limit 100KB per key for CacheService
      cache.put(cacheKey, jsonString, 1800); // cache for 30 minutes
    }
  } catch(e) {}

  return result;
}

function saveData(sheetName, headers, payload, idField) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  var writtenRow = 0;
  try {
    var sheet = ensureSheet(sheetName, headers);
    var data = sheet.getDataRange().getValues();
    var currentHeaders = data[0];
    var rowIndex = -1;
    idField = idField || 'id';
    
    if (payload[idField]) {
      var idColIndex = currentHeaders.indexOf(idField);
      for (var i = 1; i < data.length; i++) {
        if (data[i][idColIndex] == payload[idField]) {
          rowIndex = i + 1;
          break;
        }
      }
    }
    
    var rowData = [];
    for (var j = 0; j < currentHeaders.length; j++) {
      var header = currentHeaders[j];
      var val = payload[header];
      if (val === undefined) {
        val = (rowIndex !== -1) ? data[rowIndex-1][j] : "";
      } else if (typeof val === 'object' && val !== null) {
        val = JSON.stringify(val);
      }
      rowData.push(val);
    }
    
    if (rowIndex !== -1) {
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
      writtenRow = rowIndex;
    } else {
      var trueLastRow = 0;
      for (var r = data.length - 1; r >= 0; r--) {
        if (data[r].join("").length > 0) {
          trueLastRow = r + 1;
          break;
        }
      }
      if (trueLastRow === 0) trueLastRow = 1;
      
      var targetRow = trueLastRow + 1;
      if (targetRow > sheet.getMaxRows()) {
        sheet.insertRowAfter(sheet.getMaxRows());
      }
      sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
      writtenRow = targetRow;
    }
    SpreadsheetApp.flush();
    return {success: true, sheetName: sheetName, row: writtenRow, lastRow: sheet.getLastRow()};
  } catch(e) {
    return {success: false, error: e.toString()};
  } finally {
    clearDBCache_(sheetName);
    lock.releaseLock();
  }
}

function appendDebugLog_(action, payload) {
  try {
    var ss = getDB();
    var sheet = ss.getSheetByName('DebugLog');
    if (!sheet) {
      sheet = ss.insertSheet('DebugLog');
      sheet.appendRow(['timestamp', 'action', 'dealId', 'naskahId', 'spreadsheetUrl', 'details']);
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([
      Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd HH:mm:ss'),
      action || '',
      payload && payload.dealId || '',
      payload && payload.naskahId || '',
      ss.getUrl(),
      JSON.stringify(payload || {})
    ]);
    SpreadsheetApp.flush();
  } catch (e) {
    // Debug logging must never block the main save flow.
  }
}

function deleteData(sheetName, idField, idValue) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sheet = getDB().getSheetByName(sheetName);
    if (!sheet) return {success: false};
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return {success: false};
    var idColIndex = data[0].indexOf(idField);
    for (var i = 1; i < data.length; i++) {
      if (data[i][idColIndex] == idValue) {
        sheet.deleteRow(i + 1);
        SpreadsheetApp.flush();
        return {success: true};
      }
    }
    return {success: false};
  } catch(e) {
    return {success: false, error: e.toString()};
  } finally {
    clearDBCache_(sheetName);
    lock.releaseLock();
  }
}

// TABLES HEADERS (Data Model)
var H = {
  Users: ['username', 'password', 'nama', 'role', 'employeeId', 'alamat', 'telepon', 'tanggalLahir', 'jenisKelamin', 'email', 'bankName', 'bankAccountNumber', 'bankAccountName', 'statusKaryawan', 'profileComplete', 'resetRequested', 'resetRequestedAt', 'resetTempPassword', 'departemen', 'jabatan'],
  Deals: ['id', 'csName', 'penulis', 'noHpPenulis', 'kotaAsal', 'judul', 'penerbit', 'paket', 'percepatanProses', 'nilai', 'nominalDP', 'statusPayment', 'deadline', 'estimasiHalaman', 'estimasiKata', 'ukuran', 'spesifikasiCetak', 'catatan', 'tanggal', 'statusProses', 'nominalPelunasan', 'tanggalPelunasan', 'butuhProofreading', 'source', 'kategori', 'importedAt', 'transaksiTambahan', 'archivedAt', 'trackingCode', 'baseDeadline', 'deadlinePlan', 'assignedCssUsername', 'assignedCssName'],
  DealArchive: ['id', 'csName', 'penulis', 'noHpPenulis', 'kotaAsal', 'judul', 'penerbit', 'paket', 'percepatanProses', 'nilai', 'nominalDP', 'statusPayment', 'deadline', 'estimasiHalaman', 'estimasiKata', 'ukuran', 'spesifikasiCetak', 'catatan', 'tanggal', 'statusProses', 'nominalPelunasan', 'tanggalPelunasan', 'butuhProofreading', 'source', 'kategori', 'importedAt', 'transaksiTambahan', 'archivedAt', 'trackingCode', 'baseDeadline', 'deadlinePlan', 'assignedCssUsername', 'assignedCssName'],
  Naskah: ['id', 'dealId', 'judul', 'penulis', 'cs', 'penerbit', 'paket', 'percepatanProses', 'ukuran', 'estimasiHalaman', 'estimasiKata', 'spesifikasiCetak', 'tanggal', 'timeline', 'lengkap', 'batasRevisiProofreading', 'batasRevisiLayout', 'revisiProofreading', 'revisiLayout', 'statusIsbn', 'tindakanIsbn', 'picEditor', 'picLayouter', 'statusEditor', 'statusLayouter', 'deadlines', 'catatanCS', 'statusProses', 'source', 'kpiEligibleFrom', 'butuhProofreading', 'kotaAsal', 'cancelReason', 'cancelRequestedBy', 'cancelRequestedAt', 'cancelApprovedAt', 'trackingCode', 'baseDeadlines', 'trackingDelays', 'deadlinePlan', 'noHpPenulis', 'assignedCssUsername', 'assignedCssName', 'statusProduksi', 'statusDistribusi', 'intakeStatus', 'finalDataToken', 'finalDataSubmittedAt', 'finalJudul', 'finalPenulisUtama', 'finalPenulisList', 'finalEditorList', 'adminLoaDone', 'adminKeaslianPdfDone', 'adminKeaslianWordDone', 'adminDoneAt', 'adminKpiClaimed', 'productionStartedAt', 'picQueueStatus', 'picQueuedAt', 'picEditorQueueStatus', 'picEditorQueuedAt', 'picLayouterQueueStatus', 'picLayouterQueuedAt', 'cssKpiClaimed', 'statusEditorUpdatedAt', 'statusLayouterUpdatedAt'],
  NaskahArchive: ['id', 'dealId', 'judul', 'penulis', 'cs', 'penerbit', 'paket', 'percepatanProses', 'ukuran', 'estimasiHalaman', 'estimasiKata', 'spesifikasiCetak', 'tanggal', 'timeline', 'lengkap', 'batasRevisiProofreading', 'batasRevisiLayout', 'revisiProofreading', 'revisiLayout', 'statusIsbn', 'tindakanIsbn', 'picEditor', 'picLayouter', 'statusEditor', 'statusLayouter', 'deadlines', 'catatanCS', 'statusProses', 'source', 'kpiEligibleFrom', 'butuhProofreading', 'kotaAsal', 'cancelReason', 'cancelRequestedBy', 'cancelRequestedAt', 'cancelApprovedAt', 'trackingCode', 'baseDeadlines', 'trackingDelays', 'deadlinePlan', 'noHpPenulis', 'assignedCssUsername', 'assignedCssName', 'statusProduksi', 'statusDistribusi', 'intakeStatus', 'finalDataToken', 'finalDataSubmittedAt', 'finalJudul', 'finalPenulisUtama', 'finalPenulisList', 'finalEditorList', 'adminLoaDone', 'adminKeaslianPdfDone', 'adminKeaslianWordDone', 'adminDoneAt', 'adminKpiClaimed', 'productionStartedAt', 'picQueueStatus', 'picQueuedAt', 'picEditorQueueStatus', 'picEditorQueuedAt', 'picLayouterQueueStatus', 'picLayouterQueuedAt', 'cssKpiClaimed', 'statusEditorUpdatedAt', 'statusLayouterUpdatedAt', 'archivedAt', 'archivedBy', 'archiveReason', 'archiveRequestId'],
  Kendala: ['id', 'naskahId', 'judul', 'jenis', 'keterangan', 'tanggal'],
  Target: ['username', 'targetTerbit', 'targetCetak', 'targetOmzet', 'targetKata', 'targetHalaman', 'targetPerJenis'],
  KPI: ['id', 'picName', 'tanggal', 'judul', 'jenis', 'jumlahKata', 'jumlahHalaman', 'jumlahUmum', 'jumlahKinerja', 'qualityControl', 'qcResult', 'qcErrorCount', 'evalLayouter', 'evalTarget', 'evalCapaian', 'evalMet', 'nominal', 'spesifikasi', 'kotaAsal', 'statusPayment', 'nominalDP', 'nominalPelunasan', 'tanggalPelunasan', 'transaksiTambahan'],
  KPIArchive: ['id', 'picName', 'tanggal', 'judul', 'jenis', 'jumlahKata', 'jumlahHalaman', 'jumlahUmum', 'jumlahKinerja', 'qualityControl', 'qcResult', 'qcErrorCount', 'evalLayouter', 'evalTarget', 'evalCapaian', 'evalMet', 'nominal', 'spesifikasi', 'kotaAsal', 'statusPayment', 'nominalDP', 'nominalPelunasan', 'tanggalPelunasan', 'transaksiTambahan', 'archivedAt'],
  CetakJobs: ['id', 'kpiId', 'tanggal', 'nilaiKpi', 'judul', 'kotaAsal', 'ukuran', 'warna', 'jumlahHalWarna', 'jenisKertas', 'cover', 'jumlahEks', 'nominal', 'statusPayment', 'nominalDP', 'deadlineSelesai', 'deadlineAwal', 'statusCetak', 'csUsername', 'csName', 'delayHistory', 'selesaiCetakAt', 'selesaiCetakBy', 'createdAt', 'updatedAt'],
  KPIReq: ['id', 'kpiId', 'action', 'picName', 'jenis', 'judul', 'oldData', 'proposedData', 'alasan', 'requestBy', 'role', 'status', 'requestDate', 'approvedAt'],
  KPIReqArchive: ['id', 'kpiId', 'action', 'picName', 'jenis', 'judul', 'oldData', 'proposedData', 'alasan', 'requestBy', 'role', 'status', 'requestDate', 'approvedAt', 'archivedAt'],
  Surat: ['no', 'jenis', 'judulNaskah', 'penulis', 'penerbit', 'paket', 'tanggal', 'pengambil', 'hidden', 'hiddenMonth', 'hiddenAt', 'hiddenBy'],
  Stok: ['id', 'judul', 'gudang', 'stok', 'lastUpdate'],
  Penjualan: ['id', 'judul', 'marketplace', 'qty', 'hargaJual', 'tanggal', 'gudang'],
  DeleteReq: ['id', 'naskahId', 'judul', 'penulis', 'cs', 'penerbit', 'paket', 'tanggalMasuk', 'durasiHari', 'jumlahKata', 'jumlahHalaman', 'alasan', 'requestBy', 'role', 'status', 'requestDate'],
  Event: ['id', 'nama', 'tanggal', 'lokasi', 'status'],
  Konten: ['id', 'judul', 'platform', 'tanggal', 'status'],
  Broadcast: ['id', 'nama', 'tanggal', 'platform', 'status'],
  Kehadiran: ['id', 'tanggal', 'karyawan', 'status', 'keterangan'],
  Mitra: ['id', 'program', 'nama', 'nik', 'email', 'wa', 'tgl_lahir', 'instansi', 'jenis_instansi', 'jabatan', 'skala', 'alamat', 'bank', 'rekening', 'an_rekening', 'waktuDaftar', 'level_mitra'],
  Komisi: ['id', 'mitra_id', 'mitra_nama', 'mitra_program', 'tgl_referensi', 'calon_penulis', 'kontak_penulis', 'instansi_penulis', 'jenis_layanan', 'status', 'omset', 'persen', 'nominal_komisi', 'status_bayar'],
  SettingsPub: ['id', 'nama', 'paket'],
  SettingsKPI: ['id', 'nama', 'role'],
  Briefing: ['id', 'tanggal', 'judul', 'summary', 'createdBy', 'createdAt', 'updatedAt', 'hidden'],
  DeadlineSettings: ['id', 'penerbit', 'paket', 'totalHari', 'administrasi', 'proofreading', 'layout', 'isbn', 'produksi', 'distribusi', 'selesai', 'updatedAt'],
  HolidaySettings: ['id', 'tanggal', 'nama', 'active', 'updatedAt'],
  DelayReasons: ['id', 'stageKey', 'reasonCode', 'label', 'needsNote', 'active', 'updatedAt'],
  Messages: ['id', 'fromUsername', 'fromName', 'toUsername', 'toName', 'naskahId', 'judulNaskah', 'trackingCode', 'message', 'createdAt', 'readAt', 'status', 'deleted', 'deletedAt'],
  InternalMemo: ['id', 'nomorMemo', 'tanggalMemo', 'expiredAt', 'isiMemo', 'pdfUrl', 'pembuatNama', 'pembuatJabatan', 'createdBy', 'createdAt', 'status'],
  Notifications: ['id', 'toUsername', 'type', 'title', 'body', 'targetTab', 'targetId', 'messageId', 'createdAt', 'readAt', 'status', 'deleted', 'deletedAt'],
  GlobalState: ['key', 'value'],
  PayrollConfig: ['username', 'nama', 'role', 'gajiPokok', 'tunjangan', 'tunjanganDetail', 'rewardEnabled', 'targetKpi', 'rewardRate', 'rewardTargetRules', 'rewardBasis', 'rewardPackageRates', 'potonganDetail'],
  PayrollHistory: ['id', 'bulanTahun', 'username', 'nama', 'role', 'departemen', 'statusKaryawan', 'bankName', 'bankAccountNumber', 'bankAccountName', 'hrdName', 'pimpinanRedaksiName', 'gajiPokok', 'tunjangan', 'tunjanganDetail', 'potonganKehadiran', 'potonganDetail', 'rewardKpi', 'rewardDetail', 'gajiBersih', 'listKehadiran', 'status', 'createdAt', 'createdBy']
};

var SYSTEM_KPI_TYPES = [
  { nama: 'Pendampingan', role: 'css' },
  { nama: 'Administrasi', role: 'admin' }
];

function isSystemKpiType_(nama, role) {
  var nameKey = String(nama || '').trim().toLowerCase();
  var roleKey = normalizeRole_(role || '');
  return SYSTEM_KPI_TYPES.some(function(item) {
    return String(item.nama || '').toLowerCase() === nameKey && normalizeRole_(item.role || '') === roleKey;
  });
}

// ================= API ENDPOINTS =================

function loginAuth(u, p) {
  var users = getAllData('Users', H.Users);
  if (users.length === 0) {
     saveData('Users', H.Users, {username:'manajemen', password:'123', nama:'Direktur Utama', role:'manajemen', employeeId:'EMP-001', profileComplete:'1'}, 'username');
     saveData('Users', H.Users, {username:'report', password:'123', nama:'Report Display', role:'report', employeeId:'RPT-001', profileComplete:'1'}, 'username');
     saveData('Users', H.Users, {username:'admin', password:'123', nama:'Admin Persuratan', role:'admin', employeeId:'EMP-002', profileComplete:'0'}, 'username');
     saveData('Users', H.Users, {username:'cs', password:'123', nama:'Customer Service', role:'cs', employeeId:'EMP-003', profileComplete:'0'}, 'username');
     saveData('SettingsPub', H.SettingsPub, {id:'PUB-1', nama:'Nasmedia', paket:JSON.stringify(['Exclusive','Express','Advance'])}, 'id');
     saveData('SettingsKPI', H.SettingsKPI, {id:'JKPI-1', nama:'Proofreading', role:'editor'}, 'id');
     saveData('GlobalState', H.GlobalState, {key:'passwordDeal', value:'admin123'}, 'key');
     users = getAllData('Users', H.Users);
  }
  var username = String(u || '').trim().toLowerCase();
  if (String(p || '') === '') return { success: false, message: 'Password wajib diisi!' };
  for (var i=0; i<users.length; i++) {
    if (String(users[i].username || '').trim().toLowerCase() === username && String(users[i].password) === String(p)) {
      var userRole = normalizeRole_(users[i].role);
      if (userRole === 'karyawan') {
        return { success: false, message: 'Data karyawan ini hanya digunakan untuk kehadiran dan tidak memiliki akses portal.' };
      }
      var needsProfileSetup = userRole !== 'manajemen' && userRole !== 'pimpinan' && userRole !== 'report' && userRole !== 'hrd' && String(users[i].profileComplete || '') !== '1';
      return { success: true, data: {
        nama: users[i].nama,
        role: userRole,
        username: users[i].username,
        employeeId: users[i].employeeId || '',
        alamat: users[i].alamat || '',
        telepon: users[i].telepon || '',
        tanggalLahir: users[i].tanggalLahir || '',
        email: users[i].email || '',
        needsProfileSetup: needsProfileSetup
      } };
    }
  }
  return { success: false, message: 'Username atau password salah!' };
}

function getUsersData() { return { success: true, data: getAllData('Users', H.Users) }; }
function getDefaultCssUser_() {
  var users = getAllData('Users', H.Users);
  for (var i = 0; i < users.length; i++) {
    if (normalizeRole_(users[i].role) === 'css') {
      return { username: users[i].username || '', nama: users[i].nama || users[i].username || '' };
    }
  }
  return { username: '', nama: '' };
}

function nowDateTime_() {
  return Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd HH:mm:ss');
}

function parseDateTime_(value) {
  if (value instanceof Date) return value;
  var text = String(value || '').trim();
  if (!text) return null;
  var date = new Date(text.replace(' ', 'T'));
  if (isNaN(date.getTime())) return null;
  return date;
}

function isOlderThanDays_(dateText, days) {
  var date = parseDateTime_(dateText);
  if (!date) return false;
  return (new Date().getTime() - date.getTime()) >= (Number(days || 0) * 24 * 60 * 60 * 1000);
}

function cleanupReadMessages_() {
  var now = nowDateTime_();
  var changedMessages = 0;
  var messages = getAllData('Messages', H.Messages);
  messages.forEach(function(m) {
    if (String(m.deleted || '') === '1') return;
    if (String(m.status || '').toLowerCase() === 'read' && m.readAt && isOlderThanDays_(m.readAt, 7)) {
      m.deleted = '1';
      m.deletedAt = now;
      saveData('Messages', H.Messages, m, 'id');
      changedMessages++;
    }
  });
  var changedNotifications = 0;
  var notifications = getAllData('Notifications', H.Notifications);
  notifications.forEach(function(n) {
    if (String(n.deleted || '') === '1') return;
    if (String(n.status || '').toLowerCase() === 'read' && n.readAt && isOlderThanDays_(n.readAt, 7)) {
      n.deleted = '1';
      n.deletedAt = now;
      saveData('Notifications', H.Notifications, n, 'id');
      changedNotifications++;
    }
  });
  return { messages: changedMessages, notifications: changedNotifications };
}

function findPortalUserByUsername_(username) {
  var key = String(username || '').toLowerCase();
  var users = getAllData('Users', H.Users);
  for (var i = 0; i < users.length; i++) {
    if (String(users[i].username || '').toLowerCase() === key) return users[i];
  }
  return null;
}

function findPortalUserByName_(name) {
  var key = String(name || '').trim().toLowerCase();
  if (!key) return null;
  var users = getAllData('Users', H.Users);
  for (var i = 0; i < users.length; i++) {
    if (String(users[i].nama || '').trim().toLowerCase() === key) return users[i];
  }
  return null;
}

function getGlobalStateValue_(key) {
  var rows = getAllData('GlobalState', H.GlobalState);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].key || '') === String(key || '')) return rows[i].value;
  }
  return '';
}

function setGlobalStateValue_(key, value) {
  return saveData('GlobalState', H.GlobalState, { key: key, value: value }, 'key');
}

function getMessageUsers() {
  var users = getAllData('Users', H.Users).filter(function(u) {
    var role = normalizeRole_(u.role);
    return u.username && role !== 'karyawan' && role !== 'report';
  }).map(function(u) {
    return { username: u.username, nama: u.nama || u.username, role: normalizeRole_(u.role) };
  });
  return { success: true, data: users };
}

function getMessageNaskahOptions(query) {
  query = String(query || '').trim().toLowerCase();
  var rows = getAllData('Naskah', H.Naskah).filter(function(n) {
    if (String(n.cancelApprovedAt || '')) return false;
    var hay = [n.judul, n.penulis, n.trackingCode, n.penerbit, n.paket].join(' ').toLowerCase();
    return !query || hay.indexOf(query) !== -1;
  }).slice(0, 80).map(function(n) {
    return {
      id: n.id || '',
      judul: n.judul || '',
      penulis: n.penulis || '',
      penerbit: n.penerbit || '',
      paket: n.paket || '',
      trackingCode: n.trackingCode || ''
    };
  });
  return { success: true, data: rows };
}

function memoRoleLabel_(role) {
  var map = {
    manajemen: 'Manajemen',
    pimpinan: 'Pimpinan',
    cs: 'Customer Service',
    css: 'Customer Success',
    admin: 'Admin Persuratan',
    campaign: 'Tim Campaign',
    admin_marketplace: 'Admin Marketplace',
    editor: 'Editor',
    layouter: 'Layouter',
    pic_editor: 'PIC Editor',
    pic_layouter: 'PIC Layouter'
  };
  role = normalizeRole_(role);
  return map[role] || role || '';
}

function isOperationalMemoRole_(role) {
  role = normalizeRole_(role);
  return ['cs', 'css', 'admin', 'campaign', 'admin_marketplace', 'editor', 'layouter', 'pic_editor', 'pic_layouter'].indexOf(role) !== -1;
}

function canCreateMemo_(role) {
  role = normalizeRole_(role);
  return role === 'manajemen' || role === 'pimpinan';
}

function getInternalMemos(username) {
  var user = findPortalUserByUsername_(username);
  if (!user) return { success: false, message: 'User tidak ditemukan.' };
  var role = normalizeRole_(user.role);
  var today = Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd');
  var canManage = canCreateMemo_(role);
  var rows = getAllData('InternalMemo', H.InternalMemo).filter(function(m) {
    if (String(m.status || 'active') !== 'active') return false;
    if (!canManage && String(m.expiredAt || '') && String(m.expiredAt || '') < today) return false;
    return true;
  }).sort(function(a, b) {
    return String(b.tanggalMemo || b.createdAt || '').localeCompare(String(a.tanggalMemo || a.createdAt || ''));
  });
  return { success: true, data: rows, meta: { canCreate: canManage, role: role } };
}

function createInternalMemo(payload) {
  payload = payload || {};
  var username = String(payload.createdBy || '').trim();
  var user = findPortalUserByUsername_(username);
  if (!user) return { success: false, message: 'User pembuat memo tidak ditemukan.' };
  var role = normalizeRole_(user.role);
  if (!canCreateMemo_(role)) return { success: false, message: 'Akses membuat memo hanya untuk manajemen dan pimpinan.' };

  var nomorMemo = String(payload.nomorMemo || '').trim();
  var tanggalMemo = String(payload.tanggalMemo || '').trim();
  var isiMemo = String(payload.isiMemo || '').trim();
  if (!nomorMemo || !tanggalMemo || !isiMemo) return { success: false, message: 'Nomor, tanggal, dan isi memo wajib diisi.' };

  var now = nowDateTime_();
  var row = {
    id: 'MEMO-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000),
    nomorMemo: nomorMemo,
    tanggalMemo: tanggalMemo,
    expiredAt: String(payload.expiredAt || '').trim(),
    isiMemo: isiMemo,
    pdfUrl: String(payload.pdfUrl || '').trim(),
    pembuatNama: String(payload.pembuatNama || user.nama || username).trim(),
    pembuatJabatan: String(payload.pembuatJabatan || memoRoleLabel_(role)).trim(),
    createdBy: username,
    createdAt: now,
    status: 'active'
  };
  var saved = saveData('InternalMemo', H.InternalMemo, row, 'id');
  if (!saved.success) return saved;

  var recipients = {};
  getAllData('Users', H.Users).forEach(function(u) {
    var userRole = normalizeRole_(u.role);
    if (isOperationalMemoRole_(userRole)) recipients[String(u.username || '').toLowerCase()] = u.username;
    if (role === 'manajemen' && userRole === 'pimpinan') recipients[String(u.username || '').toLowerCase()] = u.username;
  });
  Object.keys(recipients).forEach(function(key) {
    if (!recipients[key]) return;
    createNotification_({
      toUsername: recipients[key],
      type: 'memo',
      title: 'Internal Memo Baru',
      body: row.nomorMemo + ' - ' + row.pembuatNama,
      targetTab: 'memo',
      targetId: row.id,
      messageId: row.id,
      createdAt: now
    });
  });
  return { success: true, data: row };
}

function createNotification_(payload) {
  payload = payload || {};
  if (!payload.toUsername) return { success: false, message: 'Penerima notifikasi kosong.' };
  var row = {
    id: payload.id || ('NTF-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000)),
    toUsername: payload.toUsername || '',
    type: payload.type || 'message',
    title: payload.title || '',
    body: payload.body || '',
    targetTab: payload.targetTab || '',
    targetId: payload.targetId || '',
    messageId: payload.messageId || '',
    createdAt: payload.createdAt || nowDateTime_(),
    readAt: '',
    status: 'unread',
    deleted: '',
    deletedAt: ''
  };
  return saveData('Notifications', H.Notifications, row, 'id');
}

function notifyRoleUsers_(roleNames, payload) {
  payload = payload || {};
  var allowed = {};
  (Array.isArray(roleNames) ? roleNames : [roleNames]).forEach(function(roleName) {
    allowed[normalizeRole_(roleName)] = true;
  });
  getAllData('Users', H.Users).forEach(function(user) {
    var role = normalizeRole_(user.role);
    if (!allowed[role]) return;
    if (role === 'karyawan' || role === 'report') return;
    createNotification_(Object.assign({}, payload, {
      toUsername: user.username
    }));
  });
}

function sendInternalMessage(payload) {
  cleanupReadMessages_();
  payload = payload || {};
  var fromUsername = String(payload.fromUsername || '').trim();
  var toUsername = String(payload.toUsername || '').trim();
  var message = String(payload.message || '').trim();
  if (!fromUsername || !toUsername) return { success: false, message: 'Pengirim dan penerima wajib tersedia.' };
  if (!message) return { success: false, message: 'Pesan tidak boleh kosong.' };
  if (message.length > 1000) message = message.substring(0, 1000);
  var fromUser = findPortalUserByUsername_(fromUsername) || {};
  var toUser = findPortalUserByUsername_(toUsername);
  if (!toUser) return { success: false, message: 'Penerima tidak ditemukan.' };
  var naskahId = payload.naskahId || '';
  var judulNaskah = payload.judulNaskah || '';
  var trackingCode = payload.trackingCode || '';
  if (naskahId) {
    var naskahRows = getAllData('Naskah', H.Naskah);
    for (var i = 0; i < naskahRows.length; i++) {
      if (String(naskahRows[i].id || '') === String(naskahId)) {
        judulNaskah = judulNaskah || naskahRows[i].judul || '';
        trackingCode = trackingCode || naskahRows[i].trackingCode || '';
        break;
      }
    }
  }
  var now = nowDateTime_();
  var row = {
    id: 'MSG-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000),
    fromUsername: fromUsername,
    fromName: payload.fromName || fromUser.nama || fromUsername,
    toUsername: toUsername,
    toName: toUser.nama || toUsername,
    naskahId: naskahId,
    judulNaskah: judulNaskah,
    trackingCode: trackingCode,
    message: message,
    createdAt: now,
    readAt: '',
    status: 'unread',
    deleted: '',
    deletedAt: ''
  };
  var saved = saveData('Messages', H.Messages, row, 'id');
  if (!saved.success) return saved;
  createNotification_({
    toUsername: toUsername,
    type: 'message',
    title: 'Pesan baru dari ' + row.fromName,
    body: judulNaskah ? (judulNaskah + ': ' + message) : message,
    targetTab: 'pesan',
    targetId: row.id,
    messageId: row.id,
    createdAt: now
  });
  return { success: true, data: row };
}

function getInternalMessages(username) {
  cleanupReadMessages_();
  var key = String(username || '').toLowerCase();
  var user = findPortalUserByUsername_(username);
  var role = user ? normalizeRole_(user.role) : '';
  var rows = getAllData('Messages', H.Messages).filter(function(m) {
    if (String(m.deleted || '') === '1') return false;
    if (role === 'manajemen') return true;
    return String(m.fromUsername || '').toLowerCase() === key || String(m.toUsername || '').toLowerCase() === key;
  }).sort(function(a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); });
  return { success: true, data: rows };
}

function getUnreadNotifications(username) {
  cleanupReadMessages_();
  var key = String(username || '').toLowerCase();
  var rows = getAllData('Notifications', H.Notifications).filter(function(n) {
    return String(n.deleted || '') !== '1' && String(n.toUsername || '').toLowerCase() === key && String(n.status || 'unread') !== 'read';
  }).sort(function(a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); });
  return { success: true, data: rows };
}

function markNotificationRead(id) {
  var rows = getAllData('Notifications', H.Notifications);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id || '') === String(id || '')) {
      rows[i].status = 'read';
      rows[i].readAt = nowDateTime_();
      return saveData('Notifications', H.Notifications, rows[i], 'id');
    }
  }
  return { success: false, message: 'Notifikasi tidak ditemukan.' };
}

function markMessageRead(id, username) {
  var rows = getAllData('Messages', H.Messages);
  var key = String(username || '').toLowerCase();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id || '') === String(id || '') && String(rows[i].toUsername || '').toLowerCase() === key) {
      rows[i].status = 'read';
      rows[i].readAt = nowDateTime_();
      return saveData('Messages', H.Messages, rows[i], 'id');
    }
  }
  return { success: true };
}

function getMessageArchiveMonths() {
  cleanupReadMessages_();
  var months = {};
  getAllData('Messages', H.Messages).forEach(function(m) {
    if (String(m.deleted || '') !== '1') return;
    var month = String(m.deletedAt || '').slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(month)) months[month] = true;
  });
  return { success: true, data: Object.keys(months).sort().reverse() };
}

function purgeMessageArchiveMonth(month) {
  month = String(month || '').trim();
  if (!/^\d{4}-\d{2}$/.test(month)) return { success: false, message: 'Bulan arsip tidak valid.' };
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var ss = getDB();
    var msgSheet = ensureSheet('Messages', H.Messages);
    var msgData = msgSheet.getDataRange().getValues();
    var msgHeaders = msgData[0] || [];
    var msgDeletedIdx = msgHeaders.indexOf('deleted');
    var msgDeletedAtIdx = msgHeaders.indexOf('deletedAt');
    var msgIdIdx = msgHeaders.indexOf('id');
    var purgedMessageIds = {};
    var messageCount = 0;
    for (var i = msgData.length - 1; i >= 1; i--) {
      if (String(msgData[i][msgDeletedIdx] || '') === '1' && String(msgData[i][msgDeletedAtIdx] || '').slice(0, 7) === month) {
        purgedMessageIds[String(msgData[i][msgIdIdx] || '')] = true;
        msgSheet.deleteRow(i + 1);
        messageCount++;
      }
    }

    var notifSheet = ensureSheet('Notifications', H.Notifications);
    var notifData = notifSheet.getDataRange().getValues();
    var notifHeaders = notifData[0] || [];
    var notifDeletedIdx = notifHeaders.indexOf('deleted');
    var notifDeletedAtIdx = notifHeaders.indexOf('deletedAt');
    var notifMessageIdIdx = notifHeaders.indexOf('messageId');
    var notificationCount = 0;
    for (var j = notifData.length - 1; j >= 1; j--) {
      var deletedInMonth = String(notifData[j][notifDeletedIdx] || '') === '1' && String(notifData[j][notifDeletedAtIdx] || '').slice(0, 7) === month;
      var linkedToPurgedMessage = purgedMessageIds[String(notifData[j][notifMessageIdIdx] || '')];
      if (deletedInMonth || linkedToPurgedMessage) {
        notifSheet.deleteRow(j + 1);
        notificationCount++;
      }
    }
    SpreadsheetApp.flush();
    CacheService.getScriptCache().remove('DB_Messages');
    CacheService.getScriptCache().remove('DB_Notifications');
    return { success: true, data: { messages: messageCount, notifications: notificationCount } };
  } catch(e) {
    return { success: false, error: e.toString() };
  } finally {
    lock.releaseLock();
  }
}

function notifyNaskahAssignment_(current, previous) {
  current = current || {};
  previous = previous || {};
  var targets = [
    { field: 'picEditor', statusField: 'statusEditor', label: 'Proofreading', tab: 'tugas_naskah' },
    { field: 'picLayouter', statusField: 'statusLayouter', label: 'Layout', tab: 'tugas_naskah' }
  ];
  targets.forEach(function(t) {
    var newName = String(current[t.field] || '').trim();
    var oldName = String(previous[t.field] || '').trim();
    if (!newName || newName === oldName) return;
    var user = findPortalUserByName_(newName);
    if (!user || normalizeRole_(user.role) === 'karyawan' || normalizeRole_(user.role) === 'report') return;
    createNotification_({
      toUsername: user.username,
      type: 'assignment',
      title: 'Tugas naskah baru',
      body: (current.judul || 'Naskah') + ' ditugaskan untuk ' + t.label + '.',
      targetTab: t.tab,
      targetId: current.id || '',
      createdAt: nowDateTime_()
    });
  });
}

function notifyNewDealNaskah_(naskah, cssUser) {
  naskah = naskah || {};
  var now = nowDateTime_();
  var recipients = {};
  function addRecipient(user, tab, title, body) {
    if (!user || !user.username) return;
    var role = normalizeRole_(user.role);
    if (role === 'karyawan' || role === 'report') return;
    recipients[String(user.username).toLowerCase()] = {
      username: user.username,
      tab: tab,
      title: title,
      body: body
    };
  }

  var judul = naskah.judul || 'Naskah baru';
  var detail = [naskah.penerbit, naskah.paket].filter(function(v) { return String(v || '').trim(); }).join(' - ');
  var csText = naskah.cs ? (' dari ' + naskah.cs) : '';
  var isIntakeOnly = String(naskah.intakeStatus || '').toLowerCase() === 'waiting_final_data' ||
    String(naskah.statusProses || '').toLowerCase() === 'naskah baru';
  if (cssUser && cssUser.username) {
    addRecipient(
      cssUser,
      isIntakeOnly ? 'naskah_baru' : 'progres',
      'Naskah baru dari CS',
      judul + (detail ? ' (' + detail + ')' : '') + csText + ' ditugaskan ke Anda.'
    );
  }

  if (!isIntakeOnly) {
    getAllData('Users', H.Users).forEach(function(user) {
      var role = normalizeRole_(user.role);
      if (role !== 'pic_editor' && role !== 'pic_layouter') return;
      addRecipient(
        user,
        'naskah',
        'Naskah baru dari CS',
        judul + (detail ? ' (' + detail + ')' : '') + csText + ' masuk ke database naskah.'
      );
    });
  }

  Object.keys(recipients).forEach(function(key) {
    var r = recipients[key];
    createNotification_({
      toUsername: r.username,
      type: 'assignment',
      title: r.title,
      body: r.body,
      targetTab: r.tab,
      targetId: naskah.id || '',
      messageId: naskah.id || '',
      createdAt: now
    });
  });
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function isValidPhone_(phone) {
  return /^[0-9]{5,18}$/.test(String(phone || '').trim());
}

function isValidDateText_(value) {
  var text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  var parts = text.split('-');
  var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (date.getFullYear() !== Number(parts[0]) || date.getMonth() !== Number(parts[1]) - 1 || date.getDate() !== Number(parts[2])) return false;
  return date.getTime() <= new Date().getTime();
}

function isStrongPassword_(password) {
  var text = String(password || '');
  return text.length >= 6 && /[A-Z]/.test(text) && /[a-z]/.test(text) && /[0-9]/.test(text);
}

function normalizeRole_(role) {
  var normalized = String(role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  var aliases = {
    customer_service: 'cs',
    customer_success: 'css',
    admin_persuratan: 'admin',
    tim_campaign: 'campaign',
    karyawan_kehadiran: 'karyawan',
    karyawan_non_akun: 'karyawan',
    report_display: 'report',
    hrd_penggajian: 'hrd',
    'hrd_(penggajian)': 'hrd'
  };
  return aliases[normalized] || normalized;
}

function getEmployeeDepartmentByRole_(role) {
  var r = normalizeRole_(role);
  if (['pic_editor', 'editor', 'pic_layouter', 'layouter'].indexOf(r) !== -1) return 'Kreatif';
  if (['css', 'admin'].indexOf(r) !== -1) return 'Operasional';
  if (r === 'cs') return 'Konsultan';
  if (['campaign', 'admin_marketplace'].indexOf(r) !== -1) return 'Campaign';
  if (r === 'karyawan') return 'Umum';
  return '-';
}

function generateSystemPassword_() {
  var upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  var lower = 'abcdefghijkmnopqrstuvwxyz';
  var digits = '23456789';
  var all = upper + lower + digits;
  var pass = upper.charAt(Math.floor(Math.random() * upper.length)) +
    lower.charAt(Math.floor(Math.random() * lower.length)) +
    digits.charAt(Math.floor(Math.random() * digits.length));
  for (var i = 0; i < 5; i++) {
    pass += all.charAt(Math.floor(Math.random() * all.length));
  }
  return pass.split('').sort(function() { return 0.5 - Math.random(); }).join('');
}

function saveUserData(p) {
  if (p.telepon && !isValidPhone_(p.telepon)) return { success: false, message: 'Nomor telepon hanya boleh berisi angka, panjang 5-18 digit.' };
  if (p.email && !isValidEmail_(p.email)) return { success: false, message: 'Format email tidak valid.' };
  if (p.tanggalLahir && !isValidDateText_(p.tanggalLahir)) return { success: false, message: 'Tanggal lahir tidak valid.' };
  p.role = normalizeRole_(p.role);
  if (p.role === 'karyawan') {
    p.username = p.username || p.employeeId;
    p.password = '';
    p.profileComplete = '1';
  } else if (p.role === 'manajemen' || p.role === 'pimpinan' || p.role === 'report' || p.role === 'hrd') {
    p.profileComplete = '1';
  }

  var oldUsername = String(p.old_username || '').trim();
  delete p.old_username;

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sheet = ensureSheet('Users', H.Users);
    var data = sheet.getDataRange().getValues();
    var headers = data[0] || [];
    var usernameCol = headers.indexOf('username');
    var passwordCol = headers.indexOf('password');
    if (usernameCol === -1) return { success: false, message: 'Struktur data user belum valid.' };

    var rowIndex = -1;
    var lookupUsername = oldUsername || String(p.username || '').trim();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][usernameCol] || '').trim() === lookupUsername) {
        rowIndex = i + 1;
        break;
      }
    }

    if (p.role !== 'karyawan') {
      var existingPassword = rowIndex !== -1 && passwordCol !== -1 ? String(data[rowIndex - 1][passwordCol] || '') : '';
      var nextPassword = String(p.password || '');
      var isPasswordChanged = rowIndex === -1 || nextPassword !== existingPassword;
      if (!nextPassword) return { success: false, message: 'Password wajib diisi untuk akun login.' };
      if (isPasswordChanged && !isStrongPassword_(nextPassword)) {
        return { success: false, message: 'Password wajib minimal 6 karakter serta mengandung huruf besar, huruf kecil, dan angka.' };
      }
    }

    var rowData = [];
    for (var j = 0; j < headers.length; j++) {
      var header = headers[j];
      var val = p[header];
      if (val === undefined) {
        val = (rowIndex !== -1) ? data[rowIndex - 1][j] : "";
      } else if (typeof val === 'object' && val !== null) {
        val = JSON.stringify(val);
      }
      rowData.push(val);
    }

    if (rowIndex !== -1) {
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }
    SpreadsheetApp.flush();
    clearDBCache_('Users');
    return { success: true };
  } catch(e) {
    return { success: false, message: e.toString() };
  } finally {
    lock.releaseLock();
  }
}
function deleteUser(username) { return deleteData('Users', 'username', username); }

function requestPasswordReset(username) {
  username = String(username || '').trim().toLowerCase();
  if (!username) return { success: false, message: 'Username wajib diisi.' };
  var users = getAllData('Users', H.Users);
  for (var i = 0; i < users.length; i++) {
    if (String(users[i].username || '').toLowerCase() === username) {
      if (normalizeRole_(users[i].role) === 'karyawan') return { success: false, message: 'Data karyawan non-role tidak memiliki akses login portal.' };
      users[i].resetRequested = '1';
      users[i].resetRequestedAt = Utilities.formatDate(new Date(), getDBTimezone(), "yyyy-MM-dd HH:mm");
      users[i].resetTempPassword = '';
      saveData('Users', H.Users, users[i], 'username');
      return { success: true, message: 'Permintaan reset password berhasil dikirim ke Manajemen.' };
    }
  }
  return { success: false, message: 'Username tidak ditemukan.' };
}

function generateResetPassword(username) {
  username = String(username || '').trim();
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sheet = ensureSheet('Users', H.Users);
    var data = sheet.getDataRange().getValues();
    var headers = data[0] || [];
    var usernameCol = headers.indexOf('username');
    var passwordCol = headers.indexOf('password');
    var namaCol = headers.indexOf('nama');
    var roleCol = headers.indexOf('role');
    var resetReqCol = headers.indexOf('resetRequested');
    var resetTempCol = headers.indexOf('resetTempPassword');
    if (usernameCol === -1 || passwordCol === -1) return { success: false, message: 'Struktur data user belum valid.' };

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][usernameCol] || '').trim() === username) {
        if (roleCol !== -1 && normalizeRole_(data[i][roleCol]) === 'karyawan') return { success: false, message: 'Karyawan non-role tidak memiliki akses login portal.' };
        var newPassword = generateSystemPassword_();
        sheet.getRange(i + 1, passwordCol + 1).setValue(newPassword);
        if (resetReqCol !== -1) sheet.getRange(i + 1, resetReqCol + 1).setValue('');
        if (resetTempCol !== -1) sheet.getRange(i + 1, resetTempCol + 1).setValue(newPassword);
        SpreadsheetApp.flush();
        clearDBCache_('Users');
        var savedPassword = String(sheet.getRange(i + 1, passwordCol + 1).getValue() || '');
        if (savedPassword !== newPassword) return { success: false, message: 'Password reset belum tersimpan ke spreadsheet.' };
        return { success: true, data: { username: username, nama: namaCol !== -1 ? data[i][namaCol] : username, password: newPassword } };
      }
    }
    return { success: false, message: 'Username tidak ditemukan.' };
  } catch(e) {
    return { success: false, message: e.toString() };
  } finally {
    lock.releaseLock();
  }
}

function changeOwnPassword(username, oldPassword, newPassword) {
  username = String(username || '').trim();
  if (!username) return { success: false, message: 'Sesi user tidak valid.' };
  if (!isStrongPassword_(newPassword)) return { success: false, message: 'Password baru wajib minimal 6 karakter serta mengandung huruf besar, huruf kecil, dan angka.' };

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sheet = ensureSheet('Users', H.Users);
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { success: false, message: 'Data pengguna tidak ditemukan.' };

    var headers = data[0];
    var usernameCol = headers.indexOf('username');
    var passwordCol = headers.indexOf('password');
    var resetTempCol = headers.indexOf('resetTempPassword');
    if (usernameCol === -1 || passwordCol === -1) return { success: false, message: 'Struktur data user belum valid.' };

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][usernameCol] || '').trim() === username) {
        if (String(data[i][passwordCol] || '') !== String(oldPassword || '')) {
          return { success: false, message: 'Password lama tidak sesuai.' };
        }
        sheet.getRange(i + 1, passwordCol + 1).setValue(newPassword);
        if (resetTempCol !== -1) sheet.getRange(i + 1, resetTempCol + 1).setValue('');
        SpreadsheetApp.flush();
        clearDBCache_('Users');
        var savedPassword = String(sheet.getRange(i + 1, passwordCol + 1).getValue() || '');
        if (savedPassword !== String(newPassword || '')) {
          return { success: false, message: 'Password belum tersimpan ke spreadsheet. Coba refresh dan ulangi.' };
        }
        return { success: true, data: { username: username } };
      }
    }
    return { success: false, message: 'Data pengguna tidak ditemukan.' };
  } catch(e) {
    return { success: false, message: e.toString() };
  } finally {
    lock.releaseLock();
  }
}

function completeEmployeeProfile(p) {
  if (!isStrongPassword_(p.password)) return { success: false, message: 'Password wajib minimal 6 karakter serta mengandung huruf besar, huruf kecil, dan angka.' };
  if (!p.nama || !p.alamat || !p.telepon || !p.tanggalLahir || !p.email) return { success: false, message: 'Lengkapi semua data karyawan.' };
  if (!isValidPhone_(p.telepon)) return { success: false, message: 'Nomor telepon hanya boleh berisi angka, panjang 5-18 digit.' };
  if (!isValidDateText_(p.tanggalLahir)) return { success: false, message: 'Tanggal lahir tidak valid.' };
  if (!isValidEmail_(p.email)) return { success: false, message: 'Format email tidak valid.' };
  var users = getAllData('Users', H.Users);
  for (var i = 0; i < users.length; i++) {
    if (users[i].username === p.username) {
      users[i].password = p.password;
      users[i].nama = p.nama;
      users[i].alamat = p.alamat;
      users[i].telepon = p.telepon;
      users[i].tanggalLahir = p.tanggalLahir;
      users[i].email = p.email;
      users[i].profileComplete = '1';
      saveData('Users', H.Users, users[i], 'username');
      return { success: true, data: {
        nama: users[i].nama,
        role: normalizeRole_(users[i].role),
        username: users[i].username,
        employeeId: users[i].employeeId || '',
        alamat: users[i].alamat || '',
        telepon: users[i].telepon || '',
        tanggalLahir: users[i].tanggalLahir || '',
        email: users[i].email || '',
        needsProfileSetup: false
      } };
    }
  }
  return { success: false, message: 'Data pengguna tidak ditemukan.' };
}

function getDealData() { return { success: true, data: getAllData('Deals', H.Deals) }; }
function getDealArchiveData() { return { success: true, data: getAllData('DealArchive', H.DealArchive) }; }

function trackingStageKey_(stage) {
  var text = String(stage || '').toLowerCase();
  if (text.indexOf('praproduksi') !== -1 || text.indexOf('pra produksi') !== -1 || text.indexOf('closing') !== -1) return 'praproduksi';
  if (text.indexOf('proof') !== -1) return 'proofreading';
  if (text.indexOf('layout') !== -1 || text.indexOf('cover') !== -1) return 'layout';
  if (text.indexOf('isbn') !== -1) return 'isbn';
  if (text.indexOf('produksi') !== -1 || text.indexOf('cetak') !== -1) return 'produksi';
  if (text.indexOf('distribusi') !== -1) return 'distribusi';
  if (text.indexOf('selesai') !== -1) return 'selesai';
  return 'administrasi';
}

function getHolidayDateMap_() {
  var rows = getAllData('HolidaySettings', H.HolidaySettings);
  var dates = {};
  rows.forEach(function(row) {
    var dateText = String(row.tanggal || '').substring(0, 10);
    if (dateText && String(row.active || '1') !== '0') dates[dateText] = true;
  });
  return dates;
}

function addBusinessDays_(dateText, days, holidayDates) {
  var tz = getDBTimezone();
  var base = dateText ? new Date(dateText + 'T00:00:00') : new Date();
  var count = 0;
  var target = Math.max(0, Number(days || 0));
  holidayDates = holidayDates || getHolidayDateMap_();
  while (count < target) {
    base.setDate(base.getDate() + 1);
    var day = base.getDay();
    var dateKey = Utilities.formatDate(base, tz, 'yyyy-MM-dd');
    if (day !== 0 && day !== 6 && !holidayDates[dateKey]) count++;
  }
  return Utilities.formatDate(base, tz, 'yyyy-MM-dd');
}

function businessDaysBetween_(startText, endText, holidayDates) {
  if (!startText || !endText) return 0;
  var start = new Date(startText + 'T00:00:00');
  var end = new Date(endText + 'T00:00:00');
  var count = 0;
  holidayDates = holidayDates || getHolidayDateMap_();
  while (start < end) {
    start.setDate(start.getDate() + 1);
    var day = start.getDay();
    var dateKey = Utilities.formatDate(start, getDBTimezone(), 'yyyy-MM-dd');
    if (day !== 0 && day !== 6 && !holidayDates[dateKey]) count++;
  }
  return Math.max(0, count);
}

function getDeadlineSettings() {
  var rows = getAllData('DeadlineSettings', H.DeadlineSettings);
  var defaults = [
    {id:'DL-EXCLUSIVE', penerbit:'', paket:'Exclusive', totalHari:14, administrasi:1, proofreading:2, layout:4, isbn:7, produksi:10, distribusi:12, selesai:14},
    {id:'DL-EXPRESS', penerbit:'', paket:'Express', totalHari:7, administrasi:1, proofreading:1, layout:2, isbn:4, produksi:5, distribusi:6, selesai:7},
    {id:'DL-ADVANCE', penerbit:'', paket:'Advance', totalHari:21, administrasi:2, proofreading:4, layout:7, isbn:10, produksi:15, distribusi:18, selesai:21},
    {id:'DL-IDEBUKU-VIP', penerbit:'Idebuku', paket:'VIP', totalHari:21, administrasi:2, proofreading:4, layout:7, isbn:10, produksi:15, distribusi:18, selesai:21},
    {id:'DL-IDEBUKU-VVIP', penerbit:'Idebuku', paket:'VVIP', totalHari:14, administrasi:1, proofreading:2, layout:4, isbn:7, produksi:10, distribusi:12, selesai:14}
  ];
  var existingKeys = {};
  rows.forEach(function(row) {
    existingKeys[String(row.id || '').trim()] = true;
  });
  defaults.forEach(function(row) {
    if (!existingKeys[row.id]) {
      row.updatedAt = Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd');
      saveData('DeadlineSettings', H.DeadlineSettings, row, 'id');
    }
  });
  if (rows.length === 0 || defaults.some(function(row) { return !existingKeys[row.id]; })) {
    rows = getAllData('DeadlineSettings', H.DeadlineSettings);
  }
  return { success: true, data: rows };
}

function saveDeadlineSetting(p) {
  if (!p.paket) return { success: false, message: 'Paket wajib diisi.' };
  p.id = p.id || ('DL-' + String(p.paket).toUpperCase().replace(/[^A-Z0-9]/g, '-') + '-' + new Date().getTime());
  ['totalHari','administrasi','proofreading','layout','isbn','produksi','distribusi','selesai'].forEach(function(key) {
    p[key] = Math.max(0, Number(p[key] || 0));
  });
  if (!p.selesai) p.selesai = p.totalHari;
  if (!p.totalHari) p.totalHari = p.selesai;
  p.updatedAt = Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd');
  saveData('DeadlineSettings', H.DeadlineSettings, p, 'id');
  return { success: true };
}

function deleteDeadlineSetting(id) {
  return deleteData('DeadlineSettings', 'id', id);
}

function getDefaultMarketplaceCalculatorSettings_() {
  return {
    adminPercent: 18.5,
    rounding: 1000,
    sizes: [
      { id: 'A5', label: 'A5', perPage: 76.5, fixedCost: 5500, multiplier: 5 },
      { id: 'B5_UNESCO', label: 'B5 Unesco', perPage: 95, fixedCost: 8000, multiplier: 5 }
    ]
  };
}

function normalizeMarketplaceCalculatorSettings_(value) {
  var defaults = getDefaultMarketplaceCalculatorSettings_();
  var parsed = value || {};
  if (typeof parsed === 'string' && parsed.trim()) {
    try { parsed = JSON.parse(parsed); } catch(e) { parsed = {}; }
  }
  var settings = {
    adminPercent: Math.max(0, Number(parsed.adminPercent != null ? parsed.adminPercent : defaults.adminPercent)),
    rounding: Math.max(1, Number(parsed.rounding || defaults.rounding)),
    sizes: []
  };
  var sourceSizes = Array.isArray(parsed.sizes) && parsed.sizes.length ? parsed.sizes : defaults.sizes;
  sourceSizes.forEach(function(row, idx) {
    var label = String(row.label || row.id || '').trim();
    if (!label) return;
    settings.sizes.push({
      id: String(row.id || label.toUpperCase().replace(/[^A-Z0-9]+/g, '_') || ('SIZE_' + idx)),
      label: label,
      perPage: Math.max(0, Number(row.perPage || 0)),
      fixedCost: Math.max(0, Number(row.fixedCost || 0)),
      multiplier: Math.max(0, Number(row.multiplier || 0))
    });
  });
  if (!settings.sizes.length) settings.sizes = defaults.sizes;
  return settings;
}

function getMarketplaceCalculatorSettings() {
  var globals = getAllData('GlobalState', H.GlobalState);
  var found = globals.find(function(row) { return row.key === 'marketplaceCalculatorSettings'; });
  return {
    success: true,
    data: normalizeMarketplaceCalculatorSettings_(found ? found.value : null)
  };
}

function saveMarketplaceCalculatorSettings(payload) {
  var settings = normalizeMarketplaceCalculatorSettings_(payload || {});
  settings.updatedAt = Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd');
  return saveData('GlobalState', H.GlobalState, {
    key: 'marketplaceCalculatorSettings',
    value: JSON.stringify(settings)
  }, 'key');
}

function getHolidaySettings() {
  return { success: true, data: getAllData('HolidaySettings', H.HolidaySettings) };
}

function saveHolidaySetting(p) {
  p = p || {};
  p.tanggal = String(p.tanggal || '').substring(0, 10);
  p.nama = String(p.nama || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.tanggal) || !p.nama) {
    return { success: false, message: 'Tanggal dan nama libur wajib diisi.' };
  }
  p.id = p.id || ('HOL-' + p.tanggal.replace(/-/g, '') + '-' + new Date().getTime());
  p.active = String(p.active || '1') === '0' ? '0' : '1';
  p.updatedAt = Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd');
  return saveData('HolidaySettings', H.HolidaySettings, p, 'id');
}

function deleteHolidaySetting(id) {
  return deleteData('HolidaySettings', 'id', id);
}

function findDeadlinePlan_(penerbit, paket) {
  var rows = getDeadlineSettings().data || [];
  var normPkg = String(paket || '').trim().toLowerCase();
  var normPub = normalizeDealPublisherKey_(penerbit);
  var exact = rows.find(function(row) {
    return String(row.paket || '').trim().toLowerCase() === normPkg && normalizeDealPublisherKey_(row.penerbit) === normPub;
  });
  if (exact) return exact;
  return rows.find(function(row) {
    return String(row.paket || '').trim().toLowerCase() === normPkg && !String(row.penerbit || '').trim();
  }) || null;
}

function normalizeDealPublisherKey_(penerbit) {
  var value = String(penerbit || '').trim().toLowerCase().replace(/\s+/g, '');
  if (value === 'idebuku') return 'idebuku';
  return String(penerbit || '').trim().toLowerCase();
}

function getDealAccelerationDays_(penerbit, percepatanProses) {
  var normPub = normalizeDealPublisherKey_(penerbit);
  if (normPub !== 'idebuku') return 0;
  var normAcceleration = String(percepatanProses || '').trim().toUpperCase();
  if (normAcceleration === 'VVIP') return 14;
  if (normAcceleration === 'VIP') return 21;
  return 0;
}

function findDeadlinePlanByWorkdays_(workdays) {
  var target = Number(workdays || 0);
  if (!target) return null;
  var rows = getDeadlineSettings().data || [];
  var exact = rows.find(function(row) {
    return Number(row.totalHari || row.selesai || 0) === target;
  });
  if (exact) return exact;
  return null;
}

function resolveDeadlinePlan_(penerbit, paket, percepatanProses) {
  var accelerationDays = getDealAccelerationDays_(penerbit, percepatanProses);
  if (accelerationDays) {
    var normPub = normalizeDealPublisherKey_(penerbit);
    var normAcceleration = String(percepatanProses || '').trim().toUpperCase();
    if (normPub === 'idebuku' && (normAcceleration === 'VIP' || normAcceleration === 'VVIP')) {
      var idebukuAccelerationPlan = findDeadlinePlan_('Idebuku', normAcceleration);
      if (idebukuAccelerationPlan) return idebukuAccelerationPlan;
    }
    var accelerationPlan = findDeadlinePlanByWorkdays_(accelerationDays);
    if (accelerationPlan) return accelerationPlan;
  }
  return findDeadlinePlan_(penerbit, paket);
}

function buildDeadlinePlan_(startDate, penerbit, paket, overrideDeadline, percepatanProses) {
  var plan = resolveDeadlinePlan_(penerbit, paket, percepatanProses);
  if (!plan) return null;
  var holidayDates = getHolidayDateMap_();
  var total = Math.max(1, Number(plan.totalHari || plan.selesai || 0));
  var requestedTotal = overrideDeadline ? businessDaysBetween_(startDate, overrideDeadline, holidayDates) : total;
  var finalTotal = Math.max(total, requestedTotal || total);
  var ratio = finalTotal / total;
  var dayFor = function(key) {
    var raw = Math.max(0, Number(plan[key] || 0));
    if (key === 'selesai') raw = Number(plan.selesai || total);
    return Math.max(0, Math.round(raw * ratio));
  };
  var base = {
    administrasi: addBusinessDays_(startDate, dayFor('administrasi'), holidayDates),
    proofreading: addBusinessDays_(startDate, dayFor('proofreading'), holidayDates),
    layout: addBusinessDays_(startDate, dayFor('layout'), holidayDates),
    isbn: addBusinessDays_(startDate, dayFor('isbn'), holidayDates),
    produksi: addBusinessDays_(startDate, dayFor('produksi'), holidayDates),
    distribusi: addBusinessDays_(startDate, dayFor('distribusi'), holidayDates),
    selesai: addBusinessDays_(startDate, finalTotal, holidayDates)
  };
  return {
    settingId: plan.id,
    paket: plan.paket,
    totalHari: finalTotal,
    minimumHari: total,
    base: base,
    actual: Object.assign({}, base)
  };
}

function syncNaskahDeadlinesFromSettings() {
  var rows = getAllData('Naskah', H.Naskah);
  var keys = ['administrasi','proofreading','layout','isbn','produksi','distribusi','selesai'];
  var updated = 0;
  var skipped = 0;
  var noPlan = 0;

  rows.forEach(function(n) {
    var startDate = n.tanggal || Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd');
    var plan = buildDeadlinePlan_(startDate, n.penerbit, n.paket, null, n.percepatanProses);
    if (!plan) {
      noPlan++;
      return;
    }

    var skipProofreading = isNaskahProofreadingSkipped_(n);
    var nextBase = {};
    var changed = false;

    keys.forEach(function(key) {
      var generated = plan.base[key] || '';
      if (key === 'proofreading' && skipProofreading) generated = '';
      nextBase[key] = generated;
      changed = true;
    });

    var delays = parseTrackingDelays_(n.trackingDelays);
    var nextActual = applyTrackingDelays_(nextBase, delays);
    keys.forEach(function(key) {
      if (key === 'proofreading' && skipProofreading) {
        nextActual[key] = '';
        return;
      }
    });
    changed = true;

    if (!changed) {
      skipped++;
      return;
    }

    n.baseDeadlines = nextBase;
    n.deadlines = nextActual;
    n.deadlinePlan = {
      settingId: plan.settingId,
      paket: plan.paket,
      totalHari: plan.totalHari,
      minimumHari: plan.minimumHari
    };
    saveData('Naskah', H.Naskah, n, 'id');
    updated++;
  });

  return {
    success: true,
    data: {
      total: rows.length,
      updated: updated,
      skipped: skipped,
      noPlan: noPlan
    }
  };
}

function syncIdebukuVvipDeadlinesPreview() {
  return syncIdebukuVvipDeadlines_(true);
}

function syncIdebukuVvipDeadlines() {
  return syncIdebukuVvipDeadlines_(false);
}

function syncIdebukuVvipDeadlines_(dryRun) {
  var rows = getAllData('Naskah', H.Naskah);
  var keys = ['administrasi','proofreading','layout','isbn','produksi','distribusi','selesai'];
  var matched = 0;
  var updated = 0;
  var unchanged = 0;
  var noPlan = 0;
  var changedIds = [];

  rows.forEach(function(n) {
    var publisher = String(n.penerbit || '').trim().toLowerCase();
    var acceleration = String(n.percepatanProses || '').trim().toUpperCase();
    if (normalizeDealPublisherKey_(publisher) !== 'idebuku' || acceleration !== 'VVIP') return;

    matched++;
    var startDate = n.tanggal || Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd');
    var plan = buildDeadlinePlan_(startDate, n.penerbit, n.paket, null, n.percepatanProses);
    if (!plan) {
      noPlan++;
      return;
    }

    var skipProofreading = isNaskahProofreadingSkipped_(n);
    var nextBase = {};
    keys.forEach(function(key) {
      var generated = plan.base[key] || '';
      if (key === 'proofreading' && skipProofreading) generated = '';
      nextBase[key] = generated;
    });

    var delays = parseTrackingDelays_(n.trackingDelays);
    var nextActual = applyTrackingDelays_(nextBase, delays);
    if (skipProofreading) nextActual.proofreading = '';

    var nextDeadlinePlan = {
      settingId: plan.settingId,
      paket: plan.paket,
      totalHari: plan.totalHari,
      minimumHari: plan.minimumHari
    };

    var changed = JSON.stringify(n.baseDeadlines || {}) !== JSON.stringify(nextBase) ||
      JSON.stringify(n.deadlines || {}) !== JSON.stringify(nextActual) ||
      JSON.stringify(n.deadlinePlan || {}) !== JSON.stringify(nextDeadlinePlan);

    if (!changed) {
      unchanged++;
      return;
    }

    updated++;
    if (changedIds.length < 50) changedIds.push(n.id || '');
    if (dryRun) return;

    n.baseDeadlines = nextBase;
    n.deadlines = nextActual;
    n.deadlinePlan = nextDeadlinePlan;
    saveData('Naskah', H.Naskah, n, 'id');
  });

  return {
    success: true,
    dryRun: !!dryRun,
    data: {
      total: rows.length,
      matched: matched,
      updated: updated,
      unchanged: unchanged,
      noPlan: noPlan,
      changedIds: changedIds
    }
  };
}

function generateTrackingCode_() {
  var stamp = Utilities.formatDate(new Date(), getDBTimezone(), 'yyyyMM');
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var code = '';
  for (var i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return 'NSM-' + stamp + '-' + code;
}

function isTrackingStageDone_(status) {
  return ['done', 'complete', 'selesai', 'terbit'].indexOf(String(status || '').toLowerCase()) !== -1;
}

function isPicProductionStageComplete_(status) {
  return ['complete', 'selesai', 'terbit'].indexOf(String(status || '').toLowerCase()) !== -1;
}

function isPicProductionStageSubmitted_(status) {
  return ['done', 'complete', 'selesai', 'terbit'].indexOf(String(status || '').toLowerCase()) !== -1;
}

function isPicProductionStageRevisionFollowup_(status) {
  var normalized = String(status || '').trim().toLowerCase();
  return normalized === 'done' || normalized === 'revisi' || normalized.indexOf('revisi') === 0;
}

function isIsbnStageDone_(status) {
  var normalized = String(status || '').toLowerCase();
  return isTrackingStageDone_(normalized) || normalized === 'diterima' || normalized === 'qrsbn';
}

function syncNaskahTimelineFromStatuses_(n) {
  n = n || {};
  var steps = ['Praproduksi', 'Administrasi', 'Proofreading', 'Desain Cover & Layout', 'ISBN', 'Produksi', 'Distribusi', 'Selesai'];
  var current = steps.indexOf(n.timeline);
  if (current < 0) current = 0;
  var moveTo = function(stage) {
    var index = steps.indexOf(stage);
    if (index > current) current = index;
  };
  var statusStarted = function(status) {
    status = String(status || '').trim().toLowerCase();
    return status && status !== 'menunggu';
  };
  if (isNaskahProofreadingSkipped_(n) || isPicProductionStageComplete_(n.statusEditor)) moveTo('Desain Cover & Layout');
  if (statusStarted(n.statusLayouter)) moveTo('Desain Cover & Layout');
  if (isPicProductionStageComplete_(n.statusLayouter)) moveTo('ISBN');
  if (statusStarted(n.statusIsbn)) moveTo('ISBN');
  if (isIsbnStageDone_(n.statusIsbn)) moveTo('Produksi');
  if (statusStarted(n.statusProduksi)) moveTo('Produksi');
  if (isTrackingStageDone_(n.statusProduksi)) moveTo('Distribusi');
  if (statusStarted(n.statusDistribusi)) moveTo('Distribusi');
  if (isTrackingStageDone_(n.statusDistribusi)) moveTo('Selesai');
  n.timeline = steps[current];
  return n.timeline;
}

function parseTrackingDelays_(value) {
  var normalizeItem = function(item, stageKey, index) {
    if (!item || typeof item !== 'object') return null;
    return {
      id: item.id || ('TD-' + String(stageKey || 'stage').toUpperCase() + '-' + (index + 1)),
      days: Math.max(0, Number(item.days || 0)),
      reasonCode: item.reasonCode || '',
      note: item.note || '',
      reason: item.reason || trackingDelayReason_(stageKey, item.reasonCode || '', item.note || ''),
      updatedAt: item.updatedAt || ''
    };
  };
  var normalize = function(raw) {
    var result = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result;
    Object.keys(raw).forEach(function(stageKey) {
      var value = raw[stageKey];
      var items = Array.isArray(value) ? value : [value];
      result[stageKey] = items
        .map(function(item, idx) { return normalizeItem(item, stageKey, idx); })
        .filter(function(item) { return item && (Number(item.days || 0) > 0 || item.reasonCode || item.note || item.reason); });
    });
    return result;
  };
  if (value && typeof value === 'object' && !Array.isArray(value)) return normalize(value);
  if (typeof value === 'string' && value.trim()) {
    try {
      var parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? normalize(parsed) : {};
    } catch (err) {}
  }
  return {};
}

function getDefaultDelayReasons_() {
  return [
    {id:'DR-ADMIN-FINAL-DATA', stageKey:'administrasi', reasonCode:'final_data_pending', label:'Data final penulis belum lengkap', needsNote:'0', active:'1'},
    {id:'DR-ADMIN-DOCUMENTS', stageKey:'administrasi', reasonCode:'admin_docs_check', label:'Pemeriksaan administrasi membutuhkan waktu tambahan', needsNote:'1', active:'1'},
    {id:'DR-PROOF-TIME', stageKey:'proofreading', reasonCode:'proof_time', label:'Proofreading membutuhkan waktu tambahan', needsNote:'1', active:'1'},
    {id:'DR-PROOF-NO-RESPONSE', stageKey:'proofreading', reasonCode:'author_no_response', label:'Penulis tidak merespon pesan konfirmasi', needsNote:'0', active:'1'},
    {id:'DR-PROOF-REVISION', stageKey:'proofreading', reasonCode:'author_revision_slow', label:'Revisi dari penulis lebih lama dari estimasi', needsNote:'0', active:'1'},
    {id:'DR-LAYOUT-TIME', stageKey:'layout', reasonCode:'layout_time', label:'Desain cover dan layout membutuhkan waktu tambahan', needsNote:'1', active:'1'},
    {id:'DR-LAYOUT-REVISION', stageKey:'layout', reasonCode:'author_revision_slow', label:'Revisi dari penulis lebih lama dari estimasi', needsNote:'0', active:'1'},
    {id:'DR-ISBN-DOCS', stageKey:'isbn', reasonCode:'isbn_docs_missing', label:'Penulis belum mengirimkan administrasi ISBN', needsNote:'0', active:'1'},
    {id:'DR-ISBN-REJECTED', stageKey:'isbn', reasonCode:'isbn_rejected', label:'Pengajuan ISBN ditolak oleh Perpusnas', needsNote:'0', active:'1'},
    {id:'DR-PRODUCTION-MACHINE', stageKey:'produksi', reasonCode:'production_machine', label:'Ada kendala pada mesin produksi', needsNote:'0', active:'1'},
    {id:'DR-DISTRIBUTION-UNPAID', stageKey:'distribusi', reasonCode:'unpaid', label:'Penulis belum menyelesaikan pelunasan', needsNote:'0', active:'1'},
    {id:'DR-DISTRIBUTION-ADDRESS', stageKey:'distribusi', reasonCode:'address_missing', label:'Penulis belum mengirimkan alamat', needsNote:'0', active:'1'}
  ];
}

function ensureDelayReasons_() {
  var rows = getAllData('DelayReasons', H.DelayReasons);
  var today = Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd');
  var existing = {};
  rows.forEach(function(row) {
    existing[String(row.stageKey || '') + '::' + String(row.reasonCode || '')] = true;
  });
  var changed = false;
  getDefaultDelayReasons_().forEach(function(row) {
    var key = String(row.stageKey || '') + '::' + String(row.reasonCode || '');
    if (existing[key]) return;
    row.updatedAt = today;
    saveData('DelayReasons', H.DelayReasons, row, 'id');
    changed = true;
  });
  if (changed) {
    rows = getAllData('DelayReasons', H.DelayReasons);
  }
  return rows;
}

function getDelayReasons() {
  return { success: true, data: ensureDelayReasons_() };
}

function isProofreadingSkipped_(value) {
  if (value === undefined || value === null || value === '') return false;
  return String(value).trim() === '0';
}

function isNaskahProofreadingSkipped_(n) {
  n = n || {};
  if (isProofreadingSkipped_(n.butuhProofreading)) return true;
  if (n.dealId) {
    var deals = getAllData('Deals', H.Deals);
    for (var i = 0; i < deals.length; i++) {
      if (String(deals[i].id || '') === String(n.dealId || '') && isProofreadingSkipped_(deals[i].butuhProofreading)) return true;
    }
  }
  var deadlines = n.deadlines || {};
  var baseDeadlines = n.baseDeadlines || {};
  if ((deadlines && Object.prototype.hasOwnProperty.call(deadlines, 'proofreading') && !deadlines.proofreading) ||
      (baseDeadlines && Object.prototype.hasOwnProperty.call(baseDeadlines, 'proofreading') && !baseDeadlines.proofreading)) {
    return true;
  }
  var editorStatus = String(n.statusEditor || '').toLowerCase();
  var editorDone = editorStatus === 'complete' || editorStatus === 'selesai' || editorStatus === 'terbit';
  var stageKey = trackingStageKey_(n.timeline);
  if (editorDone && ['layout', 'isbn', 'produksi', 'distribusi', 'selesai'].indexOf(stageKey) !== -1) return true;
  return false;
}

function onlyDigits_(value) {
  return String(value || '').replace(/\D+/g, '');
}

function getNaskahPhone_(n) {
  n = n || {};
  var phone = onlyDigits_(n.noHpPenulis);
  if (phone) return phone;
  if (n.dealId) {
    var deals = getAllData('Deals', H.Deals);
    for (var i = 0; i < deals.length; i++) {
      if (String(deals[i].id || '') === String(n.dealId || '')) {
        return onlyDigits_(deals[i].noHpPenulis);
      }
    }
  }
  return '';
}

function verifyTrackingPhone_(n, phone4) {
  var expected = getNaskahPhone_(n);
  if (!expected) return { success: false, message: 'Nomor HP penulis belum tersedia. Silakan hubungi tim Nasmedia.' };
  var input = onlyDigits_(phone4);
  if (!/^\d{4}$/.test(input)) return { success: false, message: 'Masukkan 4 digit terakhir nomor HP.' };
  if (expected.slice(-4) !== input) return { success: false, message: 'Kode tracking atau verifikasi nomor HP tidak sesuai.' };
  return { success: true };
}

function saveDelayReason(p) {
  if (!p || !p.stageKey || !p.reasonCode || !p.label) {
    return { success: false, message: 'Tahap, kode, dan alasan wajib diisi.' };
  }
  var stageKey = trackingStageKey_(p.stageKey);
  var code = String(p.reasonCode || '').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  if (!code) return { success: false, message: 'Kode alasan tidak valid.' };
  p.id = p.id || ('DR-' + stageKey.toUpperCase() + '-' + code.toUpperCase() + '-' + new Date().getTime());
  p.stageKey = stageKey;
  p.reasonCode = code;
  p.label = String(p.label || '').trim();
  p.needsNote = String(p.needsNote || '0') === '1' ? '1' : '0';
  p.active = String(p.active || '1') === '0' ? '0' : '1';
  p.updatedAt = Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd');
  return saveData('DelayReasons', H.DelayReasons, p, 'id');
}

function deleteDelayReason(id) {
  return deleteData('DelayReasons', 'id', id);
}

function trackingDelayReason_(stageKey, reasonCode, note) {
  var rows = ensureDelayReasons_();
  var match = rows.find(function(row) {
    return String(row.reasonCode || '') === String(reasonCode || '') && String(row.stageKey || '') === String(stageKey || '') && String(row.active || '1') !== '0';
  }) || rows.find(function(row) {
    return String(row.reasonCode || '') === String(reasonCode || '') && String(row.active || '1') !== '0';
  });
  var base = match ? String(match.label || '') : 'Estimasi tahapan membutuhkan penyesuaian.';
  return note ? base + ' ' + String(note) : base;
}

function applyTrackingDelays_(baseDeadlines, delays) {
  var steps = ['administrasi','proofreading','layout','isbn','produksi','distribusi','selesai'];
  var result = Object.assign({}, baseDeadlines || {});
  var carry = 0;
  for (var i = 0; i < steps.length; i++) {
    var key = steps[i];
    var entries = Array.isArray(delays[key]) ? delays[key] : (delays[key] ? [delays[key]] : []);
    carry += entries.reduce(function(sum, item) { return sum + Number((item && item.days) || 0); }, 0);
    if (result[key] && carry > 0) result[key] = addBusinessDays_(result[key], carry);
  }
  return result;
}

function saveNaskahTrackingDelay(id, stageKey, days, reasonCode, note) {
  days = Math.max(0, Number(days || 0));
  if (!id || !stageKey) return { success: false, message: 'Data delay tidak lengkap.' };
  var role = normalizeRole_((arguments.length > 5 && arguments[5]) || '');
  var delayId = (arguments.length > 6 && arguments[6]) || '';
  stageKey = trackingStageKey_(stageKey);
  var rows = getAllData('Naskah', H.Naskah);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].id === id) {
      var delays = parseTrackingDelays_(rows[i].trackingDelays);
      var entries = Array.isArray(delays[stageKey]) ? delays[stageKey] : [];
      var now = Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd');
      var item = {
        id: delayId || ('TD-' + stageKey.toUpperCase() + '-' + new Date().getTime()),
        days: days,
        reasonCode: reasonCode || '',
        note: note || '',
        reason: trackingDelayReason_(stageKey, reasonCode, note),
        updatedAt: now
      };
      var updated = false;
      if (delayId) {
        for (var j = 0; j < entries.length; j++) {
          if (String(entries[j].id || '') === String(delayId)) {
            entries[j] = Object.assign({}, entries[j], item);
            updated = true;
            break;
          }
        }
      }
      if (!updated) entries.push(item);
      delays[stageKey] = entries;
      rows[i].trackingDelays = delays;
      rows[i].deadlines = applyTrackingDelays_(rows[i].baseDeadlines || rows[i].deadlines || {}, delays);
      saveData('Naskah', H.Naskah, rows[i], 'id');
      return { success: true };
    }
  }
  return { success: false, message: 'Naskah tidak ditemukan.' };
}

function isDateDue_(dateText, todayText) {
  dateText = String(dateText || '').substring(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return false;
  return dateText <= todayText;
}

function naskahDeadlineForStage_(n, stageKey) {
  var deadlines = n && n.deadlines && typeof n.deadlines === 'object' ? n.deadlines : {};
  var baseDeadlines = n && n.baseDeadlines && typeof n.baseDeadlines === 'object' ? n.baseDeadlines : {};
  return String(deadlines[stageKey] || baseDeadlines[stageKey] || '').substring(0, 10);
}

function hasTrackingDelayForStage_(n, stageKey) {
  var delays = parseTrackingDelays_((n || {}).trackingDelays);
  var entries = delays[trackingStageKey_(stageKey)] || [];
  return Array.isArray(entries) && entries.length > 0;
}

function shouldHoldDeadlineAlertForTrackingDelay_(n, stageKey, today) {
  if (!hasTrackingDelayForStage_(n, stageKey)) return false;
  var deadline = naskahDeadlineForStage_(n, stageKey);
  if (/^\d{4}-\d{2}-\d{2}$/.test(deadline) && deadline <= today) return false;
  return true;
}

function isNaskahProductionStartedForAlert_(n) {
  n = n || {};
  return String(n.intakeStatus || '').toLowerCase() === 'production_started' ||
    String(n.productionStartedAt || '').trim() ||
    String(n.statusProses || '').trim().toLowerCase() === 'siap proses' ||
    ['administrasi', 'praproduksi'].indexOf(trackingStageKey_(n.timeline)) === -1;
}

function praproductionFollowupDeadline_(n) {
  var startDate = String((n || {}).tanggal || '').substring(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return '';
  return addBusinessDays_(startDate, 1);
}

function isPraproductionFollowupAlertDue_(n, today) {
  n = n || {};
  if (trackingStageKey_(n.timeline) !== 'praproduksi') return false;
  if (String(n.finalDataSubmittedAt || '').trim()) return false;
  if (String(n.cancelApprovedAt || '')) return false;
  if (String(n.statusProses || '').trim().toLowerCase() === 'dibatalkan') return false;
  var intake = String(n.intakeStatus || '').trim().toLowerCase();
  if (intake && intake !== 'waiting_final_data') return false;
  var deadline = praproductionFollowupDeadline_(n);
  return /^\d{4}-\d{2}-\d{2}$/.test(deadline) && deadline <= today;
}

function isAdministrationAlertDue_(n, today) {
  n = n || {};
  if (isNaskahProductionStartedForAlert_(n)) return false;
  if (shouldHoldDeadlineAlertForTrackingDelay_(n, 'administrasi', today)) return false;
  if (!String(n.finalDataSubmittedAt || '').trim()) return false;
  var startDate = String(n.adminDoneAt || n.finalDataSubmittedAt || '').substring(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return false;
  return addBusinessDays_(startDate, 1) <= today;
}

function isIsbnSubmissionStatus_(status) {
  var normalized = String(status || '').trim().toLowerCase();
  return normalized === 'pengajuan' || normalized === 'diajukan' || normalized === 'submitted' || normalized === 'on process' || normalized === 'on_process';
}

function shouldShowIsbnSubmissionAlert_(n, today) {
  n = n || {};
  if (isIsbnStageDone_(n.statusIsbn)) return false;
  if (isIsbnSubmissionStatus_(n.statusIsbn)) return false;
  if (String(n.statusIsbn || '').trim().toLowerCase() === 'tertolak') return false;
  today = today || Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd');
  if (shouldHoldDeadlineAlertForTrackingDelay_(n, 'isbn', today)) return false;
  return isLayoutReadyForIsbnAlert_(n.statusLayouter);
}

function shouldShowIsbnResultAlert_(n, today) {
  n = n || {};
  if (isIsbnStageDone_(n.statusIsbn)) return false;
  if (!isIsbnSubmissionStatus_(n.statusIsbn)) return false;
  today = today || Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd');
  if (shouldHoldDeadlineAlertForTrackingDelay_(n, 'isbn', today)) return false;
  if (!isDateDue_(naskahDeadlineForStage_(n, 'isbn'), today)) return false;
  var activeStage = trackingStageKey_(n.timeline);
  return isLayoutReadyForIsbnAlert_(n.statusLayouter) || activeStage === 'isbn';
}

function isLayoutReadyForIsbnAlert_(status) {
  var normalized = String(status || '').trim().toLowerCase();
  return isPicProductionStageComplete_(normalized);
}

function picStageConfig_(stageKey) {
  stageKey = trackingStageKey_(stageKey);
  if (stageKey === 'proofreading') {
    return {
      assigneeField: 'picEditor',
      statusField: 'statusEditor',
      revisionField: 'revisiProofreading',
      updatedField: 'statusEditorUpdatedAt'
    };
  }
  if (stageKey === 'layout') {
    return {
      assigneeField: 'picLayouter',
      statusField: 'statusLayouter',
      revisionField: 'revisiLayout',
      updatedField: 'statusLayouterUpdatedAt'
    };
  }
  return null;
}

function isPicWorkerAlertOpen_(n, stageKey, today) {
  var cfg = picStageConfig_(stageKey);
  if (!cfg || !n) return false;
  if (!String(n[cfg.assigneeField] || '').trim()) return false;
  if (isStageDoneForDeadlineAlert_(n, stageKey)) return false;
  if (shouldHoldDeadlineAlertForTrackingDelay_(n, stageKey, today)) return false;
  var status = String(n[cfg.statusField] || '').trim().toLowerCase();
  if (status === 'done') return false;
  if (status === 'revisi' || status.indexOf('revisi') === 0) {
    var updatedAt = String(n[cfg.updatedField] || '').substring(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(updatedAt)) {
      today = today || Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd');
      if (businessDaysBetween_(updatedAt, today) < 1) return false;
    }
    return true;
  }
  return true;
}

function maxDateText_(a, b) {
  a = String(a || '').substring(0, 10);
  b = String(b || '').substring(0, 10);
  var validA = /^\d{4}-\d{2}-\d{2}$/.test(a);
  var validB = /^\d{4}-\d{2}-\d{2}$/.test(b);
  if (!validA) return validB ? b : '';
  if (!validB) return a;
  return a > b ? a : b;
}

function picNewQueueAlertStartDate_(n, stageKey) {
  return maxDateText_(
    naskahQueueDeadline_(n, stageKey),
    String((n || {}).productionStartedAt || (n || {}).adminDoneAt || (n || {}).tanggal || '').substring(0, 10)
  );
}

function isPicNewQueueAlertDue_(n, stageKey, today) {
  if (!isPicNewNaskah_(n, stageKey)) return false;
  if (shouldHoldDeadlineAlertForTrackingDelay_(n, stageKey, today)) return false;
  var startDate = picNewQueueAlertStartDate_(n, stageKey);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return false;
  return startDate <= today;
}

function isNaskahFinishedForDeleteAlert_(n) {
  n = n || {};
  if (String(n.cancelApprovedAt || '')) return false;
  if (String(n.statusProses || '').trim().toLowerCase() === 'dibatalkan') return false;
  return trackingStageKey_(n.timeline) === 'selesai' || String(n.statusProses || '').trim().toLowerCase() === 'selesai';
}

function hasPendingDeleteRequestForNaskah_(naskahId, pendingMap) {
  if (!naskahId) return false;
  if (!pendingMap) {
    pendingMap = {};
    getAllData('DeleteReq', H.DeleteReq).forEach(function(req) {
      if (String(req.status || '').trim().toLowerCase() === 'pending') pendingMap[String(req.naskahId || '')] = true;
    });
  }
  return !!pendingMap[String(naskahId || '')];
}

function isStageDoneForDeadlineAlert_(n, stageKey) {
  n = n || {};
  stageKey = trackingStageKey_(stageKey);
  var done = function(status) { return isTrackingStageDone_(status); };
  if (stageKey === 'administrasi') return isNaskahProductionStartedForAlert_(n);
  if (stageKey === 'proofreading') return isNaskahProofreadingSkipped_(n) || isPicProductionStageComplete_(n.statusEditor);
  if (stageKey === 'layout') return isPicProductionStageComplete_(n.statusLayouter);
  if (stageKey === 'isbn') return isIsbnStageDone_(n.statusIsbn);
  if (stageKey === 'produksi') return done(n.statusProduksi);
  if (stageKey === 'distribusi') return done(n.statusDistribusi);
  if (stageKey === 'selesai') return trackingStageKey_(n.timeline) === 'selesai' || String(n.statusProses || '').toLowerCase() === 'selesai';
  return false;
}

function isStageDeadlineClosedForAlert_(n, stageKey) {
  n = n || {};
  stageKey = trackingStageKey_(stageKey);
  if (stageKey === 'proofreading') return isNaskahProofreadingSkipped_(n) || isPicProductionStageSubmitted_(n.statusEditor);
  if (stageKey === 'layout') return isPicProductionStageSubmitted_(n.statusLayouter);
  return isStageDoneForDeadlineAlert_(n, stageKey);
}

function shouldShowPicRevisionFollowupAlert_(n, stageKey, today) {
  var cfg = picStageConfig_(stageKey);
  if (!cfg || !n) return false;
  if (!String(n[cfg.assigneeField] || '').trim()) return false;
  if (isStageDoneForDeadlineAlert_(n, stageKey)) return false;
  if (stageKey === 'proofreading' && isNaskahProofreadingSkipped_(n)) return false;
  if (!isPicProductionStageRevisionFollowup_(n[cfg.statusField])) return false;
  var status = String(n[cfg.statusField] || '').trim().toLowerCase();
  if (status === 'done' || status === 'revisi' || status.indexOf('revisi') === 0) {
    var updatedAt = String(n[cfg.updatedField] || '').substring(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(updatedAt)) {
      today = today || Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd');
      if (businessDaysBetween_(updatedAt, today) < 1) return false;
    }
  }
  return true;
}

function currentDeadlineAlertStage_(n) {
  n = n || {};
  var stageKey = trackingStageKey_(n.timeline);
  if (stageKey === 'proofreading' && isNaskahProofreadingSkipped_(n)) return 'layout';
  if (stageKey === 'selesai' || isStageDoneForDeadlineAlert_(n, 'selesai')) return '';
  return stageKey;
}

function nextDeadlineAlertStage_(stageKey) {
  stageKey = trackingStageKey_(stageKey);
  var steps = ['praproduksi', 'administrasi', 'proofreading', 'layout', 'isbn', 'produksi', 'distribusi', 'selesai'];
  var idx = steps.indexOf(stageKey);
  if (idx < 0 || idx >= steps.length - 1) return '';
  return steps[idx + 1];
}

function deadlineAlertOverdueBusinessDays_(deadlineText, todayText, holidayDates) {
  deadlineText = String(deadlineText || '').substring(0, 10);
  todayText = String(todayText || '').substring(0, 10);
  if (!deadlineText || !todayText || deadlineText >= todayText) return 0;
  return businessDaysBetween_(deadlineText, todayText, holidayDates);
}

function makeDeadlineAlert_(n, stageKey, type, role) {
  var labels = {
    praproduksi: 'Praproduksi',
    administrasi: 'Administrasi',
    proofreading: 'Proofreading',
    layout: 'Desain Cover & Layout',
    isbn: 'ISBN',
    produksi: 'Produksi',
    distribusi: 'Distribusi',
    selesai: 'Selesai'
  };
  stageKey = trackingStageKey_(stageKey);
  var deadline = naskahDeadlineForStage_(n, stageKey);

  if (type === 'revision_followup') {
    var cfg = picStageConfig_(stageKey);
    if (cfg) {
      var status = String(n[cfg.statusField] || '').trim().toLowerCase();
      if (status === 'done' || status === 'revisi' || status.indexOf('revisi') === 0) {
        var updatedAt = String(n[cfg.updatedField] || '').substring(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(updatedAt)) {
          var shiftedDeadline = addBusinessDays_(updatedAt, 1);
          if (shiftedDeadline > deadline) {
            deadline = shiftedDeadline;
          }
        }
      }
    }
  }

  var today = Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd');
  var overdueBusinessDays = deadlineAlertOverdueBusinessDays_(deadline, today);
  return {
    id: String(n.id || '') + '::' + stageKey + '::' + type,
    naskahId: n.id || '',
    trackingCode: n.trackingCode || '',
    judul: n.judul || '',
    penulis: n.penulis || '',
    noHpPenulis: n.noHpPenulis || '',
    penerbit: n.penerbit || '',
    paket: n.paket || '',
    cs: n.cs || '',
    css: n.assignedCssName || n.assignedCssUsername || '',
    stageKey: stageKey,
    stageLabel: labels[stageKey] || stageKey,
    deadline: deadline,
    overdueBusinessDays: overdueBusinessDays,
    overdueText: overdueBusinessDays > 0 ? 'Lewat ' + overdueBusinessDays + ' hari kerja' : '',
    type: type,
    role: role || '',
    statusEditor: n.statusEditor || '',
    statusLayouter: n.statusLayouter || '',
    revisiProofreading: n.revisiProofreading || 0,
    revisiLayout: n.revisiLayout || 0,
    batasRevisiProofreading: n.batasRevisiProofreading || 0,
    batasRevisiLayout: n.batasRevisiLayout || 0,
    statusIsbn: n.statusIsbn || '',
    statusProduksi: n.statusProduksi || '',
    statusDistribusi: n.statusDistribusi || '',
    picEditor: n.picEditor || '',
    picLayouter: n.picLayouter || '',
    timeline: n.timeline || '',
    naskah: n
  };
}

function makePraproductionFollowupAlert_(n, role) {
  var deadline = praproductionFollowupDeadline_(n);
  var today = Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd');
  var overdueBusinessDays = deadlineAlertOverdueBusinessDays_(deadline, today);
  return {
    id: String(n.id || '') + '::praproduksi::final_data_followup',
    naskahId: n.id || '',
    trackingCode: n.trackingCode || '',
    judul: n.judul || '',
    penulis: n.penulis || '',
    noHpPenulis: n.noHpPenulis || '',
    penerbit: n.penerbit || '',
    paket: n.paket || '',
    cs: n.cs || '',
    css: n.assignedCssName || n.assignedCssUsername || '',
    stageKey: 'praproduksi',
    stageLabel: 'Praproduksi',
    deadline: deadline,
    overdueBusinessDays: overdueBusinessDays,
    overdueText: overdueBusinessDays > 0 ? 'Lewat ' + overdueBusinessDays + ' hari kerja' : '',
    type: 'final_data_followup',
    role: role || '',
    readOnly: true,
    statusEditor: n.statusEditor || '',
    statusLayouter: n.statusLayouter || '',
    revisiProofreading: n.revisiProofreading || 0,
    revisiLayout: n.revisiLayout || 0,
    batasRevisiProofreading: n.batasRevisiProofreading || 0,
    batasRevisiLayout: n.batasRevisiLayout || 0,
    statusIsbn: n.statusIsbn || '',
    statusProduksi: n.statusProduksi || '',
    statusDistribusi: n.statusDistribusi || '',
    picEditor: n.picEditor || '',
    picLayouter: n.picLayouter || '',
    timeline: n.timeline || '',
    naskah: n
  };
}

function makeCetakDeadlineAlert_(job, role) {
  var deadline = String(job.deadlineSelesai || '').substring(0, 10);
  var today = Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd');
  var overdueBusinessDays = deadlineAlertOverdueBusinessDays_(deadline, today);
  return {
    id: String(job.id || '') + '::cetak::deadline',
    entityType: 'cetak',
    cetakId: job.id || '',
    naskahId: '',
    trackingCode: job.id || '',
    judul: job.judul || '',
    penulis: '',
    noHpPenulis: '',
    penerbit: 'Cetak',
    paket: job.ukuran || '',
    cs: job.csName || job.csUsername || '',
    css: 'Semua CSS',
    stageKey: 'cetak',
    stageLabel: 'Cetak',
    deadline: deadline,
    overdueBusinessDays: overdueBusinessDays,
    overdueText: overdueBusinessDays > 0 ? 'Lewat ' + overdueBusinessDays + ' hari kerja' : '',
    type: 'cetak_deadline',
    role: role || '',
    kotaAsal: job.kotaAsal || '',
    warna: job.warna || '',
    jumlahHalWarna: job.jumlahHalWarna || '',
    jenisKertas: job.jenisKertas || '',
    cover: job.cover || '',
    jumlahEks: job.jumlahEks || '',
    nominal: job.nominal || '',
    statusPayment: job.statusPayment || '',
    nominalDP: job.nominalDP || '',
    cetak: job
  };
}

function getDeadlineAlerts(username, role) {
  role = normalizeRole_(role || '');
  var user = findPortalUserByUsername_(username) || {};
  var userName = String(user.nama || '').trim();
  var userUsername = String(user.username || username || '').trim();
  var userKey = userUsername.toLowerCase();
  var nameKey = userName.toLowerCase();
  var today = Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd');
  var rows = ensureNaskahTracking_(getAllData('Naskah', H.Naskah));
  var pendingDeleteMap = {};
  getAllData('DeleteReq', H.DeleteReq).forEach(function(req) {
    if (String(req.status || '').trim().toLowerCase() === 'pending') pendingDeleteMap[String(req.naskahId || '')] = true;
  });
  var alerts = [];

  function activeNaskah(n) {
    if (!n) return false;
    if (String(n.cancelApprovedAt || '')) return false;
    if (String(n.statusProses || '').toLowerCase() === 'dibatalkan') return false;
    var status = String(n.statusProses || '').trim().toLowerCase();
    var intake = String(n.intakeStatus || '').trim().toLowerCase();
    if (!status || status === 'siap proses') return true;
    if (intake === 'waiting_final_data' || intake === 'waiting_admin' || intake === 'admin_done') return true;
    return status === 'naskah baru' || status === 'administrasi naskah' || status === 'administrasi selesai';
  }
  function dueAndOpen(n, stageKey) {
    if (trackingStageKey_(stageKey) === 'administrasi' && !String(n.finalDataSubmittedAt || '').trim()) return false;
    return isDateDue_(naskahDeadlineForStage_(n, stageKey), today) && !isStageDeadlineClosedForAlert_(n, stageKey) && !shouldHoldDeadlineAlertForTrackingDelay_(n, stageKey, today);
  }
  function pushDueDeadlineAlert(n, activeStage, type, roleName) {
    if (dueAndOpen(n, activeStage)) {
      alerts.push(makeDeadlineAlert_(n, activeStage, type, roleName));
      return true;
    }
    var nextStage = nextDeadlineAlertStage_(activeStage);
    if (nextStage && dueAndOpen(n, nextStage)) {
      alerts.push(makeDeadlineAlert_(n, nextStage, type, roleName));
      return true;
    }
    return false;
  }
  function assignedToMe(value) {
    var key = String(value || '').trim().toLowerCase();
    return key && (key === nameKey || key === userKey);
  }
  function cssOwned(n) {
    var cssUser = String(n.assignedCssUsername || '').trim().toLowerCase();
    var cssName = String(n.assignedCssName || '').trim().toLowerCase();
    return (cssUser && cssUser === userKey) || (cssName && (cssName === nameKey || cssName === userKey));
  }
  function pushPicRevisionFollowupAlert(n, activeStage, roleName) {
    if ((activeStage === 'proofreading' || activeStage === 'layout') && shouldShowPicRevisionFollowupAlert_(n, activeStage, today)) {
      alerts.push(makeDeadlineAlert_(n, activeStage, 'revision_followup', roleName));
      return true;
    }
    return false;
  }

  rows.forEach(function(n) {
    if (!n) return;
    if (role === 'css' && cssOwned(n) && isNaskahFinishedForDeleteAlert_(n) && !hasPendingDeleteRequestForNaskah_(n.id, pendingDeleteMap)) {
      alerts.push(makeDeadlineAlert_(n, 'selesai', 'delete_request', role));
      return;
    }
    if (!activeNaskah(n)) return;
    var activeStage = currentDeadlineAlertStage_(n);
    if (!activeStage) return;
    if (role === 'css' && cssOwned(n) && isPraproductionFollowupAlertDue_(n, today)) {
      alerts.push(makePraproductionFollowupAlert_(n, role));
      return;
    }
    if (role === 'cs') {
      var csForFollowup = String(n.cs || '').trim().toLowerCase();
      if (csForFollowup && (csForFollowup === nameKey || csForFollowup === userKey) && isPraproductionFollowupAlertDue_(n, today)) {
        alerts.push(makePraproductionFollowupAlert_(n, role));
        return;
      }
    }
    if (role === 'pic_editor') {
      if (isPicNewNaskah_(n, 'proofreading')) {
        if (isPicNewQueueAlertDue_(n, 'proofreading', today)) alerts.push(makeDeadlineAlert_(n, 'proofreading', 'queue', role));
        return;
      }
      if (isPicQueuedNaskah_(n, 'proofreading') && !String(n.picEditor || '').trim() && !isNaskahProofreadingSkipped_(n) && dueAndOpen(n, 'proofreading')) {
        alerts.push(makeDeadlineAlert_(n, 'proofreading', 'assign', role));
      }
      return;
    }
    if (role === 'pic_layouter') {
      if (isPicNewNaskah_(n, 'layout')) {
        if (isPicNewQueueAlertDue_(n, 'layout', today)) alerts.push(makeDeadlineAlert_(n, 'layout', 'queue', role));
        return;
      }
      if (isPicQueuedNaskah_(n, 'layout') && !String(n.picLayouter || '').trim() && dueAndOpen(n, 'layout')) {
        alerts.push(makeDeadlineAlert_(n, 'layout', 'assign', role));
      }
      return;
    }
    if (role === 'editor') {
      if (activeStage === 'proofreading' && assignedToMe(n.picEditor) && pushPicRevisionFollowupAlert(n, activeStage, role)) return;
      if (activeStage === 'proofreading' && assignedToMe(n.picEditor) && isPicWorkerAlertOpen_(n, 'proofreading', today)) {
        alerts.push(makeDeadlineAlert_(n, 'proofreading', 'task', role));
      }
      return;
    }
    if (role === 'layouter') {
      if (activeStage === 'layout' && assignedToMe(n.picLayouter) && pushPicRevisionFollowupAlert(n, activeStage, role)) return;
      if (activeStage === 'layout' && assignedToMe(n.picLayouter) && isPicWorkerAlertOpen_(n, 'layout', today)) {
        alerts.push(makeDeadlineAlert_(n, 'layout', 'task', role));
      }
      return;
    }
    if (role === 'css') {
      if (!cssOwned(n)) return;
      if (isAdministrationAlertDue_(n, today)) {
        alerts.push(makeDeadlineAlert_(n, 'administrasi', 'monitor', role));
        return;
      }
      if (shouldShowIsbnSubmissionAlert_(n, today)) {
        alerts.push(makeDeadlineAlert_(n, 'isbn', 'isbn_submission', role));
        return;
      }
      if (shouldShowIsbnResultAlert_(n, today)) {
        alerts.push(makeDeadlineAlert_(n, 'isbn', 'isbn_result', role));
        return;
      }
      pushDueDeadlineAlert(n, activeStage, 'monitor', role);
      return;
    }
    if (role === 'cs') {
      var csField = String(n.cs || '').trim().toLowerCase();
      if (!(csField && (csField === nameKey || csField === userKey))) return;
      if (isAdministrationAlertDue_(n, today)) {
        alerts.push(makeDeadlineAlert_(n, 'administrasi', 'monitor', role));
        return;
      }
      if (shouldShowIsbnSubmissionAlert_(n, today)) {
        alerts.push(makeDeadlineAlert_(n, 'isbn', 'isbn_submission', role));
        return;
      }
      if (shouldShowIsbnResultAlert_(n, today)) {
        alerts.push(makeDeadlineAlert_(n, 'isbn', 'isbn_result', role));
        return;
      }
      pushDueDeadlineAlert(n, activeStage, 'monitor', role);
      return;
    }
    if (role === 'manajemen' || role === 'pimpinan') {
      if (isAdministrationAlertDue_(n, today)) {
        alerts.push(makeDeadlineAlert_(n, 'administrasi', 'monitor', role));
        return;
      }
      if (shouldShowIsbnSubmissionAlert_(n, today)) {
        alerts.push(makeDeadlineAlert_(n, 'isbn', 'isbn_submission', role));
        return;
      }
      if (shouldShowIsbnResultAlert_(n, today)) {
        alerts.push(makeDeadlineAlert_(n, 'isbn', 'isbn_result', role));
        return;
      }
      pushDueDeadlineAlert(n, activeStage, 'monitor', role);
    }
  });

  getAllData('CetakJobs', H.CetakJobs).forEach(function(job) {
    if (!job || String(job.statusCetak || 'Proses').toLowerCase() === 'selesai') return;
    if (!isDateDue_(job.deadlineSelesai, today)) return;
    if (role === 'cs') {
      var jobCsUser = String(job.csUsername || '').trim().toLowerCase();
      var jobCsName = String(job.csName || '').trim().toLowerCase();
      if (!((jobCsUser && jobCsUser === userKey) || (jobCsName && (jobCsName === nameKey || jobCsName === userKey)))) return;
    } else if (role !== 'css' && role !== 'manajemen') {
      return;
    }
    alerts.push(makeCetakDeadlineAlert_(job, role));
  });

  alerts.sort(function(a, b) {
    return String(a.deadline || '').localeCompare(String(b.deadline || '')) || String(a.judul || '').localeCompare(String(b.judul || ''));
  });
  return { success: true, data: alerts, today: today };
}

function completeDeadlineAlertStage(naskahId, stageKey, username, role) {
  role = normalizeRole_(role || '');
  stageKey = trackingStageKey_(stageKey);
  if (role !== 'css' && role !== 'manajemen') return { success: false, message: 'Aksi selesai hanya untuk CSS atau manajemen.' };
  var rows = getAllData('Naskah', H.Naskah);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id || '') !== String(naskahId || '')) continue;
    var n = rows[i];
    if (role === 'css' && !isCssOwner_(n, username)) return { success: false, message: 'Naskah ini bukan tanggung jawab CSS Anda.' };
    if (stageKey === 'administrasi') {
      if (role !== 'css') return { success: false, message: 'Mulai produksi administrasi hanya bisa dilakukan oleh CSS penanggung jawab.' };
      return startNaskahProductionFromCss(naskahId, username);
    }
    if (stageKey === 'proofreading' && !isNaskahProofreadingSkipped_(n)) n.statusEditor = 'Complete';
    else if (stageKey === 'layout') n.statusLayouter = 'Complete';
    else if (stageKey === 'isbn') n.statusIsbn = 'Done';
    else if (stageKey === 'produksi') n.statusProduksi = 'Done';
    else if (stageKey === 'distribusi') n.statusDistribusi = 'Done';
    else return { success: false, message: 'Tahap tidak bisa diselesaikan dari alert.' };
    return saveNaskahData(n);
  }
  return { success: false, message: 'Naskah tidak ditemukan.' };
}

function completeIsbnSubmissionAlert(naskahId, username, role) {
  role = normalizeRole_(role || '');
  if (role !== 'css' && role !== 'manajemen') return { success: false, message: 'Aksi pengajuan ISBN hanya untuk CSS atau manajemen.' };
  var rows = getAllData('Naskah', H.Naskah);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id || '') !== String(naskahId || '')) continue;
    var n = rows[i];
    if (role === 'css' && !isCssOwner_(n, username)) return { success: false, message: 'Naskah ini bukan tanggung jawab CSS Anda.' };
    if (isIsbnStageDone_(n.statusIsbn)) return { success: true, data: n };
    n.statusIsbn = 'Pengajuan';
    n.tindakanIsbn = 'Pengajuan ISBN selesai';
    return saveNaskahData(n);
  }
  return { success: false, message: 'Naskah tidak ditemukan.' };
}

function updateDeadlineAlertIsbnStatus(naskahId, status, username, role) {
  role = normalizeRole_(role || '');
  if (role !== 'css' && role !== 'manajemen') return { success: false, message: 'Aksi ISBN hanya untuk CSS atau manajemen.' };
  status = String(status || '').trim();
  if (!status) return { success: false, message: 'Status ISBN wajib dipilih.' };
  var rows = getAllData('Naskah', H.Naskah);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id || '') !== String(naskahId || '')) continue;
    var n = rows[i];
    if (role === 'css' && !isCssOwner_(n, username)) return { success: false, message: 'Naskah ini bukan tanggung jawab CSS Anda.' };
    var normalized = status.toLowerCase();
    if (normalized === 'terbit' || normalized === 'qrsbn' || normalized === 'terbit/qrsbn') {
      n.statusIsbn = 'QRSBN';
      n.tindakanIsbn = 'Terbit/QRSBN';
      return saveNaskahData(n);
    }
    if (normalized === 'tertolak') {
      n.statusIsbn = 'Tertolak';
      n.tindakanIsbn = 'ISBN tertolak oleh Perpusnas';
      var delays = parseTrackingDelays_(n.trackingDelays);
      var entries = Array.isArray(delays.isbn) ? delays.isbn : [];
      var today = Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd');
      var item = {
        id: 'TD-ISBN-REJECTED-PERPUSNAS',
        days: 10,
        reasonCode: 'isbn_rejected_perpusnas',
        note: '',
        reason: 'ISBN tertolak oleh Perpusnas',
        updatedAt: today
      };
      var updated = false;
      for (var j = 0; j < entries.length; j++) {
        if (String(entries[j].reasonCode || '') === item.reasonCode) {
          entries[j] = Object.assign({}, entries[j], item);
          updated = true;
          break;
        }
      }
      if (!updated) entries.push(item);
      delays.isbn = entries;
      n.trackingDelays = delays;
      n.deadlines = applyTrackingDelays_(n.baseDeadlines || n.deadlines || {}, delays);
      return saveNaskahData(n);
    }
    return { success: false, message: 'Status ISBN tidak dikenali.' };
  }
  return { success: false, message: 'Naskah tidak ditemukan.' };
}

function startDeadlineAlertTask(naskahId, stageKey, username, role) {
  role = normalizeRole_(role || '');
  stageKey = trackingStageKey_(stageKey);
  var user = findPortalUserByUsername_(username) || {};
  var userName = String(user.nama || '').trim().toLowerCase();
  var userUsername = String(user.username || username || '').trim().toLowerCase();
  var rows = getAllData('Naskah', H.Naskah);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id || '') !== String(naskahId || '')) continue;
    if (stageKey === 'proofreading' && role === 'editor') {
      var editorName = String(rows[i].picEditor || '').trim().toLowerCase();
      if (editorName !== userName && editorName !== userUsername) return { success: false, message: 'Naskah ini tidak ditugaskan ke akun editor Anda.' };
      if (!isTrackingStageDone_(rows[i].statusEditor)) rows[i].statusEditor = 'On Process';
    } else if (stageKey === 'layout' && role === 'layouter') {
      var layouterName = String(rows[i].picLayouter || '').trim().toLowerCase();
      if (layouterName !== userName && layouterName !== userUsername) return { success: false, message: 'Naskah ini tidak ditugaskan ke akun layouter Anda.' };
      if (!isTrackingStageDone_(rows[i].statusLayouter)) rows[i].statusLayouter = 'On Process';
    } else {
      return { success: false, message: 'Aksi mulai kerja hanya untuk editor atau layouter yang ditugaskan.' };
    }
    return saveNaskahData(rows[i]);
  }
  return { success: false, message: 'Naskah tidak ditemukan.' };
}

function getPublicTrackingData(code, phone4) {
  code = String(code || '').trim().toUpperCase();
  if (!code) return { success: false, message: 'Masukkan kode tracking.' };
  var rows = getAllData('Naskah', H.Naskah);
  var n = null;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].trackingCode || '').trim().toUpperCase() === code) {
      n = rows[i];
      break;
    }
  }
  if (!n) return { success: false, message: 'Kode tracking tidak ditemukan.' };
  if (String(n.statusProses || '').toLowerCase() === 'dibatalkan') {
    return { success: false, message: 'Naskah tidak tersedia untuk tracking.' };
  }
  var phoneCheck = verifyTrackingPhone_(n, phone4);
  if (!phoneCheck.success) return phoneCheck;
  var delays = parseTrackingDelays_(n.trackingDelays);
  var base = n.baseDeadlines || n.deadlines || {};
  var actual = applyTrackingDelays_(base, delays);
  var steps = [
    {key:'praproduksi', label:'Praproduksi'},
    {key:'administrasi', label:'Administrasi'},
    {key:'proofreading', label:'Proofreading'},
    {key:'layout', label:'Cover & Layout'},
    {key:'isbn', label:'ISBN'},
    {key:'produksi', label:'Produksi'},
    {key:'distribusi', label:'Distribusi'},
    {key:'selesai', label:'Selesai'}
  ];
  var currentKey = trackingStageKey_(n.timeline);
  var stepKeys = steps.map(function(s) { return s.key; });
  var currentIdx = stepKeys.indexOf(currentKey);
  if (currentIdx < 0) currentIdx = 0;
  var editorStatus = String(n.statusEditor || '').toLowerCase();
  var layouterStatus = String(n.statusLayouter || '').toLowerCase();
  var isbnStatus = String(n.statusIsbn || '').toLowerCase();
  var produksiStatus = String(n.statusProduksi || '').toLowerCase();
  var distribusiStatus = String(n.statusDistribusi || '').toLowerCase();
  var statusStarted = function(status) {
    return status && status !== 'menunggu';
  };
  var statusDone = function(status) {
    return status === 'complete' || status === 'selesai' || status === 'terbit';
  };
  var skipProofreading = isProofreadingSkipped_(n.butuhProofreading);
  if (!skipProofreading && n.dealId) {
    var dealsForProofreading = getAllData('Deals', H.Deals);
    for (var dealIdx = 0; dealIdx < dealsForProofreading.length; dealIdx++) {
      if (String(dealsForProofreading[dealIdx].id || '') === String(n.dealId || '') &&
          isProofreadingSkipped_(dealsForProofreading[dealIdx].butuhProofreading)) {
        skipProofreading = true;
        break;
      }
    }
  }
  if (statusStarted(editorStatus)) currentIdx = Math.max(currentIdx, stepKeys.indexOf('proofreading'));
  if (skipProofreading || statusDone(editorStatus)) currentIdx = Math.max(currentIdx, stepKeys.indexOf('layout'));
  if (statusStarted(layouterStatus)) currentIdx = Math.max(currentIdx, stepKeys.indexOf('layout'));
  if (statusDone(layouterStatus)) currentIdx = Math.max(currentIdx, stepKeys.indexOf('isbn'));
  if (statusStarted(isbnStatus)) currentIdx = Math.max(currentIdx, stepKeys.indexOf('isbn'));
  if (isIsbnStageDone_(isbnStatus)) currentIdx = Math.max(currentIdx, stepKeys.indexOf('produksi'));
  if (statusStarted(produksiStatus)) currentIdx = Math.max(currentIdx, stepKeys.indexOf('produksi'));
  if (statusDone(produksiStatus)) currentIdx = Math.max(currentIdx, stepKeys.indexOf('distribusi'));
  if (statusStarted(distribusiStatus)) currentIdx = Math.max(currentIdx, stepKeys.indexOf('distribusi'));
  if (statusDone(distribusiStatus)) currentIdx = Math.max(currentIdx, stepKeys.indexOf('selesai'));
  currentKey = stepKeys[currentIdx] || currentKey;
  var timeline = steps.map(function(step, idx) {
    var delayEntries = Array.isArray(delays[step.key]) ? delays[step.key] : (delays[step.key] ? [delays[step.key]] : []);
    var delayDays = delayEntries.reduce(function(sum, item) {
      return sum + Number((item && item.days) || 0);
    }, 0);
    var uniqueReasons = [];
    delayEntries.forEach(function(item) {
      var r = String((item && item.reason) || '').trim();
      if (r && uniqueReasons.indexOf(r) === -1) {
        uniqueReasons.push(r);
      }
    });
    var delayReason = uniqueReasons.join('; ');
    var status = idx < currentIdx ? 'Selesai' : (idx === currentIdx ? 'Sedang Diproses' : 'Menunggu');
    var isSkippedProofreading = skipProofreading && step.key === 'proofreading';
    if (isSkippedProofreading) status = 'Selesai otomatis';
    if (step.key === 'selesai' && currentKey === 'selesai') status = 'Selesai';
    return {
      key: step.key,
      label: step.label,
      status: status,
      skipped: skipProofreading && step.key === 'proofreading',
      estimasiAwal: base[step.key] || '',
      estimasiTerbaru: isSkippedProofreading ? 'Tidak diperlukan' : (actual[step.key] || base[step.key] || ''),
      delayDays: delayDays,
      reason: delayReason,
      adjustedByPrevious: delayDays <= 0 && (actual[step.key] || '') !== (base[step.key] || '')
    };
  });
  return {
    success: true,
    data: {
      trackingVerified: true,
      trackingCode: n.trackingCode,
      judul: n.judul,
      penulis: n.penulis,
      penerbit: n.penerbit,
      paket: n.paket,
      spesifikasiCetak: n.spesifikasiCetak || '',
      tanggal: n.tanggal,
      butuhProofreading: skipProofreading ? '0' : '1',
      timeline: (steps[currentIdx] && steps[currentIdx].label) || n.timeline || 'Administrasi',
      estimasiSelesaiAwal: base.selesai || '',
      estimasiSelesaiTerbaru: actual.selesai || base.selesai || '',
      tahapan: timeline
    }
  };
}
function saveDealData(p) {
  var isNew = !p.id;
  var existingDeal = null;
  if (!isNew) {
    var oldDeals = getAllData('Deals', H.Deals);
    for (var j = 0; j < oldDeals.length; j++) {
      if (String(oldDeals[j].id || '') === String(p.id || '')) {
        existingDeal = oldDeals[j];
        break;
      }
    }
  }
  p.butuhProofreading = isProofreadingSkipped_(p.butuhProofreading) ? '0' : '1';
  p.percepatanProses = String(p.percepatanProses || '').trim().toUpperCase();
  if (normalizeDealPublisherKey_(p.penerbit) !== 'idebuku' || (p.percepatanProses !== 'VIP' && p.percepatanProses !== 'VVIP')) {
    p.percepatanProses = '';
  }
  p.noHpPenulis = onlyDigits_(p.noHpPenulis || (existingDeal && existingDeal.noHpPenulis) || '');
  var requireDealPhone = String(p.source || '').toLowerCase() !== 'legacy';
  if (requireDealPhone && (!p.noHpPenulis || p.noHpPenulis.length < 5 || p.noHpPenulis.length > 18)) {
    return { success: false, message: 'Nomor HP penulis wajib angka 5-18 digit.' };
  }
  if (isNew) {
    p.id = "DEAL-" + new Date().getTime() + "-" + Math.floor(Math.random() * 100000);
    if(!p.csName) p.csName = "Sistem";
    if(!p.tanggal) p.tanggal = Utilities.formatDate(new Date(), getDBTimezone(), "yyyy-MM-dd");
  } else {
    if (existingDeal && existingDeal.tanggal) p.tanggal = existingDeal.tanggal;
    if(!p.tanggal) p.tanggal = Utilities.formatDate(new Date(), getDBTimezone(), "yyyy-MM-dd");
  }
  if (!p.trackingCode) p.trackingCode = generateTrackingCode_();
  var selectedCss = null;
  if (p.assignedCssUsername) {
    var cssUsersForDeal = getAllData('Users', H.Users);
    for (var cu = 0; cu < cssUsersForDeal.length; cu++) {
      if (String(cssUsersForDeal[cu].username || '').trim().toLowerCase() === String(p.assignedCssUsername || '').trim().toLowerCase() && normalizeRole_(cssUsersForDeal[cu].role) === 'css') {
        selectedCss = cssUsersForDeal[cu];
        break;
      }
    }
  }
  if (!selectedCss && isNew && String(p.source || '').toLowerCase() !== 'legacy') {
    return { success: false, message: 'CSS penanggung jawab wajib dipilih sebelum deal disimpan.' };
  }
  if (!selectedCss) selectedCss = { username: '', nama: '' };
  p.assignedCssUsername = selectedCss.username || p.assignedCssUsername || '';
  p.assignedCssName = selectedCss.nama || p.assignedCssName || '';
  var deadlinePlan = buildDeadlinePlan_(p.tanggal, p.penerbit, p.paket, p.deadline, p.percepatanProses);
  if (deadlinePlan) {
    p.baseDeadline = deadlinePlan.base.selesai;
    p.deadlinePlan = deadlinePlan.settingId;
    p.deadline = p.deadline && businessDaysBetween_(p.tanggal, p.deadline) >= Number(deadlinePlan.minimumHari || 0)
      ? p.deadline
      : deadlinePlan.base.selesai;
  }
  var savedDeal = saveData('Deals', H.Deals, p, 'id');
  if (!savedDeal || savedDeal.success === false) {
    appendDebugLog_('saveDealData:deal_failed', {
      dealId: p.id,
      payload: p,
      savedDeal: savedDeal
    });
    return {
      success: false,
      message: 'Deal gagal disimpan ke sheet Deals.',
      error: savedDeal && (savedDeal.error || savedDeal.message) ? (savedDeal.error || savedDeal.message) : 'Unknown save error'
    };
  }
  
  if (isNew && p.source !== 'legacy') {
    var skipProofreading = p.butuhProofreading === '0';
    var planForNaskah = deadlinePlan || buildDeadlinePlan_(p.tanggal, p.penerbit, p.paket, p.deadline, p.percepatanProses);
    var baseDeadlines = planForNaskah ? planForNaskah.base : null;
    var actualDeadlines = planForNaskah ? planForNaskah.actual : null;
    if (skipProofreading && actualDeadlines) actualDeadlines.proofreading = '';
    var newNaskah = {
      id: "NSK-" + new Date().getTime() + "-" + Math.floor(Math.random() * 100000),
      dealId: p.id, judul: p.judul, penulis: p.penulis, noHpPenulis: p.noHpPenulis || '', kotaAsal: p.kotaAsal || '', cs: p.csName,
      penerbit: p.penerbit, paket: p.paket, percepatanProses: p.percepatanProses, ukuran: p.ukuran,
      estimasiHalaman: p.estimasiHalaman, estimasiKata: p.estimasiKata,
      spesifikasiCetak: p.spesifikasiCetak || '',
      tanggal: Utilities.formatDate(new Date(), getDBTimezone(), "yyyy-MM-dd"),
      timeline: 'Praproduksi', lengkap: false,
      batasRevisiProofreading: 0, batasRevisiLayout: 0, revisiProofreading: 0, revisiLayout: 0,
      statusIsbn: 'Menunggu', tindakanIsbn: '', picEditor: '', picLayouter: '',
      assignedCssUsername: selectedCss.username || '',
      assignedCssName: selectedCss.nama || '',
      statusEditor: skipProofreading ? 'Complete' : 'Menunggu', statusLayouter: 'Menunggu', statusProduksi: 'Menunggu', statusDistribusi: 'Menunggu', deadlines: actualDeadlines, catatanCS: p.catatan || '',
      statusProses: p.statusProses || 'Belum Siap Proses',
      source: 'cs',
      butuhProofreading: p.butuhProofreading,
      trackingCode: p.trackingCode,
      baseDeadlines: baseDeadlines,
      trackingDelays: {},
      deadlinePlan: p.deadlinePlan || '',
      intakeStatus: 'waiting_final_data',
      finalDataToken: createFinalDataToken_(),
      finalDataSubmittedAt: '',
      finalJudul: '',
      finalPenulisUtama: '',
      finalPenulisList: [],
      finalEditorList: [],
      adminLoaDone: '',
      adminKeaslianPdfDone: '',
      adminKeaslianWordDone: '',
      adminDoneAt: '',
      productionStartedAt: ''
    };
    var savedNaskah = saveData('Naskah', H.Naskah, newNaskah, 'id');
    if (!savedNaskah || savedNaskah.success === false) {
      appendDebugLog_('saveDealData:naskah_failed', {
        dealId: p.id,
        naskahId: newNaskah.id,
        savedDeal: savedDeal,
        savedNaskah: savedNaskah
      });
      return {
        success: false,
        message: 'Deal tersimpan, tetapi naskah gagal dibuat. Hubungi manajemen untuk cek sheet Naskah.',
        data: { dealId: p.id, trackingCode: p.trackingCode, dealRow: savedDeal && savedDeal.row },
        error: savedNaskah && (savedNaskah.error || savedNaskah.message) ? (savedNaskah.error || savedNaskah.message) : 'Unknown save error'
      };
    }
    notifyNewDealNaskah_(newNaskah, selectedCss);
    appendDebugLog_('saveDealData:success_new', {
      dealId: p.id,
      naskahId: newNaskah.id,
      trackingCode: newNaskah.trackingCode,
      savedDeal: savedDeal,
      savedNaskah: savedNaskah,
      assignedCssUsername: p.assignedCssUsername,
      assignedCssName: p.assignedCssName
    });
    return {
      success: true,
      data: {
        dealId: p.id,
        naskahId: newNaskah.id,
        trackingCode: newNaskah.trackingCode,
        dealRow: savedDeal && savedDeal.row,
        naskahRow: savedNaskah && savedNaskah.row,
        dealLastRow: savedDeal && savedDeal.lastRow,
        naskahLastRow: savedNaskah && savedNaskah.lastRow
      },
      debugUrl: getDB().getUrl()
    };
  } else {
    var naskahs = getAllData('Naskah', H.Naskah);
    for(var i=0; i<naskahs.length; i++) {
       if (naskahs[i].dealId === p.id) {
           var n = naskahs[i];
           n.judul = p.judul; n.penulis = p.penulis; n.noHpPenulis = p.noHpPenulis || n.noHpPenulis || ''; n.kotaAsal = p.kotaAsal || n.kotaAsal || ''; n.penerbit = p.penerbit;
           n.paket = p.paket; n.percepatanProses = p.percepatanProses; n.ukuran = p.ukuran; n.estimasiHalaman = p.estimasiHalaman; n.estimasiKata = p.estimasiKata; n.spesifikasiCetak = p.spesifikasiCetak || '';
           n.statusProses = p.statusProses || n.statusProses;
           if (p.assignedCssUsername) {
             n.assignedCssUsername = selectedCss.username || p.assignedCssUsername;
             n.assignedCssName = selectedCss.nama || p.assignedCssName || p.assignedCssUsername;
           } else if (!n.assignedCssUsername && selectedCss.username) {
             n.assignedCssUsername = selectedCss.username;
             n.assignedCssName = selectedCss.nama;
           }
           n.trackingCode = n.trackingCode || p.trackingCode || generateTrackingCode_();
           if (deadlinePlan) {
             n.baseDeadlines = deadlinePlan.base;
             n.deadlinePlan = deadlinePlan.settingId;
             n.deadlines = applyTrackingDelays_(deadlinePlan.base, parseTrackingDelays_(n.trackingDelays));
           }
           var oldButuhProofreading = isProofreadingSkipped_(n.butuhProofreading) ? '0' : '1';
           n.butuhProofreading = p.butuhProofreading;
           if (p.butuhProofreading === '0') {
             n.picEditor = '';
             n.statusEditor = 'Complete';
             if (n.deadlines && typeof n.deadlines === 'object') n.deadlines.proofreading = '';
             var timelineOrder = ['Administrasi', 'Proofreading', 'Desain Cover & Layout', 'ISBN', 'Produksi', 'Distribusi', 'Selesai'];
             var currentIdx = timelineOrder.indexOf(n.timeline);
             var layoutIdx = timelineOrder.indexOf('Desain Cover & Layout');
             if (currentIdx === -1 || currentIdx < layoutIdx) n.timeline = 'Desain Cover & Layout';
           } else if (oldButuhProofreading === '0' && String(n.statusEditor || '') === 'Complete' && !n.picEditor) {
             n.statusEditor = 'Menunggu';
           }
           var updatedNaskah = saveData('Naskah', H.Naskah, n, 'id');
           if (!updatedNaskah || updatedNaskah.success === false) {
             appendDebugLog_('saveDealData:naskah_update_failed', {
               dealId: p.id,
               naskahId: n.id,
               savedDeal: savedDeal,
               updatedNaskah: updatedNaskah
             });
             return {
               success: false,
               message: 'Deal tersimpan, tetapi naskah terkait gagal diperbarui.',
               error: updatedNaskah && (updatedNaskah.error || updatedNaskah.message) ? (updatedNaskah.error || updatedNaskah.message) : 'Unknown save error'
             };
           }
           break;
       }
    }
  }
  appendDebugLog_('saveDealData:success_update', {
    dealId: p.id,
    savedDeal: savedDeal
  });
  return { success: true, data: { dealId: p.id, dealRow: savedDeal && savedDeal.row, dealLastRow: savedDeal && savedDeal.lastRow }, debugUrl: getDB().getUrl() };
}
function saveLegacyDealData(p) {
  p.source = 'legacy';
  p.kategori = normalizeLegacyDealCategory_(p.kategori || p.jenis || p.tipe);
  p.statusProses = p.statusProses || 'Tagihan Berjalan';
  p.butuhProofreading = isProofreadingSkipped_(p.butuhProofreading) ? '0' : '1';
  p.importedAt = p.importedAt || Utilities.formatDate(new Date(), getDBTimezone(), "yyyy-MM-dd");
  return saveDealData(p);
}
function normalizeLegacyDealCategory_(value) {
  var text = String(value || '').trim().toLowerCase();
  if (text.indexOf('cetak') !== -1) return 'Cetak';
  if (text.indexOf('lain') !== -1) return 'Lainnya';
  return 'Terbit';
}
function parsePaymentTransactions_(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      var parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }
  return [];
}
function addDealAdditionalPayment(id, amount) {
  amount = Number(amount || 0);
  if (!id || amount <= 0) return { success: false, message: 'Nominal tambahan tidak valid.' };
  var deals = getAllData('Deals', H.Deals);
  var today = Utilities.formatDate(new Date(), getDBTimezone(), "yyyy-MM-dd");
  for (var i = 0; i < deals.length; i++) {
    if (deals[i].id === id) {
      var tx = parsePaymentTransactions_(deals[i].transaksiTambahan);
      tx.push({ tanggal: today, nominal: amount });
      deals[i].transaksiTambahan = tx;
      deals[i].nilai = Number(deals[i].nilai || 0) + amount;
      saveData('Deals', H.Deals, deals[i], 'id');
      return { success: true };
    }
  }
  return { success: false, message: 'Deal tidak ditemukan.' };
}
function updateDealAdditionalPayment(id, amount) {
  amount = Number(amount || 0);
  if (!id || amount < 0) return { success: false, message: 'Nominal biaya tidak valid.' };
  var deals = getAllData('Deals', H.Deals);
  var today = Utilities.formatDate(new Date(), getDBTimezone(), "yyyy-MM-dd");
  for (var i = 0; i < deals.length; i++) {
    if (deals[i].id === id) {
      var tx = parsePaymentTransactions_(deals[i].transaksiTambahan);
      var biayaSaatIni = tx.filter(function(item) {
        return !isTambahDpTransaction_(item);
      }).reduce(function(sum, item) {
        return sum + Number(item.nominal || 0);
      }, 0);
      var keepTx = tx.filter(isTambahDpTransaction_);
      if (amount > 0) keepTx.push({ tanggal: today, nominal: amount, tipe: 'Tambahan Biaya' });
      deals[i].transaksiTambahan = keepTx;
      deals[i].nilai = Math.max(0, Number(deals[i].nilai || 0) - biayaSaatIni + amount);
      saveData('Deals', H.Deals, deals[i], 'id');
      return { success: true, data: deals[i] };
    }
  }
  return { success: false, message: 'Deal tidak ditemukan.' };
}
function addDealDpPayment(id, amount) {
  amount = Number(amount || 0);
  if (!id || amount <= 0) return { success: false, message: 'Nominal tambah DP tidak valid.' };
  var deals = getAllData('Deals', H.Deals);
  var today = Utilities.formatDate(new Date(), getDBTimezone(), "yyyy-MM-dd");
  for (var i = 0; i < deals.length; i++) {
    if (deals[i].id === id) {
      if (deals[i].statusPayment !== 'DP') return { success: false, message: 'Tambah DP hanya tersedia untuk deal berstatus DP.' };
      var total = Number(deals[i].nilai || 0);
      var currentDp = Number(deals[i].nominalDP || 0);
      var sisa = total - currentDp;
      if (amount >= sisa) return { success: false, message: 'Nominal sama atau melebihi sisa tagihan. Gunakan tombol pelunasan.' };
      var tx = parsePaymentTransactions_(deals[i].transaksiTambahan);
      tx.push({ tanggal: today, nominal: amount, tipe: 'Tambah DP' });
      deals[i].transaksiTambahan = tx;
      deals[i].nominalDP = currentDp + amount;
      saveData('Deals', H.Deals, deals[i], 'id');
      return { success: true };
    }
  }
  return { success: false, message: 'Deal tidak ditemukan.' };
}
function addDealPelunasanPayment(id, amount) {
  amount = Number(amount || 0);
  if (!id || amount <= 0) return { success: false, message: 'Nominal pelunasan tidak valid.' };
  var deals = getAllData('Deals', H.Deals);
  var today = Utilities.formatDate(new Date(), getDBTimezone(), "yyyy-MM-dd");
  for (var i = 0; i < deals.length; i++) {
    if (deals[i].id === id) {
      var currentDp = Number(deals[i].nominalDP || 0);
      deals[i].nilai = currentDp + amount;
      deals[i].statusPayment = 'Full Payment';
      deals[i].nominalPelunasan = amount;
      deals[i].tanggalPelunasan = today;
      saveData('Deals', H.Deals, deals[i], 'id');
      return { success: true };
    }
  }
  return { success: false, message: 'Deal tidak ditemukan.' };
}

function updateDealPaymentCorrection(id, payload) {
  id = String(id || '').trim();
  payload = payload || {};
  var authPassword = String(payload.authPassword || '');
  var expectedPassword = String(getGlobalStateValue_('passwordDeal') || 'admin123');
  if (!authPassword || authPassword !== expectedPassword) return { success: false, message: 'Password otorisasi salah.' };
  var nilai = Number(payload.nilai || 0);
  var statusPayment = String(payload.statusPayment || '').trim();
  var nominalDP = Number(payload.nominalDP || 0);
  if (!id) return { success: false, message: 'ID deal tidak valid.' };
  if (nilai <= 0) return { success: false, message: 'Nilai deal wajib lebih dari 0.' };
  if (statusPayment !== 'DP' && statusPayment !== 'Full Payment') return { success: false, message: 'Status pembayaran tidak valid.' };
  if (statusPayment === 'DP') {
    if (nominalDP <= 0) return { success: false, message: 'Nominal DP wajib lebih dari 0.' };
    if (nominalDP >= nilai) return { success: false, message: 'Nominal DP harus lebih kecil dari nilai deal.' };
  } else {
    nominalDP = 0;
  }
  var deals = getAllData('Deals', H.Deals);
  var now = nowDateTime_();
  for (var i = 0; i < deals.length; i++) {
    if (String(deals[i].id || '') !== id) continue;
    var hasPelunasan = Number(deals[i].nominalPelunasan || 0) > 0;
    if (statusPayment === 'Full Payment' && hasPelunasan) {
      nominalDP = Number(payload.nominalDP || 0);
      if (nominalDP <= 0) return { success: false, message: 'Nominal DP awal wajib diisi untuk deal yang sudah memiliki pelunasan.' };
      if (nominalDP >= nilai) return { success: false, message: 'Nominal DP awal harus lebih kecil dari nilai deal.' };
    }
    var previous = {
      nilai: Number(deals[i].nilai || 0),
      statusPayment: deals[i].statusPayment || '',
      nominalDP: Number(deals[i].nominalDP || 0)
    };
    deals[i].nilai = nilai;
    deals[i].statusPayment = statusPayment;
    deals[i].nominalDP = nominalDP;
    deals[i].paymentCorrectionAt = now;
    deals[i].paymentCorrectionBy = String(payload.username || payload.updatedBy || '');
    deals[i].paymentCorrectionNote = String(payload.note || '').trim();
    deals[i].paymentCorrectionPrevious = JSON.stringify(previous);
    var savedDeal = saveData('Deals', H.Deals, deals[i], 'id');
    if (!savedDeal || savedDeal.success === false) return savedDeal || { success: false, message: 'Koreksi pembayaran gagal disimpan.' };
    return { success: true, data: deals[i] };
  }
  return { success: false, message: 'Deal tidak ditemukan.' };
}
function addKpiDpPayment(id, amount) {
  amount = Number(amount || 0);
  if (!id || amount <= 0) return { success: false, message: 'Nominal tambah DP tidak valid.' };
  var rows = getAllData('KPI', H.KPI);
  var today = Utilities.formatDate(new Date(), getDBTimezone(), "yyyy-MM-dd");
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].id === id) {
      if (rows[i].statusPayment !== 'DP') return { success: false, message: 'Tambah DP hanya tersedia untuk data berstatus DP.' };
      var total = Number(rows[i].nominal || 0);
      var currentDp = Number(rows[i].nominalDP || 0);
      var sisa = total - currentDp;
      if (amount >= sisa) return { success: false, message: 'Nominal sama atau melebihi sisa tagihan. Gunakan tombol pelunasan.' };
      var tx = parsePaymentTransactions_(rows[i].transaksiTambahan);
      tx.push({ tanggal: today, nominal: amount, tipe: 'Tambah DP' });
      rows[i].transaksiTambahan = tx;
      rows[i].nominalDP = currentDp + amount;
      saveData('KPI', H.KPI, rows[i], 'id');
      return { success: true };
    }
  }
  return { success: false, message: 'Data KPI tidak ditemukan.' };
}
function archiveDeal(id) {
  if (!id) return { success: false, message: 'ID deal tidak valid.' };
  var deals = getAllData('Deals', H.Deals);
  var today = Utilities.formatDate(new Date(), getDBTimezone(), "yyyy-MM-dd");
  for (var i = 0; i < deals.length; i++) {
    if (deals[i].id === id) {
      var deal = deals[i];
      deal.archivedAt = today;
      saveData('DealArchive', H.DealArchive, deal, 'id');
      deleteData('Deals', 'id', id);
      return { success: true };
    }
  }
  return { success: false, message: 'Deal tidak ditemukan.' };
}
function deleteDeal(id) { 
  deleteData('Deals', 'id', id); 
  var naskahs = getAllData('Naskah', H.Naskah);
  for(var i=0; i<naskahs.length; i++) {
    if (naskahs[i].dealId === id) deleteData('Naskah', 'id', naskahs[i].id);
  }
  return { success: true }; 
}

function updateNaskahStatusProses(id, status) {
  var naskahs = getAllData('Naskah', H.Naskah);
  var updated = false;
  var dealId = '';
  for(var i=0; i<naskahs.length; i++) {
    if (naskahs[i].id === id) {
      naskahs[i].statusProses = status;
      dealId = naskahs[i].dealId;
      saveData('Naskah', H.Naskah, naskahs[i], 'id');
      updated = true;
      break;
    }
  }
  
  // Update deal as well
  if (updated && dealId) {
    var deals = getAllData('Deals', H.Deals);
    for(var j=0; j<deals.length; j++) {
      if (deals[j].id === dealId) {
        deals[j].statusProses = status;
        saveData('Deals', H.Deals, deals[j], 'id');
        break;
      }
    }
  }
  return { success: updated };
}

function updateNaskahSpesifikasiCetak(id, spesifikasiCetak) {
  id = String(id || '').trim();
  if (!id) return { success: false, message: 'ID naskah tidak valid.' };
  var value = String(spesifikasiCetak || '').trim();
  var naskahs = getAllData('Naskah', H.Naskah);
  for (var i = 0; i < naskahs.length; i++) {
    if (String(naskahs[i].id || '') !== id) continue;
    naskahs[i].spesifikasiCetak = value;
    var savedNaskah = saveData('Naskah', H.Naskah, naskahs[i], 'id');
    if (!savedNaskah || savedNaskah.success === false) {
      return {
        success: false,
        message: 'Spesifikasi cetak gagal disimpan ke naskah.',
        error: savedNaskah && (savedNaskah.error || savedNaskah.message) ? (savedNaskah.error || savedNaskah.message) : 'Unknown save error'
      };
    }
    if (naskahs[i].dealId) {
      var deals = getAllData('Deals', H.Deals);
      for (var j = 0; j < deals.length; j++) {
        if (String(deals[j].id || '') !== String(naskahs[i].dealId || '')) continue;
        deals[j].spesifikasiCetak = value;
        saveData('Deals', H.Deals, deals[j], 'id');
        break;
      }
    }
    return { success: true, data: { id: id, spesifikasiCetak: value } };
  }
  return { success: false, message: 'Naskah tidak ditemukan.' };
}

function getKendalaData() { return { success: true, data: getAllData('Kendala', H.Kendala) }; }
function saveKendalaData(p) {
  p.id = p.id || "KND-" + new Date().getTime();
  p.tanggal = p.tanggal || Utilities.formatDate(new Date(), getDBTimezone(), "yyyy-MM-dd");
  return saveData('Kendala', H.Kendala, p, 'id');
}

function getSettingsData() { 
  var pubs = getAllData('SettingsPub', H.SettingsPub);
  if(pubs.length > 0) {
      pubs.forEach(function(p){ 
          if(typeof p.paket === 'string') {
              try{ p.paket = JSON.parse(p.paket); } catch(e){ p.paket = p.paket.split(','); }
          }
      });
  }
  var kpis = getAllData('SettingsKPI', H.SettingsKPI).filter(function(row) {
    return !isSystemKpiType_(row.nama, row.role);
  });
  var globals = getAllData('GlobalState', H.GlobalState);
  var pw = 'admin123';
  for(var i=0; i<globals.length; i++) { if(globals[i].key === 'passwordDeal') pw = globals[i].value; }
  
  return { success: true, data: { penerbit: pubs, jenisKPI: kpis, passwordDeal: pw } };
}
function savePenerbitData(p) {
  if(!p.id) p.id = "PUB-" + new Date().getTime();
  if(Array.isArray(p.paket)) p.paket = JSON.stringify(p.paket);
  return saveData('SettingsPub', H.SettingsPub, p, 'id');
}
function deletePenerbitData(id) { return deleteData('SettingsPub', 'id', id); }

function saveJenisKPI(p) {
  if (isSystemKpiType_(p && p.nama, p && p.role)) {
    return { success: false, message: 'KPI ini adalah KPI tetap sistem. Manajemen hanya bisa mengatur targetnya.' };
  }
  if(!p.id) p.id = "JKPI-" + new Date().getTime();
  return saveData('SettingsKPI', H.SettingsKPI, p, 'id');
}
function deleteJenisKPI(id) {
  var rows = getAllData('SettingsKPI', H.SettingsKPI);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id || '') === String(id || '') && isSystemKpiType_(rows[i].nama, rows[i].role)) {
      return { success: false, message: 'KPI ini adalah KPI tetap sistem dan tidak bisa dihapus.' };
    }
  }
  return deleteData('SettingsKPI', 'id', id);
}

function getTargetData() { return { success: true, data: getAllData('Target', H.Target) }; }
function saveTargetData(p) { return saveData('Target', H.Target, p, 'username'); }

function getKPIData() { return { success: true, data: getAllData('KPI', H.KPI) }; }
function saveKPIData(p) {
  if(!p.id) p.id = "KPI-" + new Date().getTime();
  return saveData('KPI', H.KPI, p, 'id');
}
function deleteKPI(id) { return deleteData('KPI', 'id', id); }

function buildCetakSpecification_(p) {
  var parts = [];
  if (p.ukuran) parts.push('Ukuran ' + p.ukuran);
  if (p.warna) parts.push('Warna ' + p.warna + (String(p.warna || '').toLowerCase() === 'beberapa hal warna' && p.jumlahHalWarna ? ' (' + p.jumlahHalWarna + ' hal)' : ''));
  if (p.jenisKertas) parts.push('Kertas ' + p.jenisKertas);
  if (p.cover) parts.push('Cover ' + p.cover);
  if (p.jumlahEks) parts.push(p.jumlahEks + ' eks');
  return parts.join(', ');
}

function getCetakJobs(username, role) {
  role = normalizeRole_(role || '');
  var user = findPortalUserByUsername_(username) || {};
  var userName = String(user.nama || '').trim().toLowerCase();
  var userUsername = String(user.username || username || '').trim().toLowerCase();
  var rows = getAllData('CetakJobs', H.CetakJobs);
  if (role === 'cs') {
    rows = rows.filter(function(row) {
      var csUser = String(row.csUsername || '').trim().toLowerCase();
      var csName = String(row.csName || '').trim().toLowerCase();
      return (csUser && csUser === userUsername) || (csName && (csName === userName || csName === userUsername));
    });
  } else if (role !== 'css' && role !== 'manajemen') {
    rows = [];
  }
  rows.sort(function(a, b) {
    return String(a.deadlineSelesai || '').localeCompare(String(b.deadlineSelesai || '')) || String(b.tanggal || '').localeCompare(String(a.tanggal || ''));
  });
  return { success: true, data: rows };
}

function saveCetakJob(p, username) {
  p = p || {};
  var user = findPortalUserByUsername_(username) || {};
  var now = Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd HH:mm:ss');
  var today = Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd');
  var isNew = !p.id;
  if (!p.tanggal) p.tanggal = today;
  p.tanggal = String(p.tanggal || '').substring(0, 10);
  p.deadlineSelesai = String(p.deadlineSelesai || '').substring(0, 10);
  p.judul = String(p.judul || '').trim();
  p.kotaAsal = String(p.kotaAsal || '').trim();
  p.ukuran = String(p.ukuran || '').trim();
  p.warna = String(p.warna || '').trim();
  p.jenisKertas = String(p.jenisKertas || '').trim();
  p.cover = String(p.cover || '').trim();
  p.jumlahHalWarna = String(p.warna || '').toLowerCase() === 'beberapa hal warna' ? Math.max(0, Number(p.jumlahHalWarna || 0)) : 0;
  p.jumlahEks = Math.max(0, Number(p.jumlahEks || 0));
  p.nilaiKpi = Math.max(0, Number(p.nilaiKpi || 0));
  p.nominal = Math.max(0, Number(p.nominal || 0));
  p.statusPayment = String(p.statusPayment || 'Full Payment') === 'DP' ? 'DP' : 'Full Payment';
  p.nominalDP = p.statusPayment === 'DP' ? Math.max(0, Number(p.nominalDP || 0)) : 0;
  if (!p.judul || !p.tanggal || !p.deadlineSelesai || !p.ukuran || !p.warna || !p.jenisKertas || !p.cover || !p.jumlahEks || !p.nominal) {
    return { success: false, message: 'Tanggal, judul, spesifikasi cetak, jumlah eks, nominal, dan deadline wajib diisi.' };
  }
  if (p.warna === 'Beberapa Hal Warna' && !p.jumlahHalWarna) {
    return { success: false, message: 'Jumlah halaman warna wajib diisi.' };
  }
  if (p.statusPayment === 'DP' && (p.nominalDP <= 0 || p.nominalDP >= p.nominal)) {
    return { success: false, message: 'Nominal DP wajib lebih dari 0 dan lebih kecil dari nominal.' };
  }
  p.id = p.id || ('CETAK-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000));
  p.kpiId = p.kpiId || ('KPI-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000));
  p.deadlineAwal = p.deadlineAwal || p.deadlineSelesai;
  p.statusCetak = p.statusCetak || 'Proses';
  p.csUsername = p.csUsername || user.username || username || '';
  p.csName = p.csName || user.nama || username || '';
  p.delayHistory = p.delayHistory || [];
  p.createdAt = p.createdAt || now;
  p.updatedAt = now;

  var kpiPayload = {
    id: p.kpiId,
    picName: p.csName,
    tanggal: p.tanggal,
    judul: p.judul,
    jenis: 'Cetak',
    jumlahKinerja: p.nilaiKpi,
    nominal: p.nominal,
    spesifikasi: buildCetakSpecification_(p),
    kotaAsal: p.kotaAsal,
    statusPayment: p.statusPayment,
    nominalDP: p.nominalDP,
    transaksiTambahan: p.transaksiTambahan || []
  };
  var savedKpi = saveData('KPI', H.KPI, kpiPayload, 'id');
  if (!savedKpi || savedKpi.success === false) return { success: false, message: 'KPI cetak gagal disimpan.', error: savedKpi && (savedKpi.error || savedKpi.message) };
  var saved = saveData('CetakJobs', H.CetakJobs, p, 'id');
  if (!saved || saved.success === false) return { success: false, message: 'Proses cetak gagal disimpan.', error: saved && (saved.error || saved.message) };
  return { success: true, data: { id: p.id, kpiId: p.kpiId, isNew: isNew } };
}

function completeCetakJob(id, username, role) {
  role = normalizeRole_(role || '');
  if (role !== 'cs' && role !== 'css' && role !== 'manajemen') return { success: false, message: 'Akses tidak diizinkan.' };
  var rows = getAllData('CetakJobs', H.CetakJobs);
  var user = findPortalUserByUsername_(username) || {};
  var userKey = String(user.username || username || '').trim().toLowerCase();
  var nameKey = String(user.nama || '').trim().toLowerCase();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id || '') !== String(id || '')) continue;
    if (role === 'cs') {
      var csUser = String(rows[i].csUsername || '').trim().toLowerCase();
      var csName = String(rows[i].csName || '').trim().toLowerCase();
      if (!((csUser && csUser === userKey) || (csName && (csName === nameKey || csName === userKey)))) return { success: false, message: 'Data cetak ini bukan milik CS Anda.' };
    }
    rows[i].statusCetak = 'Selesai';
    rows[i].selesaiCetakAt = Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd HH:mm:ss');
    rows[i].selesaiCetakBy = user.nama || username || '';
    rows[i].updatedAt = rows[i].selesaiCetakAt;
    return saveData('CetakJobs', H.CetakJobs, rows[i], 'id');
  }
  return { success: false, message: 'Data cetak tidak ditemukan.' };
}

function delayCetakJob(id, nextDeadline, reason, username, role) {
  role = normalizeRole_(role || '');
  if (role !== 'cs' && role !== 'css' && role !== 'manajemen') return { success: false, message: 'Akses tidak diizinkan.' };
  nextDeadline = String(nextDeadline || '').substring(0, 10);
  reason = String(reason || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDeadline) || !reason) return { success: false, message: 'Tanggal baru dan alasan kemunduran wajib diisi.' };
  var rows = getAllData('CetakJobs', H.CetakJobs);
  var user = findPortalUserByUsername_(username) || {};
  var userKey = String(user.username || username || '').trim().toLowerCase();
  var nameKey = String(user.nama || '').trim().toLowerCase();
  var now = Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd HH:mm:ss');
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id || '') !== String(id || '')) continue;
    if (role === 'cs') {
      var csUser = String(rows[i].csUsername || '').trim().toLowerCase();
      var csName = String(rows[i].csName || '').trim().toLowerCase();
      if (!((csUser && csUser === userKey) || (csName && (csName === nameKey || csName === userKey)))) return { success: false, message: 'Data cetak ini bukan milik CS Anda.' };
    }
    var history = Array.isArray(rows[i].delayHistory) ? rows[i].delayHistory : [];
    history.push({ from: rows[i].deadlineSelesai || '', to: nextDeadline, reason: reason, by: user.nama || username || '', at: now });
    rows[i].deadlineSelesai = nextDeadline;
    rows[i].delayHistory = history;
    rows[i].updatedAt = now;
    return saveData('CetakJobs', H.CetakJobs, rows[i], 'id');
  }
  return { success: false, message: 'Data cetak tidak ditemukan.' };
}

function getKpiCorrectionRequests() { return { success: true, data: getAllData('KPIReq', H.KPIReq) }; }
function saveKpiCorrectionRequest(p) {
  if (!p || !p.kpiId) return { success: false, message: 'Data KPI tidak valid.' };
  var reqs = getAllData('KPIReq', H.KPIReq);
  for (var i = 0; i < reqs.length; i++) {
    if (reqs[i].kpiId === p.kpiId && reqs[i].status === 'pending') {
      return { success: false, message: 'KPI ini masih memiliki permintaan koreksi yang menunggu persetujuan.' };
    }
  }
  var kpis = getAllData('KPI', H.KPI);
  var kpi = null;
  for (var j = 0; j < kpis.length; j++) {
    if (kpis[j].id === p.kpiId) {
      kpi = kpis[j];
      break;
    }
  }
  if (!kpi) return { success: false, message: 'Data KPI tidak ditemukan.' };
  p.id = p.id || 'KPIREQ-' + new Date().getTime();
  p.action = p.action || 'edit';
  p.picName = kpi.picName || p.picName || '';
  p.jenis = kpi.jenis || p.jenis || '';
  p.judul = kpi.judul || p.judul || '';
  p.oldData = p.oldData || kpi;
  p.status = 'pending';
  p.requestDate = Utilities.formatDate(new Date(), getDBTimezone(), "yyyy-MM-dd");
  var saved = saveData('KPIReq', H.KPIReq, p, 'id');
  if (saved && saved.success !== false) {
    notifyRoleUsers_('manajemen', {
      type: 'kpi_correction',
      title: p.action === 'delete' ? 'Permintaan hapus KPI' : 'Permintaan koreksi KPI',
      body: (p.picName || 'Tim') + ' mengajukan ' + (p.action === 'delete' ? 'hapus' : 'koreksi') + ' KPI ' + (p.judul || p.jenis || ''),
      targetTab: 'koreksi_kpi',
      targetId: p.id,
      messageId: p.id,
      createdAt: nowDateTime_()
    });
  }
  return saved;
}
function approveKpiCorrectionRequest(id) {
  var reqs = getAllData('KPIReq', H.KPIReq);
  for (var i = 0; i < reqs.length; i++) {
    if (reqs[i].id === id) {
      if (reqs[i].status !== 'pending') return { success: false, message: 'Permintaan ini sudah diproses.' };
      if (reqs[i].action === 'delete') {
        deleteData('KPI', 'id', reqs[i].kpiId);
      } else {
        var proposed = reqs[i].proposedData || {};
        if (typeof proposed === 'string') {
          try { proposed = JSON.parse(proposed); } catch(e) { proposed = {}; }
        }
        proposed.id = reqs[i].kpiId;
        saveData('KPI', H.KPI, proposed, 'id');
      }
      reqs[i].status = 'approved';
      reqs[i].approvedAt = Utilities.formatDate(new Date(), getDBTimezone(), "yyyy-MM-dd");
      return saveData('KPIReq', H.KPIReq, reqs[i], 'id');
    }
  }
  return { success: false, message: 'Permintaan koreksi tidak ditemukan.' };
}
function approveKpiCorrectionRequestWithData(id, proposedData) {
  var reqs = getAllData('KPIReq', H.KPIReq);
  for (var i = 0; i < reqs.length; i++) {
    if (reqs[i].id === id) {
      reqs[i].proposedData = proposedData || {};
      saveData('KPIReq', H.KPIReq, reqs[i], 'id');
      return approveKpiCorrectionRequest(id);
    }
  }
  return { success: false, message: 'Permintaan koreksi tidak ditemukan.' };
}
function rejectKpiCorrectionRequest(id) {
  var reqs = getAllData('KPIReq', H.KPIReq);
  for (var i = 0; i < reqs.length; i++) {
    if (reqs[i].id === id) {
      reqs[i].status = 'rejected';
      return saveData('KPIReq', H.KPIReq, reqs[i], 'id');
    }
  }
  return { success: false, message: 'Permintaan koreksi tidak ditemukan.' };
}

function getDefaultKpiActiveDate_() {
  var now = new Date();
  var firstNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return Utilities.formatDate(firstNextMonth, getDBTimezone(), "yyyy-MM-dd");
}

function getKpiTransitionSettings() {
  var globals = getAllData('GlobalState', H.GlobalState);
  var kpiActiveDate = '';
  for (var i = 0; i < globals.length; i++) {
    if (globals[i].key === 'kpiActiveDate') kpiActiveDate = globals[i].value;
  }
  if (!kpiActiveDate) kpiActiveDate = getDefaultKpiActiveDate_();
  return { success: true, data: { kpiActiveDate: kpiActiveDate } };
}

function saveKpiActiveDate(dateText) {
  dateText = String(dateText || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return { success: false, message: 'Tanggal aktif KPI tidak valid.' };
  return saveData('GlobalState', H.GlobalState, { key: 'kpiActiveDate', value: dateText }, 'key');
}

function getDefaultWhatsAppTrackingTemplate_() {
  return 'Halo {{nama_penulis}},\n\nProgres naskah "{{judul_naskah}}" saat ini berada pada tahap {{tahap_saat_ini}}.\nKode tracking: {{kode_tracking}}\nEstimasi selesai: {{estimasi_selesai}}\n\nTerima kasih.';
}

function getWhatsAppTrackingTemplate() {
  var globals = getAllData('GlobalState', H.GlobalState);
  var value = '';
  for (var i = 0; i < globals.length; i++) {
    if (globals[i].key === 'whatsAppTrackingTemplate') value = String(globals[i].value || '');
  }
  return { success: true, data: { template: value || getDefaultWhatsAppTrackingTemplate_() } };
}

function saveWhatsAppTrackingTemplate(templateText) {
  templateText = String(templateText || '').trim();
  if (!templateText) return { success: false, message: 'Template pesan WhatsApp wajib diisi.' };
  return saveData('GlobalState', H.GlobalState, { key: 'whatsAppTrackingTemplate', value: templateText }, 'key');
}

function ensureNaskahTracking_(rows) {
  var changed = false;
  var cssUsers = getAllData('Users', H.Users).filter(function(u) { return normalizeRole_(u.role) === 'css'; });
  var defaultCss = cssUsers.length > 0 ? cssUsers[0] : null;
  rows.forEach(function(n) {
    var shouldSave = false;
    if (n.assignedCssUsername && !n.assignedCssName) {
      var matchedCss = cssUsers.find(function(u) { return String(u.username || '').trim().toLowerCase() === String(n.assignedCssUsername || '').trim().toLowerCase(); });
      n.assignedCssName = matchedCss ? matchedCss.nama : n.assignedCssUsername;
      shouldSave = true;
    }
    if (!n.trackingCode) {
      n.trackingCode = generateTrackingCode_();
      shouldSave = true;
    }
    if (!n.baseDeadlines && n.paket) {
      var plan = buildDeadlinePlan_(n.tanggal || Utilities.formatDate(new Date(), getDBTimezone(), "yyyy-MM-dd"), n.penerbit, n.paket, null, n.percepatanProses);
      if (plan) {
        n.baseDeadlines = plan.base;
        n.deadlines = n.deadlines || plan.actual;
        n.deadlinePlan = plan.settingId;
        shouldSave = true;
      }
    }
    if (shouldSave) {
      saveData('Naskah', H.Naskah, n, 'id');
      changed = true;
    }
  });
  return rows;
}

function getNaskahData() { return { success: true, data: ensureNaskahTracking_(getAllData('Naskah', H.Naskah)) }; }

function buildNaskahTrackingView_(n) {
  var view = Object.assign({}, n || {});
  if (view.baseDeadlines || view.deadlines) {
    var delays = parseTrackingDelays_(view.trackingDelays);
    var recalculatedDeadlines = applyTrackingDelays_(view.baseDeadlines || view.deadlines || {}, delays);
    if (isNaskahProofreadingSkipped_(view)) recalculatedDeadlines.proofreading = '';
    view.deadlines = recalculatedDeadlines;
  }
  syncNaskahTimelineFromStatuses_(view);
  return view;
}

function getMonitorNaskahData() {
  var rows = ensureNaskahTracking_(getAllData('Naskah', H.Naskah));
  return { success: true, data: rows.map(buildNaskahTrackingView_) };
}

function createFinalDataToken_() {
  return Utilities.getUuid().replace(/-/g, '') + String(Math.floor(Math.random() * 1000000));
}

function normalizeAuthorList_(authors) {
  var list = [];
  if (Array.isArray(authors)) {
    list = authors;
  } else {
    list = String(authors || '').split(/\n|,|;/);
  }
  return list.map(function(name) {
    return String(name || '').replace(/\s+/g, ' ').trim();
  }).filter(Boolean);
}

function publicAuthorDisplay_(authors) {
  var list = normalizeAuthorList_(authors);
  if (!list.length) return '';
  return list.length > 1 ? list[0] + ', dkk' : list[0];
}

function isCssOwner_(n, username) {
  var user = String(username || '').trim().toLowerCase();
  if (!user) return false;
  var userRow = findPortalUserByUsername_(username) || {};
  var userName = String(userRow.nama || '').trim().toLowerCase();
  var cssUser = String(n.assignedCssUsername || '').trim().toLowerCase();
  var cssName = String(n.assignedCssName || '').trim().toLowerCase();
  return (cssUser && cssUser === user) ||
    (cssName && (cssName === user || cssName === userName));
}

function isNewNaskahIntake_(n) {
  var status = String(n.statusProses || '').trim().toLowerCase();
  var intake = String(n.intakeStatus || '').trim().toLowerCase();
  return !String(n.cancelApprovedAt || '') &&
    status !== 'dibatalkan' &&
    status !== 'belum siap proses' &&
    status !== 'naskah baru' &&
    String(n.source || '').trim().toLowerCase() === 'cs' &&
    !String(n.productionStartedAt || '') &&
    (
      status === 'naskah baru' ||
      status === 'administrasi naskah' ||
      status === 'administrasi selesai' ||
      intake === 'waiting_final_data' ||
      intake === 'waiting_admin' ||
      intake === 'admin_done'
    );
}

function getNaskahByCodeAndToken_(code, token) {
  code = String(code || '').trim();
  token = String(token || '').trim();
  if (!code || !token) return null;
  var rows = getAllData('Naskah', H.Naskah);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].trackingCode || '').trim() === code && String(rows[i].finalDataToken || '').trim() === token) {
      return rows[i];
    }
  }
  return null;
}

function getPublicFinalDataUrl_(n) {
  n = n || {};
  var currentUrl = ScriptApp.getService().getUrl();
  var base = currentUrl.replace(/\/dev$/, '/exec');
  return base + '?api=final-data&c=' + encodeURIComponent(n.trackingCode || '') + '&t=' + encodeURIComponent(n.finalDataToken || '');
}

function getCssNewNaskah(username) {
  username = String(username || '').trim();
  var changed = false;
  var rows = getAllData('Naskah', H.Naskah);
  var data = rows.filter(function(n) {
    return isNewNaskahIntake_(n) && isCssOwner_(n, username);
  }).map(function(n) {
    if (!n.finalDataToken) {
      n.finalDataToken = createFinalDataToken_();
      saveData('Naskah', H.Naskah, n, 'id');
      changed = true;
    }
    n.finalDataUrl = getPublicFinalDataUrl_(n);
    n.finalDataLinkType = 'custom_form';
    n.finalDataLinkError = '';
    return n;
  });
  if (changed) rows = getAllData('Naskah', H.Naskah);
  return { success: true, data: data };
}

function getNaskahFinalDataForm(code, token) {
  var n = null;
  if (!code && token) {
    n = getAllData('Naskah', H.Naskah).find(function(row) { return String(row.finalDataToken || '').trim() === token; });
  } else {
    n = getNaskahByCodeAndToken_(code, token);
  }
  
  if (!n || !isNewNaskahIntake_(n)) {
    return { success: false, message: 'Link/Token data naskah tidak valid atau sudah tidak aktif.' };
  }
  return {
    success: true,
    data: {
      trackingCode: n.trackingCode || '',
      judul: n.finalJudul || n.judul || '',
      penulis: n.finalPenulisUtama || n.penulis || '',
      penulisList: normalizeAuthorList_(n.finalPenulisList || n.finalPenulisUtama || n.penulis),
      editorList: normalizeAuthorList_(n.finalEditorList || []),
      penerbit: n.penerbit || '',
      paket: n.paket || '',
      submitted: !!n.finalDataSubmittedAt
    }
  };
}

function submitNaskahFinalData(code, token, payload) {
  payload = payload || {};
  var n = null;
  if (!code && token) {
    n = getAllData('Naskah', H.Naskah).find(function(row) { return String(row.finalDataToken || '').trim() === token; });
    code = n ? n.trackingCode : '';
  } else {
    n = getNaskahByCodeAndToken_(code, token);
  }
  
  if (!n || !isNewNaskahIntake_(n)) {
    return { success: false, message: 'Link/Token data naskah tidak valid atau sudah tidak aktif.' };
  }
  var finalJudul = String(payload.judul || '').replace(/\s+/g, ' ').trim();
  var authors = normalizeAuthorList_(payload.penulisList || payload.penulis || []);
  var editors = normalizeAuthorList_(payload.editorList || payload.editors || []);
  if (!finalJudul) return { success: false, message: 'Judul final wajib diisi.' };
  if (!authors.length) return { success: false, message: 'Minimal satu nama penulis wajib diisi.' };

  var wasSubmitted = !!String(n.finalDataSubmittedAt || '');
  n.finalJudul = finalJudul;
  n.finalPenulisUtama = authors[0];
  n.finalPenulisList = authors;
  n.finalEditorList = editors;
  n.judul = finalJudul;
  n.penulis = publicAuthorDisplay_(authors);
  n.finalDataSubmittedAt = nowDateTime_();
  n.intakeStatus = 'waiting_admin';
  n.statusProses = 'Administrasi Naskah';
  n.timeline = 'Administrasi';
  var saved = saveData('Naskah', H.Naskah, n, 'id');
  if (!saved || saved.success === false) return { success: false, message: 'Data final gagal disimpan.', error: saved && saved.error };

  if (!wasSubmitted) {
    getAllData('Users', H.Users).forEach(function(user) {
      if (normalizeRole_(user.role) !== 'admin') return;
      createNotification_({
        toUsername: user.username,
        type: 'administrasi_naskah',
        title: 'Administrasi naskah baru',
        body: finalJudul + ' sudah mengirim data final dan menunggu administrasi.',
        targetTab: 'administrasi_naskah',
        targetId: n.id,
        messageId: n.id,
        createdAt: nowDateTime_()
      });
    });
  }

  return { success: true, message: 'Data final naskah berhasil dikirim.' };
}

function getAdministrasiNaskahData(username) {
  var rows = getAllData('Naskah', H.Naskah).filter(function(n) {
    if (!String(n.finalDataSubmittedAt || '')) return false;
    if (String(n.cancelApprovedAt || '')) return false;
    if (String(n.statusProses || '').toLowerCase() === 'dibatalkan') return false;
    var intake = String(n.intakeStatus || '').toLowerCase();
    return intake === 'waiting_admin' || intake === 'admin_done' || String(n.statusProses || '').toLowerCase() === 'administrasi naskah';
  });
  return { success: true, data: rows };
}

function saveNaskahAdministration(naskahId, payload, username) {
  payload = payload || {};
  var rows = getAllData('Naskah', H.Naskah);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id || '') !== String(naskahId || '')) continue;
    var n = rows[i];
    if (!String(n.finalDataSubmittedAt || '')) return { success: false, message: 'Data final penulis belum masuk.' };
    var wasComplete = String(n.intakeStatus || '') === 'admin_done';
    
    appendDebugLog_('saveNaskahAdministration', { naskahId: naskahId, payload: payload, n_judul: n.judul });

    n.adminLoaDone = payload.loaDone ? '1' : '';
    n.adminKeaslianPdfDone = payload.keaslianPdfDone ? '1' : '';
    n.adminKeaslianWordDone = payload.keaslianWordDone ? '1' : '';
    var complete = n.adminLoaDone === '1' && n.adminKeaslianPdfDone === '1' && n.adminKeaslianWordDone === '1';
    if (complete) {
      n.intakeStatus = 'admin_done';
      n.statusProses = 'Administrasi Selesai';
      if (!n.adminDoneAt) n.adminDoneAt = nowDateTime_();
    } else {
      n.intakeStatus = 'waiting_admin';
      n.statusProses = 'Administrasi Naskah';
      n.adminDoneAt = '';
    }
    var saved = saveData('Naskah', H.Naskah, n, 'id');
    if (!saved || saved.success === false) return { success: false, message: 'Administrasi gagal disimpan.', error: saved && saved.error };
    
    if (complete && !wasComplete) {
      if (n.assignedCssUsername) {
        createNotification_({
          toUsername: n.assignedCssUsername,
          type: 'administrasi_selesai',
          title: 'Administrasi naskah selesai',
          body: (n.judul || 'Naskah') + ' sudah selesai administrasi dan siap mulai produksi.',
          targetTab: 'naskah_baru',
          targetId: n.id,
          messageId: n.id,
          createdAt: nowDateTime_()
        });
      }
      
      // Auto KPI for Admin
      if (n.adminKpiClaimed !== '1') {
        var userRow = getAllData('Users', H.Users).filter(function(u) { return String(u.username) === String(username); })[0];
        var picName = userRow ? (userRow.nama || username) : username;
        var kpiId = 'KPI-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000);
        var kpiData = {
          id: kpiId,
          picName: picName,
          tanggal: nowDateTime_().split(' ')[0],
          judul: n.judul || '-',
          jenis: 'Administrasi',
          jumlahUmum: 0,
          jumlahKata: 0,
          jumlahHalaman: 0,
          jumlahKinerja: 3,
          evalLayouter: '',
          evalTarget: '',
          evalCapaian: '',
          evalMet: ''
        };
        saveData('KPI', H.KPI, kpiData, 'id');
        
        // Mark as claimed so it doesn't get double counted
        n.adminKpiClaimed = '1';
        saveData('Naskah', H.Naskah, n, 'id'); // Save again to record the claim
      }
    }
    
    return { success: true, complete: complete, data: n };
  }
  return { success: false, message: 'Naskah tidak ditemukan.' };
}

function notifyProductionReady_(naskah) {
  var detail = [naskah.penerbit, naskah.paket].filter(function(v) { return String(v || '').trim(); }).join(' - ');
  getAllData('Users', H.Users).forEach(function(user) {
    var role = normalizeRole_(user.role);
    if (role !== 'pic_editor' && role !== 'pic_layouter') return;
    createNotification_({
      toUsername: user.username,
      type: 'production_ready',
      title: 'Naskah siap produksi',
      body: (naskah.judul || 'Naskah') + (detail ? ' (' + detail + ')' : '') + ' sudah melewati administrasi dan menunggu masuk antrian.',
      targetTab: 'naskah_baru',
      targetId: naskah.id || '',
      messageId: naskah.id || '',
      createdAt: nowDateTime_()
    });
  });
}

function isCsProductionNaskah_(n) {
  if (!n) return false;
  if (String(n.cancelApprovedAt || '')) return false;
  if (String(n.statusProses || '').toLowerCase() === 'dibatalkan') return false;
  var source = String(n.source || '').trim().toLowerCase();
  if (source && source !== 'cs' && source !== 'migrasi') return false;
  var intake = String(n.intakeStatus || '').trim().toLowerCase();
  var queueStarted = ['picQueueStatus', 'picEditorQueueStatus', 'picLayouterQueueStatus'].some(function(field) {
    var value = String(n[field] || '').trim().toLowerCase();
    return value === 'new' || value === 'queued';
  });
  return intake === 'production_started' || !!String(n.productionStartedAt || '') || queueStarted;
}

function picQueueStageForRole_(role) {
  role = normalizeRole_(role || '');
  if (role === 'editor' || role === 'pic_editor') return 'proofreading';
  if (role === 'layouter' || role === 'pic_layouter') return 'layout';
  return '';
}

function picQueueStatusFieldForStage_(stageKey) {
  return stageKey === 'proofreading' ? 'picEditorQueueStatus' :
    stageKey === 'layout' ? 'picLayouterQueueStatus' : '';
}

function picQueueDateFieldForStage_(stageKey) {
  return stageKey === 'proofreading' ? 'picEditorQueuedAt' :
    stageKey === 'layout' ? 'picLayouterQueuedAt' : '';
}

function isPicQueueApplicable_(n, stageKey) {
  if (!isCsProductionNaskah_(n)) return false;
  if (stageKey === 'proofreading') return !isNaskahProofreadingSkipped_(n) && !isPicProductionStageComplete_(n.statusEditor);
  if (stageKey === 'layout') return !isPicProductionStageComplete_(n.statusLayouter);
  return false;
}

function picQueueStatusForStage_(n, stageKey) {
  var field = picQueueStatusFieldForStage_(stageKey);
  var stageStatus = field ? String(n[field] || '').trim().toLowerCase() : '';
  if (stageStatus) return stageStatus;
  return String(n.picQueueStatus || '').trim().toLowerCase();
}

function isPicAssignedForStage_(n, stageKey) {
  if (stageKey === 'proofreading') return !!String((n || {}).picEditor || '').trim();
  if (stageKey === 'layout') return !!String((n || {}).picLayouter || '').trim();
  return true;
}

function isPicNewNaskah_(n, stageKey) {
  return isPicQueueApplicable_(n, stageKey) && !isPicAssignedForStage_(n, stageKey) && picQueueStatusForStage_(n, stageKey) !== 'queued';
}

function isPicQueuedNaskah_(n, stageKey) {
  if (!isPicQueueApplicable_(n, stageKey)) return false;
  return !isPicAssignedForStage_(n, stageKey) && picQueueStatusForStage_(n, stageKey) === 'queued';
}

function naskahQueueDeadline_(n, stageKey) {
  var deadlines = n && n.deadlines && typeof n.deadlines === 'object' ? n.deadlines : {};
  var baseDeadlines = n && n.baseDeadlines && typeof n.baseDeadlines === 'object' ? n.baseDeadlines : {};
  return String(deadlines[stageKey] || baseDeadlines[stageKey] || '').substring(0, 10);
}

function isPicQueueDeadlineOpen_(n, stageKey) {
  var deadline = naskahQueueDeadline_(n, stageKey);
  if (!deadline) return true;
  var today = Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd');
  return deadline <= today;
}

function getPicEarlyAssignPassword_() {
  return String(getGlobalStateValue_('picEarlyAssignPassword') || getGlobalStateValue_('passwordDeal') || 'admin123');
}

function isPicEarlyAssignAuthorized_(password) {
  return String(password || '') === getPicEarlyAssignPassword_();
}

function naskahPackagePriority_(paket) {
  var key = String(paket || '').trim().toLowerCase().replace(/\s+/g, ' ');
  var priorities = {
    'exclusive': 1,
    'express': 2,
    'advance': 3,
    '20 buku': 4,
    '10 buku': 5,
    '2 buku': 6,
    '2buku': 6
  };
  return priorities[key] || 99;
}

function sortPicNaskahQueue_(rows, stageKey) {
  return (rows || []).sort(function(a, b) {
    var deadlineA = naskahQueueDeadline_(a, stageKey) || '9999-12-31';
    var deadlineB = naskahQueueDeadline_(b, stageKey) || '9999-12-31';
    return deadlineA.localeCompare(deadlineB) ||
      (naskahPackagePriority_(a.paket) - naskahPackagePriority_(b.paket)) ||
      String(a.tanggal || '').localeCompare(String(b.tanggal || '')) ||
      String(a.id || '').localeCompare(String(b.id || ''));
  });
}

function getPicNewNaskahData(role) {
  role = normalizeRole_(role || '');
  if (role !== 'pic_editor' && role !== 'pic_layouter') return { success: false, message: 'Akses hanya untuk PIC Editor/Layouter.' };
  var stageKey = picQueueStageForRole_(role);
  var rows = getAllData('Naskah', H.Naskah).filter(function(n) { return isPicNewNaskah_(n, stageKey); });
  return { success: true, stageKey: stageKey, data: sortPicNaskahQueue_(rows, stageKey) };
}

function getPicNaskahQueueData(role) {
  role = normalizeRole_(role || '');
  if (['editor', 'layouter', 'pic_editor', 'pic_layouter'].indexOf(role) === -1) return { success: false, message: 'Akses hanya untuk tim Editor/Layouter.' };
  var stageKey = picQueueStageForRole_(role);
  var rows = getAllData('Naskah', H.Naskah).filter(function(n) { return isPicQueuedNaskah_(n, stageKey); });
  return { success: true, stageKey: stageKey, data: sortPicNaskahQueue_(rows, stageKey) };
}

function getManagementNaskahQueueData(role) {
  role = normalizeRole_(role || '');
  if (role !== 'manajemen') return { success: false, message: 'Akses hanya untuk manajemen.' };
  var rows = getAllData('Naskah', H.Naskah);
  var proofreading = rows.filter(function(n) { return isPicQueuedNaskah_(n, 'proofreading'); });
  var layout = rows.filter(function(n) { return isPicQueuedNaskah_(n, 'layout'); });
  return {
    success: true,
    data: {
      proofreading: sortPicNaskahQueue_(proofreading, 'proofreading'),
      layout: sortPicNaskahQueue_(layout, 'layout')
    }
  };
}

function enqueuePicNaskah(naskahId, username, role) {
  role = normalizeRole_(role || '');
  if (role !== 'pic_editor' && role !== 'pic_layouter') return { success: false, message: 'Akses hanya untuk PIC Editor/Layouter.' };
  var stageKey = picQueueStageForRole_(role);
  var statusField = picQueueStatusFieldForStage_(stageKey);
  var dateField = picQueueDateFieldForStage_(stageKey);
  var rows = getAllData('Naskah', H.Naskah);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id || '') !== String(naskahId || '')) continue;
    if (!isPicNewNaskah_(rows[i], stageKey)) return { success: false, message: 'Naskah ini tidak tersedia di Naskah Baru PIC.' };
    rows[i][statusField] = 'queued';
    rows[i][dateField] = nowDateTime_();
    var saved = saveData('Naskah', H.Naskah, rows[i], 'id');
    if (!saved || saved.success === false) return { success: false, message: 'Gagal memasukkan naskah ke antrian.', error: saved && saved.error };
    return { success: true, stageKey: stageKey, data: rows[i] };
  }
  return { success: false, message: 'Naskah tidak ditemukan.' };
}

function startNaskahProductionFromCss(naskahId, username) {
  var rows = getAllData('Naskah', H.Naskah);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id || '') !== String(naskahId || '')) continue;
    var n = rows[i];
    if (!isCssOwner_(n, username)) return { success: false, message: 'Naskah ini bukan tanggung jawab CSS Anda.' };
    if (String(n.intakeStatus || '') !== 'admin_done') return { success: false, message: 'Administrasi naskah belum selesai.' };
    var skipProofreading = isProofreadingSkipped_(n.butuhProofreading);
    n.statusProses = 'Siap Proses';
    n.intakeStatus = 'production_started';
    n.productionStartedAt = nowDateTime_();
    n.picQueueStatus = 'new';
    n.picQueuedAt = '';
    n.picEditorQueueStatus = skipProofreading ? 'skipped' : 'new';
    n.picEditorQueuedAt = '';
    n.picLayouterQueueStatus = 'new';
    n.picLayouterQueuedAt = '';
    n.timeline = skipProofreading ? 'Desain Cover & Layout' : 'Proofreading';
    n.statusEditor = skipProofreading ? 'Complete' : (n.statusEditor || 'Menunggu');
    n.statusLayouter = n.statusLayouter || 'Menunggu';
    n.statusIsbn = n.statusIsbn || 'Menunggu';
    n.statusProduksi = n.statusProduksi || 'Menunggu';
    n.statusDistribusi = n.statusDistribusi || 'Menunggu';
    var saved = saveData('Naskah', H.Naskah, n, 'id');
    if (!saved || saved.success === false) return { success: false, message: 'Gagal memulai produksi.', error: saved && saved.error };
    
    // Auto KPI for CSS Pendampingan
    if (n.cssKpiClaimed !== '1') {
      var userRow = getAllData('Users', H.Users).filter(function(u) { return String(u.username) === String(username); })[0];
      var picName = userRow ? (userRow.nama || username) : username;
      var kpiId = 'KPI-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000);
      var kpiData = {
        id: kpiId,
        picName: picName,
        tanggal: nowDateTime_().split(' ')[0],
        judul: n.judul || '-',
        jenis: 'Pendampingan',
        jumlahUmum: 0,
        jumlahKata: 0,
        jumlahHalaman: 0,
        jumlahKinerja: 1,
        evalLayouter: '',
        evalTarget: '',
        evalCapaian: '',
        evalMet: ''
      };
      
      saveData('KPI', H.KPI, kpiData, 'id');
      
      // Mark as claimed so it doesn't get double counted
      n.cssKpiClaimed = '1';
      saveData('Naskah', H.Naskah, n, 'id'); // Save again to record the claim
    }

    notifyProductionReady_(n);
    return { success: true, data: n };
  }
  return { success: false, message: 'Naskah tidak ditemukan.' };
}

// Jalankan dari Apps Script untuk mengubah naskah migrasi yang sudah terhubung ke Deal menjadi sumber Input CS.
function syncNaskahMigrasiWithDeals() {
  var naskahRows = getAllData('Naskah', H.Naskah);
  var deals = getAllData('Deals', H.Deals);
  var dealsById = {};
  deals.forEach(function(deal) {
    var id = String(deal.id || '').trim();
    if (id) dealsById[id] = deal;
  });

  var result = { total: naskahRows.length, updated: 0, skipped: 0, noDealId: 0, dealNotFound: 0, updatedIds: [] };
  naskahRows.forEach(function(n) {
    var source = String(n.source || '').trim().toLowerCase();
    var isMigration = source === 'migrasi' || String(n.cs || '').trim().toLowerCase() === 'migrasi manajemen';
    if (!isMigration) {
      result.skipped++;
      return;
    }
    var dealId = String(n.dealId || '').trim();
    if (!dealId) {
      result.noDealId++;
      return;
    }
    var deal = dealsById[dealId];
    if (!deal) {
      result.dealNotFound++;
      return;
    }
    n.source = 'cs';
    n.cs = deal.csName || n.cs || '';
    if (!n.noHpPenulis) n.noHpPenulis = deal.noHpPenulis || '';
    if (!n.kotaAsal) n.kotaAsal = deal.kotaAsal || '';
    saveData('Naskah', H.Naskah, n, 'id');
    result.updated++;
    if (result.updatedIds.length < 50) result.updatedIds.push(n.id);
  });
  return { success: true, data: result };
}

function getCssAssignmentOptions() {
  var users = getAllData('Users', H.Users).filter(function(u) {
    return normalizeRole_(u.role) === 'css';
  }).map(function(u) {
    return { username: u.username || '', nama: u.nama || u.username || '', role: normalizeRole_(u.role) };
  });
  var rows = ensureNaskahTracking_(getAllData('Naskah', H.Naskah)).filter(function(n) {
    return !String(n.cancelApprovedAt || '') &&
      String(n.statusProses || '').toLowerCase() !== 'dibatalkan' &&
      (n.statusProses === 'Siap Proses' || !n.statusProses || n.source === 'migrasi');
  });
  var data = users.map(function(u) {
    var byPublisher = {};
    var total = 0;
    rows.forEach(function(n) {
      var nUser = String(n.assignedCssUsername || '').trim().toLowerCase();
      var nName = String(n.assignedCssName || '').trim().toLowerCase();
      var uUser = String(u.username || '').trim().toLowerCase();
      var uName = String(u.nama || u.username || '').trim().toLowerCase();
      var matches = (nUser === uUser && uUser) || (nUser === uName && uName) || (nName === uUser && uUser) || (nName === uName && uName);
      if (!matches) return;
      total++;
      var publisher = n.penerbit || 'Tanpa Penerbit';
      byPublisher[publisher] = (byPublisher[publisher] || 0) + 1;
    });
    return { username: u.username, nama: u.nama, role: u.role, total: total, byPublisher: byPublisher };
  });
  return { success: true, data: data };
}

function getCssUsersForDeal() {
  var users = getAllData('Users', H.Users).filter(function(u) {
    return normalizeRole_(u.role) === 'css';
  }).map(function(u) {
    return {
      username: u.username || '',
      nama: u.nama || u.username || '',
      role: 'css',
      total: 0,
      byPublisher: {}
    };
  });
  return { success: true, data: users };
}

function assignNaskahCss(naskahId, cssUsername) {
  naskahId = String(naskahId || '').trim();
  cssUsername = String(cssUsername || '').trim();
  if (!naskahId || !cssUsername) return { success: false, message: 'Naskah dan CSS wajib dipilih.' };
  var users = getAllData('Users', H.Users);
  var cssUser = null;
  for (var i = 0; i < users.length; i++) {
    if (String(users[i].username || '').toLowerCase() === cssUsername.toLowerCase() && normalizeRole_(users[i].role) === 'css') {
      cssUser = users[i];
      break;
    }
  }
  if (!cssUser) return { success: false, message: 'User CSS tidak ditemukan.' };
  var rows = getAllData('Naskah', H.Naskah);
  for (var j = 0; j < rows.length; j++) {
    if (String(rows[j].id || '') === naskahId) {
      rows[j].assignedCssUsername = cssUser.username || cssUsername;
      rows[j].assignedCssName = cssUser.nama || cssUser.username || cssUsername;
      return saveData('Naskah', H.Naskah, rows[j], 'id');
    }
  }
  return { success: false, message: 'Naskah tidak ditemukan.' };
}

function autoAssignUnassignedNaskah() {
  var cssUsers = getAllData('Users', H.Users).filter(function(u) { return normalizeRole_(u.role) === 'css'; });
  if (cssUsers.length === 0) return { success: false, message: 'Tidak ada akun CSS yang tersedia.' };
  var rows = getAllData('Naskah', H.Naskah);
  var assigned = 0;
  var skipped = 0;
  rows.forEach(function(n) {
    if (String(n.cancelApprovedAt || '')) return;
    if (String(n.statusProses || '').toLowerCase() === 'dibatalkan') return;
    if (n.assignedCssUsername) { skipped++; return; }
    var cssIndex = assigned % cssUsers.length;
    n.assignedCssUsername = cssUsers[cssIndex].username;
    n.assignedCssName = cssUsers[cssIndex].nama || cssUsers[cssIndex].username;
    saveData('Naskah', H.Naskah, n, 'id');
    assigned++;
  });
  return { success: true, data: { assigned: assigned, skipped: skipped, totalCss: cssUsers.length } };
}

function saveNaskahData(p) {
  p = p || {};
  var callerRole = normalizeRole_(p._userRole || p.userRole || '');
  var assignmentAuthPassword = p.picAssignAuthPassword || '';
  delete p._userRole;
  delete p.userRole;
  delete p.picAssignAuthPassword;
  var previous = null;
  if (p && p.id) {
    var existingRows = getAllData('Naskah', H.Naskah);
    for (var ex = 0; ex < existingRows.length; ex++) {
      if (String(existingRows[ex].id || '') === String(p.id || '')) {
        previous = existingRows[ex];
        break;
      }
    }
  }
  var isNewNaskah = !p.id;
  if(!p.id) p.id = "NSK-" + new Date().getTime();
  p.noHpPenulis = onlyDigits_(p.noHpPenulis || (previous && previous.noHpPenulis) || '');
  if (!p.assignedCssUsername && previous && previous.assignedCssUsername) {
    p.assignedCssUsername = previous.assignedCssUsername;
    p.assignedCssName = previous.assignedCssName || previous.assignedCssUsername || '';
  } else if (p.assignedCssUsername) {
    var cssRows = getAllData('Users', H.Users);
    for (var cssIdx = 0; cssIdx < cssRows.length; cssIdx++) {
      if (String(cssRows[cssIdx].username || '').trim().toLowerCase() === String(p.assignedCssUsername || '').trim().toLowerCase() && normalizeRole_(cssRows[cssIdx].role) === 'css') {
        p.assignedCssUsername = cssRows[cssIdx].username || p.assignedCssUsername;
        p.assignedCssName = cssRows[cssIdx].nama || p.assignedCssName || p.assignedCssUsername;
        break;
      }
    }
  }
  var shouldRequirePhone = isNewNaskah;
  if (shouldRequirePhone && (!p.noHpPenulis || p.noHpPenulis.length < 5 || p.noHpPenulis.length > 18)) {
    return { success: false, message: 'Nomor HP penulis wajib angka 5-18 digit.' };
  }
  if (!p.trackingCode) p.trackingCode = generateTrackingCode_();
  if (previous && (callerRole === 'pic_editor' || callerRole === 'pic_layouter')) {
    var assignStage = callerRole === 'pic_editor' ? 'proofreading' : 'layout';
    var assignField = callerRole === 'pic_editor' ? 'picEditor' : 'picLayouter';
    var previousAssignee = String(previous[assignField] || '').trim();
    var nextAssignee = String(p[assignField] || '').trim();
    if (nextAssignee && nextAssignee !== previousAssignee && !isPicQueueDeadlineOpen_(previous, assignStage) && !isPicEarlyAssignAuthorized_(assignmentAuthPassword)) {
      return { success: false, code: 'EARLY_ASSIGN_LOCKED', message: 'Belum masuk jadwal deadline. Gunakan password otorisasi manajemen untuk menugaskan lebih cepat.' };
    }
  }
  var startDate = p.tanggal || Utilities.formatDate(new Date(), getDBTimezone(), "yyyy-MM-dd");
  if (!p.baseDeadlines && p.paket) {
    var plan = buildDeadlinePlan_(startDate, p.penerbit, p.paket, null, p.percepatanProses);
    if (plan) {
      p.baseDeadlines = plan.base;
      p.deadlines = p.deadlines || plan.actual;
      p.deadlinePlan = plan.settingId;
    }
  }
  if (p.baseDeadlines && p.trackingDelays) {
    p.deadlines = applyTrackingDelays_(p.baseDeadlines, parseTrackingDelays_(p.trackingDelays));
  }
  p.statusProduksi = p.statusProduksi || 'Menunggu';
  p.statusDistribusi = p.statusDistribusi || 'Menunggu';
  var todayText = Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd');
  if (previous) {
    if (String(p.statusEditor || '') !== String(previous.statusEditor || '') ||
        Number(p.revisiProofreading || 0) !== Number(previous.revisiProofreading || 0)) {
      p.statusEditorUpdatedAt = todayText;
    } else if (!p.statusEditorUpdatedAt && previous.statusEditorUpdatedAt) {
      p.statusEditorUpdatedAt = previous.statusEditorUpdatedAt;
    }
    if (String(p.statusLayouter || '') !== String(previous.statusLayouter || '') ||
        Number(p.revisiLayout || 0) !== Number(previous.revisiLayout || 0)) {
      p.statusLayouterUpdatedAt = todayText;
    } else if (!p.statusLayouterUpdatedAt && previous.statusLayouterUpdatedAt) {
      p.statusLayouterUpdatedAt = previous.statusLayouterUpdatedAt;
    }
  } else {
    if (!p.statusEditorUpdatedAt && p.statusEditor && String(p.statusEditor || '') !== 'Menunggu') p.statusEditorUpdatedAt = todayText;
    if (!p.statusLayouterUpdatedAt && p.statusLayouter && String(p.statusLayouter || '') !== 'Menunggu') p.statusLayouterUpdatedAt = todayText;
  }
  syncNaskahTimelineFromStatuses_(p);
  var saved = saveData('Naskah', H.Naskah, p, 'id');
  if (saved && saved.success) notifyNaskahAssignment_(p, previous);
  return saved;
}
function deleteNaskah(id) { return deleteData('Naskah', 'id', id); }

function getSuratData() { return { success: true, data: getAllData('Surat', H.Surat) }; }
function deleteSurat(no) { return deleteData('Surat', 'no', no); }
function getBriefingData() { return { success: true, data: getAllData('Briefing', H.Briefing) }; }
function saveBriefingData(p) {
  var tz = getDBTimezone();
  var now = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss');
  p = p || {};
  if (!p.id) {
    p.id = 'BRF-' + Date.now();
    p.createdAt = now;
  }
  p.updatedAt = now;
  p.hidden = p.hidden || '';
  return saveData('Briefing', H.Briefing, p, 'id');
}
function setSuratHiddenByMonth(month, hidden, userName) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    month = String(month || '').substring(0, 7);
    if (!month) return {success: false, message: 'Bulan tidak valid'};
    var sheet = ensureSheet('Surat', H.Surat);
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return {success: true, count: 0};
    var headers = data[0];
    var tanggalIdx = headers.indexOf('tanggal');
    var hiddenIdx = headers.indexOf('hidden');
    var monthIdx = headers.indexOf('hiddenMonth');
    var atIdx = headers.indexOf('hiddenAt');
    var byIdx = headers.indexOf('hiddenBy');
    var tz = getDBTimezone();
    var now = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss');
    var count = 0;
    for (var i = 1; i < data.length; i++) {
      var tanggal = data[i][tanggalIdx];
      if (tanggal instanceof Date) tanggal = Utilities.formatDate(tanggal, tz, 'yyyy-MM-dd');
      if (String(tanggal || '').substring(0, 7) !== month) continue;
      sheet.getRange(i + 1, hiddenIdx + 1).setValue(hidden ? '1' : '');
      sheet.getRange(i + 1, monthIdx + 1).setValue(hidden ? month : '');
      sheet.getRange(i + 1, atIdx + 1).setValue(hidden ? now : '');
      sheet.getRange(i + 1, byIdx + 1).setValue(hidden ? (userName || '') : '');
      count++;
    }
    SpreadsheetApp.flush();
    CacheService.getScriptCache().remove('DB_Surat');
    return {success: true, count: count};
  } catch(e) {
    return {success: false, error: e.toString()};
  } finally {
    lock.releaseLock();
  }
}
function generateNomor(p) {
  var globals = getAllData('GlobalState', H.GlobalState);
  var key = p.isLainnya ? 'Counter_Lainnya' : ('Counter_' + p.jenis);
  var currentCount = 1;
  for(var i=0; i<globals.length; i++) { if(globals[i].key === key) currentCount = parseInt(globals[i].value) || 1; }
  
  var urutan = "10" + ("00" + currentCount).slice(-2);
  var monthsRoman = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
  var romawiBulan = monthsRoman[new Date().getMonth()];
  
  var no = "";
  if (p.isLainnya) {
    no = urutan + "/" + p.penerbit + "/" + romawiBulan + "/" + new Date().getFullYear();
  } else {
    no = urutan + "/" + p.jenis + "/" + p.penerbit + "/" + romawiBulan + "/" + new Date().getFullYear();
  }
  
  var surat = {
    no: no, jenis: p.jenis, judulNaskah: p.judulNaskah, penulis: p.penulis,
    penerbit: p.penerbit, paket: p.paket, tanggal: Utilities.formatDate(new Date(), getDBTimezone(), "dd/MM/yyyy"), pengambil: p.pengambil
  };
  var savedSurat = saveData('Surat', H.Surat, surat, 'no');
  if (!savedSurat || savedSurat.success === false) {
    return { success: false, message: 'Gagal menyimpan Surat: ' + (savedSurat && savedSurat.error ? savedSurat.error : '') };
  }
  
  currentCount++;
  saveData('GlobalState', H.GlobalState, {key: key, value: currentCount}, 'key');
  return { success: true, data: no };
}

function resetNomorSurat() {
  var globals = getAllData('GlobalState', H.GlobalState);
  for(var i=0; i<globals.length; i++) {
    if(globals[i].key.indexOf('Counter_') === 0) {
      globals[i].value = 1;
      saveData('GlobalState', H.GlobalState, globals[i], 'key');
    }
  }
  return { success: true };
}

function getStokData() { return { success: true, data: getAllData('Stok', H.Stok) }; }
function saveStokData(p) {
  if(!p.id) p.id = "STK-" + new Date().getTime();
  p.lastUpdate = p.lastUpdate || Utilities.formatDate(new Date(), getDBTimezone(), "yyyy-MM-dd");
  return saveData('Stok', H.Stok, p, 'id');
}
function deleteStok(id) { return deleteData('Stok', 'id', id); }

function getPenjualanData() { return { success: true, data: getAllData('Penjualan', H.Penjualan) }; }
function savePenjualanData(p) {
  var oldData = getAllData('Penjualan', H.Penjualan);
  var oldItem = null;
  if (p.id) {
    for (var o = 0; o < oldData.length; o++) {
      if (oldData[o].id === p.id) {
        oldItem = oldData[o];
        break;
      }
    }
  }
  if(!p.id) p.id = "PNJ-" + new Date().getTime();
  var saveResult = saveData('Penjualan', H.Penjualan, p, 'id');
  if (!saveResult || saveResult.success === false) return saveResult;

  function adjustStock_(judul, gudang, qtyDelta) {
    if (!judul || !gudang || !qtyDelta) return;
    var stoks = getAllData('Stok', H.Stok);
    for(var i=0; i<stoks.length; i++) {
      if(stoks[i].judul === judul && stoks[i].gudang === gudang) {
        stoks[i].stok = Math.max(0, (parseInt(stoks[i].stok, 10) || 0) - qtyDelta);
        stoks[i].lastUpdate = Utilities.formatDate(new Date(), getDBTimezone(), "yyyy-MM-dd");
        saveData('Stok', H.Stok, stoks[i], 'id');
        break;
      }
    }
  }

  var stoks = getAllData('Stok', H.Stok);
  if (!oldItem) {
    adjustStock_(p.judul, p.gudang, parseInt(p.qty, 10) || 0);
  } else if (oldItem.judul === p.judul && oldItem.gudang === p.gudang) {
    adjustStock_(p.judul, p.gudang, (parseInt(p.qty, 10) || 0) - (parseInt(oldItem.qty, 10) || 0));
  } else {
    adjustStock_(oldItem.judul, oldItem.gudang, -1 * (parseInt(oldItem.qty, 10) || 0));
    adjustStock_(p.judul, p.gudang, parseInt(p.qty, 10) || 0);
  }
  return {success: true};
}
function deletePenjualan(id) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var ss = getDB();
    var sheetPenjualan = ss.getSheetByName('Penjualan');
    if (!sheetPenjualan) return {success: false};

    var dataPenjualan = sheetPenjualan.getDataRange().getValues();
    if (dataPenjualan.length <= 1) return {success: false};
    var headersPenjualan = dataPenjualan[0];
    var idCol = headersPenjualan.indexOf('id');
    if (idCol === -1) return {success: false};

    var rowIndex = -1;
    var penjualan = {};
    for (var i = 1; i < dataPenjualan.length; i++) {
      if (dataPenjualan[i][idCol] == id) {
        rowIndex = i + 1;
        for (var j = 0; j < headersPenjualan.length; j++) {
          penjualan[headersPenjualan[j]] = dataPenjualan[i][j];
        }
        break;
      }
    }
    if (rowIndex === -1) return {success: false};

    sheetPenjualan.deleteRow(rowIndex);

    var qty = parseInt(penjualan.qty, 10) || 0;
    if (penjualan.judul && penjualan.gudang && qty > 0) {
      var sheetStok = ensureSheet('Stok', H.Stok);
      var dataStok = sheetStok.getDataRange().getValues();
      var headersStok = dataStok[0];
      var stokJudulCol = headersStok.indexOf('judul');
      var stokGudangCol = headersStok.indexOf('gudang');
      var stokQtyCol = headersStok.indexOf('stok');
      var stokLastUpdateCol = headersStok.indexOf('lastUpdate');
      for (var k = 1; k < dataStok.length; k++) {
        if (dataStok[k][stokJudulCol] === penjualan.judul && dataStok[k][stokGudangCol] === penjualan.gudang) {
          var restoredQty = (parseInt(dataStok[k][stokQtyCol], 10) || 0) + qty;
          sheetStok.getRange(k + 1, stokQtyCol + 1).setValue(restoredQty);
          if (stokLastUpdateCol !== -1) {
            sheetStok.getRange(k + 1, stokLastUpdateCol + 1).setValue(Utilities.formatDate(new Date(), getDBTimezone(), "yyyy-MM-dd"));
          }
          break;
        }
      }
    }

    SpreadsheetApp.flush();
    return {success: true};
  } catch(e) {
    return {success: false, error: e.toString()};
  } finally {
    var cache = CacheService.getScriptCache();
    cache.remove('DB_Penjualan');
    cache.remove('DB_Stok');
    lock.releaseLock();
  }
}

function getRoyaltiData() { 
  var globals = getAllData('GlobalState', H.GlobalState);
  for(var i=0; i<globals.length; i++) { if(globals[i].key === 'royaltiGlobal') return {success:true, data: parseFloat(globals[i].value)}; }
  return {success:true, data: 10}; 
}
function saveRoyaltiData(p) {
  return saveData('GlobalState', H.GlobalState, {key: 'royaltiGlobal', value: p.persentase}, 'key');
}

function getDeleteRequests() { return { success: true, data: getAllData('DeleteReq', H.DeleteReq) }; }
function saveDeleteRequest(p) {
  var reqs = getAllData('DeleteReq', H.DeleteReq);
  for (var i = 0; i < reqs.length; i++) {
    if (reqs[i].naskahId === p.naskahId && reqs[i].status === 'pending') {
      return { success: false, message: 'Request pembatalan naskah ini masih menunggu persetujuan manajemen.' };
    }
  }
  p.id = "DELREQ-" + new Date().getTime();
  p.status = 'pending';
  p.requestDate = Utilities.formatDate(new Date(), getDBTimezone(), "yyyy-MM-dd");
  var saved = saveData('DeleteReq', H.DeleteReq, p, 'id');
  if (saved && saved.success !== false) {
    notifyRoleUsers_('manajemen', {
      type: 'delete_approval',
      title: 'Persetujuan hapus naskah',
      body: (p.requestBy || 'Tim') + ' meminta persetujuan hapus ' + (p.judul || 'naskah') + '.',
      targetTab: 'approval_hapus',
      targetId: p.id,
      messageId: p.id,
      createdAt: nowDateTime_()
    });
  }
  return saved;
}
function archiveNaskah_(naskah, meta) {
  if (!naskah || !naskah.id) return { success: false, message: 'Naskah tidak valid.' };
  meta = meta || {};
  var now = Utilities.formatDate(new Date(), getDBTimezone(), "yyyy-MM-dd");
  var archiveRow = Object.assign({}, naskah);
  archiveRow.statusProses = 'Dibatalkan';
  archiveRow.cancelReason = archiveRow.cancelReason || meta.reason || '';
  archiveRow.cancelRequestedBy = archiveRow.cancelRequestedBy || meta.requestedBy || '';
  archiveRow.cancelRequestedAt = archiveRow.cancelRequestedAt || meta.requestedAt || '';
  archiveRow.cancelApprovedAt = archiveRow.cancelApprovedAt || now;
  archiveRow.archivedAt = meta.archivedAt || now;
  archiveRow.archivedBy = meta.archivedBy || '';
  archiveRow.archiveReason = meta.archiveReason || archiveRow.cancelReason || 'Dibatalkan';
  archiveRow.archiveRequestId = meta.requestId || '';
  var saved = saveData('NaskahArchive', H.NaskahArchive, archiveRow, 'id');
  if (!saved || saved.success === false) return saved || { success: false, message: 'Arsip naskah gagal disimpan.' };
  var removed = deleteData('Naskah', 'id', naskah.id);
  if (!removed || removed.success === false) return removed || { success: false, message: 'Naskah aktif gagal dikeluarkan setelah diarsipkan.' };
  return { success: true };
}
function approveDeleteRequest(id) {
  var reqs = getAllData('DeleteReq', H.DeleteReq);
  for(var i=0; i<reqs.length; i++) {
    if(reqs[i].id === id) {
      reqs[i].status = 'approved';
      saveData('DeleteReq', H.DeleteReq, reqs[i], 'id');
      var naskahs = getAllData('Naskah', H.Naskah);
      for (var j = 0; j < naskahs.length; j++) {
        if (naskahs[j].id === reqs[i].naskahId) {
          naskahs[j].statusProses = 'Dibatalkan';
          naskahs[j].cancelReason = reqs[i].alasan || '';
          naskahs[j].cancelRequestedBy = reqs[i].requestBy || '';
          naskahs[j].cancelRequestedAt = reqs[i].requestDate || '';
          naskahs[j].cancelApprovedAt = Utilities.formatDate(new Date(), getDBTimezone(), "yyyy-MM-dd");
          var archived = archiveNaskah_(naskahs[j], {
            reason: reqs[i].alasan || '',
            requestedBy: reqs[i].requestBy || '',
            requestedAt: reqs[i].requestDate || '',
            archivedBy: 'Manajemen',
            requestId: reqs[i].id
          });
          if (!archived || archived.success === false) return archived;
          break;
        }
      }
      break;
    }
  }
  return {success: true};
}
function rejectDeleteRequest(id) {
  var reqs = getAllData('DeleteReq', H.DeleteReq);
  for(var i=0; i<reqs.length; i++) {
    if(reqs[i].id === id) {
      reqs[i].status = 'rejected';
      saveData('DeleteReq', H.DeleteReq, reqs[i], 'id');
      break;
    }
  }
  return {success: true};
}
function getNaskahArchiveData() {
  return { success: true, data: getAllData('NaskahArchive', H.NaskahArchive) };
}
function archiveCancelledNaskah(userName) {
  var rows = getAllData('Naskah', H.Naskah);
  var count = 0;
  var errors = [];
  rows.forEach(function(n) {
    var cancelled = String(n.cancelApprovedAt || '') || String(n.statusProses || '').toLowerCase() === 'dibatalkan';
    if (!cancelled) return;
    var result = archiveNaskah_(n, {
      archivedBy: userName || 'Manajemen',
      archiveReason: n.cancelReason || 'Dibatalkan'
    });
    if (result && result.success) count++;
    else errors.push((n.judul || n.id || '-') + ': ' + ((result && (result.message || result.error)) || 'gagal diarsipkan'));
  });
  return { success: errors.length === 0, data: { count: count, errors: errors }, message: count + ' naskah batal diarsipkan.' };
}

function getEventData() { return { success: true, data: getAllData('Event', H.Event) }; }
function saveEventData(p) { if(!p.id) p.id = "EVT-" + new Date().getTime(); return saveData('Event', H.Event, p, 'id'); }
function deleteEvent(id) { return deleteData('Event', 'id', id); }

function getKontenData() { return { success: true, data: getAllData('Konten', H.Konten) }; }
function saveKontenData(p) { if(!p.id) p.id = "KNT-" + new Date().getTime(); return saveData('Konten', H.Konten, p, 'id'); }
function deleteKonten(id) { return deleteData('Konten', 'id', id); }

function getBroadcastData() { return { success: true, data: getAllData('Broadcast', H.Broadcast) }; }
function saveBroadcastData(p) { if(!p.id) p.id = "BRC-" + new Date().getTime(); return saveData('Broadcast', H.Broadcast, p, 'id'); }
function deleteBroadcast(id) { return deleteData('Broadcast', 'id', id); }

function getKehadiranData() { return { success: true, data: getAllData('Kehadiran', H.Kehadiran) }; }
function saveKehadiranData(p) { if(!p.id) p.id = "ATT-" + new Date().getTime(); return saveData('Kehadiran', H.Kehadiran, p, 'id'); }
function deleteKehadiran(id) { return deleteData('Kehadiran', 'id', id); }
function clearKehadiran() { 
  var sheet = getDB().getSheetByName('Kehadiran');
  if(sheet) {
    var max = sheet.getMaxRows();
    if(max > 1) {
      sheet.deleteRows(2, max - 1);
    }
  }
  CacheService.getScriptCache().remove('DB_Kehadiran');
  return {success: true}; 
}

function countKehadiranWorkDaysForMonth_(kehadiran, bulanTahun) {
  var days = {};
  (kehadiran || []).forEach(function(row) {
    var dateStr = String(row.tanggal || '');
    if (dateStr.substring(0, 7) === String(bulanTahun || '')) days[dateStr] = true;
  });
  return Object.keys(days).length;
}

function getPayrollHariKerjaFromKehadiran_(kehadiran, bulanTahun) {
  var attendanceDays = countKehadiranWorkDaysForMonth_(kehadiran, bulanTahun);
  if (attendanceDays > 0) return { value: attendanceDays, source: 'kehadiran' };
  return { value: Number(getGlobalStateValue_('hrd_hari_kerja') || 22), source: 'fallback' };
}

function isKehadiranRowForPayrollUser_(row, username, nama) {
  var key = String(row && row.karyawan || '').trim().toLowerCase();
  return key && (key === String(username || '').trim().toLowerCase() || key === String(nama || '').trim().toLowerCase());
}

function normalizePayrollAttendanceStatus_(status) {
  return String(status || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function resetDataBulanan() {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var ss = getDB();
    var now = Utilities.formatDate(new Date(), getDBTimezone(), "yyyy-MM-dd HH:mm:ss");
    
    var sheetKPI = ss.getSheetByName('KPI');
    if (sheetKPI && sheetKPI.getLastRow() > 1) {
      var kpiData = getAllData('KPI', H.KPI);
      kpiData.forEach(function(r) { r.archivedAt = now; });
      var sheetArchive = ensureSheet('KPIArchive', H.KPIArchive);
      var rows = kpiData.map(function(r) { return H.KPIArchive.map(function(h) { return r[h] || ''; }); });
      if (rows.length > 0) sheetArchive.getRange(sheetArchive.getLastRow() + 1, 1, rows.length, H.KPIArchive.length).setValues(rows);
      sheetKPI.deleteRows(2, sheetKPI.getLastRow() - 1);
    }
    
    var sheetKPIReq = ss.getSheetByName('KPIReq');
    if (sheetKPIReq && sheetKPIReq.getLastRow() > 1) {
      var reqData = getAllData('KPIReq', H.KPIReq);
      reqData.forEach(function(r) { r.archivedAt = now; });
      var sheetArchiveReq = ensureSheet('KPIReqArchive', H.KPIReqArchive);
      var rowsReq = reqData.map(function(r) { return H.KPIReqArchive.map(function(h) { return r[h] || ''; }); });
      if (rowsReq.length > 0) sheetArchiveReq.getRange(sheetArchiveReq.getLastRow() + 1, 1, rowsReq.length, H.KPIReqArchive.length).setValues(rowsReq);
      sheetKPIReq.deleteRows(2, sheetKPIReq.getLastRow() - 1);
    }
    
    var sheetDeals = ss.getSheetByName('Deals');
    if (sheetDeals && sheetDeals.getLastRow() > 1) {
      var dealData = getAllData('Deals', H.Deals);
      dealData.forEach(function(r) { r.archivedAt = now; });
      var sheetDealArchive = ensureSheet('DealArchive', H.DealArchive);
      var rowsDeal = dealData.map(function(r) { return H.DealArchive.map(function(h) { return r[h] || ''; }); });
      if (rowsDeal.length > 0) sheetDealArchive.getRange(sheetDealArchive.getLastRow() + 1, 1, rowsDeal.length, H.DealArchive.length).setValues(rowsDeal);
      sheetDeals.deleteRows(2, sheetDeals.getLastRow() - 1);
    }
    
    var targets = getAllData('Target', H.Target);
    for(var i=0; i<targets.length; i++) {
      targets[i].targetTerbit = 0;
      targets[i].targetCetak = 0;
      targets[i].targetOmzet = 0;
      targets[i].targetKata = 0;
      targets[i].targetHalaman = 0;
      targets[i].targetPerJenis = {};
      saveData('Target', H.Target, targets[i], 'username');
    }
    
    SpreadsheetApp.flush();
    return {success: true};
  } catch(e) {
    return {success: false, error: e.toString()};
  } finally {
    var cache = CacheService.getScriptCache();
    cache.remove('DB_KPI');
    cache.remove('DB_KPIReq');
    cache.remove('DB_Deals');
    cache.remove('DB_Target');
    lock.releaseLock();
  }
}

function resetTotalOperasional() {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  var sheetsToClear = [
    'Deals',
    'Naskah',
    'Kendala',
    'KPI',
    'KPIReq',
    'Surat',
    'Stok',
    'Penjualan',
    'DeleteReq',
    'Event',
    'Konten',
    'Broadcast',
    'Kehadiran',
    'Mitra',
    'Komisi'
  ];

  try {
    var ss = getDB();
    var cleared = [];

    sheetsToClear.forEach(function(sheetName) {
      var sheet = ss.getSheetByName(sheetName);
      if (sheet && sheet.getLastRow() > 1) {
        sheet.deleteRows(2, sheet.getLastRow() - 1);
        cleared.push(sheetName);
      }
    });

    SpreadsheetApp.flush();

    var cache = CacheService.getScriptCache();
    sheetsToClear.forEach(function(sheetName) {
      cache.remove('DB_' + sheetName);
    });

    return {
      success: true,
      message: 'Reset total operasional berhasil. Akun, target, jenis KPI, penerbit/paket, dan pengaturan tetap dipertahankan.',
      cleared: cleared
    };
  } catch(e) {
    return { success: false, error: e.toString() };
  } finally {
    lock.releaseLock();
  }
}

function getMitraData() { return { success: true, data: getAllData('Mitra', H.Mitra) }; }
function saveMitraData(p) { 
  if(!p.id) {
    p.id = "MTR-" + new Date().getTime(); 
    p.waktuDaftar = Utilities.formatDate(new Date(), getDBTimezone(), "yyyy-MM-dd");
  }
  return saveData('Mitra', H.Mitra, p, 'id'); 
}
function deleteMitraData(id) { return deleteData('Mitra', 'id', id); }
function importMitraData(dataArray) {
  var t = new Date().getTime();
  dataArray.forEach(function(p, idx) {
    p.id = "MTR-IMP-" + t + "-" + idx;
    saveData('Mitra', H.Mitra, p, 'id');
  });
  return {success: true};
}

function getKomisiData() { return { success: true, data: getAllData('Komisi', H.Komisi) }; }
function saveKomisiData(p) { if(!p.id) p.id = "KMS-" + new Date().getTime(); return saveData('Komisi', H.Komisi, p, 'id'); }
function deleteKomisiData(id) { return deleteData('Komisi', 'id', id); }

function saveDealPassword(pwd) {
  return saveData('GlobalState', H.GlobalState, {key: 'passwordDeal', value: pwd}, 'key');
}

function deleteLegacyArsipSheet_() {
  try {
    var ss = getDB();
    var sheet = ss.getSheetByName('Arsip');
    if (sheet) {
      ss.deleteSheet(sheet);
      CacheService.getScriptCache().remove('DB_Arsip');
    }
  } catch(e) {
    // Fitur arsip sudah dinonaktifkan; kegagalan cleanup tidak boleh mengganggu initial data.
  }
}

function getInitialData() {
  deleteLegacyArsipSheet_();
  try {
    var today = new Date();
    var currentMonthStr = Utilities.formatDate(today, getDBTimezone(), "yyyy-MM");
    var lastCleanup = getGlobalStateValue_('last_cleanup_month') || '';
    if (currentMonthStr !== lastCleanup) {
      executeDatabaseCleanup();
      setGlobalStateValue_('last_cleanup_month', currentMonthStr);
    }
  } catch (e) {
    console.error("Cleanup error in getInitialData: " + e.message);
  }
  return {
    success: true,
    data: {
      users: getAllData('Users', H.Users),
      naskah: getAllData('Naskah', H.Naskah),
      deal: getAllData('Deals', H.Deals),
      dealArchive: getAllData('DealArchive', H.DealArchive),
      deleteReq: getAllData('DeleteReq', H.DeleteReq),
      settings: getAllData('GlobalState', H.GlobalState),
      target: getAllData('Target', H.Target),
      kpi: getAllData('KPI', H.KPI),
      kpiReq: getAllData('KPIReq', H.KPIReq),
      kpiArchive: getAllData('KPIArchive', H.KPIArchive),
      kendala: getAllData('Kendala', H.Kendala),
      kehadiran: getAllData('Kehadiran', H.Kehadiran),
      penjualan: getAllData('Penjualan', H.Penjualan),
      stok: getAllData('Stok', H.Stok),
      deadlineSettings: getAllData('DeadlineSettings', H.DeadlineSettings),
      payrollConfig: getAllData('PayrollConfig', H.PayrollConfig),
      payrollHistory: getAllData('PayrollHistory', H.PayrollHistory)
    }
  };
}

// ==========================================
// DEBUG / DIAGNOSTICS
// ==========================================
function getDebugInfo() {
  try {
    var ss = getDB();
    var sheets = ss.getSheets().map(function(s) {
      return { name: s.getName(), rows: Math.max(0, s.getLastRow() - 1) };
    });
    return { success: true, ssName: ss.getName(), sheets: sheets };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}
function importStokData(rows) {
  for(var i=0; i<rows.length; i++) {
    var p = rows[i];
    if(!p.id) p.id = "STK-" + new Date().getTime() + "-" + i;
    saveData('Stok', H.Stok, p, 'id');
  }
  return {success:true};
}

function importPenjualanData(rows) {
  var oldData = getAllData('Penjualan', H.Penjualan);
  for(var i=0; i<rows.length; i++) {
    var p = rows[i];
    var isNew = false;
    if(!p.id) {
       p.id = "PNJ-" + new Date().getTime() + "-" + i;
       isNew = true;
    } else {
       var found = false;
       for(var k=0;k<oldData.length;k++) { if(oldData[k].id === p.id) { found = true; break; } }
       if(!found) isNew = true;
    }
    saveData('Penjualan', H.Penjualan, p, 'id');
    
    if (isNew) {
      var stoks = getAllData('Stok', H.Stok);
      for(var j=0; j<stoks.length; j++) {
        if(stoks[j].judul === p.judul && stoks[j].gudang === p.gudang) {
          stoks[j].stok = Math.max(0, parseInt(stoks[j].stok) - parseInt(p.qty));
          stoks[j].lastUpdate = Utilities.formatDate(new Date(), getDBTimezone(), "yyyy-MM-dd");
          saveData('Stok', H.Stok, stoks[j], 'id');
          break;
        }
      }
    }
  }
  return {success:true};
}


function generateShortUrlBackend(longUrl) {
  try {
    var options = { muteHttpExceptions: true };
    var res1 = UrlFetchApp.fetch('https://is.gd/create.php?format=simple&url=' + encodeURIComponent(longUrl), options);
    if (res1.getResponseCode() === 200) {
      return { success: true, shortUrl: res1.getContentText() };
    }
    var res2 = UrlFetchApp.fetch('https://tinyurl.com/api-create.php?url=' + encodeURIComponent(longUrl), options);
    if (res2.getResponseCode() === 200) {
      return { success: true, shortUrl: res2.getContentText() };
    }
    return { success: false, message: "ISGD: " + res1.getResponseCode() + " " + res1.getContentText() + " | TINY: " + res2.getResponseCode() + " " + res2.getContentText() };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}

function getDatabaseCleanupStatus() {
  try {
    var today = new Date();
    
    // Surat
    var suratApproved = getGlobalStateValue_('surat_clear_approved') === 'true';
    var currentMonth = today.getMonth();
    var suratNeedsBackup = (currentMonth === 11 || currentMonth === 0);
    
    // Archive
    var archiveApproved = getGlobalStateValue_('archive_clear_approved') === 'true';
    var archiveOldCount = 0;
    var kpiArch = getAllData('KPIArchive', H.KPIArchive);
    var dealArch = getAllData('DealArchive', H.DealArchive);
    var naskahArch = getAllData('NaskahArchive', H.NaskahArchive);
    
    kpiArch.forEach(function(row) { if (isOlderThan90Days_(row.archivedAt, today)) archiveOldCount++; });
    dealArch.forEach(function(row) { if (isOlderThan90Days_(row.archivedAt, today)) archiveOldCount++; });
    naskahArch.forEach(function(row) { if (isOlderThan90Days_(row.archivedAt, today)) archiveOldCount++; });
    
    var archiveNeedsBackup = archiveOldCount > 0;
    
    // Kehadiran
    var kehadiranApproved = getGlobalStateValue_('kehadiran_clear_approved') === 'true';
    var kehadiranOldCount = 0;
    var kehadiranData = getAllData('Kehadiran', H.Kehadiran);
    kehadiranData.forEach(function(row) { if (isOlderThan90Days_(row.tanggal, today)) kehadiranOldCount++; });
    
    var kehadiranNeedsBackup = kehadiranOldCount > 0;
    
    return {
      success: true,
      data: {
        surat: { needsBackup: suratNeedsBackup, approved: suratApproved },
        archive: { needsBackup: archiveNeedsBackup, approved: archiveApproved, count: archiveOldCount },
        kehadiran: { needsBackup: kehadiranNeedsBackup, approved: kehadiranApproved, count: kehadiranOldCount }
      }
    };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}

function isOlderThan90Days_(dateVal, todayDate) {
  if (!dateVal) return false;
  var d = new Date(String(dateVal).substring(0, 10));
  if (isNaN(d.getTime())) return false;
  var diffMs = todayDate.getTime() - d.getTime();
  var diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > 90;
}

function approveDatabaseCleanup(type, approved) {
  try {
    var val = approved ? 'true' : 'false';
    if (type === 'surat') {
      setGlobalStateValue_('surat_clear_approved', val);
      var today = new Date();
      if (approved && today.getMonth() === 0) {
        executeDatabaseCleanup();
      }
    } else if (type === 'archive') {
      setGlobalStateValue_('archive_clear_approved', val);
      if (approved) {
        executeDatabaseCleanup();
      }
    } else if (type === 'kehadiran') {
      setGlobalStateValue_('kehadiran_clear_approved', val);
      if (approved) {
        executeDatabaseCleanup();
      }
    }
    return { success: true };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}

function executeDatabaseCleanup() {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var today = new Date();
    
    // 1. Messages & Notifications: Cleared automatically every month
    clearSheetData_('Messages', H.Messages);
    clearSheetData_('Notifications', H.Notifications);
    
    // 2. Kehadiran: Clear data older than 90 days if approved
    var kehadiranApproved = getGlobalStateValue_('kehadiran_clear_approved') === 'true';
    if (kehadiranApproved) {
      deleteOlderRows_('Kehadiran', H.Kehadiran, 'tanggal', today);
      setGlobalStateValue_('kehadiran_clear_approved', 'false');
    }
    
    // 3. Archives: Clear data older than 90 days if approved
    var archiveApproved = getGlobalStateValue_('archive_clear_approved') === 'true';
    if (archiveApproved) {
      deleteOlderRows_('KPIArchive', H.KPIArchive, 'archivedAt', today);
      deleteOlderRows_('DealArchive', H.DealArchive, 'archivedAt', today);
      deleteOlderRows_('NaskahArchive', H.NaskahArchive, 'archivedAt', today);
      setGlobalStateValue_('archive_clear_approved', 'false');
    }
    
    // 4. Surat: Clear all data if approved and it is January (Month index 0)
    var suratApproved = getGlobalStateValue_('surat_clear_approved') === 'true';
    if (suratApproved && today.getMonth() === 0) {
      clearSheetData_('Surat', H.Surat);
      setGlobalStateValue_('surat_clear_approved', 'false');
    }
  } catch (e) {
    console.error("Cleanup error in executeDatabaseCleanup: " + e.message);
  } finally {
    lock.releaseLock();
  }
}

function deleteOlderRows_(sheetName, headers, dateField, todayDate) {
  var sheet = ensureSheet(sheetName, headers);
  var rows = getAllData(sheetName, headers);
  
  var remainingRows = rows.filter(function(row) {
    var dateVal = row[dateField];
    if (!dateVal) return true;
    var d = new Date(String(dateVal).substring(0, 10));
    if (isNaN(d.getTime())) return true;
    var diffMs = todayDate.getTime() - d.getTime();
    var diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= 90; // Keep if within 90 days
  });
  
  if (remainingRows.length < rows.length) {
    sheet.clearContents();
    sheet.appendRow(headers);
    if (remainingRows.length > 0) {
      var dataToWrite = remainingRows.map(function(row) {
        return headers.map(function(h) {
          var val = row[h];
          if (typeof val === 'object' && val !== null) {
            return JSON.stringify(val);
          }
          return val === undefined ? "" : val;
        });
      });
      sheet.getRange(2, 1, dataToWrite.length, headers.length).setValues(dataToWrite);
    }
    CacheService.getScriptCache().remove(dbCacheKey_(sheetName));
  }
}

function clearSheetData_(sheetName, headers) {
  var sheet = ensureSheet(sheetName, headers);
  sheet.clearContents();
  sheet.appendRow(headers);
  CacheService.getScriptCache().remove(dbCacheKey_(sheetName));
}

// ==========================================
// HRD & PAYROLL MODULE API
// ==========================================

function getPayrollConfig() {
  return { success: true, data: getAllData('PayrollConfig', H.PayrollConfig) };
}

function savePayrollConfig(p) {
  var allowanceDetails = parsePayrollAllowanceDetails_(p.tunjanganDetail);
  if (allowanceDetails.length) {
    p.tunjanganDetail = JSON.stringify(allowanceDetails);
    p.tunjangan = allowanceDetails.reduce(function(sum, item) {
      return sum + Number(item.nominal || 0);
    }, 0);
  } else {
    p.tunjanganDetail = '';
    p.tunjangan = Number(p.tunjangan || 0);
  }
  var deductionDetails = parsePayrollAllowanceDetails_(p.potonganDetail);
  if (deductionDetails.length) {
    p.potonganDetail = JSON.stringify(deductionDetails);
  } else {
    p.potonganDetail = '';
  }
  return { success: true, data: saveData('PayrollConfig', H.PayrollConfig, p, 'username') };
}

function getPayrollHistory() {
  return { success: true, data: getAllData('PayrollHistory', H.PayrollHistory) };
}

function savePayrollHistory(p) {
  p.id = "PAY-" + String(p.username || '').toLowerCase() + "-" + String(p.bulanTahun || '');
  p.createdAt = p.createdAt || Utilities.formatDate(new Date(), getDBTimezone(), 'yyyy-MM-dd HH:mm:ss');
  p.pimpinanRedaksiName = p.pimpinanRedaksiName || 'Ayu Anggrita Ramadhani';
  var saved = saveData('PayrollHistory', H.PayrollHistory, p, 'id');
  if (saved && saved.success === false) return { success: false, message: saved.error || 'Slip gaji gagal disimpan.' };
  return { success: true, data: p };
}

function deletePayrollHistory(id) {
  return { success: true, data: deleteData('PayrollHistory', 'id', id) };
}

function findPayrollTargetConfig_(username) {
  var targets = getAllData('Target', H.Target);
  var key = String(username || '').toLowerCase();
  return targets.find(function(t) {
    return String(t.username || '').toLowerCase() === key;
  }) || {};
}

function getPayrollRewardMainTarget_(role, targetConfig, fallbackTarget) {
  if (role === 'cs') return Number(targetConfig.targetOmzet || 0);
  if (role === 'editor' || role === 'pic_editor') return Number(targetConfig.targetKata || 0);
  if (role === 'layouter' || role === 'pic_layouter') return Number(targetConfig.targetHalaman || 0);
  return Number(fallbackTarget || 0);
}

function buildPayrollTargetCheck_(key, label, target, capaian, unit) {
  var value = Number(target || 0);
  if (value <= 0) return null;
  return {
    key: key,
    label: label,
    target: value,
    capaian: Number(capaian || 0),
    unit: unit,
    met: Number(capaian || 0) >= value
  };
}

function parsePayrollRewardTargetRules_(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    var parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

function parsePayrollRewardPackageRates_(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    var parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

function parsePayrollAllowanceDetails_(value) {
  if (!value) return [];
  var items = value;
  if (typeof value === 'string') {
    try {
      items = JSON.parse(value);
    } catch (e) {
      items = [];
    }
  }
  if (!Array.isArray(items)) return [];
  return items.map(function(item) {
    return {
      nama: String(item && (item.nama || item.name || item.label) || '').trim(),
      nominal: Math.max(0, Number(item && (item.nominal || item.amount || item.value) || 0))
    };
  }).filter(function(item) {
    return item.nama || item.nominal > 0;
  });
}

function getPayrollRewardBasis_(role, config) {
  var basis = String(config.rewardBasis || '').trim().toLowerCase();
  if (basis) return basis;
  if (role === 'cs') return 'omzet';
  if (role === 'editor' || role === 'pic_editor') return 'kata';
  if (role === 'layouter' || role === 'pic_layouter') return 'halaman';
  if (role === 'karyawan') return 'manual';
  return '';
}

function getPayrollPackageRewardRate_(rates, paket) {
  var key = String(paket || '').trim().toLowerCase();
  var direct = Number(rates[paket] || rates[key] || 0);
  if (direct) return direct;
  for (var name in rates) {
    if (String(name || '').trim().toLowerCase() === key) return Number(rates[name] || 0);
  }
  return 0;
}

function filterEnabledPayrollTargetChecks_(checks, rules) {
  return checks.map(function(item) {
    if (!item) return null;
    item.enabled = rules[item.key] !== false;
    return item;
  }).filter(function(item) {
    return item && item.enabled;
  });
}

function calculatePayroll(username, bulanTahun) {
  clearDBCache_('Users');
  var user = findPortalUserByUsername_(username);
  if (!user) return { success: false, message: 'Karyawan tidak ditemukan.' };
  
  var role = normalizeRole_(user.role);
  var nama = user.nama || username;
  
  var configs = getAllData('PayrollConfig', H.PayrollConfig);
  var config = configs.find(function(c) {
    return String(c.username || '').toLowerCase() === String(username).toLowerCase();
  }) || { username: username, nama: nama, role: role, gajiPokok: 0, tunjangan: 0, targetKpi: 0, rewardRate: 0 };
  
  var gp = Number(config.gajiPokok || 0);
  var tunjanganDetail = parsePayrollAllowanceDetails_(config.tunjanganDetail);
  var tj = tunjanganDetail.length ? tunjanganDetail.reduce(function(sum, item) {
    return sum + Number(item.nominal || 0);
  }, 0) : Number(config.tunjangan || 0);
  var customDeductions = parsePayrollAllowanceDetails_(config.potonganDetail);
  var customDeductionTotal = customDeductions.reduce(function(sum, item) {
    return sum + Number(item.nominal || 0);
  }, 0);
  var rewardEnabled = String(config.rewardEnabled || '') === '1';
  var targetKpi = Number(config.targetKpi || 0);
  var rewardRate = Number(config.rewardRate || 0);
  var rewardTargetRules = parsePayrollRewardTargetRules_(config.rewardTargetRules);
  var rewardBasis = getPayrollRewardBasis_(role, config);
  var rewardPackageRates = parsePayrollRewardPackageRates_(config.rewardPackageRates);
  var targetConfig = findPayrollTargetConfig_(username);
  targetKpi = rewardEnabled ? getPayrollRewardMainTarget_(role, targetConfig, targetKpi) : targetKpi;
  
  var kehadiran = getAllData('Kehadiran', H.Kehadiran);
  var alpaCount = 0;
  var izinCount = 0;
  var izinSetengahHariCount = 0;
  var sakitCount = 0;
  var cutiCount = 0;
  var terlambatCount = 0;
  var detailKehadiranList = [];
  
  kehadiran.forEach(function(row) {
    if (isKehadiranRowForPayrollUser_(row, username, nama)) {
      var dateStr = String(row.tanggal || '');
      if (dateStr.substring(0, 7) === bulanTahun) {
        var status = normalizePayrollAttendanceStatus_(row.status);
        if (status === 'alpa') alpaCount++;
        else if (status === 'izin') izinCount++;
        else if (status === 'izin_setengah_hari') izinSetengahHariCount++;
        else if (status === 'sakit') sakitCount++;
        else if (status === 'cuti') cutiCount++;
        else if (status === 'terlambat') terlambatCount++;
        
        detailKehadiranList.push({
          tanggal: row.tanggal,
          status: row.status,
          keterangan: row.keterangan || ''
        });
      }
    }
  });
  
  var hk = Number(getGlobalStateValue_('hrd_hari_kerja') || 22);
  var formulaAlpa = getGlobalStateValue_('hrd_formula_alpa') || '0';
  var formulaIzin = getGlobalStateValue_('hrd_formula_izin') || '0';
  var formulaIzinSetengahHari = getGlobalStateValue_('hrd_formula_izin_setengah_hari') || '0';
  var formulaSakit = getGlobalStateValue_('hrd_formula_sakit') || '0';
  var formulaCuti = getGlobalStateValue_('hrd_formula_cuti') || '0';
  var formulaTerlambat = getGlobalStateValue_('hrd_formula_terlambat') || '0';
  
  var variables = {
    GP: gp,
    TJ: tj,
    HK: hk,
    A: alpaCount,
    I: izinCount,
    ISH: izinSetengahHariCount,
    S: sakitCount,
    C: cutiCount,
    T: terlambatCount
  };
  
  var potonganAlpa = alpaCount > 0 ? evaluatePayrollFormula_(formulaAlpa, variables) : 0;
  var potonganIzin = izinCount > 0 ? evaluatePayrollFormula_(formulaIzin, variables) : 0;
  var potonganIzinSetengahHari = izinSetengahHariCount > 0 ? evaluatePayrollFormula_(formulaIzinSetengahHari, variables) : 0;
  var potonganSakit = sakitCount > 0 ? evaluatePayrollFormula_(formulaSakit, variables) : 0;
  var potonganCuti = cutiCount > 0 ? evaluatePayrollFormula_(formulaCuti, variables) : 0;
  var potonganTerlambat = terlambatCount > 0 ? evaluatePayrollFormula_(formulaTerlambat, variables) : 0;
  var totalPotongan = Math.max(0, Math.round(potonganAlpa + potonganIzin + potonganIzinSetengahHari + potonganSakit + potonganCuti + potonganTerlambat + customDeductionTotal));
  
  var potonganDetail = {
    customDeductions: customDeductions,
    alpaCount: alpaCount,
    izinCount: izinCount,
    izinSetengahHariCount: izinSetengahHariCount,
    sakitCount: sakitCount,
    cutiCount: cutiCount,
    terlambatCount: terlambatCount,
    potonganAlpa: Math.round(potonganAlpa),
    potonganIzin: Math.round(potonganIzin),
    potonganIzinSetengahHari: Math.round(potonganIzinSetengahHari),
    potonganSakit: Math.round(potonganSakit),
    potonganCuti: Math.round(potonganCuti),
    potonganTerlambat: Math.round(potonganTerlambat),
    formulaAlpa: formulaAlpa,
    formulaIzin: formulaIzin,
    formulaIzinSetengahHari: formulaIzinSetengahHari,
    formulaSakit: formulaSakit,
    formulaCuti: formulaCuti,
    formulaTerlambat: formulaTerlambat,
    hariKerja: hk
  };
  
  var rewardKpi = 0;
  var rewardDetail = {
    role: role,
    capaian: 0,
    target: targetKpi,
    rate: rewardRate,
    basis: rewardBasis,
    excess: 0,
    activeTargets: [],
    targetRules: rewardTargetRules,
    packageRates: rewardPackageRates,
    allTargetsMet: false,
    targetSource: rewardEnabled ? 'Target Manajemen' : 'PayrollConfig'
  };
  
  if (rewardEnabled && role === 'cs') {
    var allDeals = getAllData('Deals', H.Deals);
    var allKpis = getAllData('KPI', H.KPI);
    var totalOmzet = 0;
    var countDeals = 0;
    var totalCetak = 0;
    var dealItems = [];
    
    allDeals.forEach(function(d) {
      if (String(d.csName || '').toLowerCase() === String(nama).toLowerCase() || String(d.csName || '').toLowerCase() === String(username).toLowerCase()) {
        totalOmzet += getDealOmzetThisMonth_(d, bulanTahun);
        if (isMatchingMonth_(d.tanggal || d.deadline, bulanTahun)) {
          countDeals++;
          dealItems.push({
            id: d.id || '',
            tanggal: d.tanggal || d.deadline || '',
            judul: d.judul || '',
            paket: d.paket || '',
            nilai: Number(d.nilai || 0)
          });
        }
      }
    });
    
    allKpis.forEach(function(k) {
      if (String(k.picName || '').toLowerCase() === String(nama).toLowerCase()) {
        if (k.jenis === 'Cetak' || k.jenis === 'Lainnya') {
          totalOmzet += getKpiOmzetThisMonth_(k, bulanTahun);
        }
        if (k.jenis === 'Cetak' && isMatchingMonth_(k.tanggal, bulanTahun)) {
          totalCetak += Number(k.jumlahKinerja || 0);
        }
      }
    });
    
    var allTargetChecks = [
      buildPayrollTargetCheck_('targetOmzet', 'Omzet', targetConfig.targetOmzet, totalOmzet, 'Rupiah'),
      buildPayrollTargetCheck_('targetTerbit', 'Deal Closing', targetConfig.targetTerbit, countDeals, 'Deal'),
      buildPayrollTargetCheck_('targetCetak', 'Cetak', targetConfig.targetCetak, totalCetak, 'Poin')
    ].filter(function(item) { return item; });
    var activeTargetChecks = allTargetChecks.filter(function(item) {
      return rewardBasis === 'terbit' ? item.key === 'targetTerbit' : item.key === 'targetOmzet';
    });
    var allTargetsMet = activeTargetChecks.length > 0 && activeTargetChecks.every(function(item) { return item.met; });
    var excess = 0;
    var packageRewardItems = [];
    if (rewardBasis === 'terbit') {
      targetKpi = Number(targetConfig.targetTerbit || 0);
      excess = Math.max(0, countDeals - targetKpi);
      dealItems.sort(function(a, b) {
        return String(b.tanggal || '').localeCompare(String(a.tanggal || '')) || String(b.id || '').localeCompare(String(a.id || ''));
      });
      packageRewardItems = dealItems.slice(0, excess).map(function(item) {
        var rate = getPayrollPackageRewardRate_(rewardPackageRates, item.paket);
        return {
          id: item.id,
          tanggal: item.tanggal,
          judul: item.judul,
          paket: item.paket,
          rate: rate
        };
      });
      rewardKpi = allTargetsMet ? packageRewardItems.reduce(function(sum, item) {
        return sum + Number(item.rate || 0);
      }, 0) : 0;
    } else {
      targetKpi = Number(targetConfig.targetOmzet || 0);
      excess = Math.max(0, totalOmzet - targetKpi);
      rewardKpi = allTargetsMet ? Math.max(0, Math.round(totalOmzet * (rewardRate / 100))) : 0;
    }
    
    rewardDetail.capaian = rewardBasis === 'terbit' ? countDeals : totalOmzet;
    rewardDetail.target = targetKpi;
    rewardDetail.excess = excess;
    rewardDetail.label = rewardBasis === 'terbit' ? 'Terbit' : 'Omzet';
    rewardDetail.unit = rewardBasis === 'terbit' ? 'Deal' : 'Rupiah';
    rewardDetail.omzetCapaian = totalOmzet;
    rewardDetail.terbitCapaian = countDeals;
    rewardDetail.packageRewardItems = packageRewardItems;
    rewardDetail.availableTargets = allTargetChecks;
    rewardDetail.activeTargets = activeTargetChecks;
    rewardDetail.allTargetsMet = allTargetsMet;
  } else if (rewardEnabled && (role === 'editor' || role === 'pic_editor')) {
    var allKpi = getAllData('KPI', H.KPI);
    var totalKata = 0;
    
    allKpi.forEach(function(k) {
      if (String(k.picName || '').toLowerCase() === String(nama).toLowerCase()) {
        if (['Proofreading', 'KPI Tambahan'].indexOf(String(k.jenis || '')) !== -1) {
          totalKata += Number(k.jumlahKata || 0);
        }
      }
    });
    
    var allTargetChecks = [
      buildPayrollTargetCheck_('targetKata', 'Kata', targetKpi, totalKata, 'Kata')
    ].filter(function(item) { return item; });
    var activeTargetChecks = filterEnabledPayrollTargetChecks_(allTargetChecks, rewardTargetRules);
    var allTargetsMet = activeTargetChecks.length > 0 && activeTargetChecks.every(function(item) { return item.met; });
    var excess = Math.max(0, totalKata - targetKpi);
    rewardKpi = allTargetsMet ? Math.max(0, Math.round(excess * rewardRate)) : 0;
    
    rewardDetail.capaian = totalKata;
    rewardDetail.excess = excess;
    rewardDetail.label = 'Kata';
    rewardDetail.unit = 'Kata';
    rewardDetail.availableTargets = allTargetChecks;
    rewardDetail.activeTargets = activeTargetChecks;
    rewardDetail.allTargetsMet = allTargetsMet;
  } else if (rewardEnabled && (role === 'layouter' || role === 'pic_layouter')) {
    var allKpi = getAllData('KPI', H.KPI);
    var totalHalaman = 0;
    
    allKpi.forEach(function(k) {
      if (String(k.picName || '').toLowerCase() === String(nama).toLowerCase()) {
        if (['Layout', 'Desain Cover', 'KPI Tambahan'].indexOf(String(k.jenis || '')) !== -1) {
          totalHalaman += Number(k.jumlahHalaman || 0);
        }
      }
    });
    
    var allTargetChecks = [
      buildPayrollTargetCheck_('targetHalaman', 'Halaman', targetKpi, totalHalaman, 'Halaman')
    ].filter(function(item) { return item; });
    var activeTargetChecks = filterEnabledPayrollTargetChecks_(allTargetChecks, rewardTargetRules);
    var allTargetsMet = activeTargetChecks.length > 0 && activeTargetChecks.every(function(item) { return item.met; });
    var excess = Math.max(0, totalHalaman - targetKpi);
    rewardKpi = allTargetsMet ? Math.max(0, Math.round(excess * rewardRate)) : 0;
    
    rewardDetail.capaian = totalHalaman;
    rewardDetail.excess = excess;
    rewardDetail.label = 'Halaman';
    rewardDetail.unit = 'Halaman';
    rewardDetail.availableTargets = allTargetChecks;
    rewardDetail.activeTargets = activeTargetChecks;
    rewardDetail.allTargetsMet = allTargetsMet;
  } else if (rewardEnabled && role === 'karyawan') {
    rewardKpi = Math.max(0, Math.round(rewardRate));
    rewardDetail.capaian = rewardKpi;
    rewardDetail.target = 0;
    rewardDetail.rate = rewardKpi;
    rewardDetail.label = 'Reward Manual';
    rewardDetail.unit = 'Rupiah';
    rewardDetail.basis = 'manual';
    rewardDetail.excess = 0;
    rewardDetail.availableTargets = [];
    rewardDetail.activeTargets = [];
    rewardDetail.allTargetsMet = true;
  }
  
  var gajiBersih = Math.max(0, gp + tj + rewardKpi - totalPotongan);
  
  return {
    success: true,
    data: {
      username: username,
      nama: nama,
      role: role,
      departemen: getEmployeeDepartmentByRole_(role),
      statusKaryawan: user.statusKaryawan || 'Karyawan Kontrak',
      bankName: user.bankName || '',
      bankAccountNumber: user.bankAccountNumber || '',
      bankAccountName: user.bankAccountName || nama,
      pimpinanRedaksiName: 'Ayu Anggrita Ramadhani',
      bulanTahun: bulanTahun,
      gajiPokok: gp,
      tunjangan: tj,
      tunjanganDetail: JSON.stringify(tunjanganDetail),
      potonganKehadiran: totalPotongan,
      potonganDetail: JSON.stringify(potonganDetail),
      rewardKpi: rewardKpi,
      rewardDetail: JSON.stringify(rewardDetail),
      gajiBersih: gajiBersih,
      listKehadiran: detailKehadiranList
    }
  };
}

function evaluatePayrollFormula_(formula, variables) {
  var processed = String(formula || '');
  for (var key in variables) {
    var mentionRegex = new RegExp("@" + key + "\\b", "gi");
    var bareRegex = new RegExp("\\b" + key + "\\b", "g");
    processed = processed.replace(mentionRegex, variables[key]);
    processed = processed.replace(bareRegex, variables[key]);
  }
  try {
    processed = processed.replace(/[^0-9\+\-\*\/\(\)\. ]/g, '');
    if (!processed.trim()) return 0;
    var result = eval(processed);
    return isNaN(result) || !isFinite(result) ? 0 : result;
  } catch (e) {
    return 0;
  }
}

// CS Omzet Helper Functions
function getDealOmzetThisMonth_(d, bulanTahun) {
  var originalDate = d.tanggal || d.deadline;
  var extraTx = normalizePaymentTransactions_(d.transaksiTambahan);
  var extra = extraTx.reduce(function(sum, tx) {
    return sum + (isMatchingMonth_(tx.tanggal, bulanTahun) ? Number(tx.nominal || 0) : 0);
  }, 0);
  
  var originalPayment = 0;
  if (d.source !== 'legacy' && isMatchingMonth_(originalDate, bulanTahun)) {
    originalPayment = getDealOriginalPaymentAmount_(d);
  }
  
  var pelunasan = isMatchingMonth_(d.tanggalPelunasan, bulanTahun) ? Number(d.nominalPelunasan || 0) : 0;
  return originalPayment + pelunasan + extra;
}

function getKpiOmzetThisMonth_(k, bulanTahun) {
  var extra = normalizePaymentTransactions_(k.transaksiTambahan).reduce(function(sum, tx) {
    return sum + (isMatchingMonth_(tx.tanggal, bulanTahun) ? Number(tx.nominal || 0) : 0);
  }, 0);
  
  var originalPayment = isMatchingMonth_(k.tanggal, bulanTahun) ? getKpiOriginalPaymentAmount_(k) : 0;
  var pelunasan = isMatchingMonth_(k.tanggalPelunasan, bulanTahun) ? Number(k.nominalPelunasan || 0) : 0;
  return originalPayment + pelunasan + extra;
}

function normalizePaymentTransactions_(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      var parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch(e) {
      return [];
    }
  }
  return [];
}

function isMatchingMonth_(dateStr, bulanTahun) {
  if (!dateStr) return false;
  var str = dateStr;
  if (dateStr instanceof Date) {
    str = Utilities.formatDate(dateStr, getDBTimezone(), "yyyy-MM-dd");
  }
  return String(str).substring(0, 7) === bulanTahun;
}

function isTambahDpTransaction_(item) {
  return String(item.kategori || '').toLowerCase() === 'tambah dp' || String(item.tipe || '').toLowerCase() === 'tambah dp';
}

function getDealOriginalPaymentAmount_(d) {
  var tx = normalizePaymentTransactions_(d.transaksiTambahan);
  var addedDp = tx.filter(isTambahDpTransaction_).reduce(function(sum, item) {
    return sum + Number(item.nominal || 0);
  }, 0);
  var addedCost = tx.filter(function(item) { return !isTambahDpTransaction_(item); }).reduce(function(sum, item) {
    return sum + Number(item.nominal || 0);
  }, 0);
  var hasPelunasan = Number(d.nominalPelunasan || 0) > 0;
  if (d.statusPayment === 'DP' || hasPelunasan) {
    return Math.max(0, Number(d.nominalDP || 0) - addedDp);
  }
  return Math.max(0, Number(d.nilai || 0) - addedCost);
}

function getKpiOriginalPaymentAmount_(k) {
  var tx = normalizePaymentTransactions_(k.transaksiTambahan);
  var addedDp = tx.filter(isTambahDpTransaction_).reduce(function(sum, item) {
    return sum + Number(item.nominal || 0);
  }, 0);
  var hasPelunasan = Number(k.nominalPelunasan || 0) > 0;
  if (k.statusPayment === 'DP' || hasPelunasan) {
    return Math.max(0, Number(k.nominalDP || 0) - addedDp);
  }
  return Number(k.nominal || 0);
}

function saveHrdGlobalConfig(hk, formulaAlpa, formulaIzin, formulaIzinSetengahHari, formulaSakit, formulaCuti, formulaTerlambat) {
  setGlobalStateValue_('hrd_hari_kerja', String(hk));
  setGlobalStateValue_('hrd_formula_alpa', formulaAlpa || '0');
  setGlobalStateValue_('hrd_formula_izin', formulaIzin || '0');
  setGlobalStateValue_('hrd_formula_izin_setengah_hari', formulaIzinSetengahHari || '0');
  setGlobalStateValue_('hrd_formula_sakit', formulaSakit || '0');
  setGlobalStateValue_('hrd_formula_cuti', formulaCuti || '0');
  setGlobalStateValue_('hrd_formula_terlambat', formulaTerlambat || '0');
  return { success: true };
}

function getHrdGlobalConfig() {
  return {
    success: true,
    data: {
      hariKerja: getGlobalStateValue_('hrd_hari_kerja') || '22',
      formulaAlpa: getGlobalStateValue_('hrd_formula_alpa') || '0',
      formulaIzin: getGlobalStateValue_('hrd_formula_izin') || '0',
      formulaIzinSetengahHari: getGlobalStateValue_('hrd_formula_izin_setengah_hari') || '0',
      formulaSakit: getGlobalStateValue_('hrd_formula_sakit') || '0',
      formulaCuti: getGlobalStateValue_('hrd_formula_cuti') || '0',
      formulaTerlambat: getGlobalStateValue_('hrd_formula_terlambat') || '0'
    }
  };
}
// Trigger force push comment 123

function saveBankDetails(payload) {
  if (!payload || !payload.username) return { success: false, message: 'Data tidak valid.' };
  var users = getAllData('Users', H.Users);
  for (var i = 0; i < users.length; i++) {
    if (users[i].username === payload.username) {
      users[i].bankName = payload.bankName;
      users[i].bankAccountNumber = payload.bankAccountNumber;
      users[i].bankAccountName = payload.bankAccountName;
      var res = saveData('Users', H.Users, users[i], 'username');
      if (res && res.success === false) return res;
      return { success: true, data: users[i] };
    }
  }
  return { success: false, message: 'Pengguna tidak ditemukan.' };
}
