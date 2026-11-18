import Link from "next/link";
import { notFound } from "next/navigation";
import { Copy, Factory, FileText, Percent, Scale, TriangleAlert, Truck, Wallet } from "lucide-react";
import { Pill, type Tone } from "@/components/app/ui";
import { CancelJobButton, CollectionForm, ConfirmWarningButton, DeleteDraftButton, NoteForm } from "@/components/jobs/job-actions";
import { HeaderSection } from "@/components/jobs/header-section";
import { jobType } from "@/components/jobs/job-type";
import { SectionHeading } from "@/components/jobs/section-heading";
import { JobStatusBadge, ReconciliationBadge } from "@/components/jobs/status-badges";
import { WeighingCard, type RevisionView, type WeighingLineView } from "@/components/jobs/weighing-card";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Decimal } from "@/domain/decimal";
import {
  canCancel,
  canConfirmWarning,
  canDelete,
  canEditHeader,
  canEditNote,
  canRecordWeighing,
  weighingEditNeedsReason,
  type WeighingSide,
} from "@/domain/job-status";
import { can } from "@/domain/permissions";
import { RECONCILIATION_LABEL, reconcileLines } from "@/domain/reconciliation";
import {
  formatDate,
  formatDateTime,
  formatKg,
  formatMoney,
  formatPercent,
  formatSignedKg,
  toDateInput,
  toDateTimeInput,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WeighingFormInput } from "@/lib/weighing-schema";
import { requireUser } from "@/server/auth";
import {
  activeCommodities,
  currentThreshold,
  getJobDetail,
  jobOptions,
  userNames,
  type JobDetail,
} from "@/server/job-queries";

type Weighing = JobDetail["originWeighings"][number];

