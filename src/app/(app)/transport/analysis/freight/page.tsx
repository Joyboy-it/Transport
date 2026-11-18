import { redirect } from "next/navigation";
import { AnalysisReport } from "@/components/analysis/analysis-report";
import { analysisSearch } from "@/components/analysis/search";
import { can } from "@/domain/permissions";
import { requireUser } from "@/server/auth";
import { loadAnalysis, readAnalysisFilters } from "@/server/analysis";
import { jobOptions } from "@/server/job-queries";

export default async function FreightAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const filters = readAnalysisFilters(await searchParams, "transporter");
  if (!can(user.role, "job.viewFreight")) redirect(`/transport/analysis?${analysisSearch(filters, null)}`);
  const [report, options] = await Promise.all([
    loadAnalysis(filters),
    jobOptions({
      transporterId: filters.transporterId,
      originId: filters.originId,
      destinationFactoryId: filters.destinationFactoryId,
      commodityId: filters.commodityId,
    }),
  ]);
  return (
    <AnalysisReport
      kind="freight"
      title="ค่าจ้าง"
      action="/transport/analysis/freight"
      filters={filters}
      options={options}
      total={report.total}
      rows={report.rows}
    />
  );
}
