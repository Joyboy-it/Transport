"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition, type ChangeEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { SearchSelect } from "@/components/app/search-select";
import { Field, FormMessage } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  addDriverAction,
  addTransporterAction,
  addVehicleAction,
  createJobAction,
  updateJobHeaderAction,
} from "@/app/(app)/transport/jobs/actions";
import { jobHeaderSchema, type JobHeaderInput } from "@/lib/job-schema";
import { keepMoneyTyping } from "@/lib/money-input";
import type { JobOptions } from "@/server/job-queries";

type Mode =
  | { kind: "create" }
  | { kind: "edit"; jobId: string; updatedAt: string; isDraft: boolean; onSaved?: () => void };

type State = { ok: boolean; message?: string } | null;

function withAdded<T extends { id: string }>(base: T[], added: T[]) {
  return [...base, ...added.filter((row) => !base.some((item) => item.id === row.id))];
}

export function JobHeaderForm({
  options,
  defaults,
  mode,
  idPrefix = "",
  onDirtyChange,
}: {
  options: JobOptions;
  defaults: JobHeaderInput;
  mode: Mode;
  idPrefix?: string;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  "use no memo"; // react-hook-form subscribes through proxies that React Compiler memoization hides
  const fieldId = (name: string) => `${idPrefix}${name}`;
  const { register, handleSubmit, control, getValues, setValue, setError, formState } = useForm<JobHeaderInput>({
    resolver: zodResolver(jobHeaderSchema),
    defaultValues: defaults,
  });
  const [state, setState] = useState<State>(null);
  const [pending, startTransition] = useTransition();
  const [addedDrivers, setAddedDrivers] = useState<JobOptions["drivers"]>([]);
  const [addedVehicles, setAddedVehicles] = useState<JobOptions["vehicles"]>([]);
  const [addedTransporters, setAddedTransporters] = useState<JobOptions["transporters"]>([]);
  const transporterId = useWatch({ control, name: "transporterId" });
  const vehicleId = useWatch({ control, name: "vehicleId" });
  const driverId = useWatch({ control, name: "driverId" });
  const commodityId = useWatch({ control, name: "commodityId" });
  const originId = useWatch({ control, name: "originId" });
  const destinationFactoryId = useWatch({ control, name: "destinationFactoryId" });
  const responsibleUserId = useWatch({ control, name: "responsibleUserId" });

  useEffect(() => {
    onDirtyChange?.(formState.isDirty);
  }, [formState.isDirty, onDirtyChange]);

  const allTransporters = withAdded(options.transporters, addedTransporters);
  const allVehicles = withAdded(options.vehicles, addedVehicles);
  const allDrivers = withAdded(options.drivers, addedDrivers);
  const vehicles = allVehicles.filter((v) => !transporterId || v.transporterId === transporterId);
  const drivers = allDrivers.filter((d) => !transporterId || d.transporterId === transporterId);

  async function addTransporter(name: string) {
    const result = await addTransporterAction(name);
    if (!result.ok) return result.message;
    setAddedTransporters((list) => withAdded(list, [result.row]));
    setValue("transporterId", result.row.id, { shouldDirty: true });
    onTransporterChange(result.row.id);
    toast.success(`เพิ่มผู้รับจ้าง ${result.row.code} ${result.row.name} แล้ว`);
    return null;
  }

  async function addVehicle(plate: string) {
    if (!transporterId) return "เลือกผู้รับจ้างก่อนเพิ่มรถ";
    const result = await addVehicleAction(transporterId, plate);
    if (!result.ok) return result.message;
    setAddedVehicles((list) => withAdded(list, [result.row]));
    setValue("vehicleId", result.row.id, { shouldDirty: true });
    toast.success(`เพิ่มรถ ${result.row.plate} แล้ว`);
    return null;
  }

  async function addDriver(name: string) {
    if (!transporterId) return "เลือกผู้รับจ้างก่อนเพิ่มคนขับ";
    const result = await addDriverAction(transporterId, name);
    if (!result.ok) return result.message;
    setAddedDrivers((list) => withAdded(list, [result.driver]));
    setValue("driverId", result.driver.id, { shouldDirty: true });
    toast.success(`เพิ่มคนขับ ${result.driver.name} แล้ว`);
    return null;
  }

  function onTransporterChange(id: string) {
    const vehicle = allVehicles.find((v) => v.id === getValues("vehicleId"));
    if (vehicle && id && vehicle.transporterId !== id) setValue("vehicleId", "");
    const driver = allDrivers.find((d) => d.id === getValues("driverId"));
    if (driver?.transporterId && id && driver.transporterId !== id) setValue("driverId", "");
  }

  function onVehicleChange(id: string) {
    const vehicle = allVehicles.find((v) => v.id === id);
    if (vehicle && !getValues("transporterId")) setValue("transporterId", vehicle.transporterId);
  }

  const submit = (issue: boolean) =>
    handleSubmit((values) => {
      startTransition(async () => {
        const result =
          mode.kind === "create"
            ? await createJobAction(values, issue)
            : await updateJobHeaderAction(mode.jobId, mode.updatedAt, values, issue);
        setState(result);
        if (result?.fieldErrors) {
          for (const [name, message] of Object.entries(result.fieldErrors)) {
            setError(name as keyof JobHeaderInput, { message });
          }
        }
        if (result?.ok) {
          toast.success(result.message ?? "บันทึกแล้ว");
          if (mode.kind === "edit") mode.onSaved?.();
        }
      });
    });

  const e = formState.errors;

  function moneyField(name: "freightAmount" | "collectAmount") {
    const field = register(name);
    return {
      ...field,
      inputMode: "decimal" as const,
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        event.target.value = keepMoneyTyping(event.target.value);
        field.onChange(event);
      },
    };
  }
  const showIssue = mode.kind === "create" || mode.isDraft;

  return (
    <form onSubmit={submit(false)} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="วันที่จ้าง" htmlFor={fieldId("hireDate")} error={e.hireDate?.message}>
          <Input id={fieldId("hireDate")} type="date" {...register("hireDate")} />
        </Field>
        <Field label="ผู้รับจ้าง" htmlFor={fieldId("transporterId")} error={e.transporterId?.message}>
          <SearchSelect
            id={fieldId("transporterId")}
            value={transporterId}
            title="ผู้รับจ้าง"
            placeholder="พิมพ์ชื่อหรือรหัสผู้รับจ้าง หากไม่มีในรายการกดเพิ่มได้"
            emptyLabel="เลือกผู้รับจ้าง"
            options={allTransporters.map((item) => ({ id: item.id, label: `${item.code} · ${item.name}`, name: item.name }))}
            onChange={(id) => {
              setValue("transporterId", id, { shouldDirty: true });
              onTransporterChange(id);
            }}
            onCreate={addTransporter}
          />
        </Field>
        <Field label="ทะเบียนรถ" htmlFor={fieldId("vehicleId")} error={e.vehicleId?.message}>
          <SearchSelect
            id={fieldId("vehicleId")}
            value={vehicleId}
            title="ทะเบียนรถ"
            placeholder="พิมพ์ทะเบียนรถ หากไม่มีในรายการกดเพิ่มได้"
            emptyLabel="เลือกรถ"
            options={vehicles.map((item) => ({
              id: item.id,
              label: item.vehicleType ? `${item.plate} · ${item.vehicleType}` : item.plate,
              name: item.plate,
            }))}
            onChange={(id) => {
              setValue("vehicleId", id, { shouldDirty: true });
              onVehicleChange(id);
            }}
            onCreate={addVehicle}
            createHint={transporterId ? undefined : "เลือกผู้รับจ้างก่อน จึงจะเพิ่มรถใหม่ได้"}
          />
        </Field>
        <Field label="คนขับ" htmlFor={fieldId("driverId")} error={e.driverId?.message}>
          <SearchSelect
            id={fieldId("driverId")}
            value={driverId}
            title="คนขับ"
            placeholder="พิมพ์ชื่อคนขับ หากไม่มีในรายการกดเพิ่มได้"
            emptyLabel="เลือกคนขับ"
            options={drivers.map((item) => ({ id: item.id, label: item.name }))}
            onChange={(id) => setValue("driverId", id, { shouldDirty: true })}
            onCreate={addDriver}
            createHint={transporterId ? undefined : "เลือกผู้รับจ้างก่อน จึงจะเพิ่มคนขับใหม่ได้"}
          />
        </Field>
        <Field label="ประเภทสินค้า" htmlFor={fieldId("commodityId")} error={e.commodityId?.message}>
          <SearchSelect
            id={fieldId("commodityId")}
            value={commodityId}
            title="ประเภทสินค้า"
            placeholder="พิมพ์ชื่อสินค้า"
            emptyLabel="เลือกสินค้า"
            options={options.commodities.map((item) => ({ id: item.id, label: item.name }))}
            onChange={(id) => setValue("commodityId", id, { shouldDirty: true })}
          />
        </Field>
        <Field label="ต้นทาง" htmlFor={fieldId("originId")} error={e.originId?.message}>
          <SearchSelect
            id={fieldId("originId")}
            value={originId}
            title="ต้นทาง"
            placeholder="พิมพ์ชื่อต้นทาง"
            emptyLabel="เลือกต้นทาง"
            options={options.origins.map((item) => ({ id: item.id, label: item.name }))}
            onChange={(id) => setValue("originId", id, { shouldDirty: true })}
          />
        </Field>
        <Field label="โรงงานปลายทาง" htmlFor={fieldId("destinationFactoryId")} error={e.destinationFactoryId?.message}>
          <SearchSelect
            id={fieldId("destinationFactoryId")}
            value={destinationFactoryId}
            title="โรงงานปลายทาง"
            placeholder="พิมพ์ชื่อโรงงาน"
            emptyLabel="เลือกโรงงาน"
            options={options.factories.map((item) => ({ id: item.id, label: item.name }))}
            onChange={(id) => setValue("destinationFactoryId", id, { shouldDirty: true })}
          />
        </Field>
        <Field label="ผู้รับผิดชอบ" htmlFor={fieldId("responsibleUserId")} error={e.responsibleUserId?.message}>
          <SearchSelect
            id={fieldId("responsibleUserId")}
            value={responsibleUserId}
            title="ผู้รับผิดชอบ"
            placeholder="พิมพ์ชื่อผู้รับผิดชอบ"
            emptyLabel="เลือกผู้รับผิดชอบ"
            options={options.users.map((item) => ({ id: item.id, label: item.displayName }))}
            onChange={(id) => setValue("responsibleUserId", id, { shouldDirty: true })}
          />
        </Field>
        <Field label="ค่าจ้างต่อเที่ยว (บาท)" htmlFor={fieldId("freightAmount")} error={e.freightAmount?.message}>
          <Input id={fieldId("freightAmount")} placeholder="0.00" {...moneyField("freightAmount")} />
        </Field>
        <Field
          label="เงินเก็บจากปลายทาง (บาท)"
          htmlFor={fieldId("collectAmount")}
          error={e.collectAmount?.message}
          className="sm:col-span-2 lg:col-span-3"
        >
          <Input id={fieldId("collectAmount")} placeholder="ไม่เก็บเงิน" {...moneyField("collectAmount")} />
        </Field>
        {mode.kind === "create" && (
          <Field label="หมายเหตุ" htmlFor={fieldId("note")} error={e.note?.message} className="sm:col-span-2 lg:col-span-3">
            <Textarea id={fieldId("note")} rows={2} {...register("note")} />
          </Field>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant={showIssue ? "outline" : "default"} disabled={pending}>
          {showIssue ? "บันทึกร่าง" : "บันทึกหัวใบงาน"}
        </Button>
        {showIssue && (
          <Button type="button" disabled={pending} onClick={submit(true)}>
            {mode.kind === "create" ? "บันทึกและออกใบงาน" : "ออกใบงาน"}
          </Button>
        )}
        {state && !state.ok && <FormMessage state={state} />}
      </div>
    </form>
  );
}
