"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedProgressProps {
  value: number | string;
  axis?: "width" | "height";
  className?: string;
  delay?: number;
}

export function AnimatedProgress({ value, axis = "width", className, delay = 0 }: AnimatedProgressProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-1000 ease-[cubic-bezier(0.2,0,0,1)]",
        className
      )}
      style={{
        [axis]: isVisible ? (typeof value === "number" ? `${value}%` : value) : "0%",
        transitionDelay: `${delay}ms`,
      }}
    />
  );
}
