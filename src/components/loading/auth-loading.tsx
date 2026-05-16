import { Loader2 } from "lucide-react";

export function AuthLoading() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-[linear-gradient(180deg,#fafafa_0%,#ffffff_58%,#f8fafc_100%)]">
      <div className="flex flex-col items-center gap-6">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg shadow-slate-900/5">
          <span className="font-semibold tracking-tight text-xl animate-pulse">AQ</span>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-muted-foreground/70" />
          <span className="animate-pulse">Establishing secure session...</span>
        </div>
      </div>
    </div>
  );
}
