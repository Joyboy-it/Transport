import { NoAccess, PageHeader } from "@/components/app/ui";
import { can } from "@/domain/permissions";
import { requireUser } from "@/server/auth";
import { listMaster } from "@/server/masters";
import { AddTransporterDialog } from "./add-transporter-dialog";
import { TransporterBoard } from "./transporter-board";

function param(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function TransporterPage({ searchParams }: PageProps<"/masters/transporters">) {
  const user = await requireUser();
  if (!can(user.role, "master.manage")) return <NoAccess />;

  const sp = await searchParams;
  const [transporters, vehicles, drivers] = await Promise.all([
    listMaster("transporters"),
    listMaster("vehicles"),
    listMaster("drivers"),
  ]);

  return (
    <>
      <PageHeader
        title="ผู้รับจ้าง รถ และคนขับ"
        description="กด รถ คนขับ หรือแก้ไข เพื่อเปิดหน้าต่างของบริษัทนั้น หากปุ่มไม่พอดีแถวเดียว จะรวมเป็นปุ่มจัดการ"
        actions={<AddTransporterDialog />}
      />
      <TransporterBoard
        transporters={transporters}
        vehicles={vehicles}
        drivers={drivers}
        options={transporters.map((row) => ({ id: row.id, code: row.values.code, name: row.values.name }))}
        initial={{
          id: param(sp.id),
          edit: param(sp.edit),
          editVehicle: param(sp.editVehicle),
          editDriver: param(sp.editDriver),
        }}
      />
    </>
  );
}
