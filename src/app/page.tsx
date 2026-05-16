import type { Metadata } from "next";

import { AnalyticsPreview } from "@/components/marketing/analytics-preview";
import { CtaFooter } from "@/components/marketing/cta-footer";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { GovernanceSection } from "@/components/marketing/governance-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { RoleShowcase } from "@/components/marketing/role-showcase";
import { SiteHeader } from "@/components/marketing/site-header";

export const metadata: Metadata = {
  title: "AtomQuest | Enterprise Goal Execution Intelligence",
  description:
    "Enterprise goal execution, governance, and workforce performance intelligence for quarterly operating rhythms.",
};

export default function Home() {
  return (
    <main className="min-h-svh overflow-hidden bg-background text-foreground">
      <SiteHeader />
      <HeroSection />
      <FeatureGrid />
      <RoleShowcase />
      <AnalyticsPreview />
      <GovernanceSection />
      <CtaFooter />
    </main>
  );
}
