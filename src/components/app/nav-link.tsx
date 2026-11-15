"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  if (href === "/jobs") return pathname === "/jobs" || /^\/jobs\/(?!new$)[^/]+/.test(pathname);
  if (href === "/settings") return pathname === "/settings";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-[background-color,color,transform] duration-200 hover:translate-x-0.5 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isActive(pathname, href) && "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm",
      )}
    >
      {children}
    </Link>
  );
}
