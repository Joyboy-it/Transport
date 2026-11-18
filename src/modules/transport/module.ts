import { Banknote, ChartColumn, ClipboardList, Database, FilePlus2, HandCoins, Scale, Settings, TriangleAlert, Truck } from "lucide-react";
import type { ModuleDef } from "../types";

export const transportModule: ModuleDef = {
  id: "transport",
  basePath: "/transport",
  name: "จ้างรถขนส่ง",
  shortName: "ขนส่ง",
  description: "ใบงานจ้างรถ คิวชั่งน้ำหนัก และส่วนต่างน้ำหนัก",
  icon: Truck,
  visible: [],
  sections: [
    {
      items: [
        { label: "ใบงาน", href: "/transport/jobs", icon: ClipboardList, exclude: ["/transport/jobs/new"] },
        {
          label: "สร้างใบงาน",
          href: "/transport/jobs?new=1",
          icon: FilePlus2,
          visible: "job.create",
          neverActive: true,
          shortcut: true,
        },
      ],
    },
    {
      title: "คิวงาน",
      items: [
        { label: "รอชั่งต้นทาง", href: "/transport/queues/origin", icon: Scale, countKey: "origin" },
        { label: "รอชั่งปลายทาง", href: "/transport/queues/destination", icon: Scale, countKey: "destination" },
        { label: "ส่วนต่างรอตรวจสอบ", href: "/transport/queues/variance", icon: TriangleAlert, countKey: "variance" },
      ],
    },
    {
      title: "วิเคราะห์",
      items: [
        { label: "ภาพรวม", href: "/transport/analysis", icon: ChartColumn, exact: true },
        { label: "ส่วนต่างน้ำหนัก", href: "/transport/analysis/variance", icon: Scale },
        { label: "ค่าจ้าง", href: "/transport/analysis/freight", icon: Banknote, visible: "job.viewFreight" },
        { label: "เงินเก็บปลายทาง", href: "/transport/analysis/collection", icon: HandCoins, visible: "job.viewFreight" },
      ],
    },
    {
      title: "ข้อมูลหลัก",
      items: [
        { label: "ผู้รับจ้าง รถ คนขับ", href: "/transport/masters/transporters", icon: Database, visible: "master.manage" },
        { label: "ต้นทาง", href: "/transport/masters/origins", icon: Database, visible: "master.manage" },
        { label: "โรงงานปลายทาง", href: "/transport/masters/factories", icon: Database, visible: "master.manage" },
        { label: "ประเภทสินค้า", href: "/transport/masters/commodities", icon: Database, visible: "master.manage" },
      ],
    },
    {
      title: "ตั้งค่าระบบนี้",
      items: [{ label: "เกณฑ์ส่วนต่าง", href: "/transport/settings", icon: Settings, visible: "settings.manage" }],
    },
  ],
};
