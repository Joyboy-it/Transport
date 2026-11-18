import { notFound, redirect } from "next/navigation";
import { EmptyRow, NoAccess, PageHeader } from "@/components/app/ui";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { can } from "@/domain/permissions";
import { isMasterKind, MASTER_CONFIG } from "@/lib/masters";
import { requireUser } from "@/server/auth";
import { listMaster } from "@/server/masters";
import { AddMasterDialog } from "./add-master-dialog";
import { EditMasterDialog } from "./edit-master-dialog";

export default async function MasterPage({ params, searchParams }: PageProps<"/transport/masters/[kind]">) {
  const user = await requireUser();
  if (!can(user.role, "master.manage")) return <NoAccess />;

  const { kind } = await params;
  if (!isMasterKind(kind)) notFound();
  const { edit } = await searchParams;

  const config = MASTER_CONFIG[kind];
  const rows = await listMaster(kind);
  const editing = typeof edit === "string" ? (rows.find((r) => r.id === edit) ?? null) : null;

  if (kind === "vehicles" || kind === "drivers") {
    const query = new URLSearchParams();
    if (editing?.values.transporterId) query.set("id", editing.values.transporterId);
    if (editing) query.set(kind === "vehicles" ? "editVehicle" : "editDriver", editing.id);
    redirect(query.size ? `/transport/masters/transporters?${query}` : "/transport/masters/transporters");
  }
  const listFields = config.fields.filter((f) => f.list);

  return (
    <>
      <PageHeader
        title={config.title}
        description="ข้อมูลที่ปิดใช้งานยังแสดงบนใบงานเดิม แต่ไม่ให้เลือกในใบงานใหม่"
        actions={<AddMasterDialog kind={kind} title={config.title} />}
      />
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {listFields.map((f) => (
                  <TableHead key={f.name}>{f.label}</TableHead>
                ))}
                <TableHead>สถานะ</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && <EmptyRow colSpan={listFields.length + 2}>ยังไม่มีข้อมูล</EmptyRow>}
              {rows.map((row) => (
                <TableRow key={row.id} className={row.active ? undefined : "text-muted-foreground"}>
                  {listFields.map((f) => (
                    <TableCell key={f.name}>{row.display[f.name] ?? row.values[f.name] ?? ""}</TableCell>
                  ))}
                  <TableCell>
                    {row.active ? <Badge variant="secondary">ใช้งาน</Badge> : <Badge variant="outline">ปิดใช้งาน</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <EditMasterDialog
                      kind={kind}
                      title={config.title}
                      row={row}
                      initialOpen={editing?.id === row.id}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
