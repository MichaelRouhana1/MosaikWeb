"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SortOption =
  | "recommended"
  | "newest"
  | "price-low"
  | "price-high"
  | "name-asc"
  | "name-desc";

const SORT_LABELS: Record<SortOption, string> = {
  recommended: "Recommended",
  newest: "Newest",
  "price-low": "Price: Low to High",
  "price-high": "Price: High to Low",
  "name-asc": "Name: A to Z",
  "name-desc": "Name: Z to A",
};

interface UtilityBarProps {
  onFiltersClick: () => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
}

export function UtilityBar({
  onFiltersClick,
  sort,
  onSortChange,
}: UtilityBarProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <button
        type="button"
        onClick={onFiltersClick}
        className="text-xs font-medium uppercase tracking-[0.2em] text-foreground hover:opacity-70 transition-opacity"
      >
        Filters
      </button>
      <Select
        value={sort}
        onValueChange={(v) => onSortChange(v as SortOption)}
      >
        <SelectTrigger className="min-w-0 w-auto sm:min-w-[200px] border-0 shadow-none text-xs font-medium uppercase tracking-[0.2em] h-auto py-1">
          <SelectValue>Sort {SORT_LABELS[sort]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
            <SelectItem key={opt} value={opt}>
              {SORT_LABELS[opt]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
