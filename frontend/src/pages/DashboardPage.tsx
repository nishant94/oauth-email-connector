import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, formatDistanceToNow } from "date-fns";
import {
  Calendar,
  Eye,
  Mail,
  MoreHorizontal,
  MousePointer,
  Send,
  Settings,
  TrendingUp,
  User,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import "../App.css";
import ConnectionsCard from "../components/ConnectionsCard";
import EmailAnalyticsModal from "../components/EmailAnalyticsModal";
import EmailComposer from "../components/EmailComposer";
import { useAuth } from "../context/AuthContext";
import { apiService } from "../services/api";
import { Email, EmailWithTracking, OverviewStats } from "../types";

const DashboardPage: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [emails, setEmails] = useState<EmailWithTracking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("emails");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);

  useEffect(() => {
    // Check URL parameters for tab and connection status
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get("tab");
    const connected = urlParams.get("connected");

    if (tab) {
      setActiveTab(tab);
    }

    const loadData = async () => {
      if (connected) {
        // Refresh user data to get updated connections
        console.log(`Successfully connected ${connected} account!`);
        await refreshUser();
        // Clear the URL parameter
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }

      await loadDashboardData();
    };

    loadData();
  }, [refreshUser]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [statsData, emailsData] = await Promise.all([
        apiService.getOverviewStats(),
        apiService.getSentEmailsWithTracking({ page: 1, limit: 10 }),
      ]);
      setStats(statsData);
      setEmails(emailsData);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewAnalytics = (emailId: string) => {
    setSelectedEmailId(emailId);
    setShowAnalyticsModal(true);
  };

  const handleCloseAnalytics = () => {
    setShowAnalyticsModal(false);
    setSelectedEmailId(null);
  };

  const getStatusColor = (status: Email["status"]) => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "delivered":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getPlatformColor = (provider: Email["provider"]) => {
    return provider === "gmail"
      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  EmailConnector
                </h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {user?.name}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={logout}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-5">
            {/* <TabsTrigger value="overview">Overview</TabsTrigger> */}
            <TabsTrigger value="emails">Emails</TabsTrigger>
            <TabsTrigger value="compose">Compose</TabsTrigger>
            {/* <TabsTrigger value="analytics">Analytics</TabsTrigger> */}
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Emails
                  </CardTitle>
                  <Send className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats?.totalEmails || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.sentEmails || 0} sent, {stats?.failedEmails || 0}{" "}
                    failed
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Opens
                  </CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats?.totalOpens || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.uniqueOpens || 0} unique opens
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Clicks
                  </CardTitle>
                  <MousePointer className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats?.totalClicks || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.uniqueClicks || 0} unique clicks
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Open Rate
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats?.openRate || "0"}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.clickRate || "0"}% click rate
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest email interactions and events
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {stats.recentActivity.slice(0, 5).map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`p-2 rounded-full ${
                              activity.type === "open"
                                ? "bg-green-100 text-green-600"
                                : "bg-blue-100 text-blue-600"
                            }`}
                          >
                            {activity.type === "open" ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <MousePointer className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {activity.subject}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {activity.type === "click" && activity.clickedUrl
                                ? `Clicked: ${activity.clickedUrl}`
                                : `Email ${activity.type}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.timestamp), {
                            addSuffix: true,
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No recent activity</p>
                    <p className="text-sm">
                      Send your first email to see activity here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compose Tab */}
          <TabsContent value="compose">
            <EmailComposer onEmailSent={loadDashboardData} />
          </TabsContent>

          {/* Emails Tab */}
          <TabsContent value="emails" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Sent Emails</h2>
                <p className="text-muted-foreground">
                  Manage and track your sent emails
                </p>
              </div>
              {/* <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div> */}
            </div>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-0">
                {emails.length > 0 ? (
                  <div className="divide-y">
                    {emails.map((email) => (
                      <div
                        key={email.id}
                        className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-semibold text-sm truncate">
                                {email.subject}
                              </h3>
                              <Badge className={getStatusColor(email.status)}>
                                {email.status}
                              </Badge>
                              <Badge
                                className={getPlatformColor(email.provider)}
                              >
                                {email.provider}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              To: {email.recipients.to.slice(0, 2).join(", ")}
                              {email.recipients.to.length > 2 && (
                                <span>
                                  {" "}
                                  +{email.recipients.to.length - 2} more
                                </span>
                              )}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground mb-2">
                              <span className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {format(
                                  new Date(email.sendTimestamp),
                                  "MMM d, yyyy HH:mm",
                                )}
                              </span>
                              <span>
                                {email.trackingStats.totalRecipients} recipients
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 text-xs">
                              <div className="flex items-center space-x-1 text-blue-600">
                                <Eye className="h-3 w-3" />
                                <span>
                                  {email.trackingStats.uniqueOpens}/
                                  {email.trackingStats.totalRecipients} opened (
                                  {email.trackingStats.openRate}%)
                                </span>
                              </div>
                              <div className="flex items-center space-x-1 text-green-600">
                                <MousePointer className="h-3 w-3" />
                                <span>
                                  {email.trackingStats.uniqueClicks} clicked (
                                  {email.trackingStats.clickRate}%)
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No emails sent yet</p>
                    <p className="text-sm">
                      Compose your first email to get started
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Email Analytics</CardTitle>
                <CardDescription>
                  Detailed insights into your email performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Advanced analytics will be displayed here</p>
                  <p className="text-sm">
                    Charts, graphs, and detailed metrics
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* User Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Account Information
                  </CardTitle>
                  <CardDescription>Your account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Name
                    </label>
                    <div className="text-sm">{user?.name}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Email
                    </label>
                    <div className="text-sm">{user?.email}</div>
                  </div>
                  {user?.username && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Username
                      </label>
                      <div className="text-sm">{user.username}</div>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Account Type
                    </label>
                    <div className="text-sm">
                      <Badge variant="outline">
                        {user?.provider === "local"
                          ? "Local Account"
                          : `${user?.provider} Account`}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* OAuth Connections */}
              <div className="lg:col-span-2">
                <ConnectionsCard />
              </div>
            </div>

            {/* Account Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Account Actions
                </CardTitle>
                <CardDescription>Manage your account settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button variant="outline" onClick={logout}>
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Email Analytics Modal */}
      <EmailAnalyticsModal
        emailId={selectedEmailId}
        isOpen={showAnalyticsModal}
        onClose={handleCloseAnalytics}
      />
    </div>
  );
};

export default DashboardPage;
