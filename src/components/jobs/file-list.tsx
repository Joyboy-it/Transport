"use client";

import { FileText, Paperclip } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { WeighingSide } from "@/domain/job-status";
import { ACCEPT_ATTRIBUTE, MAX_FILE_BYTES } from "@/domain/file-type";

export type FileItem = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  createdAt: string;
};

export function FileList({
  jobId,
  side,
  files,
  canUpload,
}: {
  jobId: string;
  side: WeighingSide;
  files: FileItem[];
  canUpload: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(selected: FileList | null) {
    if (!selected?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(selected)) {
        if (file.size > MAX_FILE_BYTES) {
          toast.error(`${file.name}: ไฟล์ใหญ่เกิน 10 MB`);
          continue;
        }
        const body = new FormData();
        body.set("category", side);
        body.set("file", file);
        const response = await fetch(`/api/jobs/${jobId}/files`, { method: "POST", body });
        const result = (await response.json().catch(() => null)) as { ok: boolean; message?: string } | null;
        if (result?.ok) toast.success(`แนบ ${file.name} แล้ว`);
        else toast.error(`${file.name}: ${result?.message ?? "แนบไฟล์ไม่สำเร็จ"}`);
      }
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
      router.refresh();
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">ไฟล์หลักฐาน ({files.length})</span>
        {canUpload && (
          <>
            <input
              ref={input}
              type="file"
              multiple
              accept={ACCEPT_ATTRIBUTE}
              className="hidden"
              aria-label={side === "ORIGIN" ? "แนบไฟล์ต้นทาง" : "แนบไฟล์ปลายทาง"}
              onChange={(e) => upload(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => input.current?.click()}
            >
              <Paperclip /> {uploading ? "กำลังอัปโหลด…" : "แนบไฟล์"}
            </Button>
          </>
        )}
      </div>
      {files.length === 0 ? (
        <p className="text-xs text-muted-foreground">ยังไม่มีไฟล์</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {files.map((file) => (
            <li key={file.id}>
              <a
                href={`/api/files/${file.id}`}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-2 rounded-lg border bg-background p-2 text-sm hover:bg-muted"
              >
                {file.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element -- served by an authenticated route
                  <img src={`/api/files/${file.id}`} alt="" className="size-12 rounded object-cover" />
                ) : (
                  <span className="flex size-12 items-center justify-center rounded bg-muted">
                    <FileText className="size-5" />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate font-medium">{file.originalName}</span>
                  <span className="block text-xs text-muted-foreground">
                    {(file.sizeBytes / 1024).toFixed(0)} KB · {file.uploadedBy} · {file.createdAt}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
