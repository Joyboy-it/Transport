import Link from "next/link";
import { notFound } from "next/navigation";
import { NoAccess, PageHeader } from "@/components/app/ui";
import { Card, CardContent } from "@/components/ui/card";
import { can } from "@/domain/permissions";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { EditUserForm } from "../user-forms";

export default async function EditUserPage({ params }: PageProps<"/settings/users/[id]">) {
  const me = await requireUser();
  if (!can(me.role, "user.manage")) return <NoAccess />;

  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, username: true, displayName: true, role: true, active: true },
  });
  if (!user) notFound();

  return (
    <>
      <PageHeader
        title={`ผู้ใช้ ${user.username}`}
        actions={
          <Link href="/settings/users" className="text-sm text-primary underline-offset-4 hover:underline">
            กลับไปรายการผู้ใช้
          </Link>
        }
      />
      <Card>
        <CardContent>
          <EditUserForm user={user} />
        </CardContent>
      </Card>
    </>
  );
}
