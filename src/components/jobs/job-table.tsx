import Link from "next/link";
import { EmptyRow } from "@/components/app/ui";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatKg, formatMoney, formatPercent, formatSignedKg } from "@/lib/format";
import { Decimal } from "@/domain/decimal";
import { reconcile, type ReconciliationStatus } from "@/domain/reconciliation";
import type { JobListRow, JobListSummary } from "@/server/job-queries";
import { JobStatusBadge } from "./status-badges";

/** Null when the job has no lines on that side, so the cell shows a dash instead of zero. */
function sumOf<K extends string>(lines: Record<K, { toString(): string }>[], field: K) {
  if (lines.length === 0) return null;
  return lines.reduce((total, line) => total.plus(line[field].toString()), new Decimal(0));
}

function commodityNames(job: JobListRow) {
  const weighed = [...new Set(job.originWeighings.map((w) => w.commodity.name))];
  return weighed.length > 0 ? weighed.join(", ") : (job.commodity?.name ?? "–");
}

type ShownLine = {
  key: string;
  job: JobListRow;
  /** First commodity of the job, so trip money is shown once. */
  first: boolean;
  commodity: string;
  originNet: { toString(): string } | null;
  destinationNet: { toString(): string } | null;
  impurity: { toString(): string } | null;
  variance: { toString(): string } | null;
  percent: { toString(): string } | null;
  lineStatus: ReconciliationStatus | null;
};

function splitJob(job: JobListRow): ShownLine[] {
  const destination = new Map(job.destinationWeighings.map((line) => [line.commodityId, line]));
  const seen = new Set<string>();
  const rows: ShownLine[] = [];
  const add = (
    commodityId: string,
    commodity: string,
    originNet: { toString(): string } | null,
    dest: (typeof job.destinationWeighings)[number] | undefined,
  ) => {
    const judged =
      originNet && dest
        ? reconcile({
            originNet: originNet.toString(),
            destinationNet: dest.net.toString(),
            thresholds:
              job.thresholdKg !== null && job.thresholdPercent !== null
                ? { maxVarianceKg: job.thresholdKg, maxVariancePercent: job.thresholdPercent }
                : null,
          })
        : null;
    rows.push({
      key: `${job.id}:${commodityId}`,
      job,
      first: rows.length === 0,
      commodity,
      originNet,
      destinationNet: dest?.net ?? null,
      impurity: dest?.impurity ?? null,
      variance: judged?.variance ?? null,
      percent: judged?.percent ?? null,
      lineStatus: judged?.status ?? null,
    });
  };

  for (const origin of job.originWeighings) {
    seen.add(origin.commodityId);
    add(origin.commodityId, origin.commodity.name, origin.net, destination.get(origin.commodityId));
  }
  for (const dest of job.destinationWeighings) {
    if (seen.has(dest.commodityId)) continue;
    add(dest.commodityId, dest.commodity.name, null, dest);
  }
  if (rows.length === 0) {
    add(job.commodityId ?? job.id, job.commodity?.name ?? "–", null, undefined);
  }
  return rows;
}

function shownLines(jobs: JobListRow[], lines: boolean): ShownLine[] {
  if (!lines) {
    return jobs.map((job) => ({
      key: job.id,
      job,
      first: true,
      commodity: commodityNames(job),
      originNet: sumOf(job.originWeighings, "net"),
      destinationNet: sumOf(job.destinationWeighings, "net"),
      impurity: sumOf(job.destinationWeighings, "impurity"),
      variance: job.variance,
      percent: job.variancePercent,
      lineStatus: job.reconciliationStatus,
    }));
  }
  return jobs.flatMap(splitJob);
}

function varianceClass(status: ReconciliationStatus | null) {
  const within = status === "MATCH" || status === "NORMAL";
  return `text-right font-medium tabular-nums${within ? " text-emerald-700" : ""}`;
}

