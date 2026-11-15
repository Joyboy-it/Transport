import Link from "next/link";
import { PageHeader } from "@/components/app/ui";
import { itemCount, moduleHref } from "@/components/shell/shell-helpers";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { loadMenuCounts } from "@/modules/counts";
import { visibleModules, visibleSections } from "@/modules/registry";
import { requireUser } from "@/server/auth";

export default async function HomePage() {
  const user = await requireUser();
  const counts = await loadMenuCounts(user.role);

  return (
    <>
      <PageHeader title="หน้าแรก" />
      <div className="grid gap-4 md:grid-cols-2">
        {visibleModules(user.role).map((mod) => {
          const items = visibleSections(mod, user.role).flatMap((section) => section.items);
          const counted = items.filter((item) => item.countKey);
          const shortcuts = items.filter((item) => item.shortcut && !item.countKey);

          return (
            <Card key={mod.id}>
              <CardHeader className="flex flex-wrap items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <mod.icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-40 flex-1">
                  <CardTitle>{mod.name}</CardTitle>
                  <CardDescription>{mod.description}</CardDescription>
                </div>
                <Link href={moduleHref(mod, user.role)} className={cn(buttonVariants(), "shrink-0")}>
                  เปิดระบบ<span className="sr-only"> {mod.name}</span>
                </Link>
              </CardHeader>

              {(counted.length > 0 || shortcuts.length > 0) && (
                <CardContent className="grid gap-3">
                  {counted.length > 0 && (
                    <ul className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3">
                      {counted.map((item) => {
                        const count = itemCount(counts, mod, item);
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              className="flex h-full flex-col gap-0.5 rounded-md bg-tile px-3.5 py-3 outline-none transition-[background-color,box-shadow] duration-200 hover:bg-muted hover:ring-1 hover:ring-input focus-visible:ring-3 focus-visible:ring-ring/30 motion-reduce:transition-none"
                            >
                              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <item.icon className="size-3.5 shrink-0" aria-hidden="true" />
                                {item.label}
                              </span>
                              {count !== null && (
                                <span className={cn("text-xl font-bold tabular-nums", count === 0 && "text-muted-foreground")}>
                                  {count.toLocaleString("th-TH")}
                                </span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {shortcuts.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {shortcuts.map((item) => (
                        <Link key={item.href} href={item.href} className={cn(buttonVariants({ variant: "outline" }))}>
                          <item.icon aria-hidden="true" />
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
