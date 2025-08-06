import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { wsManager } from "@/lib/websocket";

type Notification = {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
};

export function NotificationBell() {
  const [showDropdown, setShowDropdown] = useState(false);
  const { toast } = useToast();

  // Fetch unread notification count
  const { data: unreadCount = 0, refetch: refetchCount } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        "/api/notifications/unread-count"
      );
      if (!response.ok) throw new Error("Failed to fetch unread count");
      const data = await response.json();
      return data.count;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch notifications
  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/notifications");
      if (!response.ok) throw new Error("Failed to fetch notifications");
      return response.json();
    },
    enabled: showDropdown,
  });

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await apiRequest(
        "PATCH",
        `/api/notifications/${notificationId}/read`
      );
      if (!response.ok) throw new Error("Failed to mark notification as read");
      return response.json();
    },
    onSuccess: () => {
      refetchCount();
      refetchNotifications();
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", "/api/notifications/read-all");
      if (!response.ok)
        throw new Error("Failed to mark all notifications as read");
      return response.json();
    },
    onSuccess: () => {
      refetchCount();
      refetchNotifications();
      toast({
        title: "Notifications marked as read",
        description: "All notifications have been marked as read.",
      });
    },
  });

  // Delete notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/notifications/${notificationId}`
      );
      if (!response.ok) throw new Error("Failed to delete notification");
      return response.json();
    },
    onSuccess: () => {
      refetchCount();
      refetchNotifications();
    },
  });

  // Listen for real-time notifications
  useEffect(() => {
    const unsubscribe = wsManager.on("notification", data => {
      // Show toast for new notification
      toast({
        title: data.notification.title,
        description: data.notification.message,
        duration: 5000,
      });

      // Refetch counts and notifications
      refetchCount();
      if (showDropdown) {
        refetchNotifications();
      }
    });

    return () => unsubscribe();
  }, [showDropdown, refetchCount, refetchNotifications, toast]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }

    // Handle different notification types
    switch (notification.type) {
      case "collaboration_request":
        // Navigate to session or show collaboration panel
        if (notification.data?.sessionId) {
          window.location.href = `/playground/${notification.data.sessionId}`;
        }
        break;
      case "request_accepted":
        // Navigate to session
        if (notification.data?.sessionId) {
          window.location.href = `/playground/${notification.data.sessionId}`;
        }
        break;
      default:
        // For other types, just mark as read
        break;
    }

    setShowDropdown(false);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "collaboration_request":
        return "👥";
      case "request_accepted":
        return "✅";
      case "request_rejected":
        return "❌";
      case "user_joined":
        return "👋";
      case "user_left":
        return "👋";
      default:
        return "🔔";
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="relative p-2"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        {unreadCount > 0 ? (
          <Bell className="h-5 w-5" />
        ) : (
          <BellOff className="h-5 w-5" />
        )}
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">
              Notifications
            </h3>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="text-xs text-gray-400 hover:text-foreground"
              >
                Mark all read
              </Button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification: Notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b border-border cursor-pointer hover:bg-accent transition-colors ${
                    !notification.isRead ? "bg-gray-750" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-lg">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-foreground truncate">
                          {notification.title}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-400">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                          {!notification.isRead && (
                            <div className="h-2 w-2 bg-primary rounded-full"></div>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation();
                        deleteNotificationMutation.mutate(notification.id);
                      }}
                      disabled={deleteNotificationMutation.isPending}
                      className="text-muted-foreground hover:text-red-400 p-1 h-6 w-6"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                <BellOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
