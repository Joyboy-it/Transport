import { NoAccess, PageHeader } from "@/components/app/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { can } from "@/domain/permissions";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { ThresholdForm } from "./threshold-form";

export default async function TransportSettingsPage() {
  const user = await requireUser();
  if (!can(user.role, "settings.manage")) return <NoAccess />;

  const threshold = await db.varianceThreshold.findUnique({ where: { id: 1 } });

  return (
    <>
      <PageHeader title="เกณฑ์ส่วนต่าง" />
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>เกณฑ์ส่วนต่างน้ำหนัก</CardTitle>
            <CardDescription>ใช้ตัดสินว่าน้ำหนักตรงกัน อยู่ในเกณฑ์ หรือเกินเกณฑ์</CardDescription>
          </CardHeader>
          <CardContent>
            <ThresholdForm
              kg={threshold?.maxVarianceKg.toFixed(2) ?? "100.00"}
              percent={threshold?.maxVariancePercent.toFixed(2) ?? "1.00"}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
