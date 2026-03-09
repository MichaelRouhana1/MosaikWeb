import { z } from "zod";

export const categorySchema = z.object({
    slug: z.string().min(1).trim().toLowerCase().regex(/^[a-z0-9-]+$/),
    label: z.string().min(1).trim(),
    showOnHome: z.boolean(),
    parentId: z.number().int().positive().nullable(),
    level: z.enum(["root", "main", "sub"]).default("main"),
    storeType: z.enum(["streetwear", "formal", "both"]).default("both"),
});

export const productSchema = z.object({
    name: z.string().min(1, "Name is required").trim(),
    description: z.string().trim().nullable().optional(),
    price: z.string().min(1).regex(/^\d+(\.\d{1,2})?$/, "Valid price is required"),
    categorySlug: z.string().min(1),
    storeType: z.enum(["streetwear", "formal", "both"]).default("both"),
    isVisible: z.boolean(),
    color_count: z.number().int().min(1, "Add at least one color"),
});

export const updateProductSchema = z.object({
    name: z.string().min(1, "Name is required").trim(),
    description: z.string().trim().nullable().optional(),
    price: z.string().min(1).regex(/^\d+(\.\d{1,2})?$/, "Valid price is required"),
    categorySlug: z.string().min(1),
    isVisible: z.boolean(),
    color_count: z.number().int().min(1, "Add at least one color"),
});
