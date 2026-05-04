// lib/auth.ts
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { getAll, upsertById } from "./jsonDb";
import type { Session, User } from "./types";

const SESSION_TTL_DAYS = 7;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const users = await getAll<User>("users");
  return (
    users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null
  );
}

export async function createSession(userId: string): Promise<Session> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  const session: Session = {
    id: nanoid(),
    userId,
    token: nanoid(32),
    expiresAt: expiresAt.toISOString(),
  };

  await upsertById("sessions", session);
  return session;
}

export async function getUserBySessionToken(
  token: string
): Promise<User | null> {
  const sessions = await getAll<Session>("sessions");
  const session = sessions.find(
    (s) => s.token === token && new Date(s.expiresAt) > new Date()
  );
  if (!session) return null;
  const users = await getAll<User>("users");
  return users.find((u) => u.id === session.userId) ?? null;
}

export async function destroySession(token: string): Promise<void> {
  const sessions = await getAll<Session>("sessions");
  const filtered = sessions.filter((s) => s.token !== token);
  const { saveAll } = await import("./jsonDb");
  await saveAll("sessions", filtered);
}
