"use server";

import { redirect } from "next/navigation";
import { endSession, startSession, verifyCredentials } from "@/server/auth";

export type LoginState = { message?: string; username?: string } | null;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { message: "กรอกชื่อผู้ใช้และรหัสผ่าน", username };

  const user = await verifyCredentials(username, password);
  if (!user) return { message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", username };

  await startSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  await endSession();
  redirect("/login");
}