export function JobTable({
  jobs,
  empty,
  showFreight = false,
  summary,
  total,
  lines = false,
}: {
  jobs: JobListRow[];
  empty: string;
  showFreight?: boolean;
  summary?: JobListSummary;
  total?: number;
  /** One row per commodity instead of one summed row per job. */
  lines?: boolean;
}) {
  const varianceTone = summary?.withinThreshold ? ("MATCH" as const) : null;
  const shown = shownLines(jobs, lines);
  const band = "h-8 border-b border-border text-center text-xs font-semibold";
  const sub = "h-8 bg-card text-xs font-normal";
  return (
    <Table>
      <TableHeader className="bg-card">
        <TableRow className="hover:bg-transparent">
          <TableHead rowSpan={2} className="bg-muted/80">เลขที่ใบงาน</TableHead>
          <TableHead rowSpan={2} className="bg-muted/80">วันที่จ้าง</TableHead>
          <TableHead rowSpan={2} className="h-auto bg-muted/80 py-1.5">
            <span className="block leading-5">ผู้รับจ้าง</span>
            <span className="block text-xs font-normal leading-5">ทะเบียน</span>
          </TableHead>
          <TableHead rowSpan={2} className="bg-muted/80">สินค้า</TableHead>
          <TableHead rowSpan={2} className="bg-muted/80">ต้นทาง → โรงงาน</TableHead>
          {showFreight ? (
            <TableHead colSpan={2} className={`${band} border-l bg-primary/10 text-primary`}>สถานะ</TableHead>
          ) : (
            <TableHead rowSpan={2} className="border-l bg-primary/10 text-primary">สถานะ</TableHead>
          )}
          {showFreight && <TableHead colSpan={2} className={`${band} border-l bg-amber-100 text-amber-950`}>การเงิน</TableHead>}
          <TableHead colSpan={5} className={`${band} border-l bg-sky-100 text-sky-950`}>น้ำหนัก</TableHead>
        </TableRow>
        <TableRow className="hover:bg-transparent">
          {showFreight && <TableHead className={`${sub} border-l bg-primary/5`} title="สถานะใบงาน">ใบงาน</TableHead>}
          {showFreight && <TableHead className={`${sub} bg-primary/5`} title="สถานะการเก็บเงิน">เก็บเงิน</TableHead>}
          {showFreight && (
            <TableHead className={`${sub} border-l bg-amber-50 text-right`} title="ค่าจ้างต่อเที่ยว">ค่าจ้าง</TableHead>
          )}
          {showFreight && <TableHead className={`${sub} bg-amber-50 text-right`}>เก็บปลายทาง</TableHead>}
          <TableHead className={`${sub} border-l bg-sky-50 text-right`}>สุทธิต้นทาง</TableHead>
          <TableHead className={`${sub} bg-sky-50 text-right`}>สุทธิปลายทาง</TableHead>
          <TableHead className={`${sub} bg-sky-50 text-right`}>หักปลายทาง</TableHead>
          <TableHead className={`${sub} bg-sky-50 text-right`}>ส่วนต่าง</TableHead>
          <TableHead className={`${sub} bg-sky-50 text-right`}>ส่วนต่าง (%)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {shown.length === 0 && <EmptyRow colSpan={showFreight ? 14 : 11}>{empty}</EmptyRow>}
        {shown.map((line, index) => (
          <TableRow key={line.key} className={lines && line.first && index > 0 ? "border-t-2 border-border" : undefined}>
            <TableCell>
              <Link href={`/transport/jobs/${line.job.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                {line.job.jobNumber}
              </Link>
            </TableCell>
            <TableCell>{formatDate(line.job.hireDate)}</TableCell>
            <TableCell>
              <div className="leading-5">{line.job.transporter?.name ?? "–"}</div>
              <div className="text-xs leading-5 text-muted-foreground">{line.job.vehicle?.plate ?? "–"}</div>
            </TableCell>
            <TableCell className="max-w-48">{line.commodity}</TableCell>
            <TableCell>
              {line.job.origin?.name ?? "–"} → {line.job.destinationFactory?.name ?? "–"}
            </TableCell>
            <TableCell className="border-l">
              <JobStatusBadge status={line.job.status} />
            </TableCell>
            {showFreight && (
              <TableCell className={line.first && line.job.collectedAt ? "font-medium text-emerald-700" : undefined}>
                {line.first ? (line.job.collectAmount ? (line.job.collectedAt ? "ได้รับแล้ว" : "ยังไม่ได้รับ") : "–") : ""}
              </TableCell>
            )}
            {showFreight && (
              <TableCell className="border-l text-right tabular-nums">
                {line.first && line.job.freightAmount ? formatMoney(line.job.freightAmount) : line.first ? "–" : ""}
              </TableCell>
            )}
            {showFreight && (
              <TableCell className="text-right tabular-nums">
                {line.first && line.job.collectAmount ? formatMoney(line.job.collectAmount) : line.first ? "–" : ""}
              </TableCell>
            )}
            <TableCell className="border-l text-right tabular-nums">{formatKg(line.originNet)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatKg(line.destinationNet)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatKg(line.impurity)}</TableCell>
            <TableCell className={varianceClass(line.lineStatus)}>{formatSignedKg(line.variance)}</TableCell>
            <TableCell className={varianceClass(line.lineStatus)}>{formatPercent(line.percent)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      {summary && (total ?? jobs.length) > 0 && (
        <TableFooter>
          <TableRow className="bg-muted/80 hover:bg-muted/80">
            <TableCell colSpan={5} className="font-semibold">
              รวม {(total ?? jobs.length).toLocaleString("th-TH")} ใบงาน
            </TableCell>
            <TableCell className="border-l" />
            {showFreight && (
              <TableCell className="text-right font-semibold tabular-nums">
                {summary.collectedAmount ? formatMoney(summary.collectedAmount) : "–"}
              </TableCell>
            )}
            {showFreight && (
              <TableCell className="border-l text-right font-semibold tabular-nums">
                {summary.freightAmount ? formatMoney(summary.freightAmount) : "–"}
              </TableCell>
            )}
            {showFreight && (
              <TableCell className="text-right font-semibold tabular-nums">
                {summary.collectAmount ? formatMoney(summary.collectAmount) : "–"}
              </TableCell>
            )}
            <TableCell className="border-l text-right font-semibold tabular-nums">{formatKg(summary.originNet)}</TableCell>
            <TableCell className="text-right font-semibold tabular-nums">{formatKg(summary.destinationNet)}</TableCell>
            <TableCell className="text-right font-semibold tabular-nums">{formatKg(summary.destinationImpurity)}</TableCell>
            <TableCell className={varianceClass(varianceTone)}>{formatSignedKg(summary.variance)}</TableCell>
            <TableCell className={varianceClass(varianceTone)}>{formatPercent(summary.variancePercent)}</TableCell>
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
}
