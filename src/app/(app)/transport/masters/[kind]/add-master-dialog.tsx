"use client";

import { useCallback, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { MasterKind } from "@/lib/masters";
import { MasterForm } from "./master-form";

export function AddMasterDialog({ kind, title }: { kind: MasterKind; title: string }) {
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
        <Plus /> เพิ่ม{title}
      </DialogTrigger>
      <DialogContent className="gap-5 p-6 sm:max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-lg">เพิ่ม{title}</DialogTitle>
          <DialogDescription>ข้อมูลที่ปิดใช้งานยังแสดงบนใบงานเดิม แต่ไม่ให้เลือกในใบงานใหม่</DialogDescription>
        </DialogHeader>
        <div
          onInput={() => {
            dirty.current = true;
          }}
        >
          <MasterForm
            key={formKey}
            kind={kind}
            row={null}
            transporters={[]}
            idPrefix={`add-${kind}`}
            onSaved={onSaved}
            compact
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
