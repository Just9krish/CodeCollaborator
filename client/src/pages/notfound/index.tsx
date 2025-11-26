import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { AlertCircle, Home, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-svh w-full flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-lg mx-auto bg-background/95 backdrop-blur-sm border-border shadow-xl">
        <CardContent className="pt-8 pb-8 px-8">
          {/* Icon and Title */}
          <div className="text-center mb-6">
            <div className="relative inline-block mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <AlertCircle className="h-10 w-10 text-foreground" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-yellow-900">?</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Oops! Page Not Found
            </h1>
            <p className="text-muted-foreground text-lg">
              Looks like this page took a coding break!
            </p>
          </div>

          {/* Creative Message */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6 border border-border/50">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <Search className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  What happened here?
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The page you're looking for might have been moved, deleted, or
                  you typed the wrong URL. Don't worry, even the best developers
                  get 404s sometimes!
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1 bg-primary hover:bg-primary/90">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Link>
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>

          {/* Fun Footer */}
          <div className="text-center mt-6 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Error 404 • Page not found •
              <span className="ml-1 text-primary font-mono">
                {window.location.pathname}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
