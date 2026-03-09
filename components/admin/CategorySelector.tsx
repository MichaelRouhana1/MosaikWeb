import { Label } from "@/components/ui/label";
import type { ProductCategory } from "@/actions/categories";

interface CategorySelectorProps {
    categories: ProductCategory[];
}

export function CategorySelector({ categories }: CategorySelectorProps) {
    return (
        <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select
                id="category"
                name="category"
                required
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
                <option value="">Select category</option>
                {categories.map((cat) => (
                    <option key={cat.id} value={cat.slug}>
                        {cat.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
