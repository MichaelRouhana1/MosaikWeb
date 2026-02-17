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

// Products - category_slug matches landing page: trousers, shirts, tshirts, hoodies, jackets, jeans
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  category: productCategoryEnum("category").notNull(),
  categorySlug: text("category_slug"),
  color: text("color"),
  images: text("images").array().notNull().default([]),
  isVisible: boolean("is_visible").notNull().default(true),
});

// ProductVariants
export const productVariants = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  size: text("size").notNull(),
  stock: integer("stock").notNull().default(0),
  sku: text("sku").notNull(),
});

// Orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  guestEmail: text("guest_email"),
  customerName: text("customer_name"),
  phoneNumber: text("phone_number"),
  addressLine1: text("address_line1"),
  city: text("city"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
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
  orderItems: many(orderItems),
  wishlistItems: many(wishlists),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products),
}));

export const ordersRelations = relations(orders, ({ many }) => ({
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
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

export type Wishlist = typeof wishlists.$inferSelect;
export type NewWishlist = typeof wishlists.$inferInsert;

export type LookbookItem = typeof lookbookItems.$inferSelect;
export type NewLookbookItem = typeof lookbookItems.$inferInsert;

export type HeroImage = typeof heroImages.$inferSelect;
export type NewHeroImage = typeof heroImages.$inferInsert;

export type HomeVideo = typeof homeVideo.$inferSelect;
export type NewHomeVideo = typeof homeVideo.$inferInsert;
