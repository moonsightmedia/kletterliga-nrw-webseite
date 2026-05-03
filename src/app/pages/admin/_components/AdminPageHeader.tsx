import { StitchSectionHeading } from "@/app/components/StitchPrimitives";
import { cn } from "@/lib/utils";

type AdminPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
};

export const AdminPageHeader = ({ className, ...props }: AdminPageHeaderProps) => (
  <StitchSectionHeading className={cn("mb-6 md:mb-8", className)} {...props} />
);
