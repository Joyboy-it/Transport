import "server-only";
import { queueCounts } from "@/server/job-queries";

export function transportCounts(): Promise<Record<string, number>> {
  return queueCounts();
}
