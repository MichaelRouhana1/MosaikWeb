import { CreateProductForm } from "@/components/CreateProductForm";
import { getCategories } from "@/actions/categories";
import { getAdminStoreType } from "@/actions/admin-store";

export default async function CreateProductPage() {
  const categories = await getCategories();
  const storeType = await getAdminStoreType();
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Create Product</h1>
      <CreateProductForm categories={categories} initialStoreType={storeType} />
    </div>
  );
}
