import { NoAccess, PageHeader } from "@/components/app/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { can } from "@/domain/permissions";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { CompanyForm, ThresholdForm } from "./settings-forms";

export default async function SettingsPage() {
  const user = await requireUser();
  if (!can(user.role, "settings.manage")) return <NoAccess />;

  const [company, threshold] = await Promise.all([
    db.companyProfile.findUnique({ where: { id: 1 } }),
    db.varianceThreshold.findUnique({ where: { id: 1 } }),
  ]);

  return (
    <>
      <PageHeader title="ตั้งค่า" />
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
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลบริษัท</CardTitle>
          </CardHeader>
          <CardContent>
            <CompanyForm
              company={{
                name: company?.name ?? "",
                address: company?.address ?? "",
                taxId: company?.taxId ?? "",
                phone: company?.phone ?? "",
              }}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
