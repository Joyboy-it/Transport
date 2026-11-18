export function SummaryTiles({ items }: { items: { label: string; value: string }[] }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-3">
      {items.map((item) => (
        <li key={item.label} className="rounded-md bg-tile px-3.5 py-3">
          <div className="text-xs text-muted-foreground">{item.label}</div>
          <div className="text-xl font-bold tabular-nums">{item.value}</div>
        </li>
      ))}
    </ul>
  );
}
