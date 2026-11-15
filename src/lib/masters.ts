export const VEHICLE_TYPES = ["4ล้อ", "6ล้อ", "10ล้อ", "รถพ่วง"] as const;

export const MASTER_KINDS = [
  "transporters",
  "vehicles",
  "drivers",
  "origins",
  "factories",
  "commodities",
] as const;
export type MasterKind = (typeof MASTER_KINDS)[number];

export type MasterField = {
  name: string;
  label: string;
  required?: boolean;
  type?: "text" | "textarea" | "transporter";
  /** Shown in the list table. */
  list?: boolean;
};

export const MASTER_CONFIG: Record<MasterKind, { title: string; fields: MasterField[] }> = {
  transporters: {
    title: "ผู้รับจ้าง",
    fields: [
      { name: "code", label: "รหัสผู้รับจ้าง", required: true, list: true },
      { name: "name", label: "ชื่อบริษัท / บุคคล", required: true, list: true },
      { name: "taxId", label: "เลขประจำตัวผู้เสียภาษี", list: true },
      { name: "phone", label: "โทรศัพท์", list: true },
      { name: "contactName", label: "ผู้ติดต่อ", list: true },
      { name: "address", label: "ที่อยู่", type: "textarea" },
      { name: "note", label: "หมายเหตุ", type: "textarea" },
    ],
  },
  vehicles: {
    title: "รถ",
    fields: [
      { name: "plate", label: "ทะเบียนรถ", required: true, list: true },
      { name: "vehicleType", label: "ประเภทรถ", list: true },
      { name: "transporterId", label: "ผู้รับจ้างเจ้าของรถ", required: true, type: "transporter", list: true },
    ],
  },
  drivers: {
    title: "คนขับ",
    fields: [
      { name: "name", label: "ชื่อคนขับ", required: true, list: true },
      { name: "phone", label: "โทรศัพท์", list: true },
      { name: "nationalId", label: "เลขประจำตัว", list: true },
      { name: "transporterId", label: "สังกัดผู้รับจ้าง", required: true, type: "transporter", list: true },
    ],
  },
  origins: { title: "ต้นทาง", fields: [{ name: "name", label: "ชื่อต้นทาง", required: true, list: true }] },
  factories: {
    title: "โรงงานปลายทาง",
    fields: [{ name: "name", label: "ชื่อโรงงาน", required: true, list: true }],
  },
  commodities: {
    title: "ประเภทสินค้า",
    fields: [{ name: "name", label: "ชื่อสินค้า", required: true, list: true }],
  },
};

export function isMasterKind(value: string): value is MasterKind {
  return (MASTER_KINDS as readonly string[]).includes(value);
}

export type MasterRow = {
  id: string;
  active: boolean;
  values: Record<string, string>;
  /** Display text for relation fields. */
  display: Record<string, string>;
};
