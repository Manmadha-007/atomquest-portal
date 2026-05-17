import type { Metadata } from "next";
import Link from "next/link";
import { AuthError } from "next-auth";
import {
  ArrowLeft,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";

import { LoginShowcase } from "@/components/auth/login-showcase";
import { SignInButton } from "@/components/auth/sign-in-button";
import { AnimatedSection } from "@/components/marketing/animated-section";
import { InteractiveGrid } from "@/components/marketing/interactive-grid";
import { Button } from "@/components/ui/button";
import { MicrosoftSignInButton } from "@/components/auth/microsoft-signin-button";
import { PasswordInput } from "@/components/auth/password-input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  SIGN_IN_PATH,
  getSafeDashboardCallbackPath,
} from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign In | AtomQuest",
  description:
    "Secure enterprise workspace access for AtomQuest goal execution and governance.",
};

type SignInPageProps = {
  searchParams: Promise<{
    callbackUrl?: string | string[];
    error?: string | string[];
  }>;
};

function getFirstSearchParam(
  value?: string | string[],
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getAuthErrorMessage(
  error?: string,
): string | null {
  if (!error) {
    return null;
  }

  switch (error) {
    case "CredentialsSignin":
      return "The email or password did not match an active AtomQuest workspace account.";

    case "Configuration":
      return "Authentication could not be completed due to a configuration issue.";

    default:
      return "Authentication could not be completed. Please verify the account and try again.";
  }
}

async function authenticate(formData: FormData) {
  "use server";

  const email = formData.get("email")?.toString().trim();

  const password = formData
    .get("password")
    ?.toString();

  const callbackUrl =
    getSafeDashboardCallbackPath(
      formData.get("callbackUrl")?.toString(),
    );

  if (!email || !password) {
    const params = new URLSearchParams({
      callbackUrl,
      error: "CredentialsSignin",
    });

    redirect(`${SIGN_IN_PATH}?${params.toString()}`);
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const params = new URLSearchParams({
        callbackUrl,
        error:
          error.type === "CredentialsSignin"
            ? "CredentialsSignin"
            : "Configuration",
      });

      redirect(
        `${SIGN_IN_PATH}?${params.toString()}`,
      );
    }

    throw error;
  }
}

export default async function SignInPage({
  searchParams,
}: SignInPageProps) {
  const params = await searchParams;

  const callbackUrl =
    getSafeDashboardCallbackPath(
      getFirstSearchParam(params.callbackUrl),
    );

  const errorMessage = getAuthErrorMessage(
    getFirstSearchParam(params.error),
  );

  return (
    <main className="relative isolate min-h-svh overflow-hidden bg-[linear-gradient(180deg,#fafafa_0%,#ffffff_58%,#f8fafc_100%)] text-foreground">
      <InteractiveGrid />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-foreground text-sm font-semibold text-background shadow-sm">
              AQ
            </span>

            <span className="grid">
              <span className="text-sm font-semibold leading-5">
                AtomQuest
              </span>

              <span className="text-xs text-muted-foreground">
                Goal Operations
              </span>
            </span>
          </Link>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="bg-background/80"
          >
            <Link href="/">
              <ArrowLeft
                className="size-3.5"
                aria-hidden="true"
              />
              Platform
            </Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col px-4 pt-20 sm:px-6 lg:px-8">
        <div className="grid flex-1 gap-8 py-4 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-12 lg:py-6">
          <LoginShowcase />

          <AnimatedSection
            delay={100}
            className="mx-auto flex w-full max-w-md flex-col gap-4 lg:mx-0 lg:justify-self-end"
          >
            <Card className="rounded-lg bg-background/95 shadow-2xl shadow-slate-900/10">
              <CardHeader className="gap-4 border-b p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-slate-950 text-slate-50">
                    <LockKeyhole
                      className="size-5"
                      aria-hidden="true"
                    />
                  </div>

                  <div className="rounded-md border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    RBAC secured
                  </div>
                </div>

                <div className="space-y-1.5">
                  <CardTitle className="text-xl tracking-tight sm:text-2xl">
                    Sign in to your enterprise workspace
                  </CardTitle>

                  <p className="text-sm leading-5 text-muted-foreground">
                    Access role-aware execution dashboards,
                    governed review workflows,
                    completion monitoring, and
                    audit-ready reporting.
                  </p>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5">
                <form
                  action={authenticate}
                  className="grid gap-4"
                >
                  <input
                    type="hidden"
                    name="callbackUrl"
                    value={callbackUrl}
                  />

                  {errorMessage ? (
                    <div
                      role="alert"
                      className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm leading-5 text-destructive"
                    >
                      {errorMessage}
                    </div>
                  ) : null}

                  <MicrosoftSignInButton />

                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/40" />
                    </div>

                    <div className="relative flex justify-center text-xs">
                      <span className="bg-background px-2 text-muted-foreground/60">
                        Or
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <label
                      htmlFor="email"
                      className="text-sm font-medium text-foreground"
                    >
                      Email
                    </label>

                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="Enter your email"
                      required
                      className="h-10 bg-background"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label
                      htmlFor="password"
                      className="text-sm font-medium text-foreground"
                    >
                      Password
                    </label>

                    <PasswordInput />
                  </div>

                  <SignInButton />

                  <div className="mt-1 flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
                    <ShieldCheck
                      className="mt-0.5 size-3.5 shrink-0 text-emerald-600"
                      aria-hidden="true"
                    />

                    Credentials are evaluated against
                    active workspace users and routed to
                    the correct employee, manager, or
                    admin workspace.
                  </div>
                </form>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>
      </div>
    </main>
  );
}