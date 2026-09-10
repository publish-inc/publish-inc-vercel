import { getKpiEvents, getRoleKpiTargets } from "./workflow";

const PAYROLL_KEY = "spk_payroll_releases";
const CONFIG_KEY = "spk_salary_config";
const PROFILES_KEY = "spk_employee_profiles_v1";

export const BASE_SALARY_MAP = {
  master_admin: 6000000,
  pimpinan: 8000000,
  cs: 3500000,
  admin: 3500000,
  cco: 3800000,
  pic_editor: 4200000,
  editor: 3800000,
  pic_layouter: 4000000,
  layouter: 3600000,
  hrd: 4500000,
  finance: 4500000,
  admin_marketplace: 3800000,
  campaign: 3700000,
  sosmed: 3500000,
  crm: 3500000,
  produksi: 3500000,
  report: 3500000,
};

export const ALLOWANCE_MAP = {
  master_admin: 1000000,
  pimpinan: 1500000,
  cs: 500000,
  admin: 500000,
  cco: 600000,
  pic_editor: 700000,
  editor: 500000,
  pic_layouter: 600000,
  layouter: 500000,
  hrd: 750000,
  finance: 750000,
  admin_marketplace: 500000,
  campaign: 500000,
  sosmed: 500000,
  crm: 500000,
  produksi: 500000,
  report: 500000,
};

export function getEmployeeProfiles() {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getEmployeeProfile(userId) {
  const profiles = getEmployeeProfiles();
  return (
    profiles[userId] || {
      nik: "737101290394000" + (String(userId).length > 2 ? String(userId).slice(-2) : "01"),
      alamat: "Jl. Sultan Alauddin No. 128, Makassar",
      phone: "081234567890",
      emergency_contact: "Keluarga (081987654321)",
      bank_name: "Bank BCA",
      bank_account_number: "1234567890",
      photo_url: "",
      photo_drive_url: "",
      show_on_landing: true,
    }
  );
}

export function saveEmployeeProfile(userId, profileData) {
  try {
    const profiles = getEmployeeProfiles();
    profiles[userId] = { ...profiles[userId], ...profileData };
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch (err) {
    console.error("Failed to save employee profile:", err);
  }
}

export function calculateKemnakerDeduction({
  baseSalary = 0,
  allowance = 0,
  alpaDays = 0,
  unpaidLeaveDays = 0,
  lateHours = 0,
  workDaysSystem = 21,
}) {
  const monthlySalary = Number(baseSalary) + Number(allowance);
  const divider = Number(workDaysSystem) || 21;
  const dailyRate = monthlySalary / divider;
  const hourlyRate = monthlySalary / 173;

  const alpaDeduction = Math.round(Number(alpaDays) * dailyRate);
  const unpaidDeduction = Math.round(Number(unpaidLeaveDays) * dailyRate);
  const lateDeduction = Math.round(Number(lateHours) * hourlyRate);

  const totalDeduction = alpaDeduction + unpaidDeduction + lateDeduction;

  return {
    monthlySalary,
    dailyRate: Math.round(dailyRate),
    hourlyRate: Math.round(hourlyRate),
    alpaDeduction,
    unpaidDeduction,
    lateDeduction,
    totalDeduction,
  };
}

export function getSalaryConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : { baseSalaries: BASE_SALARY_MAP, allowances: ALLOWANCE_MAP, bonusRates: {}, deductions: {} };
  } catch {
    return { baseSalaries: BASE_SALARY_MAP, allowances: ALLOWANCE_MAP, bonusRates: {}, deductions: {} };
  }
}

export function saveSalaryConfig(config) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (err) {
    console.error("Failed to save salary config:", err);
  }
}

