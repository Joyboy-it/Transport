"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SearchSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  title,
  emptyLabel = "ไม่เลือก",
  onCreate,
  createHint,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** `name` is the bare value compared with the typed text before offering to create a new option. */
  options: { id: string; label: string; name?: string }[];
  placeholder: string;
  title?: string;
  emptyLabel?: string;
  /** Creates a new option from the typed text. Resolves to an error message, or null when done. */
  onCreate?: (text: string) => Promise<string | null>;
  /** Shown instead of the add button when creating is not possible yet. */
  createHint?: string;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const selected = options.find((option) => option.id === value);
  const typed = text.trim();
  const needle = typed.toLowerCase();
  const shown = options.filter((option) => option.label.toLowerCase().includes(needle));
  const canCreate = Boolean(onCreate) && typed !== "" && !options.some((option) => (option.name ?? option.label).toLowerCase() === needle);

  async function create() {
    if (!onCreate || creating) return;
    setCreating(true);
    setCreateError(null);
    const error = await onCreate(typed);
    setCreating(false);
    if (error) {
      setCreateError(error);
      return;
    }
    setOpen(false);
    setText("");
  }

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    setText("");
  }

  return (
    <>
      <button
        type="button"
        id={id}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setText("");
          setCreateError(null);
          setOpen(true);
        }}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3.5 text-left text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        <span className={cn("min-w-0 truncate", !selected && "text-muted-foreground")}>
          {selected?.label ?? emptyLabel}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[min(36rem,calc(100dvh-2rem))] flex-col gap-4 overflow-hidden p-6 sm:max-w-md">
          <DialogHeader className="pr-8">
            <DialogTitle className="text-lg">{title ?? placeholder}</DialogTitle>
            <DialogDescription>พิมพ์เพื่อค้นหา แล้วเลือกรายการด้านล่าง</DialogDescription>
          </DialogHeader>
          <Input
            ref={searchRef}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setCreateError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && canCreate && !createHint && shown.length === 0) {
                event.preventDefault();
                void create();
              }
            }}
            placeholder={placeholder}
            autoComplete="off"
          />
          {canCreate &&
            (createHint ? (
              <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">{createHint}</p>
            ) : (
              <button
                type="button"
                disabled={creating}
                onClick={() => void create()}
                className="flex w-full items-center gap-2 rounded-lg border border-dashed border-primary/50 bg-primary/5 px-4 py-3 text-left text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-60"
              >
                <Plus className="size-4 shrink-0" />
                <span className="min-w-0 truncate">{creating ? "กำลังเพิ่ม…" : `เพิ่ม «${typed}»`}</span>
              </button>
            ))}
          {createError && <p className="text-sm text-destructive">{createError}</p>}
          <ul className="min-h-0 flex-1 overflow-auto rounded-lg border">
            <li>
              <button
                type="button"
                className={cn(
                  "w-full px-4 py-3 text-left text-sm hover:bg-muted",
                  value === "" && "bg-muted font-medium",
                )}
                onClick={() => choose("")}
              >
                {emptyLabel}
              </button>
            </li>
            {shown.map((option) => (
              <li key={option.id} className="border-t">
                <button
                  type="button"
                  className={cn(
                    "w-full px-4 py-3 text-left text-sm hover:bg-muted",
                    option.id === value && "bg-primary/10 font-medium text-primary",
                  )}
                  onClick={() => choose(option.id)}
                >
                  {option.label}
                </button>
              </li>
            ))}
            {shown.length === 0 && (
              <li className="border-t px-4 py-6 text-center text-sm text-muted-foreground">ไม่พบรายการ</li>
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
