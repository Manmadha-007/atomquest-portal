import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SIGN_IN_PATH } from "@/lib/auth";



import { InteractiveGrid } from "./interactive-grid";
import { DashboardPreview } from "./dashboard-preview";
import { TypewriterText } from "@/components/ui/typewriter-text";
import { Badge } from "@/components/ui/badge";


export function HeroSection() {
  return (
    <section className="relative isolate border-b bg-[linear-gradient(180deg,#fafafa_0%,#ffffff_58%,#f8fafc_100%)]">
      <InteractiveGrid />

      <div className="mx-auto flex w-full max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 pb-12 pt-20 sm:pb-16 sm:pt-24 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-12 lg:pb-16 lg:pt-24">
          <div className="max-w-3xl space-y-8">
            <div className="space-y-5">
              <Badge
                variant="outline"
                className="h-7 rounded-md border-foreground/10 bg-background/80 px-3 text-muted-foreground shadow-sm"
              >
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                Enterprise execution intelligence
              </Badge>

              <div className="space-y-5">
                <TypewriterText
                  as="h1"
                  className="max-w-4xl text-balance font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
                  text="Enterprise goal execution, governance, and workforce performance intelligence in one platform."
                  duration={1800}
                />
                <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                  AtomQuest turns quarterly objectives into an accountable
                  operating system for employees, managers, and administrators,
                  with governed workflows, shared KPI propagation, audit-ready
                  decisions, and executive analytics.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row mt-4">
              <Button asChild size="lg" className="h-12 px-8 min-w-[200px]">
                <Link href={SIGN_IN_PATH}>
                  Sign In
                  <ArrowRight className="size-4 ml-2" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 bg-background/80 px-8 min-w-[200px]"
              >
                <Link href="#platform-capabilities">Explore Platform</Link>
              </Button>
            </div>


          </div>

          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}
