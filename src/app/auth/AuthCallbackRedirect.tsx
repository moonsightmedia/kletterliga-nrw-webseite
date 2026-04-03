import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type CallbackLocation = {
  pathname: string;
  search: string;
  hash: string;
};

const stripLeadingCharacter = (value: string, character: string) =>
  value.startsWith(character) ? value.slice(1) : value;

const getSearchParams = (value: string, leadingCharacter: string) =>
  new URLSearchParams(stripLeadingCharacter(value, leadingCharacter));

const isSupabaseHashCallback = (hash: string) => {
  if (!hash || hash === "#") {
    return false;
  }

  const params = getSearchParams(hash, "#");
  const type = params.get("type");

  return (
    params.has("access_token") ||
    params.has("refresh_token") ||
    params.has("error_code") ||
    type === "signup" ||
    type === "magiclink" ||
    type === "recovery"
  );
};

const isSupabaseQueryCallback = (search: string) => {
  if (!search || search === "?") {
    return false;
  }

  const params = getSearchParams(search, "?");
  return params.has("token_hash") || params.has("error_code");
};

const getCallbackType = ({ search, hash }: Pick<CallbackLocation, "search" | "hash">) => {
  const searchType = getSearchParams(search, "?").get("type");
  if (searchType) {
    return searchType;
  }

  return getSearchParams(hash, "#").get("type");
};

export const getAuthCallbackRedirectTarget = ({ pathname, search, hash }: CallbackLocation) => {
  const hasAuthPayload = isSupabaseHashCallback(hash) || isSupabaseQueryCallback(search);
  if (!hasAuthPayload) {
    return null;
  }

  const type = getCallbackType({ search, hash });
  const targetPath = type === "recovery" ? "/app/auth/reset-password" : "/app/auth/confirm";

  if (pathname === targetPath) {
    return null;
  }

  return `${targetPath}${search}${hash}`;
};

export const AuthCallbackRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const target = getAuthCallbackRedirectTarget(location);
    if (!target) {
      return;
    }

    navigate(target, { replace: true });
  }, [location, navigate]);

  return null;
};
