import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState(true);
  const [theme, setTheme] = useState("dark");
  const [loading, setLoading] = useState(false);

  if (!user) {
    return null;
  }

  const handleSavePreferences = () => {
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
      });
    }, 1000);
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8 text-foreground">Settings</h1>

      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <Card className="bg-gray-800 border-gray-700 text-foreground">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription className="text-gray-400">
                Update your account details and password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={user.username}
                  disabled
                  className="bg-gray-700 border-gray-600"
                />
                <p className="text-xs text-gray-400">
                  Username cannot be changed at this time
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="Enter current password"
                  className="bg-gray-700 border-gray-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                  className="bg-gray-700 border-gray-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                  className="bg-gray-700 border-gray-600"
                />
              </div>

              <Button
                onClick={() => {
                  toast({
                    title: "Password updated",
                    description: "Your password has been changed successfully.",
                  });
                }}
                className="mt-4"
              >
                Update Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card className="bg-gray-800 border-gray-700 text-foreground">
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription className="text-gray-400">
                Customize your coding environment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications">Email Notifications</Label>
                  <p className="text-sm text-gray-400">
                    Receive email notifications about collaboration requests
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>

              <div className="flex flex-col space-y-2">
                <Label htmlFor="theme">Theme Preference</Label>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    className={theme === "dark" ? "" : "text-gray-400"}
                    onClick={() => setTheme("dark")}
                  >
                    <i className="ri-moon-line mr-2"></i>
                    Dark
                  </Button>
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    className={theme === "light" ? "" : "text-gray-400"}
                    onClick={() => setTheme("light")}
                  >
                    <i className="ri-sun-line mr-2"></i>
                    Light
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleSavePreferences}
                className="mt-4"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin"></span>
                    Saving...
                  </>
                ) : (
                  "Save Preferences"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
