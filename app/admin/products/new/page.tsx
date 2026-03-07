import { CreateProductForm } from "@/components/CreateProductForm";
import { getCategories } from "@/actions/categories";
import { getAdminStoreType } from "@/actions/admin-store";

export default async function CreateProductPage() {
  const storeType = await getAdminStoreType();
  const categories = await getCategories(storeType);
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Create Product</h1>
      <CreateProductForm categories={categories} initialStoreType={storeType} />
    </div>
  );
}
