import { useLocation, Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AppHeader } from "@/components/layout/app-header";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import LoginPage from "@/pages/login-page";
import SignupPage from "@/pages/signup-page";
import PlaygroundPage from "@/pages/playground-page";
import ProfilePage from "@/pages/profile-page";
import SettingsPage from "@/pages/settings-page";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import { queryClient } from "@/lib/queryClient";
import { ProtectedRoute } from "@/lib/protected-route";

function AppContainer() {
    const [location] = useLocation();
    const isAuthRoute = location === "/login" || location === "/signup";

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
                    <Route path="/login" component={LoginPage} />
                    <Route path="/signup" component={SignupPage} />
                    <Route path="/auth">
                        <Redirect to="/login" />
                    </Route>
                    <Route component={NotFound} />
                </Switch>
            </main>
        </>
    );
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <AuthProvider>
                    <AppContainer />
                    <Toaster />
                </AuthProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
}

export default App;
