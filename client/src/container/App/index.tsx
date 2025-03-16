import { useLocation, Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AppHeader } from "@/components/layout/app-header";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import PlaygroundPage from "@/pages/playground-page";
import ProfilePage from "@/pages/profile-page";
import SettingsPage from "@/pages/settings-page";
import { AuthProvider } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { ProtectedRoute } from "@/lib/protected-route";

function AppContainer() {
    const [location] = useLocation();
    const isAuthRoute = location === "/auth";

    return (
        <>
            {!isAuthRoute && <AppHeader />}
            <main>
                <Switch>
                    <ProtectedRoute path="/" component={HomePage} />
                    <ProtectedRoute path="/playground" component={PlaygroundPage} />
                    <ProtectedRoute path="/playground/:id" component={PlaygroundPage} />
                    <ProtectedRoute path="/profile" component={ProfilePage} />
                    <ProtectedRoute path="/settings" component={SettingsPage} />
                    <Route path="/auth" component={AuthPage} />
                    <Route component={NotFound} />
                </Switch>
            </main>
        </>
    );
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <AppContainer />
                <Toaster />
            </AuthProvider>
        </QueryClientProvider>
    );
}

export default App;
