import Link from "next/link";
import { PageHeader } from "@/components/app/ui";
import { CreateJobButton } from "@/components/jobs/create-job-button";
import { JobFilterDialog } from "@/components/jobs/job-filter-dialog";
import { JobTable } from "@/components/jobs/job-table";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { can } from "@/domain/permissions";
import { toDateInput } from "@/lib/format";
import { EMPTY_JOB_HEADER, type JobHeaderInput } from "@/lib/job-schema";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { jobOptions, listJobs, PAGE_SIZE, readFilters, summarizeJobs } from "@/server/job-queries";

export default async function JobsPage({ searchParams }: PageProps<"/transport/jobs">) {
  const user = await requireUser();
  const params = await searchParams;
  const filters = readFilters(params);
  const lines = params.view === "lines";
  const page = Math.max(1, Number(params.page) || 1);
  const copyId = typeof params.copy === "string" ? params.copy : undefined;
  const [{ total, jobs }, options, source, summary] = await Promise.all([
    listJobs(filters, page),
    jobOptions(),
    copyId ? db.transportJob.findUnique({ where: { id: copyId } }) : null,
    summarizeJobs(filters),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const queryFor = (pageNumber?: number, nextLines = lines) => {
    const query = new URLSearchParams(
      Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])),
    );
    if (nextLines) query.set("view", "lines");
    if (pageNumber && pageNumber > 1) query.set("page", String(pageNumber));
    const text = query.toString();
    return text ? `/transport/jobs?${text}` : "/transport/jobs";
  };
  const pageHref = (p: number) => queryFor(p);

  const keep = (id: string | null, list: { id: string }[]) => (id && list.some((item) => item.id === id) ? id : "");
  const defaults: JobHeaderInput = source
    ? {
        hireDate: toDateInput(source.hireDate),
        transporterId: keep(source.transporterId, options.transporters),
        vehicleId: keep(source.vehicleId, options.vehicles),
        driverId: keep(source.driverId, options.drivers),
        commodityId: keep(source.commodityId, options.commodities),
        originId: keep(source.originId, options.origins),
        destinationFactoryId: keep(source.destinationFactoryId, options.factories),
        responsibleUserId: keep(source.responsibleUserId, options.users),
        freightAmount: source.freightAmount?.toFixed(2) ?? "",
        collectAmount: source.collectAmount?.toFixed(2) ?? "",
        note: "",
      }
    : { ...EMPTY_JOB_HEADER, responsibleUserId: user.id };
  const createOpen = params.new === "1" || Boolean(source);

  return (
    <>
      <PageHeader
        title="ใบงาน"
        description={
          lines
            ? `พบ ${total.toLocaleString("th-TH")} ใบงาน · แสดงแยกตามสินค้า`
            : `พบ ${total.toLocaleString("th-TH")} ใบงาน`
        }
        actions={
          can(user.role, "job.create") && (
            <CreateJobButton
              key={source ? `copy-${source.id}` : createOpen ? "new" : "closed"}
              options={options}
              defaults={defaults}
              initialOpen={createOpen}
              title={source ? `คัดลอกจาก ${source.jobNumber}` : "สร้างใบงาน"}
            />
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <JobFilterDialog
          filters={filters}
          transporters={options.transporters}
          origins={options.origins}
          factories={options.factories}
          commodities={options.commodities}
          view={lines ? "lines" : undefined}
        />
        <div className="flex rounded-lg border bg-card p-1">
          <Link href={queryFor(1, false)} className={cn(buttonVariants({ variant: lines ? "ghost" : "default", size: "sm" }))}>
            รวมรายการ
          </Link>
          <Link href={queryFor(1, true)} className={cn(buttonVariants({ variant: lines ? "default" : "ghost", size: "sm" }))}>
            แยกรายการ
          </Link>
        </div>
      </div>

      <Card>
        <CardContent>
          <JobTable
            jobs={jobs}
            empty="ไม่พบใบงานตามเงื่อนไข"
            showFreight={can(user.role, "job.viewFreight")}
            summary={summary}
            total={total}
            lines={lines}
          />
          {pages > 1 && (
            <div className="mt-4 flex items-center justify-end gap-3 text-sm">
              {page > 1 && <Link href={pageHref(page - 1)} className="text-primary hover:underline">ก่อนหน้า</Link>}
              <span className="text-muted-foreground">
                หน้า {page} / {pages}
              </span>
              {page < pages && <Link href={pageHref(page + 1)} className="text-primary hover:underline">ถัดไป</Link>}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
