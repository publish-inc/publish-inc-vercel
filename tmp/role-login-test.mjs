import puppeteer from "puppeteer";

const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";

const accounts = [
  { role: "pic_editor", email: "pic.editor@publishinc.com", password: "pic123" },
  { role: "pic_layouter", email: "pic.layouter@publishinc.com", password: "pic123" },
  { role: "editor", email: "editor@publishinc.com", password: "editor123" },
  { role: "layouter", email: "layouter@publishinc.com", password: "layouter123" },
];

const expectedMenus = {
  pic_editor: ["Dashboard KPI", "Distribusi Tugas", "Tugas Produksi", "Detail KPI", "Klaim KPI", "Approval KPI"],
  pic_layouter: ["Dashboard KPI", "Distribusi Tugas", "Tugas Produksi", "Detail KPI", "Klaim KPI", "Approval KPI"],
  editor: ["Dashboard KPI", "Tugas Produksi", "Detail KPI", "Klaim KPI"],
  layouter: ["Dashboard KPI", "Tugas Produksi", "Detail KPI", "Klaim KPI"],
};

const forbiddenMenus = {
  pic_editor: ["Katalog Buku", "Pengaturan Sistem", "Kelola Karyawan"],
  pic_layouter: ["Katalog Buku", "Pengaturan Sistem", "Kelola Karyawan"],
  editor: ["Distribusi Tugas", "Approval KPI", "Katalog Buku", "Pengaturan Sistem"],
  layouter: ["Distribusi Tugas", "Approval KPI", "Katalog Buku", "Pengaturan Sistem"],
};

const routeChecks = {
  pic_editor: {
    allowed: ["/admin/antrian-naskah", "/admin/tugas-produksi", "/admin/approval-kpi"],
    forbidden: ["/admin/buku", "/admin/pengaturan-sistem"],
  },
  pic_layouter: {
    allowed: ["/admin/antrian-naskah", "/admin/tugas-produksi", "/admin/approval-kpi"],
    forbidden: ["/admin/buku", "/admin/pengaturan-sistem"],
  },
  editor: {
    allowed: ["/admin/tugas-produksi", "/admin/input-kpi", "/admin/kpi-pribadi"],
    forbidden: ["/admin/antrian-naskah", "/admin/approval-kpi", "/admin/buku"],
  },
  layouter: {
    allowed: ["/admin/tugas-produksi", "/admin/input-kpi", "/admin/kpi-pribadi"],
    forbidden: ["/admin/antrian-naskah", "/admin/approval-kpi", "/admin/buku"],
  },
};

const waitForIdle = async (page) => {
  await Promise.race([
    page.waitForNetworkIdle({ idleTime: 700, timeout: 6000 }),
    new Promise((resolve) => setTimeout(resolve, 2500)),
  ]);
};

const textIncludes = (text, needle) => text.toLowerCase().includes(needle.toLowerCase());

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
const results = [];

try {
  for (const account of accounts) {
    const page = await browser.newPage();
    const errors = [];

    page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
    });

    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.clear());
    const cookies = await page.cookies();
    if (cookies.length) await page.deleteCookie(...cookies);
    await page.goto(`${baseUrl}/admin/login`, { waitUntil: "networkidle2" });
    await page.waitForSelector('[data-testid="login-email"]', { timeout: 10000 });

    await page.type('[data-testid="login-email"]', account.email);
    await page.type('[data-testid="login-password"]', account.password);
    await Promise.all([
      page.click('[data-testid="login-submit"]'),
      page.waitForFunction(() => location.pathname !== "/admin/login", { timeout: 10000 }),
    ]);
    await waitForIdle(page);

    const url = page.url();
    const bodyText = await page.evaluate(() => document.body.innerText);
    const roleLabel = account.role.replace("_", " ").toUpperCase();
    const visibleExpected = expectedMenus[account.role].filter((menu) => textIncludes(bodyText, menu));
    const visibleForbidden = forbiddenMenus[account.role].filter((menu) => textIncludes(bodyText, menu));
    const allowedRoutes = [];
    const forbiddenRoutes = [];

    for (const path of routeChecks[account.role].allowed) {
      await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle2" });
      allowedRoutes.push({ path, finalPath: new URL(page.url()).pathname, ok: new URL(page.url()).pathname === path });
    }

    for (const path of routeChecks[account.role].forbidden) {
      await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle2" });
      forbiddenRoutes.push({ path, finalPath: new URL(page.url()).pathname, ok: new URL(page.url()).pathname !== path });
    }

    results.push({
      role: account.role,
      email: account.email,
      url,
      roleLabelVisible: textIncludes(bodyText, roleLabel),
      expectedMenusOk: visibleExpected.length === expectedMenus[account.role].length,
      visibleExpected,
      forbiddenMenusHidden: visibleForbidden.length === 0,
      visibleForbidden,
      allowedRoutes,
      forbiddenRoutes,
      errors,
    });

    await page.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(results, null, 2));
