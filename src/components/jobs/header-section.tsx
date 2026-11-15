"use client";

import {
  Banknote,
  Calendar,
  Factory,
  FileText,
  MapPin,
  Package,
  Pencil,
  Truck,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeading } from "./section-heading";
import type { JobHeaderInput } from "@/lib/job-schema";
import type { JobOptions } from "@/server/job-queries";
import { JobHeaderForm } from "./job-header-form";

export function HeaderSection({
  rows,
  edit,
}: {
  rows: [label: string, value: string][];
  edit: { jobId: string; updatedAt: string; isDraft: boolean; options: JobOptions; defaults: JobHeaderInput } | null;
}) {
  const [editing, setEditing] = useState(Boolean(edit?.isDraft));

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <SectionHeading icon={FileText} title="ข้อมูลใบงาน" />
        </CardTitle>
        {edit && !editing && (
          <CardAction>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil /> แก้ไขข้อมูล
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {edit && editing ? (
          <JobHeaderForm
            options={edit.options}
            defaults={edit.defaults}
            mode={{
              kind: "edit",
              jobId: edit.jobId,
              updatedAt: edit.updatedAt,
              isDraft: edit.isDraft,
              onSaved: () => setEditing(false),
            }}
          />
        ) : (
          <div className={`grid gap-4 ${groupsOf(rows).length > 3 ? "lg:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3"}`}>
            {groupsOf(rows).map((group) => {
              const GroupIcon = group.icon;
              return (
              <section key={group.title} className="grid content-start gap-3 rounded-xl bg-muted/40 p-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <GroupIcon className="size-4" aria-hidden />
                  {group.title}
                </h3>
                <dl className="grid gap-2">
                  {group.rows.map(([label, value]) => {
                    const Icon = FIELD_ICON[label] ?? FileText;
                    const empty = value === "";
                    return (
                      <div key={label} className="grid grid-cols-[10rem_minmax(0,1fr)] items-center gap-2">
                        <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Icon className="size-4 shrink-0 text-primary" aria-hidden />
                          {label}
                        </dt>
                        <dd
                          className={`flex min-h-10 items-center rounded-lg border bg-background px-3 py-1.5 ${empty ? "text-muted-foreground" : "font-medium"}`}
                        >
                          <span className="wrap-break-word">{empty ? "–" : value}</span>
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </section>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const FIELD_GROUPS: { title: string; icon: LucideIcon; labels: string[] }[] = [
  { title: "งานจ้าง", icon: Calendar, labels: ["วันที่จ้าง", "ประเภทสินค้า", "ผู้รับผิดชอบ"] },
  { title: "ผู้รับจ้าง", icon: Truck, labels: ["ผู้รับจ้าง", "ทะเบียนรถ", "คนขับ"] },
  { title: "เส้นทาง", icon: MapPin, labels: ["ต้นทาง", "โรงงานปลายทาง"] },
  { title: "การเงิน", icon: Banknote, labels: ["ค่าจ้างต่อเที่ยว", "เงินเก็บจากปลายทาง", "สถานะเงิน"] },
];

function groupsOf(rows: [string, string][]) {
  const byLabel = new Map(rows.map((row) => [row[0], row]));
  const used = new Set<string>();
  const groups = FIELD_GROUPS.flatMap((group) => {
    const found = group.labels.flatMap((label) => {
      const row = byLabel.get(label);
      if (!row) return [];
      used.add(label);
      return [row];
    });
    return found.length > 0 ? [{ title: group.title, icon: group.icon, rows: found }] : [];
  });
  const rest = rows.filter(([label]) => !used.has(label));
  if (rest.length > 0) groups.push({ title: "อื่น ๆ", icon: FileText, rows: rest });
  return groups;
}

const FIELD_ICON: Record<string, LucideIcon> = {
  วันที่จ้าง: Calendar,
  ผู้รับจ้าง: UserRound,
  ทะเบียนรถ: Truck,
  คนขับ: UserRound,
  ประเภทสินค้า: Package,
  ต้นทาง: MapPin,
  โรงงานปลายทาง: Factory,
  ผู้รับผิดชอบ: UserRound,
  ค่าจ้างต่อเที่ยว: Banknote,
  เงินเก็บจากปลายทาง: Wallet,
  สถานะเงิน: Wallet,
};