export function getPayrollReleases() {
  try {
    const raw = localStorage.getItem(PAYROLL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePayrollReleases(releases) {
  try {
    localStorage.setItem(PAYROLL_KEY, JSON.stringify(releases));
  } catch (err) {
    console.error("Failed to save payroll releases:", err);
  }
}

export function calculatePayrollSummary(users = [], period = "") {
  const config = getSalaryConfig();
  const baseSalaries = { ...BASE_SALARY_MAP, ...(config.baseSalaries || {}) };
  const allowances = { ...ALLOWANCE_MAP, ...(config.allowances || {}) };

  const targets = getRoleKpiTargets();
  const allEvents = getKpiEvents();
  const filteredEvents = period
    ? allEvents.filter((e) => new Date(e.at).toISOString().slice(0, 7) === period)
    : allEvents;

  return users.map((user) => {
    const role = user.role || "cs";
    const userKey = user.id || user.email;

    const baseSalary = Number(config[`base_${userKey}`] ?? baseSalaries[role] ?? 3200000);
    const allowance = Number(config[`allowance_${userKey}`] ?? allowances[role] ?? 500000);
    const userDeduction = Number(config[`deduction_${userKey}`] ?? 0);
    const customBonusKpiOverride = config[`bonus_kpi_${userKey}`];

    const userRoleTargets = targets[role] || [];
    const targetVal = userRoleTargets.reduce((sum, t) => sum + (Number(t.target) || 0), 0);

    const userEvents = filteredEvents.filter(
      (e) => e.user_id === user.id || e.user_email === user.email || e.user_name === user.name
    );

    const achievedVal = userEvents.reduce((sum, e) => sum + (Number(e.value) || 0), 0);

    let bonusKpi = 0;
    if (customBonusKpiOverride !== undefined && customBonusKpiOverride !== null && customBonusKpiOverride !== "") {
      bonusKpi = Number(customBonusKpiOverride) || 0;
    } else if (userRoleTargets.length) {
      userRoleTargets.forEach((targetItem) => {
        const itemMetric = targetItem.metric || targetItem.name;
        const itemTarget = Number(targetItem.target) || 0;

        const itemAchieved = userEvents
          .filter((e) => e.metric === targetItem.metric || e.title === targetItem.name || e.target_id === targetItem.id)
          .reduce((sum, e) => sum + (Number(e.value) || 0), 0);

        if (itemTarget > 0 && itemAchieved < itemTarget) {
          return;
        }

        const isPercentage =
          targetItem?.reward_type === "percentage" ||
          targetItem?.unit === "rupiah" ||
          itemMetric === "omzet" ||
          itemMetric === "marketplace_omzet";

        const defaultRate = isPercentage ? 2 : 1000;
        const rewardRate = Number(targetItem?.reward ?? defaultRate);

        if (isPercentage) {
          bonusKpi += itemAchieved * (rewardRate / 100);
        } else {
          bonusKpi += itemAchieved * rewardRate;
        }
      });
    }

    const kpiPercentage = targetVal ? Math.round((achievedVal / targetVal) * 100) : 0;
    const grossSalary = baseSalary + allowance + bonusKpi;
    const netSalary = Math.max(0, grossSalary - userDeduction);

    const profile = getEmployeeProfile(userKey);

    return {
      id: userKey,
      name: user.name || user.email,
      email: user.email,
      role,
      base_salary: baseSalary,
      allowance,
      achieved: achievedVal,
      target: targetVal,
      kpi_percentage: kpiPercentage,
      bonus_kpi: Math.round(bonusKpi),
      late_deduction: userDeduction,
      gross_salary: Math.round(grossSalary),
      net_salary: Math.round(netSalary),
      nik: profile.nik,
      alamat: profile.alamat,
      phone: profile.phone,
      emergency_contact: profile.emergency_contact,
      bank_name: profile.bank_name,
      bank_account_number: profile.bank_account_number,
      photo_url: profile.photo_url,
      photo_drive_url: profile.photo_drive_url,
    };
  });
}

export function submitPayrollRelease(period, rows) {
  const totalAmount = rows.reduce((sum, r) => sum + (r.net_salary || 0), 0);
  const releases = getPayrollReleases();

  const existingIndex = releases.findIndex((r) => r.period === period);
  const newRelease = {
    id: `pay-${period}`,
    period,
    total_amount: totalAmount,
    employee_count: rows.length,
    status: "submitted_to_finance",
    submitted_at: new Date().toISOString(),
    details: rows,
  };

  if (existingIndex >= 0) {
    releases[existingIndex] = newRelease;
  } else {
    releases.unshift(newRelease);
  }

  savePayrollReleases(releases);
  return newRelease;
}

export function markPayrollAsPaid(period) {
  const releases = getPayrollReleases();
  const updated = releases.map((r) => {
    if (r.period === period) {
      return { ...r, status: "paid", paid_at: new Date().toISOString() };
    }
    return r;
  });
  savePayrollReleases(updated);
}
