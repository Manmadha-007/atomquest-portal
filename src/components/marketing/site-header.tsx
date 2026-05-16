import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SIGN_IN_PATH } from "@/lib/auth";
import { LandingNav } from "./landing-nav";

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-lg bg-foreground text-sm font-semibold text-background shadow-sm">
            AQ
          </span>
          <span className="grid">
            <span className="text-sm font-semibold leading-none">AtomQuest</span>
          </span>
        </Link>

        <LandingNav />

        <Button asChild variant="default" size="sm" className="h-9 px-5 font-medium shadow-sm transition-all hover:bg-primary/90 hover:shadow-md">
          <Link href={SIGN_IN_PATH}>Sign In</Link>
        </Button>
      </div>
    </header>
  );
}
