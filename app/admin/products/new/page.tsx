import { CreateProductForm } from "@/components/CreateProductForm";
import { getCategories } from "@/actions/categories";

export default async function CreateProductPage() {
  const categories = await getCategories();
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Create Product</h1>
      <CreateProductForm categories={categories} />
    </div>
  );
}
