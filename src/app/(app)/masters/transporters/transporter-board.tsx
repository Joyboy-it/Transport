"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setTransporterActiveAction } from "@/app/(app)/masters/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyRow } from "@/components/app/ui";
import { MASTER_CONFIG, type MasterKind, type MasterRow } from "@/lib/masters";
import { MasterForm } from "../[kind]/master-form";

type Choice = { id: string; code: string; name: string };

function matchesTransporter(row: MasterRow, vehicles: MasterRow[], drivers: MasterRow[], needle: string) {
  const parts = Object.values(row.values);
  for (const vehicle of vehicles) {
    if (vehicle.values.transporterId === row.id) parts.push(vehicle.values.plate, vehicle.values.vehicleType);
  }
  for (const driver of drivers) {
    if (driver.values.transporterId === row.id) {
      parts.push(driver.values.name, driver.values.phone, driver.values.nationalId);
    }
  }
  return parts.join(" ").toLowerCase().includes(needle);
}
type Panel = "vehicles" | "drivers" | "edit";

function RowActions({
  vehicleCount,
  driverCount,
  active,
  pending,
  compact,
  onVehicles,
  onDrivers,
  onEdit,
  onToggleActive,
}: {
  vehicleCount: number;
  driverCount: number;
  active: boolean;
  pending: boolean;
  compact: boolean;
  onVehicles: () => void;
  onDrivers: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
}) {
  const actions = (
    <>
      <Button type="button" variant="outline" size="sm" onClick={onVehicles}>
        รถ ({vehicleCount})
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onDrivers}>
        คนขับ ({driverCount})
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onEdit}>
        แก้ไข
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onToggleActive}>
        {active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
      </Button>
    </>
  );

  if (!compact) {
    return (
      <div data-action-group className="flex flex-wrap justify-end gap-2">
        {actions}
      </div>
    );
  }

  return (
    <ManageMenu
      vehicleCount={vehicleCount}
      driverCount={driverCount}
      active={active}
      pending={pending}
      onVehicles={onVehicles}
      onDrivers={onDrivers}
      onEdit={onEdit}
      onToggleActive={onToggleActive}
    />
  );
}

