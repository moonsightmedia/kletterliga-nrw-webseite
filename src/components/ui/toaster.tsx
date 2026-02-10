import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { CheckCircle2, AlertCircle } from "lucide-react";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        // Icon basierend auf Variante
        const icon = variant === "success" ? (
          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
        ) : variant === "destructive" ? (
          <AlertCircle className="h-5 w-5 text-destructive-foreground flex-shrink-0" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
        );

        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-start gap-3 flex-1">
              {icon}
              <div className="grid gap-1 flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
