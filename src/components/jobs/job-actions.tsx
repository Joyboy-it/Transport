"use client";

import { Wallet } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { cancelJobAction, deleteDraftAction, recordCollectionAction, updateNoteAction } from "@/app/(app)/jobs/actions";
import { confirmWarningAction } from "@/app/(app)/jobs/[id]/weighing-actions";
import { Field, FormMessage } from "@/components/app/ui";
import { jobType } from "@/components/jobs/job-type";
import { useFormAction } from "@/components/app/use-form-action";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CancelJobButton({
  jobId,
  updatedAt,
  confirmed,
}: {
  jobId: string;
  updatedAt: string;
  confirmed: boolean;
}) {
  // A cancelled job no longer renders this button, so success needs no close handling.
  const { state, onSubmit, pending } = useFormAction(cancelJobAction.bind(null, jobId, updatedAt));

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="destructive" />}>ยกเลิกใบงาน</DialogTrigger>
      <DialogContent className={jobType}>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>ยกเลิกใบงาน</DialogTitle>
            <DialogDescription>
              {confirmed
                ? "ใบงานนี้ยืนยันน้ำหนักแล้ว การยกเลิกจะเก็บน้ำหนักและไฟล์ไว้ แต่แก้ไขต่อไม่ได้"
                : "ใบงานที่ยกเลิกแล้วแก้ไขต่อไม่ได้ ข้อมูลเดิมยังเก็บไว้"}
            </DialogDescription>
          </DialogHeader>
          <Field label="เหตุผล *" htmlFor="cancel-reason" error={state?.fieldErrors?.reason}>
            <Textarea id="cancel-reason" name="reason" rows={3} required minLength={3} />
          </Field>
          {state && !state.ok && <FormMessage state={state} />}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={pending}>
              ยืนยันการยกเลิก
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteDraftButton({ jobId }: { jobId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("ลบร่างใบงานนี้ถาวร?")) return;
        startTransition(async () => {
          const result = await deleteDraftAction(jobId);
          if (result && !result.ok) toast.error(result.message);
        });
      }}
    >
      ลบร่าง
    </Button>
  );
}

export function ConfirmWarningButton({ jobId, updatedAt }: { jobId: string; updatedAt: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      disabled={pending}
      onClick={() => {
        if (!window.confirm("ยืนยันว่าตรวจสอบส่วนต่างน้ำหนักแล้วและยอมรับได้?")) return;
        startTransition(async () => {
          const result = await confirmWarningAction(jobId, updatedAt);
          if (result?.ok) toast.success(result.message);
          else toast.error(result?.message ?? "ยืนยันไม่สำเร็จ");
        });
      }}
    >
      ยืนยันส่วนต่าง
    </Button>
  );
}

export function CollectionForm({
  jobId,
  updatedAt,
  amount,
  received,
  receivedLabel,
}: {
  jobId: string;
  updatedAt: string;
  amount: string;
  received: boolean;
  receivedLabel: string;
}) {
  const { state, onSubmit, pending } = useFormAction(recordCollectionAction.bind(null, jobId, updatedAt));
  const status = received ? "ได้รับแล้ว" : amount.trim() === "" ? "ไม่เก็บเงิน" : "ยังไม่ได้รับ";
  const statusTone = received
    ? "bg-emerald-100 text-emerald-800"
    : amount.trim() === ""
      ? "bg-muted text-muted-foreground"
      : "bg-amber-100 text-amber-900";
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <input type="hidden" name="wasReceived" value={received ? "1" : ""} />
      <div className="grid gap-1.5">
        <label htmlFor="collect-amount" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wallet className="size-4 text-primary" aria-hidden />
          เงินเก็บจากปลายทาง
        </label>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Input
              id="collect-amount"
              name="collectAmount"
              inputMode="decimal"
              defaultValue={amount}
              placeholder="ไม่เก็บเงิน"
              className="pr-14 tabular-nums"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
              บาท
            </span>
          </div>
          <span className={`inline-flex h-8 shrink-0 items-center rounded-full px-3 text-xs font-medium ${statusTone}`}>
            {status}
          </span>
        </div>
        {state?.fieldErrors?.collectAmount && (
          <p className="text-xs text-destructive">{state.fieldErrors.collectAmount}</p>
        )}
        {receivedLabel && <p className="text-xs text-emerald-700">{receivedLabel}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" name="intent" value="save" variant="outline" size="sm" disabled={pending}>
          บันทึกจำนวนเงิน
        </Button>
        {received ? (
          <Button type="submit" name="intent" value="unreceive" variant="ghost" size="sm" disabled={pending}>
            ยกเลิกการรับเงิน
          </Button>
        ) : (
          <Button type="submit" name="intent" value="receive" size="sm" disabled={pending}>
            รับเงินแล้ว
          </Button>
        )}
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function NoteForm({ jobId, updatedAt, note }: { jobId: string; updatedAt: string; note: string }) {
  const { state, onSubmit, pending } = useFormAction(updateNoteAction.bind(null, jobId, updatedAt));
  return (
    <form onSubmit={onSubmit} className="grid gap-2">
      <Textarea name="note" defaultValue={note} rows={3} aria-label="หมายเหตุ" />
      <div className="flex items-center gap-3">
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          บันทึกหมายเหตุ
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
