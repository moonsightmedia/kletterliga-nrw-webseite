import type { ComponentProps } from "react";
import { RouteLoadingState } from "@/app/components/RouteLoadingState";
import { AppStartupLoadingState } from "@/app/components/AppStartupLoadingState";
import { shouldShowAppStartupSplash } from "@/app/startup/appStartupSplash";

type AppRouteLoadingStateProps = Pick<
  ComponentProps<typeof RouteLoadingState>,
  "title" | "description"
> & {
  pathname: string;
};

export const AppRouteLoadingState = ({
  title,
  description,
  pathname,
}: AppRouteLoadingStateProps) => {
  if (shouldShowAppStartupSplash(pathname)) {
    return <AppStartupLoadingState title={title} description={description} />;
  }

  return <RouteLoadingState title={title} description={description} />;
};
