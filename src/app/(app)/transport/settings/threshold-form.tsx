"use client";

import { Field, FormMessage } from "@/components/app/ui";
import { useFormAction } from "@/components/app/use-form-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveThresholdsAction } from "./actions";

export function ThresholdForm({ kg, percent }: { kg: string; percent: string }) {
  const { state, onSubmit, pending } = useFormAction(saveThresholdsAction);
  const e = state?.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="ส่วนต่างสูงสุด (กก.)" htmlFor="maxVarianceKg" error={e.maxVarianceKg}>
          <Input id="maxVarianceKg" name="maxVarianceKg" inputMode="decimal" defaultValue={kg} required />
        </Field>
        <Field label="ส่วนต่างสูงสุด (%)" htmlFor="maxVariancePercent" error={e.maxVariancePercent}>
          <Input
            id="maxVariancePercent"
            name="maxVariancePercent"
            inputMode="decimal"
            defaultValue={percent}
            required
          />
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">
        เกินเกณฑ์ใดเกณฑ์หนึ่งถือว่าเกินเกณฑ์ ต้องให้ผู้อนุมัติยืนยัน การเปลี่ยนเกณฑ์มีผลเมื่อบันทึกน้ำหนักครั้งถัดไป
      </p>
      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          บันทึกเกณฑ์
        </Button>
      </div>
    </form>
  );
}
