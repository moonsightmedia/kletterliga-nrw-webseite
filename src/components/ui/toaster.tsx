import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { AlertCircle, Bell, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const isHeaderlessAuthRoute = (pathname: string) =>
  pathname === "/app/login" || pathname === "/app/register";

const isAuthRoute = (pathname: string) =>
  pathname.startsWith("/app/auth/") ||
  pathname.startsWith("/app/invite/") ||
  pathname.startsWith("/app/register") ||
  pathname.startsWith("/app/login");

const isAdminRoute = (pathname: string) => pathname.startsWith("/app/admin");

const isParticipantRoute = (pathname: string) =>
  pathname === "/app" || (pathname.startsWith("/app/") && !isAdminRoute(pathname) && !isAuthRoute(pathname));

const getViewportPlacementClasses = (pathname: string) => {
  if (isAdminRoute(pathname)) {
    return "top-[3.8125rem] px-0 md:left-[calc(16rem+1.25rem)] md:right-5 md:top-5 lg:left-[calc(16rem+2rem)] lg:right-8 lg:top-8";
  }

  if (isHeaderlessAuthRoute(pathname)) {
    return "top-4 px-4 sm:top-6 sm:px-6";
  }

  if (isAuthRoute(pathname)) {
    return "top-24 px-4 sm:top-28 sm:px-6";
  }

  if (isParticipantRoute(pathname)) {
    return "top-16 px-0";
  }

  return "top-4 px-4 sm:top-6 sm:px-6";
};

const getToastMeta = (variant: "default" | "success" | "destructive" = "default") => {
  if (variant === "destructive") {
    return {
      icon: AlertCircle,
      iconWrapperClassName: "bg-[#ba1a1a]/10 text-[#ba1a1a]",
      titleClassName: "font-['Space_Grotesk'] font-bold tracking-tight text-[#93000a]",
      descriptionClassName: "text-[#93000a]/72",
      closeClassName: "text-[#93000a]/40 hover:text-[#93000a]",
    };
  }

  if (variant === "success") {
    return {
      icon: Check,
      iconWrapperClassName: "bg-emerald-600/10 text-emerald-700",
      titleClassName: "font-['Space_Grotesk'] font-bold tracking-tight text-[#002637]",
      descriptionClassName: "text-[#002637]/70",
      closeClassName: "text-[#002637]/40 hover:text-[#002637]",
    };
  }

  return {
    icon: Bell,
    iconWrapperClassName: "bg-[#003d55]/10 text-[#003d55]",
    titleClassName: "font-['Space_Grotesk'] font-bold tracking-tight text-[#002637]",
    descriptionClassName: "text-[#002637]/70",
    closeClassName: "text-[#002637]/40 hover:text-[#002637]",
  };
};

export function Toaster() {
  const { toasts } = useToast();
  const location = useLocation();
  const viewportClassName = useMemo(
    () => getViewportPlacementClasses(location.pathname),
    [location.pathname],
  );

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const meta = getToastMeta(variant);
        const Icon = meta.icon;

        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  meta.iconWrapperClassName,
                )}
              >
                <Icon className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                {title ? (
                  <ToastTitle className={cn("text-sm leading-tight", meta.titleClassName)}>
                    {title}
                  </ToastTitle>
                ) : null}
                {description ? (
                  <ToastDescription
                    className={cn("mt-1 text-xs leading-snug sm:text-sm", meta.descriptionClassName)}
                  >
                    {description}
                  </ToastDescription>
                ) : null}
              </div>
            </div>
            {action}
            <ToastClose
              className={cn(
                "mt-0.5 shrink-0 opacity-100",
                meta.closeClassName,
              )}
            />
          </Toast>
        );
      })}
      <ToastViewport className={viewportClassName} />
    </ToastProvider>
  );
}
