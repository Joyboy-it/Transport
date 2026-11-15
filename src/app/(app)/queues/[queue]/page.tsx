import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/ui";
import { JobTable } from "@/components/jobs/job-table";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/server/auth";
import { listQueue, type Queue } from "@/server/job-queries";

const QUEUES: Record<Queue, { title: string; description: string; empty: string }> = {
  origin: {
    title: "รอชั่งต้นทาง",
    description: "ใบงานที่ออกแล้ว ยังไม่ได้บันทึกน้ำหนักต้นทาง",
    empty: "ไม่มีใบงานรอชั่งต้นทาง",
  },
  destination: {
    title: "รอชั่งปลายทาง",
    description: "บันทึกต้นทางแล้ว รอน้ำหนักจากโรงงานปลายทาง",
    empty: "ไม่มีใบงานรอชั่งปลายทาง",
  },
  variance: {
    title: "ส่วนต่างรอตรวจสอบ",
    description: "ส่วนต่างเกินเกณฑ์หรือคำนวณไม่ได้ ต้องให้ผู้อนุมัติยืนยันหรือแก้น้ำหนัก",
    empty: "ไม่มีใบงานที่ส่วนต่างผิดปกติ",
  },
};

export default async function QueuePage({ params }: PageProps<"/queues/[queue]">) {
  await requireUser();
  const { queue } = await params;
  if (!(queue in QUEUES)) notFound();
  const config = QUEUES[queue as Queue];
  const jobs = await listQueue(queue as Queue);

  return (
    <>
      <PageHeader title={config.title} description={`${config.description} · ${jobs.length} ใบงาน`} />
      <Card>
        <CardContent>
          <JobTable jobs={jobs} empty={config.empty} />
        </CardContent>
      </Card>
    </>
  );
}
