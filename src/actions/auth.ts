"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";

const AuthSchema = z.object({
  email: z.string().email({ message: "有効なメールアドレスを入力してください" }),
  password: z.string().min(8, { message: "パスワードは8文字以上で入力してください" }),
});

export type AuthState = {
  errors?: { email?: string[]; password?: string[]; general?: string[] };
};

export async function signUp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const result = AuthSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const { email, password } = result.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { errors: { general: ["このメールアドレスはすでに登録されています"] } };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { email, passwordHash } });

  await createSession({ userId: user.id, email: user.email });
  redirect("/");
}

export async function signIn(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const result = AuthSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const { email, password } = result.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { errors: { general: ["メールアドレスまたはパスワードが正しくありません"] } };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { errors: { general: ["メールアドレスまたはパスワードが正しくありません"] } };
  }

  await createSession({ userId: user.id, email: user.email });
  redirect("/");
}

export async function signOut() {
  await deleteSession();
  redirect("/login");
}
