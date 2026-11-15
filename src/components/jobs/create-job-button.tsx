"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2 } from "lucide-react";
import { JobHeaderForm } from "@/components/jobs/job-header-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { JobHeaderInput } from "@/lib/job-schema";
import type { JobOptions } from "@/server/job-queries";

export function CreateJobButton({
  options,
  defaults,
  initialOpen = false,
  title = "สร้างใบงาน",
}: {
  options: JobOptions;
  defaults: JobHeaderInput;
  initialOpen?: boolean;
  title?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [formKey, setFormKey] = useState(0);
  const dirty = useRef(false);
  const onDirtyChange = useCallback((value: boolean) => {
    dirty.current = value;
  }, []);

  function onOpenChange(next: boolean, eventDetails: { cancel: () => void }) {
    if (!next && dirty.current && !window.confirm("ปิดหน้าต่างนี้? ข้อมูลที่กรอกจะไม่ถูกบันทึก")) {
      eventDetails.cancel();
      return;
    }
    if (next) setFormKey((key) => key + 1);
    dirty.current = false;
    setOpen(next);
    if (!next) {
      const url = new URL(window.location.href);
      if (url.searchParams.has("new") || url.searchParams.has("copy")) {
        url.searchParams.delete("new");
        url.searchParams.delete("copy");
        const query = url.searchParams.toString();
        router.replace(query ? `${url.pathname}?${query}` : url.pathname);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button />}>
        <FilePlus2 /> สร้างใบงาน
      </DialogTrigger>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-4 overflow-hidden sm:max-w-4xl">
        <DialogHeader className="pr-8">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            บันทึกร่างได้แม้ข้อมูลยังไม่ครบ การออกใบงานต้องกรอกทุกช่องยกเว้นหมายเหตุ เลขที่ใบงานออกให้อัตโนมัติ
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto pr-1">
          <JobHeaderForm
            key={formKey}
            options={options}
            defaults={defaults}
            mode={{ kind: "create" }}
            idPrefix="new-job-"
            onDirtyChange={onDirtyChange}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
