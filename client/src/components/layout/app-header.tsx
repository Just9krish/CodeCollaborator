import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function AppHeader() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const isActivePath = (path: string) => {
    return location === path;
  };

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="bg-dark border-b border-gray-700 py-2 px-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="flex items-center mr-8">
            <i className="ri-code-box-line text-primary text-2xl mr-2"></i>
            <h1 className="text-xl font-semibold text-white">CodeCollab</h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-4">
            <Link to="/">
              <Button
                variant="ghost"
                className={`text-sm px-2 py-1 ${isActivePath("/")
                    ? "bg-primary/10 text-primary"
                    : "text-gray-300 hover:text-white"
                  }`}
              >
                Dashboard
              </Button>
            </Link>
            {/* <Link to="/playground">
              <Button
                variant="ghost"
                className={`text-sm px-2 py-1 ${location.startsWith("/playground")
                  ? "bg-primary/10 text-primary"
                  : "text-gray-300 hover:text-white"
                  }`}
              >
                Playground
              </Button>
            </Link> */}
          </nav>
        </div>

        {/* User controls */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-gray-700"
          >
            <i className="ri-question-line text-lg"></i>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-gray-700"
          >
            <i className="ri-notification-3-line text-lg"></i>
          </Button>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center p-0 hover:bg-transparent"
                >
                  <Avatar className="h-8 w-8 border-2 border-primary/30">
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {getInitials(user.username)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden md:inline-block text-white">
                    {user.username}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-gray-800 border-gray-700 text-white">
                <Link to="/profile">
                  <DropdownMenuItem className="text-gray-300 hover:text-white focus:bg-gray-700">
                    <i className="ri-user-line mr-2"></i>
                    <span>Profile</span>
                  </DropdownMenuItem>
                </Link>
                <Link to="/settings">
                  <DropdownMenuItem className="text-gray-300 hover:text-white focus:bg-gray-700">
                    <i className="ri-settings-4-line mr-2"></i>
                    <span>Settings</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem
                  className="text-gray-300 hover:text-white focus:bg-gray-700"
                  onClick={handleLogout}
                >
                  <i className="ri-logout-box-r-line mr-2"></i>
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-gray-700"
            onClick={() => setShowMobileMenu(true)}
          >
            <i className="ri-menu-line text-lg"></i>
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <Dialog open={showMobileMenu} onOpenChange={setShowMobileMenu}>
        <DialogContent className="bg-gray-800 text-white border border-gray-700 sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <i className="ri-code-box-line text-primary text-xl mr-2"></i>
              <span>CodeCollab</span>
            </DialogTitle>
          </DialogHeader>
          <nav className="flex flex-col space-y-2 py-4">
            <Link to="/" onClick={() => setShowMobileMenu(false)}>
              <Button
                variant={isActivePath("/") ? "default" : "ghost"}
                className="w-full justify-start"
              >
                <i className="ri-dashboard-line mr-2"></i>
                Dashboard
              </Button>
            </Link>
            <Link to="/playground" onClick={() => setShowMobileMenu(false)}>
              <Button
                variant={
                  location.startsWith("/playground") ? "default" : "ghost"
                }
                className="w-full justify-start"
              >
                <i className="ri-terminal-box-line mr-2"></i>
                Playground
              </Button>
            </Link>
          </nav>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMobileMenu(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