function ManageMenu({
  vehicleCount,
  driverCount,
  active,
  pending,
  onVehicles,
  onDrivers,
  onEdit,
  onToggleActive,
}: {
  vehicleCount: number;
  driverCount: number;
  active: boolean;
  pending: boolean;
  onVehicles: () => void;
  onDrivers: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function place() {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 176;
    const height = 168;
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    const top = rect.bottom + 4 + height > window.innerHeight ? Math.max(8, rect.top - height - 4) : rect.bottom + 4;
    setBox({ top, left });
  }

  useEffect(() => {
    if (!open) return;
    place();
    function onPointer(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (anchorRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  function choose(action: () => void) {
    setOpen(false);
    action();
  }

  const items = [
    { label: `รถ (${vehicleCount})`, action: onVehicles, disabled: false },
    { label: `คนขับ (${driverCount})`, action: onDrivers, disabled: false },
    { label: "แก้ไข", action: onEdit, disabled: false },
    { label: active ? "ปิดใช้งาน" : "เปิดใช้งาน", action: onToggleActive, disabled: pending },
  ];

  return (
    <span ref={anchorRef} className="inline-flex">
      <Button type="button" variant="outline" size="sm" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((value) => !value)}>
        จัดการ
      </Button>
      {open &&
        box &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: box.top, left: box.left }}
            className="fixed z-50 w-44 rounded-lg border bg-card p-1 shadow-lg"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className="flex h-9 w-full items-center rounded-md px-3 text-left text-sm hover:bg-muted disabled:opacity-50"
                onClick={() => choose(item.action)}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </span>
  );
}

function initialPanel(initial: { id?: string; edit?: string; editVehicle?: string; editDriver?: string }): Panel | null {
  if (initial.edit) return "edit";
  if (initial.editDriver) return "drivers";
  if (initial.editVehicle) return "vehicles";
  if (initial.id) return "vehicles";
  return null;
}

export function TransporterBoard({
  transporters,
  vehicles,
  drivers,
  options,
  initial,
}: {
  transporters: MasterRow[];
  vehicles: MasterRow[];
  drivers: MasterRow[];
  options: Choice[];
  initial: { id?: string; edit?: string; editVehicle?: string; editDriver?: string };
}) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(initial.edit ?? initial.id ?? null);
  const [panel, setPanel] = useState<Panel | null>(initialPanel(initial));
  const [editVehicleId, setEditVehicleId] = useState(initial.editVehicle ?? null);
  const [editDriverId, setEditDriverId] = useState(initial.editDriver ?? null);
  const [pendingActive, startActive] = useTransition();
  const [query, setQuery] = useState("");
  const [compactActions, setCompactActions] = useState(false);
  const fleetDirty = useRef(false);
  const editDirty = useRef(false);
  const tableRootRef = useRef<HTMLDivElement>(null);
  const collapsedAt = useRef(0);

  const company = transporters.find((row) => row.id === companyId) ?? null;
  const editing = panel === "edit" ? company : null;
  const fleet = panel === "vehicles" || panel === "drivers" ? company : null;
  const ownVehicles = company ? vehicles.filter((row) => row.values.transporterId === company.id) : [];
  const ownDrivers = company ? drivers.filter((row) => row.values.transporterId === company.id) : [];
  const needle = query.trim().toLowerCase();
  const visible = needle ? transporters.filter((row) => matchesTransporter(row, vehicles, drivers, needle)) : transporters;
  const editingVehicle = ownVehicles.find((row) => row.id === editVehicleId) ?? null;
  const editingDriver = ownDrivers.find((row) => row.id === editDriverId) ?? null;

  useLayoutEffect(() => {
    const root = tableRootRef.current;
    const container = root?.querySelector<HTMLElement>("[data-slot=table-container]");
    if (!root || !container) return;

    const update = () => {
      const groups = [...root.querySelectorAll<HTMLElement>("[data-action-group]")];
      if (groups.length === 0) {
        if (container.clientWidth > collapsedAt.current + 80) setCompactActions(false);
        return;
      }
      const wraps = groups.some((group) => {
        const kids = [...group.children] as HTMLElement[];
        const first = kids[0];
        if (!first) return false;
        return kids.some((kid) => kid.offsetTop > first.offsetTop + 1);
      });
      if (wraps) {
        collapsedAt.current = container.clientWidth;
        setCompactActions(true);
      }
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [compactActions, visible]);

  function clearQuery() {
    const url = new URL(window.location.href);
    let changed = false;
    for (const key of ["id", "edit", "editVehicle", "editDriver"]) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    if (!changed) return;
    const query = url.searchParams.toString();
    router.replace(query ? `${url.pathname}?${query}` : url.pathname);
  }

  function onFleetOpenChange(next: boolean, eventDetails: { cancel: () => void }) {
    if (next) return;
    if (fleetDirty.current && !window.confirm("ปิดหน้าต่างนี้? ข้อมูลที่กรอกจะไม่ถูกบันทึก")) {
      eventDetails.cancel();
      return;
    }
    fleetDirty.current = false;
    setPanel(null);
    clearQuery();
  }

  function onEditOpenChange(next: boolean, eventDetails: { cancel: () => void }) {
    if (next) return;
    if (editDirty.current && !window.confirm("ปิดหน้าต่างนี้? ข้อมูลที่กรอกจะไม่ถูกบันทึก")) {
      eventDetails.cancel();
      return;
    }
    editDirty.current = false;
    setPanel(null);
    clearQuery();
  }

  function openPanel(id: string, next: Panel) {
    setEditVehicleId(null);
    setEditDriverId(null);
    setCompanyId(id);
    setPanel(next);
  }

  function setActive(row: MasterRow, active: boolean) {
    const question = active
      ? `เปิดใช้งาน ${row.values.name}?`
      : `ปิดใช้งาน ${row.values.name}? บริษัทนี้จะไม่ให้เลือกในใบงานใหม่`;
    if (!window.confirm(question)) return;
    startActive(async () => {
      const result = await setTransporterActiveAction(row.id, active);
      if (result?.ok) toast.success(result.message);
      else toast.error(result?.message ?? "บันทึกไม่สำเร็จ");
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <label htmlFor="transporter-search" className="text-sm font-medium">
            ค้นหา
          </label>
          <Input
            id="transporter-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ชื่อบริษัท ทะเบียนรถ รหัส เลขผู้เสียภาษี โทรศัพท์ ผู้ติดต่อ ที่อยู่ หมายเหตุ หรือชื่อคนขับ"
          />
          {needle && <p className="text-sm text-muted-foreground">พบ {visible.length.toLocaleString("th-TH")} ราย</p>}
        </CardHeader>
        <CardContent>
          <div ref={tableRootRef}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รหัสผู้รับจ้าง</TableHead>
                <TableHead>ชื่อบริษัท / บุคคล</TableHead>
                <TableHead>โทรศัพท์</TableHead>
                <TableHead>ผู้ติดต่อ</TableHead>
                <TableHead>ที่อยู่</TableHead>
                <TableHead>หมายเหตุ</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 && (
                <EmptyRow colSpan={8}>{transporters.length === 0 ? "ยังไม่มีผู้รับจ้าง" : "ไม่พบข้อมูลที่ค้นหา"}</EmptyRow>
              )}
              {visible.map((row) => (
                  <TableRow key={row.id} className={row.active ? undefined : "text-muted-foreground"}>
                    <TableCell>{row.values.code}</TableCell>
                    <TableCell>{row.values.name}</TableCell>
                    <TableCell>{row.values.phone}</TableCell>
                    <TableCell>{row.values.contactName}</TableCell>
                    <TableCell className="max-w-64 align-top whitespace-pre-wrap">{row.values.address || "–"}</TableCell>
                    <TableCell className="max-w-64 align-top whitespace-pre-wrap">{row.values.note || "–"}</TableCell>
                    <TableCell>
                      {row.active ? <Badge variant="secondary">ใช้งาน</Badge> : <Badge variant="outline">ปิดใช้งาน</Badge>}
                    </TableCell>
                    <TableCell className="text-right whitespace-normal">
                      <RowActions
                        vehicleCount={vehicles.filter((item) => item.values.transporterId === row.id).length}
                        driverCount={drivers.filter((item) => item.values.transporterId === row.id).length}
                        active={row.active}
                        pending={pendingActive}
                        compact={compactActions}
                        onVehicles={() => openPanel(row.id, "vehicles")}
                        onDrivers={() => openPanel(row.id, "drivers")}
                        onEdit={() => openPanel(row.id, "edit")}
                        onToggleActive={() => setActive(row, !row.active)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={panel === "vehicles" || panel === "drivers"}
        onOpenChange={onFleetOpenChange}
        onOpenChangeComplete={(open) => {
          if (!open) {
            setEditVehicleId(null);
            setEditDriverId(null);
          }
        }}
      >
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-5 overflow-hidden p-6 sm:max-w-5xl">
          <DialogHeader className="pr-8">
            <DialogTitle className="text-lg">
              {fleet ? `${panel === "drivers" ? "คนขับ" : "รถ"} · ${fleet.values.code} ${fleet.values.name}` : "ไม่พบผู้รับจ้าง"}
            </DialogTitle>
            <DialogDescription>
              {panel === "drivers" ? "คนขับที่เพิ่มจะสังกัดบริษัทนี้" : "รถที่เพิ่มจะสังกัดบริษัทนี้"}
            </DialogDescription>
          </DialogHeader>
          {fleet && (
            <div
              className="overflow-y-auto pr-1"
              onInput={() => {
                fleetDirty.current = true;
              }}
            >
              {panel === "drivers" ? (
                <FleetSection
                  title={editingDriver ? "แก้ไขคนขับ" : "เพิ่มคนขับ"}
                  kind="drivers"
                  rows={ownDrivers}
                  hide={["transporterId"]}
                  row={editingDriver}
                  options={options}
                  lockedTransporterId={fleet.id}
                  idPrefix="fleet-driver"
                  empty="ยังไม่มีคนขับของผู้รับจ้างนี้"
                  onEdit={setEditDriverId}
                  onSaved={() => {
                    fleetDirty.current = false;
                    setEditDriverId(null);
                  }}
                  onCancel={() => setEditDriverId(null)}
                />
              ) : (
                <FleetSection
                  title={editingVehicle ? "แก้ไขรถ" : "เพิ่มรถ"}
                  kind="vehicles"
                  rows={ownVehicles}
                  hide={["transporterId"]}
                  row={editingVehicle}
                  options={options}
                  lockedTransporterId={fleet.id}
                  idPrefix="fleet-vehicle"
                  empty="ยังไม่มีรถของผู้รับจ้างนี้"
                  onEdit={setEditVehicleId}
                  onSaved={() => {
                    fleetDirty.current = false;
                    setEditVehicleId(null);
                  }}
                  onCancel={() => setEditVehicleId(null)}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={panel === "edit"}
        onOpenChange={onEditOpenChange}
      >
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-5 overflow-hidden p-6 sm:max-w-3xl">
          <DialogHeader className="pr-8">
            <DialogTitle className="text-lg">แก้ไขผู้รับจ้าง</DialogTitle>
            <DialogDescription>รหัสผู้รับจ้างออกให้อัตโนมัติแล้ว จึงแก้ไม่ได้</DialogDescription>
          </DialogHeader>
          {editing && (
            <div
              className="overflow-y-auto pr-1"
              onInput={() => {
                editDirty.current = true;
              }}
            >
              <MasterForm
                key={editing.id}
                kind="transporters"
                row={editing}
                transporters={[]}
                onSaved={() => {
                  editDirty.current = false;
                  setPanel(null);
                  clearQuery();
                }}
                onCancel={() => {
                  editDirty.current = false;
                  setPanel(null);
                  clearQuery();
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function FleetSection({
  title,
  description,
  kind,
  rows,
  hide,
  row,
  options,
  lockedTransporterId,
  idPrefix,
  empty,
  onEdit,
  onSaved,
  onCancel,
}: {
  title: string;
  description?: string;
  kind: MasterKind;
  rows: MasterRow[];
  hide: string[];
  row: MasterRow | null;
  options: Choice[];
  lockedTransporterId: string;
  idPrefix: string;
  empty: string;
  onEdit: (id: string) => void;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const fields = MASTER_CONFIG[kind].fields.filter((field) => field.list && !hide.includes(field.name));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="grid items-start gap-6 lg:grid-cols-2">
        <MasterForm
          key={row?.id ?? "new"}
          kind={kind}
          row={row}
          transporters={options}
          lockedTransporterId={row ? undefined : lockedTransporterId}
          idPrefix={row ? `${idPrefix}-${row.id}` : idPrefix}
          onSaved={onSaved}
          onCancel={row ? onCancel : undefined}
          compact
        />
        <Table>
          <TableHeader>
            <TableRow>
              {fields.map((field) => (
                <TableHead key={field.name}>{field.label}</TableHead>
              ))}
              <TableHead>สถานะ</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <EmptyRow colSpan={fields.length + 2}>{empty}</EmptyRow>}
            {rows.map((item) => (
              <TableRow key={item.id} className={item.active ? undefined : "text-muted-foreground"}>
                {fields.map((field) => (
                  <TableCell key={field.name}>{item.display[field.name] ?? item.values[field.name] ?? ""}</TableCell>
                ))}
                <TableCell>
                  {item.active ? <Badge variant="secondary">ใช้งาน</Badge> : <Badge variant="outline">ปิดใช้งาน</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <button
                    type="button"
                    className="text-sm text-primary underline-offset-4 hover:underline"
                    onClick={() => onEdit(item.id)}
                  >
                    แก้ไข
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
