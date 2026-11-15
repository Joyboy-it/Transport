import { redirect } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/modules/registry";
import { getCurrentUser } from "@/server/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <main className="flex flex-1 items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-500">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutGrid className="size-5" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">{APP_NAME}</CardTitle>
          <CardDescription>เข้าสู่ระบบด้วยบัญชีที่ผู้ดูแลระบบสร้างให้</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
