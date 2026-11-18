import Link from "next/link";
import { PageHeader } from "@/components/app/ui";
import { AnalysisToolbar } from "@/components/analysis/analysis-toolbar";
import { analysisSearch } from "@/components/analysis/search";
import { SummaryTiles } from "@/components/analysis/summary-tiles";
import { collectionTileItems, freightTileItems, varianceTileItems } from "@/components/analysis/breakdown-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { can } from "@/domain/permissions";
import { formatDate, fromDateInput } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { loadAnalysis, readAnalysisFilters } from "@/server/analysis";
import { jobOptions } from "@/server/job-queries";

export default async function AnalysisOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
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
  const showMoney = can(user.role, "job.viewFreight");
  const query = analysisSearch(filters, null);
  const range = `${formatDate(fromDateInput(filters.from))} – ${formatDate(fromDateInput(filters.to))}`;

  return (
    <>
      <PageHeader title="ภาพรวม" description={`ใบงานที่ออกแล้ว · ${range} · ไม่รวมร่างและใบที่ยกเลิก`} />
      <AnalysisToolbar
        action="/transport/analysis"
        filters={filters}
        transporters={options.transporters}
        origins={options.origins}
        factories={options.factories}
        commodities={options.commodities}
        showDimensions={false}
      />
      <div className="grid gap-4">
        <ResultCard title="ส่วนต่างน้ำหนัก" href={`/transport/analysis/variance?${query}`}>
          <SummaryTiles items={varianceTileItems(report.total)} />
        </ResultCard>
        {showMoney && (
          <ResultCard title="ค่าจ้าง" href={`/transport/analysis/freight?${query}`}>
            <SummaryTiles items={freightTileItems(report.total)} />
          </ResultCard>
        )}
        {showMoney && (
          <ResultCard title="เงินเก็บปลายทาง" href={`/transport/analysis/collection?${query}`}>
            <SummaryTiles items={collectionTileItems(report.total)} />
          </ResultCard>
        )}
      </div>
    </>
  );
}

function ResultCard({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>{title}</span>
          <Link href={href} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            ดูรายละเอียด
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
