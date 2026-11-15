import Link from "next/link";
import { NoAccess, PageHeader } from "@/components/app/ui";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { can, ROLE_LABEL } from "@/domain/permissions";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { AddUserDialog } from "./user-forms";

export default async function UsersPage() {
  const me = await requireUser();
  if (!can(me.role, "user.manage")) return <NoAccess />;

  const users = await db.user.findMany({
    select: { id: true, username: true, displayName: true, role: true, active: true },
    orderBy: [{ active: "desc" }, { username: "asc" }],
  });

  return (
    <>
      <PageHeader
        title="ผู้ใช้งาน"
        description="สร้างบัญชีและกำหนดบทบาท สิทธิ์ของแต่ละบทบาทกำหนดไว้ในระบบ"
        actions={<AddUserDialog />}
      />
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อผู้ใช้</TableHead>
                <TableHead>ชื่อที่แสดง</TableHead>
                <TableHead>บทบาท</TableHead>
                <TableHead>สถานะ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Link href={`/settings/users/${user.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                      {user.username}
                    </Link>
                  </TableCell>
                  <TableCell>{user.displayName}</TableCell>
                  <TableCell>{ROLE_LABEL[user.role]}</TableCell>
                  <TableCell>
                    {user.active ? <Badge variant="secondary">ใช้งาน</Badge> : <Badge variant="outline">ปิดใช้งาน</Badge>}
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
