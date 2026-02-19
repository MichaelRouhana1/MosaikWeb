"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table";
import { StockHoverCell } from "./StockHoverCell";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { deleteProduct } from "@/actions/deleteProduct";
import { applyBulkDiscount, removeBulkDiscount } from "@/actions/bulk-discount";
import { toast } from "sonner";

interface ProductWithMeta {
  id: number;
  name: string;
  description: string | null;
  price: string;
  salePrice: string | null;
  category: string;
  images: string[];
  isVisible: boolean;
  totalStock: number;
  stockBySize?: Record<string, number>;
  categoryLabel: string;
  colorLabel: string;
}

interface ProductCategoryRow {
  id: number;
  slug: string;
  label: string;
}

interface ProductsTableProps {
  products: ProductWithMeta[];
  initialQuery?: string;
  initialCategory?: string;
  categories: ProductCategoryRow[];
}

export function ProductsTable({
  products,
  initialQuery = "",
  initialCategory = "all",
  categories,
}: ProductsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [discountPercent, setDiscountPercent] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) params.set("q", query);
    else params.delete("q");
    if (category && category !== "all") params.set("category", category);
    else params.delete("category");
    router.push(`/admin/products?${params.toString()}`);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set("category", value);
    else params.delete("category");
    router.push(`/admin/products?${params.toString()}`);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await deleteProduct(id);
    router.refresh();
  };

  const selectedIds = Object.keys(rowSelection)
    .filter((key) => rowSelection[key])
    .map(Number);
  const selectedCount = selectedIds.length;

  const handleApplyDiscount = async () => {
    const pct = parseFloat(discountPercent);
    if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) {
      toast.error("Enter a valid percentage (e.g. 20)");
      return;
    }
    setIsApplying(true);
    try {
      await applyBulkDiscount(selectedIds, "PERCENTAGE", pct);
      toast.success(`Discount applied to ${selectedCount} product(s)`);
      setRowSelection({});
      setDiscountModalOpen(false);
      setDiscountPercent("");
      router.refresh();
    } catch {
      toast.error("Failed to apply discount");
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemoveDiscount = async () => {
    setIsRemoving(true);
    try {
      await removeBulkDiscount(selectedIds);
      toast.success(`Discount removed from ${selectedCount} product(s)`);
      setRowSelection({});
      router.refresh();
    } catch {
      toast.error("Failed to remove discount");
    } finally {
      setIsRemoving(false);
    }
  };

  const columns: ColumnDef<ProductWithMeta>[] = [
    {
      id: "select",
      size: 40,
      header: ({ table }) => (
        <div className="w-10">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
        </div>
      ),
      cell: ({ row }) => (
        <div className="w-10">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Product",
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 shrink-0 bg-muted overflow-hidden rounded">
              {p.images[0] ? (
                <Image
                  src={p.images[0]}
                  alt={p.name}
                  fill
                  className="object-cover"
                  sizes="48px"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
                  —
                </div>
              )}
            </div>
            <span className="font-medium">{p.name}</span>
          </div>
        );
      },
    },
    { accessorKey: "categoryLabel", header: "Category" },
    {
      id: "stock",
      header: "Stock",
      cell: ({ row }) => (
        <StockHoverCell
          totalStock={row.original.totalStock}
          stockBySize={row.original.stockBySize ?? {}}
        />
      ),
    },
    {
      id: "price",
      header: "Price",
      cell: ({ row }) => {
        const p = row.original;
        const price = typeof p.price === "string" ? p.price : String(p.price);
        const salePrice = p.salePrice;
        return (
          <span>
            {salePrice ? (
              <>
                <span className="line-through text-muted-foreground">${price}</span>{" "}
                <span className="text-destructive font-medium">${salePrice}</span>
              </>
            ) : (
              `$${price}`
            )}
          </span>
        );
      },
    },
    { accessorKey: "colorLabel", header: "Color" },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
            row.original.isVisible
              ? "bg-muted text-foreground"
              : "bg-muted/50 text-muted-foreground"
          }`}
        >
          {row.original.isVisible ? "Visible" : "Hidden"}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="text-right block">Actions</span>,
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="text-right">
            <Link
              href={`/admin/products/${p.id}/edit`}
              className="text-foreground hover:underline mr-4"
            >
              Edit
            </Link>
            <button
              type="button"
              onClick={() => handleDelete(p.id, p.name)}
              className="text-destructive hover:underline"
            >
              Delete
            </button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: products,
    columns,
    getRowId: (row) => String(row.id),
    state: { rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Search by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="max-w-xs"
        />
        <Button onClick={handleSearch} variant="default">
          Search
        </Button>
        <Select value={category} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            {[
              { value: "all", label: "All categories" },
              ...categories.map((c) => ({ value: c.slug, label: c.label })),
            ].map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg border border-border">
          <span className="text-sm font-medium">
            {selectedCount} product{selectedCount !== 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemoveDiscount}
              disabled={isRemoving}
            >
              {isRemoving ? "Removing…" : "Remove Discount"}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setDiscountModalOpen(true)}
              disabled={isApplying}
            >
              Apply Discount
            </Button>
          </div>
        </div>
      )}

      <div className="border border-border rounded-md overflow-visible">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-2 text-center text-muted-foreground"
                >
                  No products found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-border hover:bg-muted/30"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 overflow-visible">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={discountModalOpen} onOpenChange={setDiscountModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply bulk discount</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label
                htmlFor="discount-percent"
                className="text-sm font-medium"
              >
                Discount percentage
              </label>
              <Input
                id="discount-percent"
                type="number"
                min={1}
                max={99}
                placeholder="e.g. 20"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDiscountModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplyDiscount}
              disabled={isApplying || !discountPercent.trim()}
            >
              {isApplying ? "Applying…" : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
