"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function MicrosoftSignInButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    await signIn("microsoft-entra-id", {
      callbackUrl: "/dashboard",
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="h-10 w-full bg-background transition-colors hover:bg-muted/50"
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="mr-2.5 size-[18px] animate-spin text-muted-foreground" aria-hidden="true" />
      ) : (
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
      )}
      {isLoading ? "Signing in with Microsoft..." : "Continue with Microsoft"}
    </Button>
  );
}