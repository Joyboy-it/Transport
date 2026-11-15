"use client";

import { Field, FormMessage } from "@/components/app/ui";
import { useFormAction } from "@/components/app/use-form-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveCompanyAction } from "./actions";

export function CompanyForm({
  company,
}: {
  company: { name: string; address: string; taxId: string; phone: string };
}) {
  const { state, onSubmit, pending } = useFormAction(saveCompanyAction);
  const e = state?.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-4">
      <Field label="ชื่อบริษัท" htmlFor="name" error={e.name}>
        <Input id="name" name="name" defaultValue={company.name} />
      </Field>
      <Field label="ที่อยู่" htmlFor="address" error={e.address}>
        <Textarea id="address" name="address" defaultValue={company.address} rows={3} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="เลขประจำตัวผู้เสียภาษี" htmlFor="taxId" error={e.taxId}>
          <Input id="taxId" name="taxId" defaultValue={company.taxId} />
        </Field>
        <Field label="โทรศัพท์" htmlFor="phone" error={e.phone}>
          <Input id="phone" name="phone" defaultValue={company.phone} />
        </Field>
      </div>
      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          บันทึกข้อมูลบริษัท
        </Button>
      </div>
    </form>
  );
}
