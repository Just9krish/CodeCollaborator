import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Creates a login URL with redirect parameter
 * @param redirectPath - The path to redirect to after login
 * @returns Login URL with redirect query parameter
 */
export function createLoginUrl(redirectPath: string): string {
  return `/login?redirect=${encodeURIComponent(redirectPath)}`;
}

/**
 * Gets the redirect path from current URL query parameters
 * @returns The redirect path or '/' as fallback
 */
export function getRedirectPath(): string {
  const urlParams = new URLSearchParams(window.location.search);
  const redirect = urlParams.get("redirect");

  // Validate the redirect path to prevent open redirects
  if (!redirect) return "/";

  // Only allow internal paths (starting with /)
  if (!redirect.startsWith("/")) return "/";

  // Prevent redirects to auth pages to avoid loops
  if (redirect.startsWith("/login") || redirect.startsWith("/signup"))
    return "/";

  return redirect;
}

/**
 * Clears the redirect parameter from the current URL
 */
export function clearRedirectParam(): void {
  const newUrl = new URL(window.location.href);
  newUrl.searchParams.delete("redirect");
  window.history.replaceState({}, "", newUrl.toString());
}

/**
 * Checks if there's a redirect parameter in the current URL
 * @returns True if redirect parameter exists
 */
export function hasRedirectParam(): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.has("redirect");
}
