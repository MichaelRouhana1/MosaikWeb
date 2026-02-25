import {
  pgTable,
  serial,
  text,
  decimal,
  boolean,
  integer,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const productCategoryEnum = pgEnum("product_category", [
  "CLOTHING",
  "SHOES",
  "ACCESSORIES",
  "BAGS",
  "OTHER",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);

export const promoDiscountTypeEnum = pgEnum("promo_discount_type", [
  "PERCENTAGE",
  "FIXED_AMOUNT",
  "FREE_SHIPPING",
]);

// Product categories - admin-managed, slug used for shop filtering
export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  image: text("image"),
  showOnHome: boolean("show_on_home").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Products - category_slug references product_categories.slug
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }),
  category: productCategoryEnum("category").notNull(),
  categorySlug: text("category_slug"),
  color: text("color"),
  isVisible: boolean("is_visible").notNull().default(true),
});

// Product colors - each color has its own image gallery
export const productColors = pgTable("product_colors", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  hexCode: text("hex_code"),
  imageUrls: text("image_urls").array().notNull().default([]),
});

// ProductVariants - size + stock per color
export const productVariants = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  colorId: integer("color_id")
    .notNull()
    .references(() => productColors.id, { onDelete: "cascade" }),
  size: text("size").notNull(),
  stock: integer("stock").notNull().default(0),
});

// Promo codes
export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountType: promoDiscountTypeEnum("discount_type").notNull(),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  maxUses: integer("max_uses"),
  currentUses: integer("current_uses").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  guestEmail: text("guest_email"),
  customerName: text("customer_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  addressLine1: text("address_line1").notNull(),
  city: text("city").notNull(),
  subtotalAmount: decimal("subtotal_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  shippingFee: decimal("shipping_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  promoCodeId: integer("promo_code_id").references(() => promoCodes.id),
  status: orderStatusEnum("status").notNull().default("PENDING"),
  paymentMethod: text("payment_method").notNull().default("COD"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// OrderItems
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull(),
  size: text("size").notNull(),
  priceAtPurchase: decimal("price_at_purchase", {
    precision: 10,
    scale: 2,
  }).notNull(),
});

// Relations
export const productsRelations = relations(products, ({ many }) => ({
  variants: many(productVariants),
  colors: many(productColors),
  orderItems: many(orderItems),
  wishlistItems: many(wishlists),
}));

export const productColorsRelations = relations(productColors, ({ one, many }) => ({
  product: one(products),
  variants: many(productVariants),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products),
  color: one(productColors),
}));

export const promoCodesRelations = relations(promoCodes, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  promoCode: one(promoCodes),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders),
  product: one(products),
}));

// Home page video (single video for editorial section)
export const homeVideo = pgTable("home_video", {
  id: serial("id").primaryKey(),
  videoUrl: text("video_url").notNull(),
  caption: text("caption"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Section visibility settings (e.g. show/hide "Get the Look" on home page)
export const sectionSettings = pgTable("section_settings", {
  id: serial("id").primaryKey(),
  sectionKey: text("section_key").notNull().unique(),
  isVisible: boolean("is_visible").notNull().default(true),
});

// Get the Look section - admin-managed categories
export const lookbookItems = pgTable("lookbook_items", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  imageUrl: text("image_url").notNull(),
  href: text("href").notNull().default("/shop"),
  order: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Hero images for slideshow
export const heroImages = pgTable("hero_images", {
  id: serial("id").primaryKey(),
  imageUrl: text("image_url").notNull(),
  altText: text("alt_text"),
  order: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Wishlists
export const wishlists = pgTable("wishlists", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  product: one(products),
}));

// Exported types
export type ProductCategory = typeof productCategories.$inferSelect;
export type NewProductCategory = typeof productCategories.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type ProductColor = typeof productColors.$inferSelect;
export type NewProductColor = typeof productColors.$inferInsert;

export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;

export type PromoCode = typeof promoCodes.$inferSelect;
export type NewPromoCode = typeof promoCodes.$inferInsert;

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

export type Wishlist = typeof wishlists.$inferSelect;
export type NewWishlist = typeof wishlists.$inferInsert;

export type SectionSetting = typeof sectionSettings.$inferSelect;
export type NewSectionSetting = typeof sectionSettings.$inferInsert;

export type LookbookItem = typeof lookbookItems.$inferSelect;
export type NewLookbookItem = typeof lookbookItems.$inferInsert;

export type HeroImage = typeof heroImages.$inferSelect;
export type NewHeroImage = typeof heroImages.$inferInsert;

export type HomeVideo = typeof homeVideo.$inferSelect;
export type NewHomeVideo = typeof homeVideo.$inferInsert;
