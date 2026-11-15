"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { saveWeighingAction } from "@/app/(app)/transport/jobs/[id]/weighing-actions";
import { SearchSelect } from "@/components/app/search-select";
import { Field, FormMessage } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { WeighingSide } from "@/domain/job-status";
import { computeWeighing } from "@/domain/weight";
import { formatKg } from "@/lib/format";
import { weighingSchema, type WeighingFormInput } from "@/lib/weighing-schema";

type State = { ok: boolean; message?: string } | null;

export function WeighingForm({
  jobId,
  side,
  lineId,
  commodities,
  defaults,
  expectedUpdatedAt,
  needsReason,
  lockCommodity,
  onDone,
}: {
  jobId: string;
  side: WeighingSide;
  /** Empty for a new line. */
  lineId: string;
  /** Commodities this line may use. */
  commodities: { id: string; label: string }[];
  defaults: WeighingFormInput;
  expectedUpdatedAt: string;
  needsReason: boolean;
  /** Destination lines follow the origin commodities, so the commodity cannot be changed. */
  lockCommodity?: boolean;
  onDone: () => void;
}) {
  "use no memo"; // react-hook-form subscribes through proxies that React Compiler memoization hides
  const { register, handleSubmit, control, setValue, setError, formState } = useForm<WeighingFormInput>({
    resolver: zodResolver(weighingSchema),
    defaultValues: defaults,
  });
  const [state, setState] = useState<State>(null);
  const [pending, startTransition] = useTransition();
  const e = formState.errors;
  const prefix = `${side === "ORIGIN" ? "o" : "d"}-${lineId || "new"}`;

  const commodityId = useWatch({ control, name: "commodityId" });
  const [gross, tare, impurity] = useWatch({ control, name: ["gross", "tare", "impurity"] });
  const preview = computeWeighing({ gross, tare, impurity: impurity === "" ? "0" : impurity });

  const onSubmit = handleSubmit((values) => {
    if (needsReason && values.reason.trim().length < 3) {
      setError("reason", { message: "ระบุเหตุผลการแก้ไขอย่างน้อย 3 ตัวอักษร" });
      return;
    }
    startTransition(async () => {
      const result = await saveWeighingAction(jobId, side, lineId, expectedUpdatedAt, values);
      setState(result);
      for (const [name, message] of Object.entries(result?.fieldErrors ?? {})) {
        setError(name as keyof WeighingFormInput, { message });
      }
      if (result?.ok) {
        toast.success(result.message ?? "บันทึกแล้ว");
        onDone();
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="ประเภทสินค้า"
          htmlFor={`${prefix}-commodity`}
          error={e.commodityId?.message}
          className="sm:col-span-2"
        >
          {lockCommodity ? (
            <>
              <input type="hidden" {...register("commodityId")} />
              <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm">
                {commodities.find((item) => item.id === commodityId)?.label ?? "–"}
              </div>
            </>
          ) : (
            <SearchSelect
              id={`${prefix}-commodity`}
              value={commodityId}
              title="ประเภทสินค้า"
              placeholder="พิมพ์ชื่อสินค้า"
              emptyLabel="เลือกสินค้า"
              options={commodities}
              onChange={(id) => setValue("commodityId", id, { shouldDirty: true, shouldValidate: true })}
            />
          )}
        </Field>
        <Field label="วันที่และเวลาชั่ง" htmlFor={`${prefix}-weighedAt`} error={e.weighedAt?.message}>
          <Input id={`${prefix}-weighedAt`} type="datetime-local" {...register("weighedAt")} />
        </Field>
        <Field
          label={side === "ORIGIN" ? "เลขที่ใบชั่ง" : "เลขที่ใบชั่งโรงงาน"}
          htmlFor={`${prefix}-ticket`}
          error={e.ticketNumber?.message}
        >
          <Input id={`${prefix}-ticket`} placeholder="ไม่บังคับ" {...register("ticketNumber")} />
        </Field>
        <Field label="น้ำหนักหนัก (กก.)" htmlFor={`${prefix}-gross`} error={e.gross?.message}>
          <Input id={`${prefix}-gross`} inputMode="decimal" {...register("gross")} />
        </Field>
        <Field label="น้ำหนักเบา (กก.)" htmlFor={`${prefix}-tare`} error={e.tare?.message}>
          <Input id={`${prefix}-tare`} inputMode="decimal" {...register("tare")} />
        </Field>
        <Field label="น้ำหนักหักสิ่งเจือปน (กก.)" htmlFor={`${prefix}-impurity`} error={e.impurity?.message}>
          <Input id={`${prefix}-impurity`} inputMode="decimal" placeholder="0" {...register("impurity")} />
        </Field>
        <div className="grid content-end gap-1 rounded-lg bg-muted/60 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">น้ำหนักสินค้า</span>
            <span className="tabular-nums">{preview.ok ? formatKg(preview.value.netBeforeDeduction) : "–"}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>น้ำหนักสุทธิ</span>
            <span className="tabular-nums">{preview.ok ? formatKg(preview.value.net) : "–"}</span>
          </div>
        </div>
      </div>

      {needsReason && (
        <Field
          label="เหตุผลที่แก้ไขหลังยืนยันน้ำหนัก *"
          htmlFor={`${prefix}-reason`}
          error={e.reason?.message}
          hint="ค่าเดิมจะถูกเก็บไว้ในประวัติการแก้ไข"
        >
          <Textarea id={`${prefix}-reason`} rows={2} {...register("reason")} />
        </Field>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          บันทึกน้ำหนัก
        </Button>
        <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
          ยกเลิก
        </Button>
        {state && !state.ok && <FormMessage state={state} />}
      </div>
    </form>
  );
}
