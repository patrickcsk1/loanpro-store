import { defineConfig } from "vitest/config";
import { readFileSync } from "node:fs";
import path from "node:path";

function loadDotEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const raw = readFileSync(path.resolve(__dirname, ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  } catch {
    // .env optional; rely on process.env
  }
  return env;
}

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    env: loadDotEnv(),
    globals: false,
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
