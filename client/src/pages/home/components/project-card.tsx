import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Lock } from "lucide-react";
import { getLanguageIcon, getLanguageName } from "@/lib/language-utils";
import type { Session } from "@shared/schema";

interface ProjectCardProps {
  session: Session;
  onDelete?: (sessionId: string) => void;
  showDelete?: boolean;
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ProjectCard({
  session,
  onDelete,
  showDelete = true,
}: ProjectCardProps) {
  const langIcon = getLanguageIcon(session.language);

  return (
    <Link to={`/playground/${session.id}`}>
      <Card
        className={`border-border hover:border-primary transition-colors cursor-pointer ${
          session.isPublic
            ? "hover:border-primary/60 hover:bg-primary/5"
            : "hover:border-secondary/60 hover:bg-secondary/5"
        }`}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground">
            {session.name || "Untitled Project"}
          </CardTitle>
          <CardDescription className="flex items-center text-muted-foreground">
            <i className={`${langIcon.icon} ${langIcon.color} mr-1.5`}></i>
            {getLanguageName(session.language)}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p className="text-sm">Last edited {formatDate(session.updatedAt)}</p>
        </CardContent>
        <CardFooter className="pt-2 border-t border-border">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center text-sm">
              {session.isPublic ? (
                <div className="flex items-center text-primary">
                  <Globe className="w-4 h-4 mr-1" />
                  Public
                </div>
              ) : (
                <div className="flex items-center text-secondary-foreground">
                  <Lock className="w-4 h-4 mr-1" />
                  Private
                </div>
              )}
            </div>
            {showDelete && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(session.id);
                }}
              >
                <i className="ri-delete-bin-line"></i>
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}

export function CreateProjectCard({ onClick }: { onClick: () => void }) {
  return (
    <Card
      className="border-border hover:border-primary transition-colors cursor-pointer hover:bg-accent/20"
      onClick={onClick}
    >
      <CardContent className="flex items-center justify-center h-48">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <i className="ri-add-line text-2xl text-primary"></i>
            </div>
          </div>
          <h3 className="mt-4 text-xl font-medium text-foreground">
            Create New Project
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Start a fresh coding session
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
