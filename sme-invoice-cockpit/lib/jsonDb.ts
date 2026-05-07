// lib/jsonDb.ts
import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fsSync.existsSync(DATA_DIR)) {
  fsSync.mkdirSync(DATA_DIR, { recursive: true });
}

export type CollectionName =
  | "users"
  | "businesses"
  | "customers"
  | "items"
  | "invoices"
  | "payments"
  | "sessions"
  | "webhooks";

const fileMap: Record<CollectionName, string> = {
  users: "users.json",
  businesses: "businesses.json",
  customers: "customers.json",
  items: "items.json",
  invoices: "invoices.json",
  payments: "payments.json",
  sessions: "sessions.json",
  webhooks: "webhooks.json",
};

// naive per-file mutex (ok for single-node MVP)
const locks: Record<string, Promise<void> | null> = {};

async function withLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const previous = locks[filePath] || Promise.resolve();
  let release!: () => void;
  locks[filePath] = new Promise((res) => (release = res));
  await previous;
  try {
    return await fn();
  } finally {
    release();
    locks[filePath] = null;
  }
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJsonFile<T>(filePath: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    if (!raw.trim()) return [];
    return JSON.parse(raw) as T[];
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      await fs.writeFile(filePath, "[]", "utf8");
      return [];
    }
    if (err instanceof SyntaxError) {
      console.error(`Failed to parse JSON file: ${filePath}`, err);
    }
    throw err;
  }
}

async function writeJsonFile<T>(filePath: string, data: T[]): Promise<void> {
  await ensureDataDir();
  const tmpPath = filePath + ".tmp";
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile(tmpPath, json, "utf8");
  await fs.rename(tmpPath, filePath);
}

export async function getAll<T>(collection: CollectionName): Promise<T[]> {
  const filePath = path.join(DATA_DIR, fileMap[collection]);
  return withLock(filePath, () => readJsonFile<T>(filePath));
}

export async function saveAll<T>(
  collection: CollectionName,
  data: T[]
): Promise<void> {
  const filePath = path.join(DATA_DIR, fileMap[collection]);
  return withLock(filePath, () => writeJsonFile<T>(filePath, data));
}

export async function upsertById<T extends { id: string }>(
  collection: CollectionName,
  entity: T
): Promise<T> {
  const filePath = path.join(DATA_DIR, fileMap[collection]);
  return withLock(filePath, async () => {
    const all = await readJsonFile<T>(filePath);
    const idx = all.findIndex((e) => e.id === entity.id);
    if (idx === -1) all.push(entity);
    else all[idx] = entity;
    await writeJsonFile<T>(filePath, all);
    return entity;
  });
}

export async function deleteById<T extends { id: string }>(
  collection: CollectionName,
  id: string
): Promise<void> {
  const filePath = path.join(DATA_DIR, fileMap[collection]);
  return withLock(filePath, async () => {
    const all = await readJsonFile<T>(filePath);
    const filtered = all.filter((e) => e.id !== id);
    await writeJsonFile<T>(filePath, filtered);
  });
}

export async function findById<T extends { id: string }>(
  collection: CollectionName,
  id: string
): Promise<T | null> {
  const all = await getAll<T>(collection);
  return all.find((e) => e.id === id) ?? null;
}
