"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { MasterKind, MasterRow } from "@/lib/masters";
import { MasterForm } from "./master-form";

export function EditMasterDialog({
  kind,
  title,
  row,
  initialOpen = false,
}: {
  kind: MasterKind;
  title: string;
  row: MasterRow;
  initialOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const dirty = useRef(false);
  const onSaved = useCallback(() => {
    dirty.current = false;
    setOpen(false);
    router.replace(`/transport/masters/${kind}`);
  }, [kind, router]);

  function onOpenChange(next: boolean, eventDetails: { cancel: () => void }) {
    if (!next && dirty.current && !window.confirm("ปิดหน้าต่างนี้? ข้อมูลที่กรอกจะไม่ถูกบันทึก")) {
      eventDetails.cancel();
      return;
    }
    if (!next) {
      dirty.current = false;
      if (new URL(window.location.href).searchParams.has("edit")) {
        router.replace(`/transport/masters/${kind}`);
      }
    }
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>แก้ไข</DialogTrigger>
      <DialogContent className="gap-5 p-6 sm:max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-lg">แก้ไข{title}</DialogTitle>
          <DialogDescription>ข้อมูลที่ปิดใช้งานยังแสดงบนใบงานเดิม แต่ไม่ให้เลือกในใบงานใหม่</DialogDescription>
        </DialogHeader>
        <div
          onInput={() => {
            dirty.current = true;
          }}
        >
          <MasterForm
            kind={kind}
            row={row}
            transporters={[]}
            idPrefix={`edit-${row.id}`}
            onSaved={onSaved}
            onCancel={() => onOpenChange(false, { cancel: () => {} })}
            compact
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
