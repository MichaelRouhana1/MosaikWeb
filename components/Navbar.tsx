"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useAuth } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useCart } from "@/context/CartContext";
import { CartDrawer } from "@/components/CartDrawer";

const NAV_LINKS = [
  { label: "Shop", href: "/shop" },
  { label: "New", href: "/shop?sort=newest" },
  { label: "Collections", href: "/shop" },
  { label: "Editorial", href: "/shop" },
  { label: "About", href: "/about" },
];

export function Navbar() {
  const pathname = usePathname();
  const { sessionClaims } = useAuth();
  const { totalItems, setOpenCart } = useCart();
  const { theme, setTheme } = useTheme();
  const [cartOpen, setCartOpen] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  useEffect(() => {
    setOpenCart(() => () => setCartOpen(true));
  }, [setOpenCart]);
  const isAdmin = (sessionClaims?.metadata as { role?: string })?.role === "admin";

  if (pathname?.startsWith("/admin")) return null;
  if (pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up")) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-14">
          {/* Left: Primary navigation - flush left */}
          <div className="flex items-center gap-6 sm:gap-8 shrink-0">
            {isAdmin && (
              <Link
                href="/admin"
                className="text-sm font-normal text-foreground hover:opacity-70 transition-opacity"
              >
                Dashboard
              </Link>
            )}
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-sm font-normal text-foreground hover:opacity-70 transition-opacity"
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Center: Logo */}
          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2 text-xl font-light text-foreground tracking-[0.25em] uppercase hover:opacity-70 transition-opacity shrink-0"
          >
            MOSAIK
          </Link>

          {/* Right: Search, Theme toggle, Account, Cart - flush right */}
          <div className="flex items-center gap-6 sm:gap-8 shrink-0">
            <Link
              href="/shop"
              className="text-sm font-normal text-foreground hover:opacity-70 transition-opacity"
            >
              Search
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 text-foreground hover:opacity-70 transition-opacity"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <div className="flex items-center gap-2">
              <Link
                href="/account"
                className="text-sm font-normal text-foreground hover:opacity-70 transition-opacity"
              >
                Account
              </Link>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-5 h-5",
                  },
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="flex items-center gap-2 text-sm font-normal text-foreground hover:opacity-70 transition-opacity"
              aria-label="Cart"
            >
              Cart
              <span className="relative">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background text-[10px] font-medium">
                    {totalItems > 99 ? "99+" : totalItems}
                  </span>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </nav>
  );
}
