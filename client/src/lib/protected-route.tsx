import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";
import { createLoginUrl } from "./utils";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element | null;
}) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    // Store the actual current path in query parameter before redirecting
    const redirectUrl = createLoginUrl(location);
    return (
      <Route path={path}>
        <Redirect to={redirectUrl} />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
