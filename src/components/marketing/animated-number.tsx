"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  delay?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function AnimatedNumber({
  value,
  duration = 1500,
  delay = 0,
  className,
  prefix = "",
  suffix = "",
  decimals = 0,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;
    let timeoutId: NodeJS.Timeout;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timeoutId = setTimeout(() => {
            const animate = (timestamp: number) => {
              if (!startTime) startTime = timestamp;
              const progress = Math.min((timestamp - startTime) / duration, 1);
              
              // cubic-bezier(0.2, 0, 0, 1) approximation
              const easeProgress = 1 - Math.pow(1 - progress, 4);
              
              setCurrentValue(value * easeProgress);

              if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
              } else {
                setCurrentValue(value);
              }
            };
            animationFrame = requestAnimationFrame(animate);
          }, delay);
          
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [value, duration, delay]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {currentValue.toFixed(decimals)}
      {suffix}
    </span>
  );
}
