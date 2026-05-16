"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TypewriterTextProps {
  text: string;
  className?: string;
  as?: React.ElementType;
  delay?: number;
  speed?: number;
  duration?: number;
}

export function TypewriterText({ 
  text, 
  className, 
  as: Component = "span",
  delay = 100, 
  speed,
  duration
}: TypewriterTextProps) {
  const computedSpeed = duration ? Math.max(duration / text.length, 10) : (speed || 60);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showEndCursor, setShowEndCursor] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let index = 0;

    const startTyping = () => {
      const typeChar = () => {
        if (index < text.length) {
          index++;
          setCurrentIndex(index);
          const currentSpeed = computedSpeed + (Math.random() * 10 - 5);
          timeout = setTimeout(typeChar, currentSpeed);
        } else {
          setShowEndCursor(true);
          timeout = setTimeout(() => {
            setShowEndCursor(false);
          }, 3000);
        }
      };
      typeChar();
    };

    timeout = setTimeout(startTyping, delay);

    return () => clearTimeout(timeout);
  }, [text, delay, computedSpeed]);

  return (
    <Component className={cn("relative", className)}>
      {currentIndex === 0 && (
        <span className="absolute top-1/2 -translate-y-1/2 left-0 w-[3px] h-[0.85em] bg-foreground animate-pulse" />
      )}
      {text.split("").map((char, index) => {
        const isTyped = index < currentIndex;
        const showCursor = index === currentIndex - 1 && (currentIndex < text.length || showEndCursor);

        return (
          <span
            key={index}
            className={cn(
              "relative transition-colors duration-150",
              isTyped ? "text-foreground" : "text-transparent select-none"
            )}
          >
            {char}
            {showCursor && (
              <span className="absolute top-1/2 -translate-y-1/2 left-full w-[3px] h-[0.85em] bg-foreground animate-pulse ml-[1px]" />
            )}
          </span>
        );
      })}
    </Component>
  );
}
