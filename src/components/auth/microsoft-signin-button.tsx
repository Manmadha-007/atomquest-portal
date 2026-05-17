"use client";

import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function MicrosoftSignInButton() {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-10 w-full bg-background transition-colors hover:bg-muted/50"
      onClick={() =>
        signIn("microsoft-entra-id", {
          callbackUrl: "/dashboard",
        })
      }
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 21 21"
        className="mr-2.5 size-[18px]"
        aria-hidden="true"
      >
        <rect x="1" y="1" width="9" height="9" fill="#f25022" />
        <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
        <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
        <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
      </svg>
      Continue with Microsoft
    </Button>
  );
}