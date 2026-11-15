import type { NextConfig } from "next";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// The Appwrite credentials live in the repository root so that the Python tools
// and the web app share one file.
const rootEnv = join(process.cwd(), "..", ".env.local");
if (existsSync(rootEnv)) {
  for (const line of readFileSync(rootEnv, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i < 0) continue;
    const key = trimmed.slice(0, i).trim();
    if (!process.env[key]) process.env[key] = trimmed.slice(i + 1).trim();
  }
}

const nextConfig: NextConfig = {};

export default nextConfig;
