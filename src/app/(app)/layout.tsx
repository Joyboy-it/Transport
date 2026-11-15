import {
  ClipboardList,
  Database,
  FilePlus2,
  LogOut,
  Scale,
  Settings,
  TriangleAlert,
  Truck,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { NavLink } from "@/components/app/nav-link";
import { Button } from "@/components/ui/button";
import { can, ROLE_LABEL } from "@/domain/permissions";
import { requireUser } from "@/server/auth";
import { logoutAction } from "../login/actions";
import { queueCounts } from "@/server/job-queries";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const queues = await queueCounts();

  const sidebar = (
    <>
      <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-4">
        <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
          <Truck className="size-4" />
        </div>
        <div className="text-sm font-semibold leading-tight">
          ระบบจ้างรถขนส่ง
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        <NavLink href="/jobs">
          <ClipboardList className="size-4" /> ใบงาน
        </NavLink>
        {can(user.role, "job.create") && (
          <NavLink href="/jobs?new=1">
            <FilePlus2 className="size-4" /> สร้างใบงาน
          </NavLink>
        )}

            <div className="mt-4 px-3 pb-1 text-xs font-medium text-sidebar-foreground/70">
              คิวงาน
            </div>
        <NavLink href="/queues/origin">
          <Scale className="size-4" /> <span className="min-w-0 flex-1">รอชั่งต้นทาง</span>
          <QueueCount value={queues.origin} />
        </NavLink>
        <NavLink href="/queues/destination">
          <Scale className="size-4" /> <span className="min-w-0 flex-1">รอชั่งปลายทาง</span>
          <QueueCount value={queues.destination} />
        </NavLink>
        <NavLink href="/queues/variance">
          <TriangleAlert className="size-4" /> <span className="min-w-0 flex-1">ส่วนต่างรอตรวจสอบ</span>
          <QueueCount value={queues.variance} />
        </NavLink>

        {can(user.role, "master.manage") && (
          <>
            <div className="mt-4 px-3 pb-1 text-xs font-medium text-sidebar-foreground/70">
              ข้อมูลหลัก
            </div>
            <NavLink href="/masters/transporters">
              <Database className="size-4" /> ผู้รับจ้าง รถ คนขับ
            </NavLink>
            <NavLink href="/masters/origins">
              <Database className="size-4" /> ต้นทาง
            </NavLink>
            <NavLink href="/masters/factories">
              <Database className="size-4" /> โรงงานปลายทาง
            </NavLink>
            <NavLink href="/masters/commodities">
              <Database className="size-4" /> ประเภทสินค้า
            </NavLink>
          </>
        )}

        {can(user.role, "settings.manage") && (
          <>
            <div className="mt-4 px-3 pb-1 text-xs font-medium text-sidebar-foreground/70">
              ระบบ
            </div>
            <NavLink href="/settings">
              <Settings className="size-4" /> ตั้งค่า
            </NavLink>
            <NavLink href="/settings/users">
              <Users className="size-4" /> ผู้ใช้งาน
            </NavLink>
          </>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="text-sm font-medium">{user.displayName}</div>
        <div className="mb-2 text-xs text-sidebar-foreground/70">
          {user.username} · {ROLE_LABEL[user.role]}
        </div>
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="w-full border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut /> ออกจากระบบ
          </Button>
        </form>
      </div>
    </>
  );

  return <AppShell sidebar={sidebar}>{children}</AppShell>;
}

function QueueCount({ value }: { value: number }) {
  return (
    <span
      className={
        value > 0
          ? "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-sidebar-primary px-1.5 text-xs font-semibold text-sidebar-primary-foreground tabular-nums"
          : "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/10 px-1.5 text-xs font-medium text-sidebar-foreground/70 tabular-nums"
      }
    >
      {value.toLocaleString("th-TH")}
    </span>
  );
}
