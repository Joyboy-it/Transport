import { describe, expect, it } from "vitest";
import { parseTransporterSet } from "./transporter-set";

const company = {
  code: "TR009",
  name: "หจก. ทดสอบ",
  taxId: "",
  phone: "",
  contactName: "",
  address: "",
};

describe("parseTransporterSet", () => {
  it("accepts a company with no vehicle or driver", () => {
    const result = parseTransporterSet({
      ...company,
      vehiclePlate: "",
      vehicleType: "",
      driverName: "",
      driverPhone: "",
      driverNationalId: "",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.vehicle).toBeNull();
    expect(result.driver).toBeNull();
  });

  it("keeps a vehicle and a driver when those fields are filled", () => {
    const result = parseTransporterSet({
      ...company,
      vehiclePlate: "99-0001",
      vehicleType: "10ล้อ",
      driverName: "สมชาย",
      driverPhone: "081",
      driverNationalId: "",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.vehicle).toEqual({ plate: "99-0001", vehicleType: "10ล้อ" });
    expect(result.driver).toEqual({ name: "สมชาย", phone: "081", nationalId: "" });
  });

  it("asks for a plate when only the vehicle type is filled", () => {
    const result = parseTransporterSet({
      ...company,
      vehiclePlate: "",
      vehicleType: "6ล้อ",
      driverName: "",
      driverPhone: "",
      driverNationalId: "",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors.vehiclePlate).toBeTruthy();
  });

  it("asks for a driver name when only the phone is filled", () => {
    const result = parseTransporterSet({
      ...company,
      vehiclePlate: " ",
      vehicleType: "",
      driverName: "",
      driverPhone: "089",
      driverNationalId: "",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors.driverName).toBeTruthy();
  });
});
