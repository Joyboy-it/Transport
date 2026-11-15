import { Building2, ShieldCheck, Users } from "lucide-react";
import type { ModuleDef } from "../types";

export const adminModule: ModuleDef = {
  id: "admin",
  basePath: "/admin",
  name: "ผู้ดูแลระบบ",
  shortName: "ผู้ดูแล",
  description: "ผู้ใช้งานและข้อมูลบริษัท",
  icon: ShieldCheck,
  visible: ["user.manage", "settings.manage"],
  pinBottom: true,
  sections: [
    {
      items: [
        { label: "ผู้ใช้งาน", href: "/admin/users", icon: Users, visible: "user.manage", shortcut: true },
        { label: "ข้อมูลบริษัท", href: "/admin/company", icon: Building2, visible: "settings.manage", shortcut: true },
      ],
    },
  ],
};
