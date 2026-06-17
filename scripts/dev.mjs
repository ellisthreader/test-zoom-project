import { spawn } from "node:child_process";

const backendPort = Number(process.env.PORT || 8787);
const backendHealthUrl = `http://127.0.0.1:${backendPort}/api/health`;

let shuttingDown = false;
let children = [];

const commands = [
  ...(await isBackendAlreadyRunning() ? [] : [["backend", "npm", ["run", "server"]]]),
  ["frontend", "npm", ["run", "client"]]
];

children = commands.map(([name, command, args]) => {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env
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

async function isBackendAlreadyRunning() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 500);

  try {
    const response = await fetch(backendHealthUrl, { signal: controller.signal });

    if (response.ok) {
      console.log(`[backend] Reusing existing backend at ${backendHealthUrl}`);
      return true;
    }
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }

  return false;
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
