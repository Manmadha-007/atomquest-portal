"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      offset={24}
      visibleToasts={4}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:flex group-[.toaster]:w-full group-[.toaster]:items-start group-[.toaster]:gap-3 group-[.toaster]:rounded-xl group-[.toaster]:border group-[.toaster]:border-border/50 group-[.toaster]:bg-background/85 group-[.toaster]:px-4 group-[.toaster]:py-3.5 group-[.toaster]:text-sm group-[.toaster]:shadow-xl group-[.toaster]:backdrop-blur-xl group-[.toaster]:transition-all dark:group-[.toaster]:bg-zinc-950/85",
          title: "group-[.toast]:text-sm group-[.toast]:font-semibold group-[.toast]:text-foreground group-[.toast]:tracking-tight",
          description: "group-[.toast]:text-xs group-[.toast]:text-muted-foreground group-[.toast]:leading-relaxed",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:text-xs group-[.toast]:font-medium group-[.toast]:rounded-md group-[.toast]:px-3 group-[.toast]:h-8 group-[.toast]:transition-colors hover:group-[.toast]:bg-primary/90",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:text-xs group-[.toast]:font-medium group-[.toast]:rounded-md group-[.toast]:px-3 group-[.toast]:h-8 group-[.toast]:transition-colors hover:group-[.toast]:bg-accent hover:group-[.toast]:text-accent-foreground",
          icon: "group-[.toast]:[&>svg]:size-5 group-[.toast]:mt-0.5 group-[.toast]:shrink-0",
          success: "group-[.toast]:[&_[data-icon]]:text-emerald-600 dark:group-[.toast]:[&_[data-icon]]:text-emerald-500",
          error: "group-[.toast]:[&_[data-icon]]:text-rose-600 dark:group-[.toast]:[&_[data-icon]]:text-rose-500",
          warning: "group-[.toast]:[&_[data-icon]]:text-amber-600 dark:group-[.toast]:[&_[data-icon]]:text-amber-500",
          info: "group-[.toast]:[&_[data-icon]]:text-blue-600 dark:group-[.toast]:[&_[data-icon]]:text-blue-500",
          loader: "group-[.toast]:[&_[data-icon]]:text-muted-foreground",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-5" />,
        info: <InfoIcon className="size-5" />,
        warning: <TriangleAlertIcon className="size-5" />,
        error: <OctagonXIcon className="size-5" />,
        loading: <Loader2Icon className="size-5 animate-spin" />,
      }}
      {...props}
    />
  )
}

export { Toaster }
