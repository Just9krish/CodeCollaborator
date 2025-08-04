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
const registerSchema = insertUserSchema
  .extend({
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    email: z.string().email("Invalid email address"),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function SignupPage() {
  const { user, registerMutation } = useAuth();
  const [location, navigate] = useLocation();

  // Handle redirect after successful registration
  useEffect(() => {
    if (user) {
      const redirectPath = getRedirectPath();
      clearRedirectParam();
      navigate(redirectPath);
    }
  }, [user, navigate]);

  // Registration form
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
    },
  });

  const onRegisterSubmit = (values: z.infer<typeof registerSchema>) => {
    const { confirmPassword, ...userData } = values;
    registerMutation.mutate(userData);
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

      {/* Signup Form Section */}
      <div className="md:w-1/2 bg-background/90 p-6 md:p-12 flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto bg-background border-border">
          <CardHeader>
            <CardTitle className="text-2xl text-foreground">
              Create Account
            </CardTitle>
            <CardDescription>
              Join CodeCollab to start collaborating
              {hasRedirectParam() && (
                <div className="mt-2 text-sm text-blue-600">
                  You'll be redirected after registration
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...registerForm}>
              <form
                onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={registerForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Choose a username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Create a password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Confirm your password"
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
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Create Account
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login">
                <Button variant="link" className="p-0 text-primary">
                  Sign In
                </Button>
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
