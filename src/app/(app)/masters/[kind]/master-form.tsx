"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Field, FormMessage, NativeSelect } from "@/components/app/ui";
import { cn } from "@/lib/utils";
import { useFormAction } from "@/components/app/use-form-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MASTER_CONFIG, VEHICLE_TYPES, type MasterKind, type MasterRow } from "@/lib/masters";
import { saveMasterAction } from "../actions";

export function MasterForm({
  kind,
  row,
  transporters,
  lockedTransporterId,
  cancelHref = `/masters/${kind}`,
  idPrefix = kind,
  onSaved,
  onCancel,
  compact = false,
}: {
  kind: MasterKind;
  row: MasterRow | null;
  transporters: { id: string; code: string; name: string }[];
  /** New rows get this transporter without showing the picker. */
  lockedTransporterId?: string;
  cancelHref?: string;
  idPrefix?: string;
  onSaved?: () => void;
  onCancel?: () => void;
  compact?: boolean;
}) {
  const { state, onSubmit, pending, formRef } = useFormAction(
    saveMasterAction.bind(null, kind, row?.id ?? null),
    { resetOnSuccess: !row },
  );
  const e = state?.fieldErrors ?? {};
  const { fields } = MASTER_CONFIG[kind];

  useEffect(() => {
    if (state?.ok) onSaved?.();
  }, [state, onSaved]);

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}
    >
      {fields.map((field) => {
        const value = row?.values[field.name] ?? "";
        const id = `${idPrefix}-${field.name}`;
        if (field.name === "code" && row) {
          return (
            <Field key={field.name} label={field.label} htmlFor={id}>
              <Input id={id} name={field.name} defaultValue={value} readOnly className="bg-muted" />
            </Field>
          );
        }
        if (field.name === "code") return null;
        if (field.type === "transporter" && !row && lockedTransporterId !== undefined) {
          return <input key={field.name} type="hidden" name={field.name} value={lockedTransporterId} />;
        }
        return (
          <Field
            key={field.name}
            label={`${field.label}${field.required ? " *" : ""}`}
            htmlFor={id}
            error={e[field.name]}
            className={!compact && field.type === "textarea" ? "sm:col-span-2 lg:col-span-3" : undefined}
          >
            {field.type === "textarea" ? (
              <Textarea id={id} name={field.name} defaultValue={value} rows={2} />
            ) : field.name === "vehicleType" ? (
              <NativeSelect id={id} name={field.name} defaultValue={value}>
                <option value="">ไม่ระบุ</option>
                {value && !(VEHICLE_TYPES as readonly string[]).includes(value) && (
                  <option value={value}>{value}</option>
                )}
                {VEHICLE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </NativeSelect>
            ) : field.type === "transporter" ? (
              <NativeSelect id={id} name={field.name} defaultValue={value} required={field.required}>
                <option value="">{field.required ? "เลือกผู้รับจ้าง" : "ไม่ระบุ"}</option>
                {transporters.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} · {t.name}
                  </option>
                ))}
              </NativeSelect>
            ) : (
              <Input id={id} name={field.name} defaultValue={value} required={field.required} />
            )}
          </Field>
        );
      })}

      {row && (
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={row.active} className="size-4" />
          ใช้งานอยู่ (ปิดแล้วจะไม่แสดงในตัวเลือกของใบงานใหม่)
        </label>
      )}

      <div className={cn("flex items-center gap-3", !compact && "sm:col-span-2 lg:col-span-3", compact && "mt-1")}>
        <Button type="submit" disabled={pending} className={compact ? "w-full" : undefined}>
          {row ? "บันทึกการแก้ไข" : "เพิ่ม"}
        </Button>
        {row &&
          (onCancel ? (
            <button type="button" onClick={onCancel} className="text-sm text-muted-foreground hover:underline">
              ยกเลิกการแก้ไข
            </button>
          ) : (
            <Link href={cancelHref} className="text-sm text-muted-foreground hover:underline">
              ยกเลิกการแก้ไข
            </Link>
          ))}
        <FormMessage state={state} />
      </div>
    </form>
  );
}
