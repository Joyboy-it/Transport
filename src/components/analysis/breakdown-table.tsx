import Link from "next/link";
import { rollupMeasures, type AnalysisBucket, type AnalysisDimension } from "@/domain/analysis";
import { EmptyRow } from "@/components/app/ui";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatKg, formatMoney, formatPercent, formatSignedKg } from "@/lib/format";
import { jobsSearch, type AnalysisQuery } from "./search";

export type AnalysisKind = "variance" | "freight" | "collection";

const count = (value: number) => value.toLocaleString("th-TH");

function varianceRates(row: AnalysisBucket) {
  return rollupMeasures({
    variance: row.variance,
    originNet: row.weighedOriginNet,
    freight: null,
    freightTrips: 0,
    collect: null,
    collected: null,
  });
}

function freightRates(row: AnalysisBucket) {
  return rollupMeasures({
    variance: null,
    originNet: row.originNet,
    freight: row.freight,
    freightTrips: row.freightTrips,
    collect: null,
    collected: null,
  });
}

function collectionRates(row: AnalysisBucket) {
  return rollupMeasures({
    variance: null,
    originNet: null,
    freight: null,
    freightTrips: 0,
    collect: row.collect,
    collected: row.collected,
  });
}

function cells(kind: AnalysisKind, row: AnalysisBucket): string[] {
  if (kind === "variance") {
    const rates = varianceRates(row);
    return [
      count(row.weighedTrips),
      count(row.unweighedTrips),
      count(row.match),
      count(row.normal),
      count(row.warning),
      count(row.review),
      count(row.confirmed),
      formatKg(row.weighedOriginNet),
      formatKg(row.destinationNet),
      formatKg(row.impurity),
      formatSignedKg(row.variance),
      formatPercent(rates.variancePercent),
    ];
  }
  if (kind === "freight") {
    const rates = freightRates(row);
    return [count(row.trips), formatMoney(row.freight), formatMoney(rates.freightPerTrip), formatMoney(rates.freightPerTon)];
  }
  const rates = collectionRates(row);
  return [count(row.noCollectTrips), formatMoney(row.collect), formatMoney(row.collected), formatMoney(rates.outstanding)];
}

const HEADERS: Record<AnalysisKind, string[]> = {
  variance: [
    "เทียบแล้ว",
    "ยังเทียบไม่ได้",
    "ตรงกัน",
    "อยู่ในเกณฑ์",
    "เกินเกณฑ์",
    "รอตรวจสอบ",
    "ผ่านการตรวจสอบ",
    "สุทธิต้นทาง",
    "สุทธิปลายทาง",
    "หักสิ่งเจือปน",
    "ส่วนต่าง",
    "ส่วนต่าง (%)",
  ],
  freight: ["จำนวนเที่ยว", "ค่าจ้าง", "เฉลี่ยต่อเที่ยว", "ค่าจ้างต่อตัน"],
  collection: ["ไม่เก็บเงิน", "ต้องเก็บ", "ได้รับแล้ว", "ยังไม่ได้รับ"],
};

export function BreakdownTable({
  kind,
  dimension,
  dimensionLabel,
  filters,
  rows,
  total,
}: {
  kind: AnalysisKind;
  dimension: AnalysisDimension;
  dimensionLabel: string;
  filters: AnalysisQuery;
  rows: AnalysisBucket[];
  total: AnalysisBucket;
}) {
  const headers = HEADERS[kind];
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{dimensionLabel}</TableHead>
          {headers.map((header) => (
            <TableHead key={header} className="text-right">{header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && <EmptyRow colSpan={headers.length + 1}>ไม่มีใบงานที่ออกแล้วในช่วงนี้</EmptyRow>}
        {rows.map((row) => {
          const href = jobsSearch(filters, dimension, row.key);
          return (
            <TableRow key={row.key || row.label}>
              <TableCell>
                {href ? (
                  <Link href={href} className="font-medium text-primary underline-offset-4 hover:underline">{row.label}</Link>
                ) : (
                  row.label
                )}
              </TableCell>
              {cells(kind, row).map((value, index) => (
                <TableCell key={headers[index]} className="text-right tabular-nums">{value}</TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
      {rows.length > 0 && (
        <TableFooter>
          <TableRow>
            <TableCell className="font-semibold">รวม</TableCell>
            {cells(kind, total).map((value, index) => (
              <TableCell key={headers[index]} className="text-right font-semibold tabular-nums">{value}</TableCell>
            ))}
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
}

export function varianceTileItems(row: AnalysisBucket) {
  const rates = varianceRates(row);
  return [
    { label: "เที่ยวที่เทียบแล้ว", value: count(row.weighedTrips) },
    { label: "ยังเทียบน้ำหนักไม่ได้", value: count(row.unweighedTrips) },
    { label: "ตรงกัน", value: count(row.match) },
    { label: "อยู่ในเกณฑ์", value: count(row.normal) },
    { label: "เกินเกณฑ์", value: count(row.warning) },
    { label: "รอตรวจสอบ", value: count(row.review) },
    { label: "ผ่านการตรวจสอบ", value: count(row.confirmed) },
    { label: "สุทธิต้นทาง (กก.)", value: formatKg(row.weighedOriginNet) },
    { label: "สุทธิปลายทาง (กก.)", value: formatKg(row.destinationNet) },
    { label: "หักสิ่งเจือปน (กก.)", value: formatKg(row.impurity) },
    { label: "ส่วนต่าง (กก.)", value: formatSignedKg(row.variance) },
    { label: "ส่วนต่าง (%)", value: formatPercent(rates.variancePercent) },
  ];
}

export function freightTileItems(row: AnalysisBucket) {
  const rates = freightRates(row);
  return [
    { label: "จำนวนเที่ยว", value: count(row.trips) },
    { label: "ค่าจ้าง (บาท)", value: formatMoney(row.freight) },
    { label: "เฉลี่ยต่อเที่ยว (บาท)", value: formatMoney(rates.freightPerTrip) },
    { label: "ค่าจ้างต่อตัน (บาท)", value: formatMoney(rates.freightPerTon) },
  ];
}

export function collectionTileItems(row: AnalysisBucket) {
  const rates = collectionRates(row);
  return [
    { label: "ไม่เก็บเงิน (เที่ยว)", value: count(row.noCollectTrips) },
    { label: "ต้องเก็บ (บาท)", value: formatMoney(row.collect) },
    { label: "ได้รับแล้ว (บาท)", value: formatMoney(row.collected) },
    { label: "ยังไม่ได้รับ (บาท)", value: formatMoney(rates.outstanding) },
  ];
}
