import { demoUsers } from "./demoData";

const OFFICE_SETTINGS_KEY = "publishinc_office_settings_v1";
const ATTENDANCE_RECORDS_KEY = "publishinc_attendance_records_v1";
const LEAVE_REQUESTS_KEY = "publishinc_leave_requests_v1";
const LEAVE_QUOTAS_KEY = "publishinc_leave_quotas_v1";

const todayStr = () => new Date().toISOString().slice(0, 10);
const isoTime = (offsetMinutes = 0) => {
  const d = new Date();
  d.setMinutes(d.getMinutes() + offsetMinutes);
  return d.toISOString();
};

export const DEFAULT_OFFICE_SETTINGS = {
  office_name: "Kantor Pusat Publish Inc.",
  latitude: -5.147665, // Makassar coordinates default
  longitude: 119.432731,
  radius_meters: 100,
  work_start_time: "08:00",
  work_end_time: "17:00",
  late_tolerance_mins: 15,
};

// Haversine formula to calculate distance in meters between two GPS points
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Storage error:", e);
  }
};

export const getOfficeSettings = () => {
  return readJson(OFFICE_SETTINGS_KEY, DEFAULT_OFFICE_SETTINGS);
};

export const saveOfficeSettings = (settings) => {
  writeJson(OFFICE_SETTINGS_KEY, { ...DEFAULT_OFFICE_SETTINGS, ...settings });
};

// Initial Seed Data
const initialAttendance = [
  {
    id: "att-1001",
    user_id: "demo-cs",
    user_name: "Nadia CS",
    user_role: "cs",
    date: todayStr(),
    check_in_time: isoTime(-360),
    check_out_time: null,
    status: "hadir", // hadir, terlambat, izin, sakit, cuti
    location: { latitude: -5.147665, longitude: 119.432731, address: "Kantor Pusat Publish Inc.", distance_meters: 12 },
    photo_in: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80",
    photo_out: null,
    notes: "Absen masuk tepat waktu via PWA",
  },
  {
    id: "att-1002",
    user_id: "demo-editor",
    user_name: "Bima Editor",
    user_role: "editor",
    date: todayStr(),
    check_in_time: isoTime(-320),
    check_out_time: null,
    status: "terlambat",
    location: { latitude: -5.147680, longitude: 119.432750, address: "Kantor Pusat Publish Inc.", distance_meters: 25 },
    photo_in: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80",
    photo_out: null,
    notes: "Terlambat 20 menit karena macet",
  },
];

const initialLeaveQuotas = demoUsers.map((user) => ({
  user_id: user.id,
  user_name: user.name,
  user_role: user.role,
  year: new Date().getFullYear(),
  total_quota: 12,
  used_days: user.id === "demo-layouter" ? 3 : 0,
  remaining_days: user.id === "demo-layouter" ? 9 : 12,
}));

const initialLeaveRequests = [
  {
    id: "leave-1001",
    user_id: "demo-layouter",
    user_name: "Sari Layouter",
    user_role: "layouter",
    type: "cuti", // cuti, sakit, izin, dinas
    start_date: todayStr(),
    end_date: todayStr(),
    total_days: 1,
    reason: "Acara pernikahan keluarga di luar kota",
    attachment_url: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=500&q=80",
    status: "approved_cuti", // pending, approved_cuti, approved_unpaid, approved_paid
    hr_notes: "Disetujui. Potong kuota cuti tahunan.",
    created_at: isoTime(-1440),
  },
  {
    id: "leave-1002",
    user_id: "demo-pic-editor",
    user_name: "Pipit PIC Editor",
    user_role: "pic_editor",
    type: "sakit",
    start_date: todayStr(),
    end_date: todayStr(),
    total_days: 1,
    reason: "Demam tinggi dan butuh istirahat",
    attachment_url: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=500&q=80",
    status: "pending",
    hr_notes: "",
    created_at: isoTime(-120),
  },
];

export const getAttendanceRecords = () => {
  return readJson(ATTENDANCE_RECORDS_KEY, initialAttendance);
};

