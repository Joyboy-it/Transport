"use client";

import { Menu, Truck, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-sidebar-border bg-sidebar px-3 py-2 text-sidebar-foreground md:hidden print:hidden">
        <Button
          variant="ghost"
          size="icon"
          aria-label="เปิดเมนู"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Menu />
        </Button>
        <Truck className="size-4" />
        <span className="text-sm font-semibold">ระบบจ้างรถขนส่ง</span>
      </header>

      {open && (
        <div
          className="fixed inset-0 z-40 animate-in bg-slate-950/40 fade-in duration-200 md:hidden"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[8px_0_32px_-20px_oklch(0.2_0.04_255/0.7)] transition-transform duration-300 ease-out md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:translate-x-0 print:hidden",
          open ? "translate-x-0" : "-translate-x-full max-md:invisible",
        )}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        <Button
          variant="ghost"
          size="icon"
          aria-label="ปิดเมนู"
          className="absolute top-3 right-2 md:hidden"
          onClick={() => setOpen(false)}
        >
          <X />
        </Button>
        {sidebar}
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
