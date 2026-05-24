"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { AuthState } from "@/actions/auth";

type Props = {
  action: (prev: AuthState, data: FormData) => Promise<AuthState>;
  mode: "login" | "register";
};

export default function AuthForm({ action, mode }: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  const isLogin = mode === "login";

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-center mb-8">
          {isLogin ? "ログイン" : "新規登録"}
        </h1>

        <form action={formAction} className="space-y-4">
          {state.errors?.general?.map((e) => (
            <p key={e} className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
              {e}
            </p>
          ))}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              メールアドレス
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            {state.errors?.email?.map((e) => (
              <p key={e} className="text-xs text-red-600 mt-1">{e}</p>
            ))}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            {state.errors?.password?.map((e) => (
              <p key={e} className="text-xs text-red-600 mt-1">{e}</p>
            ))}
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-gray-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {pending ? "処理中..." : isLogin ? "ログイン" : "登録する"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {isLogin ? (
            <>アカウントをお持ちでない方は{" "}
              <Link href="/register" className="text-gray-900 underline">新規登録</Link>
            </>
          ) : (
            <>すでにアカウントをお持ちの方は{" "}
              <Link href="/login" className="text-gray-900 underline">ログイン</Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
