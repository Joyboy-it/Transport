import Link from "next/link";
import { ANALYSIS_DIMENSIONS, ANALYSIS_DIMENSION_LABEL, type AnalysisDimension } from "@/domain/analysis";
import { Field, NativeSelect } from "@/components/app/ui";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { analysisSearch, type AnalysisQuery } from "./search";

type Option = { id: string; name: string };

export function AnalysisToolbar({
  action,
  filters,
  transporters,
  origins,
  factories,
  commodities,
  showDimensions = true,
}: {
  action: string;
  filters: AnalysisQuery;
  transporters: Option[];
  origins: Option[];
  factories: Option[];
  commodities: Option[];
  showDimensions?: boolean;
}) {
  return (
    <div className="mb-4 grid gap-3">
      <form action={action} className="flex flex-wrap items-end gap-3">
        {showDimensions && <input type="hidden" name="by" value={filters.by} />}
        <Field label="ตั้งแต่วันที่" htmlFor="analysis-from">
          <input id="analysis-from" type="date" name="from" defaultValue={filters.from} className={dateClass} />
        </Field>
        <Field label="ถึงวันที่" htmlFor="analysis-to">
          <input id="analysis-to" type="date" name="to" defaultValue={filters.to} className={dateClass} />
        </Field>
        <Field label="ผู้รับจ้าง" htmlFor="analysis-transporter" className="min-w-44">
          <NativeSelect id="analysis-transporter" name="transporterId" defaultValue={filters.transporterId ?? ""}>
            <option value="">ทั้งหมด</option>
            {transporters.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="ต้นทาง" htmlFor="analysis-origin" className="min-w-40">
          <NativeSelect id="analysis-origin" name="originId" defaultValue={filters.originId ?? ""}>
            <option value="">ทั้งหมด</option>
            {origins.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="โรงงานปลายทาง" htmlFor="analysis-factory" className="min-w-44">
          <NativeSelect id="analysis-factory" name="destinationFactoryId" defaultValue={filters.destinationFactoryId ?? ""}>
            <option value="">ทั้งหมด</option>
            {factories.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="ประเภทสินค้า" htmlFor="analysis-commodity" className="min-w-40">
          <NativeSelect id="analysis-commodity" name="commodityId" defaultValue={filters.commodityId ?? ""}>
            <option value="">ทั้งหมด</option>
            {commodities.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </NativeSelect>
        </Field>
        <button type="submit" className={buttonVariants()}>แสดงผล</button>
      </form>
      {showDimensions && (
        <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
          {ANALYSIS_DIMENSIONS.map((dimension) => (
            <DimensionLink key={dimension} action={action} filters={filters} dimension={dimension} />
          ))}
        </div>
      )}
    </div>
  );
}

function DimensionLink({
  action,
  filters,
  dimension,
}: {
  action: string;
  filters: AnalysisQuery;
  dimension: AnalysisDimension;
}) {
  const current = filters.by === dimension;
  return (
    <Link
      href={`${action}?${analysisSearch(filters, dimension)}`}
      className={cn(buttonVariants({ variant: current ? "default" : "ghost", size: "sm" }))}
    >
      {ANALYSIS_DIMENSION_LABEL[dimension]}
    </Link>
  );
}

const dateClass =
  "h-11 rounded-md border border-input bg-card px-3.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30";
