"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function InteractiveGrid({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isIdle, setIsIdle] = useState(true);
  const isIdleRef = useRef(true);

  const idleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrame = useRef<number | null>(null);

  // Physics state for smooth wandering
  const physics = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    targetX: 0,
    targetY: 0,
  });

  useEffect(() => {
    // Initialize physics target to center initially
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      physics.current.targetX = width / 2;
      physics.current.targetY = height / 2;
      physics.current.x = width / 2;
      physics.current.y = height / 2;
      setPosition({ x: width / 2, y: height / 2 });
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      physics.current.x = x;
      physics.current.y = y;
      physics.current.targetX = x;
      physics.current.targetY = y;

      setPosition({ x, y });
      setIsIdle(false);
      isIdleRef.current = false;

      if (idleTimeout.current) clearTimeout(idleTimeout.current);
      idleTimeout.current = setTimeout(() => {
        setIsIdle(true);
        isIdleRef.current = true;
      }, 1000); // 1s of no movement = idle
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  useEffect(() => {
    if (!isIdle) {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
      return;
    }

    let lastTime = performance.now();

    const animate = (time: number) => {
      if (!isIdleRef.current) return;

      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const p = physics.current;

        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 50) {
          p.targetX = width * 0.1 + Math.random() * (width * 0.8);
          p.targetY = height * 0.1 + Math.random() * (height * 0.8);
        }

        // Smooth acceleration
        const ax = dx * 0.1;
        const ay = dy * 0.1;

        p.vx += ax * delta;
        p.vy += ay * delta;

        // Friction
        p.vx *= 0.96;
        p.vy *= 0.96;

        // Speed limit
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > 150) {
          p.vx = (p.vx / speed) * 150;
          p.vy = (p.vy / speed) * 150;
        }

        p.x += p.vx * delta;
        p.y += p.vy * delta;

        setPosition({ x: p.x, y: p.y });
      }

      animationFrame.current = requestAnimationFrame(animate);
    };

    animationFrame.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
    };
  }, [isIdle]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={cn("absolute inset-0 overflow-hidden pointer-events-none -z-10", className)}
    >
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.2)_1px,transparent_1px)] bg-[size:42px_42px] transition-all duration-300"
        style={{
          maskImage: `radial-gradient(250px circle at ${position.x}px ${position.y}px, black 0%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(250px circle at ${position.x}px ${position.y}px, black 0%, transparent 100%)`,
        }}
      />
    </div>
  );
}
