import { Button } from "@/components/ui/button";
import { createLoginUrl } from "@/lib/utils";

interface AuthRequiredViewProps {
  onReturn: () => void;
}

export function AuthRequiredView({ onReturn }: AuthRequiredViewProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="text-amber-500 text-6xl mb-4">
        <i className="ri-lock-line"></i>
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">
        Authentication Required
      </h1>
      <p className="text-muted-foreground mb-6 text-center max-w-md">
        You need to log in to access this private project. Your session will be
        saved and you'll be redirected back after login.
      </p>
      <div className="flex flex-col gap-4">
        <Button
          onClick={() => {
            const redirectUrl = createLoginUrl(window.location.pathname);
            window.location.href = redirectUrl;
          }}
        >
          Log In
        </Button>
        <Button variant="outline" onClick={onReturn}>
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}

interface CollaborationRequiredViewProps {
  onRequestAccess: () => void;
  onReturn: () => void;
}

export function CollaborationRequiredView({
  onRequestAccess,
  onReturn,
}: CollaborationRequiredViewProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="text-amber-500 text-6xl mb-4">
        <i className="ri-team-line"></i>
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">
        Private Project
      </h1>
      <p className="text-muted-foreground mb-6 text-center max-w-md">
        This is a private project. You need to request access from the owner.
        Once your request is approved, you'll be able to collaborate on this
        project.
      </p>
      <div className="flex flex-col gap-4">
        <Button onClick={onRequestAccess}>
          <i className="ri-user-add-line mr-2"></i>
          Request Collaboration Access
        </Button>
        <Button variant="outline" onClick={onReturn}>
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}

interface ErrorViewProps {
  message: string;
  onReturn: () => void;
}

export function ErrorView({ message, onReturn }: ErrorViewProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="text-destructive text-6xl mb-4">
        <i className="ri-error-warning-line"></i>
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">
        Failed to load playground
      </h1>
      <p className="text-muted-foreground mb-6">{message}</p>
      <Button onClick={onReturn}>Return to Dashboard</Button>
    </div>
  );
}

export function LoadingView() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
