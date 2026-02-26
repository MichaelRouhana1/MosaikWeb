"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

const SIZES = ["XS", "S", "M", "L", "XL"] as const;

export interface StockByColorRow {
  colorName: string;
  stockBySize: Record<string, number>;
}

interface StockHoverCellProps {
  totalStock: number;
  stockBySize: Record<string, number>;
  /** When provided, shows a row per color with stock breakdown. Falls back to stockBySize when empty. */
  stockByColor?: StockByColorRow[];
}

export function StockHoverCell({ totalStock, stockBySize, stockByColor }: StockHoverCellProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rows = (stockByColor && stockByColor.length > 0) ? stockByColor : [
    { colorName: "Stock", stockBySize },
  ];

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2,
    });
  };

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    updatePosition();
    setOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => setOpen(false), 100);
  };

  useEffect(() => {
    if (!open) return;
    const onScroll = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const popupContent = open && (
    <div
      className="fixed z-[9999] min-w-[200px] -translate-x-1/2 rounded-md border border-border bg-background px-4 py-3 shadow-lg pointer-events-auto"
      style={{
        top: position.top,
        left: position.left,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Stock
      </p>
      <p className="mb-3 text-lg font-bold">{totalStock}</p>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.colorName} className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">{row.colorName}</p>
            <div className="flex gap-2 flex-wrap">
              {SIZES.map((size) => (
                <div
                  key={size}
                  className="flex min-w-[2.5rem] flex-col items-center rounded border border-border bg-muted/30 px-2 py-1.5"
                >
                  <span className="text-xs text-muted-foreground">{size}</span>
                  <span className="font-medium">{row.stockBySize[size] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        className="relative z-0 inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span className="cursor-default">{totalStock}</span>
      </div>
      {open && typeof document !== "undefined" && createPortal(popupContent, document.body)}
    </>
  );
}
