"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { contactSchema } from "@/lib/validators";
import { api } from "@/lib/fetcher";
import { Field, errorProps, inputClass } from "@/components/store/form-field";

export function ContactForm({ defaultName = "", defaultEmail = "" }: { defaultName?: string; defaultEmail?: string }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: defaultName, email: defaultEmail, message: "" },
  });
  const { errors, isSubmitting } = formState;

  if (sent) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-3xl bg-tile p-5">
        <CheckCircle2 className="mt-0.5 size-6 shrink-0" />
        <div>
          <p className="font-bold">Message sent.</p>
          <p className="text-[15px] text-stone">We reply within one working day.</p>
        </div>
      </div>
    );
  }
  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setError(null);
        try {
          await api("/api/contact", { body: values });
          setSent(true);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Couldn't send. Try again.");
        }
      })}
      className="space-y-4"
    >
      <Field id="c-name" label="Name" error={errors.name?.message}>
        <input {...register("name")} {...errorProps("c-name", errors.name?.message)} autoComplete="name" className={inputClass} />
      </Field>
      <Field id="c-email" label="Email" error={errors.email?.message}>
        <input {...register("email")} {...errorProps("c-email", errors.email?.message)} type="email" autoComplete="email" className={inputClass} />
      </Field>
      <Field id="c-message" label="Message" error={errors.message?.message}>
        <textarea
          {...register("message")}
          {...errorProps("c-message", errors.message?.message)}
          rows={5}
          maxLength={2000}
          className="w-full rounded-xl border border-line p-4 text-[15px] outline-none focus-visible:border-ink aria-invalid:border-danger"
        />
      </Field>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" size="pill" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        Send message
      </Button>
    </form>
  );
}
