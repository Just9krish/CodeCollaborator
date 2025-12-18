import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "wouter";

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8 text-foreground">Profile</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card className="bg-gray-800 border-gray-700 text-foreground">
            <CardHeader className="flex flex-col items-center">
              <Avatar className="h-24 w-24 border-2 border-primary/30 mb-4">
                <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                  {getInitials(user.username)}
                </AvatarFallback>
              </Avatar>
              <CardTitle>{user.username}</CardTitle>
              <CardDescription className="text-gray-400">
                User ID: {user.id}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-400">
                    Username
                  </h3>
                  <p className="mt-1">{user.username}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-400">
                    Account Created
                  </h3>
                  <p className="mt-1">March 2025</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/settings">
                  <i className="ri-settings-4-line mr-2"></i>
                  Edit Profile Settings
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="bg-gray-800 border-gray-700 text-foreground">
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <CardDescription className="text-gray-400">
                Your recent coding activity across projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="border-l-2 border-primary pl-4 py-2">
                  <h3 className="font-medium">Project Activity</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    You've been working on several collaborative coding
                    projects.
                  </p>
                </div>
                <div className="border-l-2 border-gray-700 pl-4 py-2">
                  <h3 className="font-medium">Collaboration</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Start sharing your projects with others to see collaboration
                    activity here.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700 text-foreground mt-6">
            <CardHeader>
              <CardTitle>Projects</CardTitle>
              <CardDescription className="text-gray-400">
                Recent projects you have created or contributed to
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-400">
                <p>Your recent projects will appear here</p>
                <Button className="mt-4" asChild>
                  <Link to="/">
                    <i className="ri-dashboard-line mr-2"></i>
                    Go to Dashboard
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
