"use client";

import { Pencil, Plus, Scale, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteWeighingAction } from "@/app/(app)/jobs/[id]/weighing-actions";
import { Field } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import type { WeighingSide } from "@/domain/job-status";
import type { WeighingFormInput } from "@/lib/weighing-schema";
import { jobType } from "./job-type";
import { SectionHeading } from "./section-heading";
import { FileList, type FileItem } from "./file-list";
import { WeighingForm } from "./weighing-form";

export type WeighingLineView = {
  id: string;
  commodityId: string;
  commodity: string;
  weighedAt: string;
  ticketNumber: string;
  gross: string;
  tare: string;
  impurity: string;
  net: string;
  recordedBy: string;
  updatedBy: string;
  updatedAt: string;
  expectedUpdatedAt: string;
  defaults: WeighingFormInput;
};

/** An origin commodity that still has no destination weighing. */
export type PendingLine = {
  commodityId: string;
  commodity: string;
  defaults: WeighingFormInput;
};

export type RevisionView = {
  id: string;
  commodity: string;
  removed: boolean;
  revisedAt: string;
  revisedBy: string;
  reason: string;
  ticketNumber: string;
  weighedAt: string;
  gross: string;
  tare: string;
  impurity: string;
  net: string;
};

export function WeighingCard({
  jobId,
  side,
  lines,
  pending = [],
  totals,
  commodities,
  newDefaults,
  canRecord,
  blockedReason,
  needsReason,
  files,
  revisions,
}: {
  jobId: string;
  side: WeighingSide;
  lines: WeighingLineView[];
  /** Destination rows copied from origin that still wait for a weight. */
  pending?: PendingLine[];
  totals: { gross: string; tare: string; impurity: string; net: string };
  /** Commodities this side may weigh; lines already on this side are excluded per form. */
  commodities: { id: string; label: string }[];
  newDefaults: WeighingFormInput;
  canRecord: boolean;
  blockedReason: string | null;
  needsReason: boolean;
  files: FileItem[];
  revisions: RevisionView[];
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const title = side === "ORIGIN" ? "น้ำหนักต้นทาง" : "น้ำหนักปลายทาง";
  const ticketLabel = side === "ORIGIN" ? "ใบชั่ง" : "ใบชั่งโรงงาน";
  const used = new Set(lines.map((l) => l.commodityId));
  const choicesFor = (own: string | null) => commodities.filter((c) => c.id === own || !used.has(c.id));
  const canAdd = side === "ORIGIN" && canRecord && choicesFor(null).length > 0;
  const adding = editing === "new";
  const editingLine = lines.find((l) => l.id === editing);
  const pendingEdit = pending.find((p) => `wait:${p.commodityId}` === editing);
  const shown = lines.length + pending.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <SectionHeading
            icon={Scale}
            title={
              <span className="flex flex-wrap items-center gap-2">
                {title}
                {shown > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {side === "DESTINATION" ? `${lines.length} จาก ${shown}` : `${lines.length} รายการ`}
                  </span>
                )}
              </span>
            }
          />
        </CardTitle>
        {canAdd && !editingLine && !pendingEdit && (
          <CardAction>
            <Button variant={lines.length ? "outline" : "default"} size="sm" onClick={() => setEditing("new")}>
              <Plus /> {lines.length ? "เพิ่มรายการ" : "บันทึกน้ำหนัก"}
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="grid gap-4">
        {shown > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead>สินค้า</TableHead>
                <TableHead>{ticketLabel}</TableHead>
                <TableHead className="text-right">หนัก</TableHead>
                <TableHead className="text-right">เบา</TableHead>
                <TableHead className="text-right">หัก</TableHead>
                <TableHead className="text-right">สุทธิ (กก.)</TableHead>
                {canRecord && <TableHead className="w-0" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l) => (
                <TableRow key={l.id} data-state={editing === l.id ? "selected" : undefined}>
                  <TableCell className="font-medium">{l.commodity}</TableCell>
                  <TableCell>
                    {l.ticketNumber || "–"}
                    <span className="block text-xs text-muted-foreground">{l.weighedAt}</span>
                    <span className="block text-xs text-muted-foreground">
                      {l.recordedBy}
                      {l.updatedBy !== l.recordedBy && ` · แก้ไข ${l.updatedBy}`}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{l.gross}</TableCell>
                  <TableCell className="text-right tabular-nums">{l.tare}</TableCell>
                  <TableCell className="text-right tabular-nums">{l.impurity}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{l.net}</TableCell>
                  {canRecord && (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`แก้ไข ${l.commodity}`}
                          title="แก้ไข"
                          disabled={editing !== null}
                          onClick={() => setEditing(l.id)}
                        >
                          <Pencil />
                        </Button>
                        <DeleteLineButton
                          jobId={jobId}
                          side={side}
                          line={l}
                          needsReason={needsReason}
                          disabled={editing !== null}
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {pending.map((p) => {
                const key = `wait:${p.commodityId}`;
                return (
                  <TableRow key={key} data-state={editing === key ? "selected" : undefined}>
                    <TableCell className="font-medium">{p.commodity}</TableCell>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      รอใส่น้ำหนัก
                    </TableCell>
                    {canRecord && (
                      <TableCell>
                        <div className="flex justify-end">
                          <Button size="sm" variant="outline" disabled={editing !== null} onClick={() => setEditing(key)}>
                            ใส่น้ำหนัก
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
            {lines.length > 1 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="font-semibold">
                    รวม
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{totals.gross}</TableCell>
                  <TableCell className="text-right tabular-nums">{totals.tare}</TableCell>
                  <TableCell className="text-right tabular-nums">{totals.impurity}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{totals.net}</TableCell>
                  {canRecord && <TableCell />}
                </TableRow>
              </TableFooter>
            )}
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">{blockedReason ?? "ยังไม่ได้บันทึกน้ำหนัก"}</p>
        )}

        {adding && (
          <Dialog open onOpenChange={(open) => !open && setEditing(null)}>
            <DialogContent className={cn("sm:max-w-xl", jobType)}>
              <DialogHeader className="pr-8">
                <DialogTitle>เพิ่มรายการชั่งต้นทาง</DialogTitle>
                <DialogDescription>เลือกสินค้า แล้วกรอกน้ำหนักจากใบชั่ง</DialogDescription>
              </DialogHeader>
              <WeighingForm
                jobId={jobId}
                side={side}
                lineId=""
                commodities={choicesFor(null)}
                defaults={newDefaults}
                expectedUpdatedAt=""
                needsReason={false}
                onDone={() => setEditing(null)}
              />
            </DialogContent>
          </Dialog>
        )}

        {pendingEdit && (
          <Dialog open onOpenChange={(open) => !open && setEditing(null)}>
            <DialogContent className={cn("sm:max-w-xl", jobType)}>
              <DialogHeader className="pr-8">
                <DialogTitle>ใส่น้ำหนักปลายทาง</DialogTitle>
                <DialogDescription>สินค้า {pendingEdit.commodity} ตามรายการที่ชั่งไว้ต้นทาง</DialogDescription>
              </DialogHeader>
              <WeighingForm
                key={editing}
                jobId={jobId}
                side={side}
                lineId=""
                commodities={[{ id: pendingEdit.commodityId, label: pendingEdit.commodity }]}
                defaults={pendingEdit.defaults}
                expectedUpdatedAt=""
                needsReason={false}
                lockCommodity
                onDone={() => setEditing(null)}
              />
            </DialogContent>
          </Dialog>
        )}

        {editingLine && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-3 text-sm font-medium">แก้ไขรายการ {editingLine.commodity}</p>
            <WeighingForm
              key={editing}
              jobId={jobId}
              side={side}
              lineId={editingLine.id}
              commodities={
                side === "DESTINATION"
                  ? [{ id: editingLine.commodityId, label: editingLine.commodity }]
                  : choicesFor(editingLine.commodityId)
              }
              defaults={editingLine.defaults}
              expectedUpdatedAt={editingLine.expectedUpdatedAt}
              needsReason={needsReason}
              lockCommodity={side === "DESTINATION"}
              onDone={() => setEditing(null)}
            />
          </div>
        )}

        <FileList jobId={jobId} side={side} files={files} canUpload={canRecord} />

        {revisions.length > 0 && (
          <div className="grid gap-2">
            <span className="text-sm font-medium">ประวัติการแก้ไขหลังยืนยัน ({revisions.length})</span>
            <ul className="grid gap-2 text-xs">
              {revisions.map((r) => (
                <li key={r.id} className="rounded-lg border border-dashed p-2">
                  <div className="font-medium">
                    {r.revisedAt} · {r.revisedBy} · {r.commodity}
                    {r.removed && <span className="text-destructive"> · ลบรายการ</span>}
                  </div>
                  <div className="text-muted-foreground">เหตุผล: {r.reason}</div>
                  <div className="tabular-nums">
                    ค่าเดิม: ใบชั่ง {r.ticketNumber || "–"} ({r.weighedAt}) · หนัก {r.gross} · เบา {r.tare} · หัก {r.impurity} ·
                    สุทธิ {r.net} กก.
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DeleteLineButton({
  jobId,
  side,
  line,
  needsReason,
  disabled,
}: {
  jobId: string;
  side: WeighingSide;
  line: WeighingLineView;
  needsReason: boolean;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fieldId = `del-${line.id}`;

  function submit() {
    if (needsReason && reason.trim().length < 3) {
      setError("ระบุเหตุผลอย่างน้อย 3 ตัวอักษร");
      return;
    }
    startTransition(async () => {
      const result = await deleteWeighingAction(jobId, side, line.id, line.expectedUpdatedAt, reason);
      if (result?.ok) {
        toast.success(result.message ?? "ลบแล้ว");
        setOpen(false);
      } else {
        setError(result?.message ?? "ลบไม่สำเร็จ");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setReason("");
          setError(null);
        }
      }}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`ลบ ${line.commodity}`}
        title="ลบ"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 />
      </Button>
      <DialogContent className={jobType}>
        <DialogHeader>
          <DialogTitle>ลบรายการชั่ง {line.commodity}</DialogTitle>
          <DialogDescription>
            {line.ticketNumber ? `ใบชั่ง ${line.ticketNumber} · ` : ""}สุทธิ {line.net} กก. ระบบจะคำนวณส่วนต่างของใบงานใหม่หลังลบ
          </DialogDescription>
        </DialogHeader>
        {needsReason && (
          <Field label="เหตุผลที่ลบหลังยืนยันน้ำหนัก *" htmlFor={fieldId} hint="ค่าเดิมจะถูกเก็บไว้ในประวัติการแก้ไข">
            <Textarea id={fieldId} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>ยกเลิก</DialogClose>
          <Button variant="destructive" disabled={pending} onClick={submit}>
            ลบรายการ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
