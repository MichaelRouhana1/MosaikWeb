"use client";

export function NewsletterForm() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-[480px] mx-auto text-center">
        <p className="text-sm font-normal text-foreground mb-6">
          Receive updates when new pieces are released.
        </p>
        <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
          <input
            type="email"
            placeholder="Email"
            className="flex-1 py-3 px-4 border border-border bg-transparent text-sm font-normal text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground transition-colors duration-200 rounded-md"
          />
          <button
            type="submit"
            className="px-6 py-3 text-sm font-normal text-foreground border border-foreground hover:bg-foreground hover:text-background transition-colors duration-200 rounded-md"
          >
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
}
