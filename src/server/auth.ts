import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { can, type Action, type Role } from "@/domain/permissions";
import { db } from "./db";

export const SESSION_COOKIE = "transport_session";
const SESSION_HOURS = 12;

export type CurrentUser = { id: string; username: string; displayName: string; role: Role };

function sessionId(token: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return createHmac("sha256", secret).update(token).digest("hex");
}

export async function verifyCredentials(username: string, password: string) {
  const user = await db.user.findUnique({ where: { username } });
  if (!user || !user.active) return null;
  return (await bcrypt.compare(password, user.passwordHash)) ? user : null;
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function startSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  await db.session.create({ data: { id: sessionId(token), userId, expiresAt } });
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // The LAN deployment is plain HTTP; a Secure cookie would never be sent back.
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: sessionId(token) } });
  store.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: sessionId(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || !session.user.active) return null;
  const { id, username, displayName, role } = session.user;
  return { id, username, displayName, role };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export class ForbiddenError extends Error {
  constructor() {
    super("ไม่มีสิทธิ์ทำรายการนี้");
  }
}

/** For pages: sends signed-out users to login and blocks roles without the action. */
export async function requirePermission(action: Action): Promise<CurrentUser> {
  const user = await requireUser();
  if (!can(user.role, action)) throw new ForbiddenError();
  return user;
}
