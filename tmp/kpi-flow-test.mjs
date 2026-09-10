import puppeteer from "puppeteer";

const baseUrl = "http://localhost:3000";

const clickByText = async (page, text, exact = false) => {
  const ok = await page.evaluate(({ needle, exactMatch }) => {
    const button = [...document.querySelectorAll("button")].find((item) => {
      const value = item.innerText.trim();
      return exactMatch ? value === needle : value.includes(needle);
    });
    if (!button) return false;
    button.click();
    return true;
  }, { needle: text, exactMatch: exact });
  if (!ok) throw new Error(`Button not found: ${text}`);
};

const fillLogin = async (page, email, password) => {
  await page.goto(`${baseUrl}/admin/login`, { waitUntil: "networkidle2" });
  await page.waitForSelector('[data-testid="login-email"]');
  await page.type('[data-testid="login-email"]', email);
  await page.type('[data-testid="login-password"]', password);
  await Promise.all([
    page.click('[data-testid="login-submit"]'),
    page.waitForFunction(() => location.pathname !== "/admin/login", { timeout: 10000 }),
  ]);
};

const logoutWithoutClearingWorkflow = async (page) => {
  await page.evaluate(() => localStorage.removeItem("publishinc_access_token"));
  const cookies = await page.cookies();
  if (cookies.length) await page.deleteCookie(...cookies);
};

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();

try {
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await logoutWithoutClearingWorkflow(page);

  await fillLogin(page, "editor@publishinc.com", "editor123");
  await page.goto(`${baseUrl}/admin/tugas-produksi`, { waitUntil: "networkidle2" });
  await clickByText(page, "Done & Klaim KPI");
  await page.waitForSelector('input[type="number"]');
  await page.click('input[type="number"]');
  await page.keyboard.down("Control");
  await page.keyboard.press("KeyA");
  await page.keyboard.up("Control");
  await page.keyboard.press("Backspace");
  await page.type('input[type="number"]', "132");
  await clickByText(page, "Klaim", true);
  await page.waitForFunction(() => document.body.innerText.includes("Klaim Revisi 1"));

  await clickByText(page, "Klaim Revisi 1");
  await page.waitForSelector('input[type="number"]');
  await page.type('input[type="number"]', "10");
  await clickByText(page, "Klaim", true);
  await page.waitForFunction(() => document.body.innerText.toLowerCase().includes("revisi 2"));
  const editorText = await page.evaluate(() => document.body.innerText);

  await logoutWithoutClearingWorkflow(page);
  await fillLogin(page, "pic.editor@publishinc.com", "pic123");
  await page.goto(`${baseUrl}/admin/approval-kpi`, { waitUntil: "networkidle2" });
  const approved = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button[title="Setujui"]')];
    buttons.forEach((button) => button.click());
    return buttons.length;
  });
  await new Promise((resolve) => setTimeout(resolve, 500));

  await logoutWithoutClearingWorkflow(page);
  await fillLogin(page, "editor@publishinc.com", "editor123");
  await page.goto(`${baseUrl}/admin/kpi-pribadi`, { waitUntil: "networkidle2" });
  const detailText = await page.evaluate(() => document.body.innerText);

  console.log(JSON.stringify({
    revisionMovedToSecondStep: editorText.toLowerCase().includes("revisi 2"),
    completeHiddenAfterRevisionOne: !editorText.includes("Complete"),
    approvalsClicked: approved,
    detailShowsApproved: detailText.includes("Capaian Approved Bulan Ini") && detailText.includes("Antologi Puisi Hujan Pertama"),
    detailShowsRevisionValue: detailText.includes("+10") || detailText.includes("10"),
  }, null, 2));
} finally {
  await browser.close();
}
