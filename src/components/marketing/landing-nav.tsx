"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

const links = [
  { href: "#platform-capabilities", label: "Platform" },
  { href: "#role-experience", label: "Roles" },
  { href: "#analytics", label: "Analytics" },
  { href: "#governance", label: "Governance" },
];

export function LandingNav() {
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { 
        rootMargin: "-20% 0px -60% 0px", // Trigger when the section reaches the top 20%
      } 
    );

    const sections = document.querySelectorAll("section[id]");
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  return (
    <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
      {links.map((link) => {
        const id = link.href.replace("#", "");
        const isActive = activeSection === id;
        
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "transition-colors hover:text-foreground",
              isActive ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
