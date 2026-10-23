"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loginSchema, registerSchema } from "@/lib/validators";
import { api, ApiError } from "@/lib/fetcher";
import { Field, errorProps, inputClass } from "@/components/store/form-field";
import { safeNext } from "@/components/store/safe-next";

export function AuthForm({ mode, next }: { mode: "login" | "register"; next?: string }) {
  const [formError, setFormError] = useState<string | null>(null);
  const isLogin = mode === "login";
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ name?: string; email: string; password: string }>({
    resolver: zodResolver(isLogin ? loginSchema : registerSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const { role } = await api<{ role: "ADMIN" | "CUSTOMER" }>(`/api/auth/${mode}`, { body: values });
      // Full navigation so the new session cookie is used everywhere (header, layouts, admin guard).
      // router.replace + router.refresh races: the refresh re-renders /login and the redirect is lost.
      window.location.assign(safeNext(next) ?? (role === "ADMIN" ? "/admin" : "/account"));
    } catch (e) {
      if (e instanceof ApiError && e.fields) {
        for (const [k, v] of Object.entries(e.fields)) setError(k as "email", { message: v });
      }
      setFormError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    }
  });

  const nextQs = safeNext(next) ? `?next=${encodeURIComponent(next!)}` : "";

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError && (
        <p role="alert" className="rounded-2xl bg-[#fee4e2] p-3 text-[15px] text-danger">
          {formError}
        </p>
      )}
      {!isLogin && (
        <Field id="name" label="Full name" error={errors.name?.message}>
          <input {...register("name")} {...errorProps("name", errors.name?.message)} autoComplete="name" className={inputClass} />
        </Field>
      )}
      <Field id="email" label="Email" error={errors.email?.message}>
        <input {...register("email")} {...errorProps("email", errors.email?.message)} type="email" autoComplete="email" className={inputClass} />
      </Field>
      <Field id="password" label="Password" error={errors.password?.message} hint={isLogin ? undefined : "At least 8 characters."}>
        <input
          {...register("password")}
          {...errorProps("password", errors.password?.message)}
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          className={inputClass}
        />
      </Field>
      <Button type="submit" size="pill" className="h-12 w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {isLogin ? "Sign in" : "Create account"}
      </Button>
      <p className="text-center text-[15px] text-stone">
        {isLogin ? "New here? " : "Already have an account? "}
        <Link href={`/${isLogin ? "register" : "login"}${nextQs}`} className="font-semibold text-ink underline underline-offset-4">
          {isLogin ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}
