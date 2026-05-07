import fs from "fs/promises";
import path from "path";

function ts() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours()
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function main() {
  const root = process.cwd();
  const dataDir = path.join(root, "data");
  const backupDir = path.join(root, "backups", `data-${ts()}`);

  await fs.mkdir(backupDir, { recursive: true });
  await fs.cp(dataDir, backupDir, { recursive: true });
  console.log(`Backup created at: ${backupDir}`);
}

main().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
