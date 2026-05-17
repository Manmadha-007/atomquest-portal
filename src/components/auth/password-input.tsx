"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";

export function PasswordInput() {
  const [showPassword, setShowPassword] =
    useState(false);

  return (
    <div className="relative">
      <Input
        id="password"
        name="password"
        type={
          showPassword
            ? "text"
            : "password"
        }
        autoComplete="current-password"
        placeholder="••••••••"
        required
        className="h-10 bg-background pr-11"
      />

      <button
        type="button"
        onClick={() =>
          setShowPassword(
            (previous) => !previous,
          )
        }
        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
        aria-label={
          showPassword
            ? "Hide password"
            : "Show password"
        }
      >
        {showPassword ? (
          <EyeOff
            className="size-4"
            aria-hidden="true"
          />
        ) : (
          <Eye
            className="size-4"
            aria-hidden="true"
          />
        )}
      </button>
    </div>
  );
}