"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MapPin, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addressSchema, passwordChangeSchema, profileSchema } from "@/lib/validators";
import { api, ApiError } from "@/lib/fetcher";
import { Field, errorProps, inputClass } from "@/components/store/form-field";
import { AddressFields } from "@/components/store/address-fields";
import { EmptyState } from "@/components/store/empty-state";

function applyFieldErrors(e: unknown, setError: (k: never, v: { message: string }) => void) {
  if (e instanceof ApiError && e.fields) for (const [k, v] of Object.entries(e.fields)) setError(k as never, { message: v });
  toast.error(e instanceof Error ? e.message : "Something went wrong. Try again.");
}

export function ProfileForm({ name, phone }: { name: string; phone: string | null }) {
  const router = useRouter();
  const { register, handleSubmit, setError, formState } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name, phone: phone ?? "" },
  });
  const { errors, isSubmitting } = formState;
  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        try {
          await api("/api/account/profile", { method: "PATCH", body: values });
          toast.success("Profile saved.");
          router.refresh();
        } catch (e) {
          applyFieldErrors(e, setError);
        }
      })}
      className="space-y-4"
    >
      <Field id="name" label="Full name" error={errors.name?.message}>
        <input {...register("name")} {...errorProps("name", errors.name?.message)} autoComplete="name" className={inputClass} />
      </Field>
      <Field id="phone" label="Phone (optional)" error={errors.phone?.message}>
        <input {...register("phone")} {...errorProps("phone", errors.phone?.message)} type="tel" autoComplete="tel" className={inputClass} />
      </Field>
      <Button type="submit" size="pill" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        Save changes
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const { register, handleSubmit, setError, reset, formState } = useForm({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });
  const { errors, isSubmitting } = formState;
  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        try {
          await api("/api/account/password", { body: values });
          toast.success("Password changed.");
          reset();
        } catch (e) {
          applyFieldErrors(e, setError);
        }
      })}
      className="space-y-4"
    >
      <Field id="currentPassword" label="Current password" error={errors.currentPassword?.message}>
        <input
          {...register("currentPassword")}
          {...errorProps("currentPassword", errors.currentPassword?.message)}
          type="password"
          autoComplete="current-password"
          className={inputClass}
        />
      </Field>
      <Field id="newPassword" label="New password" error={errors.newPassword?.message} hint="At least 8 characters.">
        <input
          {...register("newPassword")}
          {...errorProps("newPassword", errors.newPassword?.message)}
          type="password"
          autoComplete="new-password"
          className={inputClass}
        />
      </Field>
      <Button type="submit" variant="outline" size="pill" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        Change password
      </Button>
    </form>
  );
}

type Address = {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

function AddressDialog({ address, open, onOpenChange }: { address: Address | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const { register, handleSubmit, setError, formState } = useForm({
    resolver: zodResolver(addressSchema),
    values: address
      ? { ...address, line2: address.line2 ?? "" }
      : { fullName: "", phone: "", line1: "", line2: "", city: "", state: "", postalCode: "", country: "India", isDefault: false },
  });
  const { errors, isSubmitting } = formState;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{address ? "Edit address" : "Add address"}</DialogTitle>
          <DialogDescription>We deliver across India.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(async (values) => {
            try {
              await api(address ? `/api/account/addresses/${address.id}` : "/api/account/addresses", {
                method: address ? "PATCH" : "POST",
                body: values,
              });
              toast.success(address ? "Address updated." : "Address added.");
              onOpenChange(false);
              router.refresh();
            } catch (e) {
              applyFieldErrors(e, setError);
            }
          })}
          className="space-y-4"
        >
          <AddressFields register={register} errors={errors} />
          <label className="flex min-h-11 items-center gap-3 text-[15px]">
            <input type="checkbox" {...register("isDefault")} className="size-5 accent-ink" />
            Use as default address
          </label>
          <Button type="submit" size="pill" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Save address
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddressBook({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Address | null>(null);
  const [open, setOpen] = useState(false);

  const edit = (a: Address | null) => {
    setEditing(a);
    setOpen(true);
  };

  async function call(url: string, method: string, body: unknown, done: string) {
    try {
      await api(url, { method, body });
      toast.success(done);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Saved addresses</h2>
        <Button size="pill" onClick={() => edit(null)}>
          <Plus className="size-4" />
          Add address
        </Button>
      </div>
      {!addresses.length ? (
        <EmptyState icon={MapPin} title="No saved addresses yet." body="Add one now or save it during checkout." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {addresses.map((a) => (
            <li key={a.id} className="flex flex-col rounded-3xl border border-line p-5 text-[15px]">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-semibold">{a.fullName}</p>
                {a.isDefault && <span className="rounded-full bg-lime px-2.5 py-0.5 text-xs font-semibold">Default</span>}
              </div>
              <address className="flex-1 text-stone not-italic">
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}
                <br />
                {a.city}, {a.state} {a.postalCode}
                <br />
                {a.phone}
              </address>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" className="h-10 rounded-full" onClick={() => edit(a)}>
                  Edit
                </Button>
                {!a.isDefault && (
                  <Button
                    variant="outline"
                    className="h-10 rounded-full"
                    onClick={() => call(`/api/account/addresses/${a.id}`, "PATCH", { isDefault: true }, "Default address updated.")}
                  >
                    Make default
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="h-10 rounded-full text-danger">
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this address?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {a.line1}, {a.city}. Past orders keep their delivery details.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep address</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-danger text-paper hover:bg-danger/90"
                        onClick={() => call(`/api/account/addresses/${a.id}`, "DELETE", undefined, "Address deleted.")}
                      >
                        Delete address
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </li>
          ))}
        </ul>
      )}
      <AddressDialog address={editing} open={open} onOpenChange={setOpen} />
    </div>
  );
}
