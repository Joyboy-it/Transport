"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Field, NativeSelect } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { JOB_STATUS_LABEL, JOB_STATUSES } from "@/domain/job-status";
import type { JobFilters } from "@/server/job-queries";

type Option = { id: string; name: string };

export function JobFilterDialog({
  filters,
  transporters,
  origins,
  factories,
  commodities,
  view,
}: {
  filters: JobFilters;
  transporters: Option[];
  origins: Option[];
  factories: Option[];
  commodities: Option[];
  /** Kept when the filter form is submitted. */
  view?: "lines";
}) {
  const [tab, setTab] = useState<"time" | "number">("time");

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        <SlidersHorizontal /> ตัวกรอง
        <span className="font-normal text-muted-foreground">{formatRange(filters.from, filters.to)}</span>
      </DialogTrigger>
      <DialogContent className="gap-5 p-6 sm:max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-lg">ตัวกรอง</DialogTitle>
        </DialogHeader>
        <form action="/transport/jobs" className="grid gap-5">
          {view === "lines" && <input type="hidden" name="view" value="lines" />}
          <div className="flex gap-6 border-b">
            <TabButton active={tab === "time"} onClick={() => setTab("time")}>
              ช่วงเวลา
            </TabButton>
            <TabButton active={tab === "number"} onClick={() => setTab("number")}>
              เลขที่ใบงาน
            </TabButton>
          </div>

          <div className={tab === "time" ? "grid grid-cols-[1fr_auto_1fr] items-end gap-3" : "hidden"}>
            <Field label="เริ่มต้น" htmlFor="filter-from">
              <Input id="filter-from" name="from" type="date" defaultValue={filters.from} />
            </Field>
            <span className="pb-3 text-muted-foreground">–</span>
            <Field label="สิ้นสุด" htmlFor="filter-to">
              <Input id="filter-to" name="to" type="date" defaultValue={filters.to} />
            </Field>
          </div>
          <div className={tab === "number" ? "grid gap-4 sm:grid-cols-2" : "hidden"}>
            <Field label="เลขที่ใบงาน" htmlFor="filter-job-number">
              <Input id="filter-job-number" name="jobNumber" defaultValue={filters.jobNumber} placeholder="JOB-2026-" />
            </Field>
            <Field label="ทะเบียนรถ" htmlFor="filter-plate">
              <Input id="filter-plate" name="plate" defaultValue={filters.plate} placeholder="พิมพ์ทะเบียน" />
            </Field>
          </div>

          <SearchSelect
            label="ผู้รับจ้าง"
            name="transporterId"
            options={transporters}
            defaultValue={filters.transporterId ?? ""}
            placeholder="พิมพ์ชื่อเพื่อค้นหา"
          />
          <SearchSelect
            label="ต้นทาง"
            name="originId"
            options={origins}
            defaultValue={filters.originId ?? ""}
            placeholder="ค้นหา"
          />
          <SearchSelect
            label="โรงงานปลายทาง"
            name="destinationFactoryId"
            options={factories}
            defaultValue={filters.destinationFactoryId ?? ""}
            placeholder="ค้นหา"
          />
          <SearchSelect
            label="ประเภทสินค้า"
            name="commodityId"
            options={commodities}
            defaultValue={filters.commodityId ?? ""}
            placeholder="ค้นหา"
          />
          <Field label="สถานะ" htmlFor="filter-status">
            <NativeSelect id="filter-status" name="status" defaultValue={filters.status ?? ""}>
              <option value="">ทั้งหมด</option>
              {JOB_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {JOB_STATUS_LABEL[status]}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <DialogClose render={<Button type="button" variant="ghost" />}>ยกเลิก</DialogClose>
            <Button type="submit">ยืนยัน</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "-mb-px border-b-2 border-primary pb-2 text-sm font-medium text-primary"
          : "-mb-px border-b-2 border-transparent pb-2 text-sm text-muted-foreground hover:text-foreground"
      }
    >
      {children}
    </button>
  );
}

function SearchSelect({
  label,
  name,
  options,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  options: Option[];
  defaultValue: string;
  placeholder: string;
}) {
  const [selected, setSelected] = useState(defaultValue);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.id === selected);
  const shown = options.filter((option) => option.name.toLowerCase().includes(text.trim().toLowerCase()));

  return (
    <Field label={label}>
      <input type="hidden" name={name} value={selected} />
      <div className="relative">
        <Input
          value={open ? text : (current?.name ?? "")}
          placeholder={placeholder}
          onFocus={() => {
            setText("");
            setOpen(true);
          }}
          onChange={(event) => setText(event.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          role="combobox"
          aria-expanded={open}
          autoComplete="off"
        />
        {open && (
          <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-lg">
            <li>
              <button
                type="button"
                className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                onMouseDown={() => {
                  setSelected("");
                  setOpen(false);
                }}
              >
                ทั้งหมด
              </button>
            </li>
            {shown.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                  onMouseDown={() => {
                    setSelected(option.id);
                    setOpen(false);
                  }}
                >
                  {option.name}
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">ไม่พบรายการ</li>}
          </ul>
        )}
      </div>
    </Field>
  );
}

function formatRange(from?: string, to?: string) {
  const start = formatDay(from);
  const end = formatDay(to);
  if (start && end && start === end) return start;
  return [start, end].filter(Boolean).join(" – ");
}

function formatDay(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
