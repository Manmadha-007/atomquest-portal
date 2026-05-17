"use client";

import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function MicrosoftSignInButton() {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={() =>
        signIn("microsoft-entra-id", {
          callbackUrl: "/dashboard",
        })
      }
    >
      Continue with Microsoft
    </Button>
  );
}