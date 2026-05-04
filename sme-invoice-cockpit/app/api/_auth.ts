// app/api/_auth.ts
import { cookies } from "next/headers";
import { getUserBySessionToken } from "@/lib/auth";
import type { User } from "@/lib/types";

export async function requireUser(): Promise<User | null> {
  const cookieStore = cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return null;
  return getUserBySessionToken(token);
}
