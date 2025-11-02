/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const fs = require("fs");
const path = require("path");

const loadEnvFile = (filename) => {
  const envPath = path.join(process.cwd(), filename);
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    if (!line || line.trim().startsWith("#")) return;
    const [key, ...rest] = line.split("=");
    if (!key) return;
    const value = rest.join("=").trim();
    if (!process.env[key]) {
      process.env[key] = value.replace(/^"|"$|^'|'$/g, "");
    }
  });
};

loadEnvFile(".env");
loadEnvFile(".env.local");
