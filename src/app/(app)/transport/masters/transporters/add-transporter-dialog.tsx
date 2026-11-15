"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { createTransporterWithCrewAction } from "@/app/(app)/transport/masters/actions";
import { Field, FormMessage, NativeSelect } from "@/components/app/ui";
import { useFormAction } from "@/components/app/use-form-action";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { VEHICLE_TYPES } from "@/lib/masters";
import { Textarea } from "@/components/ui/textarea";

export function AddTransporterDialog() {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const dirty = useRef(false);
  const onSaved = useCallback(() => {
    dirty.current = false;
    setOpen(false);
  }, []);

  function onOpenChange(next: boolean, eventDetails: { cancel: () => void }) {
    if (!next && dirty.current && !window.confirm("ปิดหน้าต่างนี้? ข้อมูลที่กรอกจะไม่ถูกบันทึก")) {
      eventDetails.cancel();
      return;
    }
    if (next) setFormKey((key) => key + 1);
    dirty.current = false;
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button />}>
        <Plus /> เพิ่มผู้รับจ้าง
      </DialogTrigger>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-5 overflow-hidden p-6 sm:max-w-3xl">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-lg">เพิ่มผู้รับจ้าง</DialogTitle>
          <DialogDescription>
            กรอกทะเบียนรถ คนขับ และหมายเหตุของบริษัทนี้ได้ทันที ช่องเหล่านี้ว่างไว้ได้
          </DialogDescription>
        </DialogHeader>
        <div
          className="overflow-y-auto pr-1"
          onInput={() => {
            dirty.current = true;
          }}
        >
          <AddTransporterForm key={formKey} onSaved={onSaved} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddTransporterForm({ onSaved }: { onSaved: () => void }) {
  const { state, onSubmit, pending, formRef } = useFormAction(createTransporterWithCrewAction, {
    resetOnSuccess: true,
  });
  const e = state?.fieldErrors ?? {};

  useEffect(() => {
    if (state?.ok) onSaved();
  }, [state, onSaved]);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-5">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <h3 className="text-sm font-semibold">ผู้รับจ้าง</h3>
          <p className="text-xs text-muted-foreground">รหัสผู้รับจ้างจะถูกสร้างให้อัตโนมัติ</p>
        </div>
        <Field label="ชื่อบริษัท / บุคคล *" htmlFor="add-name" error={e.name}>
          <Input id="add-name" name="name" required />
        </Field>
        <Field label="เลขประจำตัวผู้เสียภาษี" htmlFor="add-tax" error={e.taxId}>
          <Input id="add-tax" name="taxId" />
        </Field>
        <Field label="โทรศัพท์" htmlFor="add-phone" error={e.phone}>
          <Input id="add-phone" name="phone" />
        </Field>
        <Field label="ผู้ติดต่อ" htmlFor="add-contact" error={e.contactName}>
          <Input id="add-contact" name="contactName" />
        </Field>
        <Field label="ที่อยู่" htmlFor="add-address" error={e.address} className="sm:col-span-2 lg:col-span-3">
          <Textarea id="add-address" name="address" rows={2} />
        </Field>
        <Field label="หมายเหตุ" htmlFor="add-note" error={e.note} className="sm:col-span-2 lg:col-span-3">
          <Textarea id="add-note" name="note" rows={2} />
        </Field>
      </section>

      <section className="grid gap-4 rounded-xl bg-muted/70 p-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <h3 className="text-sm font-semibold">ทะเบียนรถ</h3>
          <p className="text-xs text-muted-foreground">รถที่กรอกจะสังกัดผู้รับจ้างนี้ ว่างไว้ได้ถ้ายังไม่มี</p>
        </div>
        <Field label="ทะเบียนรถ" htmlFor="add-plate" error={e.plate}>
          <Input id="add-plate" name="plate" />
        </Field>
        <Field label="ประเภทรถ" htmlFor="add-vehicle-type" error={e.vehicleType}>
          <NativeSelect id="add-vehicle-type" name="vehicleType" defaultValue="">
            <option value="">ไม่ระบุ</option>
            {VEHICLE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </section>

      <section className="grid gap-4 rounded-xl bg-muted/70 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <h3 className="text-sm font-semibold">คนขับ</h3>
          <p className="text-xs text-muted-foreground">คนขับที่กรอกจะสังกัดผู้รับจ้างนี้ ว่างไว้ได้ถ้ายังไม่มี</p>
        </div>
        <Field label="ชื่อคนขับ" htmlFor="add-driver-name" error={e.driverName}>
          <Input id="add-driver-name" name="driverName" />
        </Field>
        <Field label="โทรศัพท์" htmlFor="add-driver-phone" error={e.driverPhone}>
          <Input id="add-driver-phone" name="driverPhone" />
        </Field>
        <Field label="เลขประจำตัว" htmlFor="add-national-id" error={e.nationalId}>
          <Input id="add-national-id" name="nationalId" />
        </Field>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          เพิ่ม
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
