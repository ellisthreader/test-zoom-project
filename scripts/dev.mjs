import { spawn } from "node:child_process";
import net from "node:net";

const backendPort = Number(process.env.PORT || 8787);
const backendBaseUrl = process.env.API_BASE_URL || `http://127.0.0.1:${backendPort}`;
const preferredBackendPorts = Array.from(new Set([backendPort, 8787, 8788, 8789, 8790]));
const backendBaseCandidates = Array.from(new Set([
  backendBaseUrl,
  ...preferredBackendPorts.map((port) => `http://127.0.0.1:${port}`)
])).map((baseUrl) => baseUrl.replace(/\/$/, ""));
const reusableBackendBaseUrl = await findReusableBackend();
const selectedBackendPort = reusableBackendBaseUrl ? Number(new URL(reusableBackendBaseUrl).port) : await findAvailablePort(preferredBackendPorts);
const selectedBackendBaseUrl = reusableBackendBaseUrl || `http://127.0.0.1:${selectedBackendPort}`;

let shuttingDown = false;
let children = [];

const commands = [
  ...(reusableBackendBaseUrl ? [] : [{
    name: "backend",
    command: "npm",
    args: ["run", "server"],
    env: {
      PORT: String(selectedBackendPort),
      API_BASE_URL: selectedBackendBaseUrl
    }
  }]),
  {
    name: "frontend",
    command: "npm",
    args: ["run", "client"],
    env: {
      VITE_API_BASE_URL: selectedBackendBaseUrl
    }
  }
];

children = commands.map(({ name, command, args, env }) => {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      ...env
    }
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    stopChildren();
    process.exit(code ?? (signal ? 1 : 0));
  });

  child.on("error", (error) => {
    console.error(`[${name}] ${error.message}`);
    if (!shuttingDown) {
      shuttingDown = true;
      stopChildren();
      process.exit(1);
    }
  });

  return child;
});

async function findReusableBackend() {
  for (const baseUrl of backendBaseCandidates) {
    if (await isCurrentWorkspaceBackend(baseUrl)) {
      console.log(`[backend] Reusing existing backend at ${baseUrl}/api/health`);
      return baseUrl;
    }
  }

  return "";
}

async function isCurrentWorkspaceBackend(baseUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 500);

  try {
    const backendHealthUrl = `${baseUrl}/api/health`;
    const response = await fetch(backendHealthUrl, { signal: controller.signal });

    if (!response.ok) {
      return false;
    }

    const payload = await response.json();
    return payload?.service === "relayclarity-ai-backend"
      && payload?.workspaceRoot === process.cwd()
      && payload?.authSchemaVersion === 2;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }

  return false;
}

async function findAvailablePort(ports) {
  for (const port of ports) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(`No available backend port found. Tried: ${ports.join(", ")}`);
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

function stopChildren() {
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
}

process.on("SIGINT", () => {
  shuttingDown = true;
  stopChildren();
});

process.on("SIGTERM", () => {
  shuttingDown = true;
  stopChildren();
});
