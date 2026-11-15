"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
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
import { ROLE_LABEL, ROLES, type Role } from "@/domain/permissions";
import { createUserAction, updateUserAction } from "./actions";

function RoleSelect({ defaultValue }: { defaultValue?: Role }) {
  return (
    <NativeSelect id="role" name="role" defaultValue={defaultValue ?? ""} required>
      <option value="" disabled>
        เลือกบทบาท
      </option>
      {ROLES.map((role) => (
        <option key={role} value={role}>
          {ROLE_LABEL[role]}
        </option>
      ))}
    </NativeSelect>
  );
}

export function AddUserDialog() {
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
        <Plus /> เพิ่มผู้ใช้
      </DialogTrigger>
      <DialogContent className="gap-5 p-6 sm:max-w-xl">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-lg">เพิ่มผู้ใช้</DialogTitle>
          <DialogDescription>สร้างบัญชีและกำหนดบทบาท สิทธิ์ของแต่ละบทบาทกำหนดไว้ในระบบ</DialogDescription>
        </DialogHeader>
        <div
          onInput={() => {
            dirty.current = true;
          }}
        >
          <CreateUserForm key={formKey} onSaved={onSaved} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CreateUserForm({ onSaved }: { onSaved?: () => void }) {
  const { state, onSubmit, pending, formRef } = useFormAction(createUserAction, {
    resetOnSuccess: true,
  });
  const e = state?.fieldErrors ?? {};

  useEffect(() => {
    if (state?.ok) onSaved?.();
  }, [state, onSaved]);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <Field label="ชื่อผู้ใช้" htmlFor="username" error={e.username}>
        <Input id="username" name="username" autoComplete="off" required />
      </Field>
      <Field label="ชื่อที่แสดง" htmlFor="displayName" error={e.displayName}>
        <Input id="displayName" name="displayName" required />
      </Field>
      <Field label="บทบาท" htmlFor="role" error={e.role}>
        <RoleSelect />
      </Field>
      <Field label="รหัสผ่านเริ่มต้น" htmlFor="password" error={e.password}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <div className="grid gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending} className="w-full">
          เพิ่มผู้ใช้
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function EditUserForm({
  user,
}: {
  user: { id: string; displayName: string; role: Role; active: boolean };
}) {
  const { state, onSubmit, pending } = useFormAction(updateUserAction.bind(null, user.id));
  const e = state?.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="grid max-w-md gap-4">
      <Field label="ชื่อที่แสดง" htmlFor="displayName" error={e.displayName}>
        <Input id="displayName" name="displayName" defaultValue={user.displayName} required />
      </Field>
      <Field label="บทบาท" htmlFor="role" error={e.role}>
        <RoleSelect defaultValue={user.role} />
      </Field>
      <Field
        label="ตั้งรหัสผ่านใหม่"
        htmlFor="password"
        error={e.password}
        hint="เว้นว่างถ้าไม่เปลี่ยน ผู้ใช้จะถูกออกจากระบบทุกเครื่อง"
      >
        <Input id="password" name="password" type="password" autoComplete="new-password" />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={user.active} className="size-4" />
        ใช้งานอยู่
      </label>
      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          บันทึก
        </Button>
      </div>
    </form>
  );
}
