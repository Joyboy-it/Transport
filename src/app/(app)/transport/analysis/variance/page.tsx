import { AnalysisReport } from "@/components/analysis/analysis-report";
import { requireUser } from "@/server/auth";
import { loadAnalysis, readAnalysisFilters } from "@/server/analysis";
import { jobOptions } from "@/server/job-queries";

export default async function VarianceAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const filters = readAnalysisFilters(await searchParams, "transporter");
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
      kind="variance"
      title="ส่วนต่างน้ำหนัก"
      action="/transport/analysis/variance"
      filters={filters}
      options={options}
      total={report.total}
      rows={report.rows}
    />
  );
}
