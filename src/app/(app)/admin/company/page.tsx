import { NoAccess, PageHeader } from "@/components/app/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { can } from "@/domain/permissions";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { CompanyForm } from "./company-form";

export default async function CompanyPage() {
  const user = await requireUser();
  if (!can(user.role, "settings.manage")) return <NoAccess />;

  const company = await db.companyProfile.findUnique({ where: { id: 1 } });

  return (
    <>
      <PageHeader title="ข้อมูลบริษัท" />
      <div className="grid gap-6">
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
