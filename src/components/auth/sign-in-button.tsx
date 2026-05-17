"use client";

import { useFormStatus } from "react-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignInButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="h-10" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
          Authenticating...
        </>
      ) : (
        <>
          Enter Workspace
          <ArrowRight className="ml-2 size-4" aria-hidden="true" />
        </>
      )}
    </Button>
  );
}
