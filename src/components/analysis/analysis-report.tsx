import { ANALYSIS_DIMENSION_LABEL, type AnalysisBucket } from "@/domain/analysis";
import { PageHeader } from "@/components/app/ui";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, fromDateInput } from "@/lib/format";
import type { JobOptions } from "@/server/job-queries";
import { AnalysisToolbar } from "./analysis-toolbar";
import {
  BreakdownTable,
  collectionTileItems,
  freightTileItems,
  varianceTileItems,
  type AnalysisKind,
} from "./breakdown-table";
import type { AnalysisQuery } from "./search";
import { SummaryTiles } from "./summary-tiles";

const TILES = {
  variance: varianceTileItems,
  freight: freightTileItems,
  collection: collectionTileItems,
};

export function AnalysisReport({
  kind,
  title,
  action,
  filters,
  options,
  total,
  rows,
}: {
  kind: AnalysisKind;
  title: string;
  action: string;
  filters: AnalysisQuery;
  options: JobOptions;
  total: AnalysisBucket;
  rows: AnalysisBucket[];
}) {
  const range = `${formatDate(fromDateInput(filters.from))} – ${formatDate(fromDateInput(filters.to))}`;
  return (
    <>
      <PageHeader title={title} description={`ใบงานที่ออกแล้ว · ${range} · ไม่รวมร่างและใบที่ยกเลิก`} />
      <AnalysisToolbar
        action={action}
        filters={filters}
        transporters={options.transporters}
        origins={options.origins}
        factories={options.factories}
        commodities={options.commodities}
      />
      <Card>
        <CardContent className="grid gap-4">
          <SummaryTiles items={TILES[kind](total)} />
          <BreakdownTable
            kind={kind}
            dimension={filters.by}
            dimensionLabel={ANALYSIS_DIMENSION_LABEL[filters.by]}
            filters={filters}
            rows={rows}
            total={total}
          />
        </CardContent>
      </Card>
    </>
  );
}