export const recordCheckIn = (user, location, photoDataUrl, notes = "") => {
  const records = getAttendanceRecords();
  const today = todayStr();
  const settings = getOfficeSettings();

  // Determine late status
  const now = new Date();
  const [startHour, startMin] = settings.work_start_time.split(":").map(Number);
  const startTime = new Date();
  startTime.setHours(startHour, startMin + settings.late_tolerance_mins, 0, 0);

  const status = now > startTime ? "terlambat" : "hadir";

  const newRecord = {
    id: `att-${Date.now()}`,
    user_id: user?.id || "demo-user",
    user_name: user?.name || "Karyawan",
    user_role: user?.role || "staff",
    date: today,
    check_in_time: new Date().toISOString(),
    check_out_time: null,
    status,
    location,
    photo_in: photoDataUrl,
    photo_out: null,
    notes,
  };

  const filtered = records.filter((r) => !(r.user_id === newRecord.user_id && r.date === today));
  const updated = [newRecord, ...filtered];
  writeJson(ATTENDANCE_RECORDS_KEY, updated);
  return newRecord;
};

export const recordCheckOut = (user, photoDataUrl) => {
  const records = getAttendanceRecords();
  const today = todayStr();
  let updatedRecord = null;

  const updated = records.map((r) => {
    if (r.user_id === user?.id && r.date === today) {
      updatedRecord = {
        ...r,
        check_out_time: new Date().toISOString(),
        photo_out: photoDataUrl || r.photo_out,
      };
      return updatedRecord;
    }
    return r;
  });

  writeJson(ATTENDANCE_RECORDS_KEY, updated);
  return updatedRecord;
};

export const getLeaveQuotas = () => {
  const current = readJson(LEAVE_QUOTAS_KEY, initialLeaveQuotas);
  // Ensure all demo users have quotas initialized
  const userMap = new Map(current.map((q) => [q.user_id, q]));
  demoUsers.forEach((u) => {
    if (!userMap.has(u.id)) {
      userMap.set(u.id, {
        user_id: u.id,
        user_name: u.name,
        user_role: u.role,
        year: new Date().getFullYear(),
        total_quota: 12,
        used_days: 0,
        remaining_days: 12,
      });
    }
  });
  return Array.from(userMap.values());
};

export const saveLeaveQuota = (userId, totalQuota) => {
  const quotas = getLeaveQuotas();
  const updated = quotas.map((q) => {
    if (q.user_id === userId) {
      const total = Number(totalQuota) || 0;
      const remaining = Math.max(total - (q.used_days || 0), 0);
      return { ...q, total_quota: total, remaining_days: remaining };
    }
    return q;
  });
  writeJson(LEAVE_QUOTAS_KEY, updated);
  return updated;
};

export const getLeaveRequests = () => {
  return readJson(LEAVE_REQUESTS_KEY, initialLeaveRequests);
};

export const submitLeaveRequest = (user, payload) => {
  const requests = getLeaveRequests();
  const start = new Date(payload.start_date);
  const end = new Date(payload.end_date);
  const diffTime = Math.abs(end - start);
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const newReq = {
    id: `leave-${Date.now()}`,
    user_id: user?.id || "demo-user",
    user_name: user?.name || "Karyawan",
    user_role: user?.role || "staff",
    type: payload.type || "cuti",
    start_date: payload.start_date,
    end_date: payload.end_date,
    total_days: totalDays,
    reason: payload.reason || "",
    attachment_url: payload.attachment_url || null,
    status: "pending",
    hr_notes: "",
    created_at: new Date().toISOString(),
  };

  const updated = [newReq, ...requests];
  writeJson(LEAVE_REQUESTS_KEY, updated);
  return newReq;
};

export const updateLeaveRequestStatus = (requestId, status, hrNotes = "") => {
  const requests = getLeaveRequests();
  let targetReq = null;

  const updatedReqs = requests.map((req) => {
    if (req.id === requestId) {
      targetReq = { ...req, status, hr_notes: hrNotes };
      return targetReq;
    }
    return req;
  });

  writeJson(LEAVE_REQUESTS_KEY, updatedReqs);

  // If approved with 'approved_cuti' or legacy 'approved', deduct employee's leave quota
  if (targetReq && (status === "approved_cuti" || status === "approved")) {
    const quotas = getLeaveQuotas();
    const updatedQuotas = quotas.map((q) => {
      if (q.user_id === targetReq.user_id) {
        const used = (q.used_days || 0) + (targetReq.total_days || 1);
        const remaining = Math.max((q.total_quota || 12) - used, 0);
        return { ...q, used_days: used, remaining_days: remaining };
      }
      return q;
    });
    writeJson(LEAVE_QUOTAS_KEY, updatedQuotas);
  }

  return targetReq;
};