export default async function JobPage({ params }: PageProps<"/transport/jobs/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const job = await getJobDetail(id);
  if (!job) notFound();

  const [names, commodities, threshold] = await Promise.all([
    userNames([
      job.createdById,
      job.updatedById,
      job.confirmedById,
      job.cancelledById,
      job.collectedById,
      ...[...job.originWeighings, ...job.destinationWeighings].flatMap((w) => [w.createdById, w.updatedById]),
      ...job.weighingRevisions.map((r) => r.revisedById),
      ...job.attachments.map((a) => a.uploadedById),
    ]),
    activeCommodities(),
    currentThreshold(),
  ]);
  const name = (userId: string | null | undefined) => (userId ? (names[userId] ?? "–") : "–");

  const seeFreight = can(user.role, "job.viewFreight");
  const editHeader = can(user.role, "job.editHeader") && canEditHeader(job.status);
  const isDraft = job.status === "DRAFT";
  const updatedAt = job.updatedAt.toISOString();

  const headerRows: [string, string][] = [
    ["วันที่จ้าง", formatDate(job.hireDate)],
    ["ผู้รับจ้าง", job.transporter ? `${job.transporter.code} · ${job.transporter.name}` : ""],
    ["ทะเบียนรถ", job.vehicle ? `${job.vehicle.plate}${job.vehicle.vehicleType ? ` (${job.vehicle.vehicleType})` : ""}` : ""],
    ["คนขับ", job.driver ? `${job.driver.name}${job.driver.phone ? ` · ${job.driver.phone}` : ""}` : ""],
    ["ประเภทสินค้า", job.commodity?.name ?? ""],
    ["ต้นทาง", job.origin?.name ?? ""],
    ["โรงงานปลายทาง", job.destinationFactory?.name ?? ""],
    ["ผู้รับผิดชอบ", job.responsibleUser?.displayName ?? ""],
    ...(seeFreight
      ? ([
          ["ค่าจ้างต่อเที่ยว", job.freightAmount ? `${formatMoney(job.freightAmount)} บาท` : ""],
          ["เงินเก็บจากปลายทาง", job.collectAmount ? `${formatMoney(job.collectAmount)} บาท` : "ไม่เก็บเงิน"],
          [
            "สถานะเงิน",
            job.collectAmount ? (job.collectedAt ? `ได้รับแล้ว ${formatDateTime(job.collectedAt)}` : "ยังไม่ได้รับ") : "–",
          ],
        ] as [string, string][])
      : []),
  ];

  const headerEdit = editHeader
    ? {
        jobId: job.id,
        updatedAt,
        isDraft,
        options: await jobOptions(job),
        defaults: {
          hireDate: toDateInput(job.hireDate),
          transporterId: job.transporterId ?? "",
          vehicleId: job.vehicleId ?? "",
          driverId: job.driverId ?? "",
          commodityId: job.commodityId ?? "",
          originId: job.originId ?? "",
          destinationFactoryId: job.destinationFactoryId ?? "",
          responsibleUserId: job.responsibleUserId ?? "",
          freightAmount: job.freightAmount?.toFixed(2) ?? "",
          collectAmount: job.collectAmount?.toFixed(2) ?? "",
          note: job.note,
        },
      }
    : null;

  const canWeigh = can(user.role, "weighing.record");
  const hasOrigin = job.originWeighings.length > 0;
  const toDefaults = (w: Weighing | null, commodityId: string): WeighingFormInput => ({
    commodityId: w?.commodityId ?? commodityId,
    weighedAt: toDateTimeInput(w?.weighedAt ?? new Date()),
    ticketNumber: w?.ticketNumber ?? "",
    gross: w?.gross.toFixed(2) ?? "",
    tare: w?.tare.toFixed(2) ?? "",
    impurity: w?.impurity.toFixed(2) ?? "",
    reason: "",
  });
  const toLine = (w: Weighing): WeighingLineView => ({
    id: w.id,
    commodityId: w.commodityId,
    commodity: w.commodity.name,
    weighedAt: formatDateTime(w.weighedAt),
    ticketNumber: w.ticketNumber,
    gross: formatKg(w.gross),
    tare: formatKg(w.tare),
    impurity: formatKg(w.impurity),
    net: formatKg(w.net),
    recordedBy: name(w.createdById),
    updatedBy: name(w.updatedById),
    updatedAt: formatDateTime(w.updatedAt),
    expectedUpdatedAt: w.updatedAt.toISOString(),
    defaults: toDefaults(w, w.commodityId),
  });
  const total = (lines: Weighing[], field: "gross" | "tare" | "impurity" | "net") =>
    formatKg(lines.reduce((sum, w) => sum.plus(w[field].toString()), new Decimal(0)));

  const originChoices = [
    ...job.originWeighings.map((w) => ({ id: w.commodityId, label: w.commodity.name })),
    ...commodities
      .filter((c) => !job.originWeighings.some((w) => w.commodityId === c.id))
      .map((c) => ({ id: c.id, label: c.name })),
  ];
  const originCommodityFree =
    Boolean(job.commodityId) && !job.originWeighings.some((w) => w.commodityId === job.commodityId);

  const sideProps = (side: WeighingSide) => {
    const lines = side === "ORIGIN" ? job.originWeighings : job.destinationWeighings;
    return {
      jobId: job.id,
      side,
      lines: lines.map(toLine),
      totals: {
        gross: total(lines, "gross"),
        tare: total(lines, "tare"),
        impurity: total(lines, "impurity"),
        net: total(lines, "net"),
      },
      pending:
        side === "DESTINATION"
          ? job.originWeighings
              .filter((origin) => !job.destinationWeighings.some((line) => line.commodityId === origin.commodityId))
              .map((origin) => ({
                commodityId: origin.commodityId,
                commodity: origin.commodity.name,
                defaults: toDefaults(null, origin.commodityId),
              }))
          : [],
      commodities: side === "ORIGIN" ? originChoices : [],
      newDefaults: toDefaults(null, side === "ORIGIN" && originCommodityFree ? job.commodityId! : ""),
      canRecord: canWeigh && canRecordWeighing(side, job.status, hasOrigin),
      blockedReason:
        job.status === "DRAFT"
          ? "ออกใบงานก่อนจึงบันทึกน้ำหนักได้"
          : side === "DESTINATION" && !hasOrigin
            ? "รอบันทึกน้ำหนักต้นทางก่อน"
            : null,
      needsReason: weighingEditNeedsReason(job.status),
      files: job.attachments
        .filter((a) => a.category === side)
        .map((a) => ({
          id: a.id,
          originalName: a.originalName,
          mimeType: a.mimeType,
          sizeBytes: a.sizeBytes,
          uploadedBy: name(a.uploadedById),
          createdAt: formatDateTime(a.createdAt),
        })),
      revisions: job.weighingRevisions
        .filter((r) => r.side === side)
        .map(
          (r): RevisionView => ({
            id: r.id,
            commodity: r.commodity.name,
            removed: r.removed,
            revisedAt: formatDateTime(r.revisedAt),
            revisedBy: name(r.revisedById),
            reason: r.reason,
            ticketNumber: r.ticketNumber,
            weighedAt: formatDateTime(r.weighedAt),
            gross: formatKg(r.gross),
            tare: formatKg(r.tare),
            impurity: formatKg(r.impurity),
            net: formatKg(r.net),
          }),
        ),
    };
  };

  const commodityName = new Map(
    [...job.originWeighings, ...job.destinationWeighings].map((w) => [w.commodityId, w.commodity.name]),
  );
  const reconciled = reconcileLines({
    origin: job.originWeighings,
    destination: job.destinationWeighings,
    thresholds:
      job.thresholdKg && job.thresholdPercent
        ? { maxVarianceKg: job.thresholdKg, maxVariancePercent: job.thresholdPercent }
        : threshold,
  });

  const weighingCount = job.originWeighings.length + job.destinationWeighings.length;
  const showCancel = can(user.role, "job.cancel") && canCancel(job.status, user.role);
  const showDelete =
    can(user.role, "job.delete") && canDelete(job.status, { weighings: weighingCount, files: job.attachments.length });
  const showConfirm = can(user.role, "reconciliation.confirm") && canConfirmWarning(job.status, job.reconciliationStatus);

  return (
    <div className={jobType}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Truck className="size-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-3xl font-semibold tracking-tight">
              {job.jobNumber} <JobStatusBadge status={job.status} className="h-7 px-3 text-sm" />
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              สร้างโดย {name(job.createdById)} {formatDateTime(job.createdAt)} · แก้ไขล่าสุดโดย {name(job.updatedById)}{" "}
              {formatDateTime(job.updatedAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {can(user.role, "job.create") && (
            <Link href={`/transport/jobs?copy=${job.id}`} className={cn(buttonVariants({ variant: "outline" }))}>
              <Copy /> คัดลอกใบงาน
            </Link>
          )}
          {showDelete && <DeleteDraftButton jobId={job.id} />}
          {showCancel && (
            <CancelJobButton jobId={job.id} updatedAt={updatedAt} confirmed={job.status === "WEIGHT_CONFIRMED"} />
          )}
        </div>
      </div>

      {job.status === "CANCELLED" && (
        <div className="mb-4 rounded-lg border border-tone-danger-foreground/20 bg-tone-danger p-4 text-sm text-tone-danger-foreground">
          ยกเลิกโดย {name(job.cancelledById)} เมื่อ {formatDateTime(job.cancelledAt)} · เหตุผล: {job.cancelReason}
        </div>
      )}

      <div className="grid gap-4">
        <HeaderSection key={updatedAt} rows={headerRows} edit={headerEdit} />

        {job.status !== "DRAFT" && (
          <Card className={job.reconciliationStatus === "WARNING" ? "ring-2 ring-tone-danger-foreground/40" : undefined}>
            <CardHeader>
              <CardTitle>
                <SectionHeading
                  icon={job.reconciliationStatus === "WARNING" ? TriangleAlert : Scale}
                  tone={job.reconciliationStatus === "WARNING" ? "bg-tone-danger text-tone-danger-foreground" : undefined}
                  title={
                    <span className="flex flex-wrap items-center gap-2">
                      ส่วนต่างน้ำหนัก <ReconciliationBadge status={job.reconciliationStatus} className="h-7 px-3 text-sm" />
                    </span>
                  }
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <WeightTile
                  icon={Truck}
                  label="สุทธิต้นทาง"
                  value={`${formatKg(hasOrigin ? reconciled.originNet : null)} กก.`}
                  tone="bg-tile text-foreground"
                />
                <WeightTile
                  icon={Factory}
                  label="สุทธิปลายทาง"
                  value={`${formatKg(reconciled.destinationNet)} กก.`}
                  tone="bg-tile text-foreground"
                />
                <WeightTile
                  icon={Scale}
                  label="ส่วนต่าง"
                  value={`${formatSignedKg(job.variance)} กก.`}
                  tone={job.reconciliationStatus === "WARNING" ? "bg-tone-danger text-tone-danger-foreground" : "bg-tile text-foreground"}
                />
                <WeightTile
                  icon={Percent}
                  label="ส่วนต่าง (%)"
                  value={formatPercent(job.variancePercent)}
                  tone={job.reconciliationStatus === "WARNING" ? "bg-tone-danger text-tone-danger-foreground" : "bg-tile text-foreground"}
                />
              </div>
              {reconciled.lines.length > 1 && (
                <Table className="mt-4">
                  <TableHeader>
                    <TableRow className="bg-muted/60">
                      <TableHead>สินค้า</TableHead>
                      <TableHead className="text-right">สุทธิต้นทาง</TableHead>
                      <TableHead className="text-right">สุทธิปลายทาง</TableHead>
                      <TableHead className="text-right">ส่วนต่าง</TableHead>
                      <TableHead className="text-right">ส่วนต่าง (%)</TableHead>
                      <TableHead>ผล</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reconciled.lines.map((l) => (
                      <TableRow key={l.commodityId} className={l.status === "WARNING" ? "bg-tone-danger/60" : undefined}>
                        <TableCell className="font-medium">{commodityName.get(l.commodityId)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatKg(l.originNet)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatKg(l.destinationNet)}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{formatSignedKg(l.variance)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatPercent(l.percent)}</TableCell>
                        <TableCell>
                          {l.status ? (
                            <ReconciliationBadge status={l.status} className="h-7 px-3 text-sm" />
                          ) : (
                            <span className="text-xs text-muted-foreground">รอชั่งปลายทาง</span>
                          )}
                          {l.originNet === null && (
                            <span className="block text-xs text-muted-foreground">ไม่มีรายการต้นทาง</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-semibold">รวม</TableCell>
                      <TableCell className="text-right tabular-nums">{formatKg(reconciled.originNet)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatKg(reconciled.destinationNet)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatSignedKg(reconciled.variance)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatPercent(reconciled.percent)}</TableCell>
                      <TableCell>
                        <ReconciliationBadge status={job.reconciliationStatus} className="h-7 px-3 text-sm" />
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                {job.reconciliationStatus === null
                  ? "รอน้ำหนักทั้งสองฝั่งครบทุกสินค้า"
                  : job.reconciliationStatus === "REVIEW"
                    ? "คำนวณเปอร์เซ็นต์ไม่ได้ ยังไม่มีเกณฑ์ หรือมีสินค้าปลายทางที่ไม่มีในต้นทาง ต้องตรวจสอบน้ำหนักอีกครั้ง"
                    : `ตัดสินตอนบันทึกน้ำหนัก ด้วยเกณฑ์ ${formatKg(job.thresholdKg)} กก. หรือ ${job.thresholdPercent?.toFixed(2) ?? "–"}% ต่อสินค้า หากสินค้าใดเกินเกณฑ์ ใบงานจะเกินเกณฑ์ · ค่าบวกคือปลายทางเบากว่าต้นทาง`}
                {job.reconciliationStatus === "CONFIRMED" &&
                  ` · ${RECONCILIATION_LABEL.CONFIRMED}โดย ${name(job.confirmedById)} ${formatDateTime(job.confirmedAt)}`}
              </p>
              {showConfirm && (
                <div className="mt-4 flex items-center gap-3 rounded-lg bg-tone-danger p-3 text-sm text-tone-danger-foreground">
                  ส่วนต่างเกินเกณฑ์ ต้องให้ผู้อนุมัติตรวจสอบก่อนยืนยันน้ำหนัก
                  <ConfirmWarningButton jobId={job.id} updatedAt={updatedAt} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 2xl:grid-cols-2">
          <WeighingCard key={`o-${updatedAt}`} {...sideProps("ORIGIN")} />
          <WeighingCard key={`d-${updatedAt}`} {...sideProps("DESTINATION")} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              <SectionHeading icon={seeFreight ? Wallet : FileText} title={seeFreight ? "จำนวนเงินและหมายเหตุ" : "หมายเหตุ"} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={seeFreight ? "grid gap-6 lg:grid-cols-2" : undefined}>
              {seeFreight && (
                <div>
                  {can(user.role, "job.recordCollection") && job.status !== "CANCELLED" ? (
                    <CollectionForm
                      key={updatedAt}
                      jobId={job.id}
                      updatedAt={updatedAt}
                      amount={job.collectAmount?.toFixed(2) ?? ""}
                      received={Boolean(job.collectedAt)}
                      receivedLabel={
                        job.collectedAt
                          ? `ได้รับแล้วโดย ${name(job.collectedById)} เมื่อ ${formatDateTime(job.collectedAt)}`
                          : ""
                      }
                    />
                  ) : (
                    <CollectionSummary
                      amount={job.collectAmount ? `${formatMoney(job.collectAmount)} บาท` : ""}
                      received={Boolean(job.collectedAt)}
                      detail={
                        job.collectedAt
                          ? `ได้รับแล้วโดย ${name(job.collectedById)} เมื่อ ${formatDateTime(job.collectedAt)}`
                          : ""
                      }
                    />
                  )}
                </div>
              )}
              <div>
                {seeFreight && <p className="mb-1.5 text-sm font-medium">หมายเหตุ</p>}
                {can(user.role, "job.editNote") && canEditNote(job.status) ? (
                  <NoteForm key={updatedAt} jobId={job.id} updatedAt={updatedAt} note={job.note} />
                ) : (
                  <p className="whitespace-pre-wrap text-sm">{job.note || "–"}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CollectionSummary({ amount, received, detail }: { amount: string; received: boolean; detail: string }) {
  const status = received ? "ได้รับแล้ว" : amount === "" ? "ไม่เก็บเงิน" : "ยังไม่ได้รับ";
  const tone: Tone = received ? "success" : amount === "" ? "neutral" : "pending";
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Wallet className="size-4 text-primary" aria-hidden />
        เงินเก็บจากปลายทาง
      </div>
      <div className="flex items-center gap-2">
        <div className="flex h-11 min-w-0 flex-1 items-center rounded-lg border bg-background px-3.5 tabular-nums">
          {amount || "ไม่เก็บเงิน"}
        </div>
        <Pill tone={tone} dot={false} className="h-11 px-3 text-sm">
          {status}
        </Pill>
      </div>
      {detail && <p className="text-xs text-success">{detail}</p>}
    </div>
  );
}

function WeightTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Truck;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${tone}`}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card/80">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="text-xs">{label}</div>
        <div className="truncate text-2xl font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
}
