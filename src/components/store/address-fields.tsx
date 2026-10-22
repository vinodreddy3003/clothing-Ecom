"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Field, errorProps, inputClass } from "@/components/store/form-field";

const STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

type AddressShape = {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
};

/**
 * Address inputs for any RHF form. `prefix` is the field path ("" or "address.").
 * Typed loosely because it's shared by forms with different root shapes.
 */
export function AddressFields({
  register,
  errors,
  prefix = "",
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  errors?: FieldErrors<AddressShape>;
  prefix?: string;
}) {
  const id = (k: string) => `${prefix.replace(/\./g, "-")}${k}`;
  const f = (k: keyof AddressShape) => ({ ...register(`${prefix}${k}`), ...errorProps(id(k), errors?.[k]?.message) });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id={id("fullName")} label="Full name" error={errors?.fullName?.message}>
        <input {...f("fullName")} autoComplete="name" className={inputClass} />
      </Field>
      <Field id={id("phone")} label="Phone" error={errors?.phone?.message}>
        <input {...f("phone")} type="tel" autoComplete="tel" inputMode="tel" className={inputClass} />
      </Field>
      <Field id={id("line1")} label="Address" error={errors?.line1?.message} className="sm:col-span-2">
        <input {...f("line1")} autoComplete="address-line1" placeholder="House number, street" className={inputClass} />
      </Field>
      <Field id={id("line2")} label="Apartment, landmark (optional)" error={errors?.line2?.message} className="sm:col-span-2">
        <input {...f("line2")} autoComplete="address-line2" className={inputClass} />
      </Field>
      <Field id={id("city")} label="City" error={errors?.city?.message}>
        <input {...f("city")} autoComplete="address-level2" className={inputClass} />
      </Field>
      <Field id={id("state")} label="State" error={errors?.state?.message}>
        <select {...f("state")} autoComplete="address-level1" className={inputClass} defaultValue="">
          <option value="" disabled>
            Choose a state
          </option>
          {STATES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field id={id("postalCode")} label="PIN code" error={errors?.postalCode?.message}>
        <input {...f("postalCode")} autoComplete="postal-code" inputMode="numeric" maxLength={6} className={inputClass} />
      </Field>
    </div>
  );
}
