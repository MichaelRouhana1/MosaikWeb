"use client";

const SIZES = ["XS", "S", "M", "L", "XL"] as const;

interface StockHoverCellProps {
  totalStock: number;
  stockBySize: Record<string, number>;
}

export function StockHoverCell({ totalStock, stockBySize }: StockHoverCellProps) {
  return (
    <div className="group/cell relative inline-block">
      <span className="cursor-default">{totalStock}</span>
      <div className="pointer-events-none invisible absolute left-1/2 top-full z-[9999] mt-2 -translate-x-1/2 rounded-md border border-border bg-background px-4 py-3 shadow-lg group-hover/cell:visible">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Stock
        </p>
        <p className="mb-3 text-lg font-bold">{totalStock}</p>
        <div className="flex gap-2">
          {SIZES.map((size) => (
            <div
              key={size}
              className="flex min-w-[2.5rem] flex-col items-center rounded border border-border bg-muted/30 px-2 py-1.5"
            >
              <span className="text-xs text-muted-foreground">{size}</span>
              <span className="font-medium">{stockBySize[size] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
