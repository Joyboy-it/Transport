# ระบบบริหารงานจ้างรถขนส่งภายนอก

ระยะที่ 1: ใบงาน ข้อมูลหลัก การชั่งน้ำหนักต้นทางและปลายทาง การเทียบน้ำหนัก และไฟล์หลักฐาน
ศัพท์ที่ใช้ในระบบอยู่ใน [GLOSSARY.md](./GLOSSARY.md) และเหตุผลของการตัดสินใจหลักอยู่ใน [docs/adr](./docs/adr)

## สิ่งที่ต้องมีบนเครื่องหลัก

- Node.js 24 ขึ้นไป
- PostgreSQL 16 ขึ้นไป ติดตั้งบนเครื่องเดียวกัน เครื่องลูกไม่ต่อฐานข้อมูลโดยตรง

## ติดตั้งครั้งแรก

1. คัดลอก `.env.example` เป็น `.env` แล้วกรอกค่า
   - `DATABASE_URL` ชี้ไปฐานข้อมูลที่สร้างไว้
   - `STORAGE_ROOT` โฟลเดอร์เก็บไฟล์ อยู่นอกโฟลเดอร์โปรเจกต์ได้
   - `SESSION_SECRET` สุ่มยาวอย่างน้อย 32 ตัวอักษร
   - `ADMIN_USERNAME` และ `ADMIN_PASSWORD` บัญชีผู้ดูแลระบบคนแรก
2. ติดตั้งและเตรียมฐานข้อมูล

   ```powershell
   npm install
   npm run db:deploy
   npm run db:seed
   ```

   `db:seed` สร้างผู้ดูแลระบบ (ถ้ายังไม่มี) ข้อมูลบริษัทว่าง และเกณฑ์ส่วนต่างเริ่มต้น 100 กก. หรือ 1.00%

## รันใน LAN

ติดตั้ง Node.js แบบสำหรับทุกผู้ใช้ (`C:\Program Files\nodejs`) เพราะงานตอนบูตรันในบัญชี `SYSTEM`
กรอก `.env` ให้ครบก่อน: `DATABASE_URL` ชี้ `localhost`, `COOKIE_SECURE="false"`

เปิด PowerShell แบบ Run as administrator ที่โฟลเดอร์โปรเจกต์ แล้วรัน

```powershell
powershell -ExecutionPolicy Bypass -File scripts\lan\Install-TransportServer.ps1
```

สคริปต์ตรวจค่าใน `.env` แล้วทำตามลำดับ: `npm install`, `db:deploy`, `db:seed`, `build`
จากนั้นเปิด Windows Firewall ขาเข้าพอร์ต 3000 เฉพาะเครือข่าย Private และ Domain ลงทะเบียนงาน `TransportServer` ให้รันตอนบูต
แล้วพิมพ์ URL ให้เครื่องลูก เช่น `http://192.168.1.20:3000` รันซ้ำได้หลังอัปเดตโค้ด

สิ่งที่ยังทำเอง:

- ตั้ง IP คงที่ให้เครื่องหลัก หรือจอง IP ที่เราเตอร์ สคริปต์ไม่แก้ IP และ IP จาก DHCP อาจเปลี่ยนหลังรีสตาร์ต
- ถ้า Windows ตั้งเครือข่ายเป็น Public ให้เปลี่ยนเป็น Private สคริปต์จะเตือนถ้าเจอ
- ไม่เปิดพอร์ต 5432 ของ PostgreSQL ให้เครือข่าย เครื่องลูกใช้แค่เบราว์เซอร์ ไม่ลง Node.js หรือ PostgreSQL
- การสำรองฐานข้อมูลกับโฟลเดอร์ `STORAGE_ROOT` ยังไม่อยู่ในสคริปต์

ดูปัญหาของเซิร์ฟเวอร์ได้ที่ `logs\server.log` ถอดงานตอนบูตและกฎ Firewall ด้วย

```powershell
powershell -ExecutionPolicy Bypass -File scripts\lan\Uninstall-TransportServer.ps1
```

การถอดไม่ลบฐานข้อมูล `.env` log หรือไฟล์ใน `STORAGE_ROOT`

ระหว่างพัฒนาใช้ `npm run dev` ซึ่งฟัง `0.0.0.0:3000` เหมือนกัน สคริปต์ติดตั้งจะหยุดเซิร์ฟเวอร์ Next ของโปรเจกต์นี้ที่รันอยู่ก่อน build

## ทดสอบ

```powershell
npm test          # สูตรน้ำหนัก ส่วนต่าง สถานะใบงาน และสิทธิ์
npm run test:db   # เลขที่ใบงาน การชั่ง และการยืนยัน กับฐานข้อมูลทดสอบจริง
```

`test:db` ล้างข้อมูลทั้งหมดในฐานข้อมูลที่ชี้ด้วย `TEST_DATABASE_URL` จึงยอมรันเฉพาะฐานที่ชื่อลงท้ายด้วย `_test`

```powershell
$env:TEST_DATABASE_URL = "postgresql://postgres:<รหัส>@localhost:5432/transport_test?schema=public"
npx prisma migrate deploy   # ครั้งแรก โดยตั้ง DATABASE_URL เป็นฐานทดสอบชั่วคราว
npm run test:db
```
