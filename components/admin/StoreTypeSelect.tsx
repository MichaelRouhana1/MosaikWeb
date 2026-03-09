import { Label } from "@/components/ui/label";

interface StoreTypeSelectProps {
    initialStoreType: "streetwear" | "formal" | "both";
}

export function StoreTypeSelect({ initialStoreType }: StoreTypeSelectProps) {
    return (
        <div className="space-y-2">
            <Label htmlFor="storeType">Store Type</Label>
            <select
                id="storeType"
                name="storeType"
                required
                defaultValue={initialStoreType}
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
                <option value="both">Both</option>
                <option value="streetwear">Streetwear</option>
                <option value="formal">Formal</option>
            </select>
        </div>
    );
}
