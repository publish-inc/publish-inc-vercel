import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";
const bundledPython = path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "python", "python.exe");
const candidates = [process.env.PYTHON, "python", "python3", "py", bundledPython].filter(Boolean);

function works(command, args = ["--version"]) {
  const result = spawnSync(command, args, { cwd: root, stdio: "ignore", shell: false });
  return result.status === 0;
}

function findPython() {
  const found = candidates.find((candidate) => works(candidate));
  if (!found) {
    console.error("Python tidak ditemukan. Install Python 3.11+ atau set env PYTHON ke path python.exe.");
    process.exit(1);
  }
  return found;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: false, ...options });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function loadDotEnv() {
  const file = path.join(root, ".env");
  if (!fs.existsSync(file)) return {};
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const basePython = findPython();
const venvPython = isWin ? path.join(root, ".venv", "Scripts", "python.exe") : path.join(root, ".venv", "bin", "python");

if (!fs.existsSync(venvPython)) {
  console.log("Membuat Python virtualenv lokal di .venv...");
  run(basePython, ["-m", "venv", ".venv"]);
}

const depsOk = works(venvPython, ["-c", "import fastapi, uvicorn, jwt, bcrypt, PIL, reportlab, requests, pypdf"]);
if (!depsOk) {
  console.log("Menginstall dependency backend ke .venv...");
  run(venvPython, ["-m", "pip", "install", "-r", "requirements.txt"]);
}

const fileEnv = loadDotEnv();
const env = {
  ...process.env,
  ...fileEnv,
  JWT_SECRET: fileEnv.JWT_SECRET || process.env.JWT_SECRET || "local-dev-only-change-before-production",
  AUTO_SEED: fileEnv.AUTO_SEED || process.env.AUTO_SEED || "true",
};

const api = spawn(venvPython, ["-m", "uvicorn", "api.index:app", "--host", "127.0.0.1", "--port", "8000", "--reload"], {
  cwd: root,
  env,
  stdio: "inherit",
});

const viteBin = isWin ? path.join(root, "node_modules", ".bin", "vite.cmd") : path.join(root, "node_modules", ".bin", "vite");
const vite = spawn(viteBin, ["--host", "0.0.0.0"], {
  cwd: root,
  env,
  stdio: "inherit",
  shell: isWin,
});

function shutdown(code = 0) {
  api.kill();
  vite.kill();
  process.exit(code);
}

api.on("exit", (code) => shutdown(code || 0));
vite.on("exit", (code) => shutdown(code || 0));
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
