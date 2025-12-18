import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { features } from "@shared/constant";
import {
  getRedirectPath,
  clearRedirectParam,
  hasRedirectParam,
} from "@/lib/utils";

// Extend the insert schema with validation rules
const loginSchema = insertUserSchema.extend({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function LoginPage() {
  const { user, loginMutation } = useAuth();
  const [location, navigate] = useLocation();

  // Handle redirect after successful login
  useEffect(() => {
    if (user) {
      const redirectPath = getRedirectPath();
      clearRedirectParam();
      navigate(redirectPath);
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onLoginSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(values);
  };

  if (user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Hero Section */}
      <div className="md:w-1/2 bg-background p-6 md:p-12 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start mb-6">
            <i className="ri-code-box-line text-primary text-3xl mr-2"></i>
            <h1 className="text-3xl font-bold text-foreground">CodeCollab</h1>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Collaborative Code Playground
          </h2>
          <p className="text-muted-foreground mb-6">
            Write, edit, and execute code in real-time with developers around
            the world. Seamlessly collaborate on coding projects with integrated
            chat and debugging tools.
          </p>
          <div className="grid grid-cols-2 gap-4 mb-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-muted p-4 rounded-lg">
                <i
                  className={`${feature.icon} ${feature.color} text-xl mb-2`}
                ></i>
                <h3 className="text-foreground font-medium mb-1">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Login Form Section */}
      <div className="md:w-1/2 bg-background/90 p-6 md:p-12 flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto bg-background border-border">
          <CardHeader>
            <CardTitle className="text-2xl text-foreground">
              Welcome Back
            </CardTitle>
            <CardDescription>
              Sign in to your CodeCollab account
              {hasRedirectParam() && (
                <div className="mt-2 text-sm text-blue-600">
                  You'll be redirected after login
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...loginForm}>
              <form
                onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="your-username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="********"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Sign In
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/signup">
                <Button variant="link" className="p-0 text-primary">
                  Create Account
                </Button>
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
