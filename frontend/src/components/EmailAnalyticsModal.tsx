import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Eye,
  MousePointer,
  Mail,
  Clock,
  User,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { apiService } from "../services/api";
import { EmailAnalyticsWithRecipients } from "../types";
import { format, formatDistanceToNow } from "date-fns";

interface EmailAnalyticsModalProps {
  emailId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const EmailAnalyticsModal: React.FC<EmailAnalyticsModalProps> = ({
  emailId,
  isOpen,
  onClose,
}) => {
  const [analytics, setAnalytics] =
    useState<EmailAnalyticsWithRecipients | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (emailId && isOpen) {
      loadAnalytics();
    }
  }, [emailId, isOpen]);

  const loadAnalytics = async () => {
    if (!emailId) return;

    setIsLoading(true);
    try {
      const data = await apiService.getEmailAnalyticsWithRecipients(emailId);
      setAnalytics(data);
    } catch (error) {
      console.error("Failed to load email analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (recipient: any) => {
    if (recipient.clicked) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (recipient.opened) {
      return <Eye className="h-4 w-4 text-blue-500" />;
    } else {
      return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = (recipient: any) => {
    if (recipient.clicked) return "Clicked";
    if (recipient.opened) return "Opened";
    return "Not opened";
  };

  const getStatusColor = (recipient: any) => {
    if (recipient.clicked) return "bg-green-100 text-green-800";
    if (recipient.opened) return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-600";
  };

  if (!analytics && !isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Analytics</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No analytics data available</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Email Analytics
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading analytics...</p>
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Email Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{analytics.subject}</CardTitle>
                <p className="text-sm text-gray-500">
                  Sent {formatDistanceToNow(new Date(analytics.sentAt))} ago •{" "}
                  {format(new Date(analytics.sentAt), "MMM d, yyyy 'at' HH:mm")}
                </p>
              </CardHeader>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Mail className="h-8 w-8 text-blue-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Recipients
                      </p>
                      <p className="text-2xl font-bold">
                        {analytics.totalRecipients}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Eye className="h-8 w-8 text-green-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Opened
                      </p>
                      <p className="text-2xl font-bold">
                        {analytics.openedCount}
                      </p>
                      <p className="text-xs text-gray-500">
                        {analytics.openRate}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <MousePointer className="h-8 w-8 text-purple-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Clicked
                      </p>
                      <p className="text-2xl font-bold">
                        {analytics.clickedCount}
                      </p>
                      <p className="text-xs text-gray-500">
                        {analytics.clickRate}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-orange-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Engagement
                      </p>
                      <p className="text-2xl font-bold">
                        {(
                          ((analytics.openedCount + analytics.clickedCount) /
                            analytics.totalRecipients) *
                          100
                        ).toFixed(1)}
                        %
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recipient Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Recipient Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Opens</TableHead>
                        <TableHead>Clicks</TableHead>
                        <TableHead>First Opened</TableHead>
                        <TableHead>Last Activity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.recipients.map((recipient) => (
                        <TableRow key={recipient.email}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(recipient)}
                              <Badge
                                variant="outline"
                                className={getStatusColor(recipient)}
                              >
                                {getStatusText(recipient)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {recipient.email}
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              {recipient.openCount}
                              {recipient.openCount > 1 && (
                                <span className="text-xs text-gray-500 block">
                                  multiple
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              {recipient.clickCount}
                              {recipient.clickCount > 1 && (
                                <span className="text-xs text-gray-500 block">
                                  multiple
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {recipient.firstOpenAt ? (
                              <div>
                                <div className="text-sm">
                                  {format(
                                    new Date(recipient.firstOpenAt),
                                    "MMM d, HH:mm",
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatDistanceToNow(
                                    new Date(recipient.firstOpenAt),
                                  )}{" "}
                                  ago
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {recipient.lastClickAt || recipient.lastOpenAt ? (
                              <div>
                                <div className="text-sm">
                                  {format(
                                    new Date(
                                      recipient.lastClickAt ||
                                        recipient.lastOpenAt!,
                                    ),
                                    "MMM d, HH:mm",
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatDistanceToNow(
                                    new Date(
                                      recipient.lastClickAt ||
                                        recipient.lastOpenAt!,
                                    ),
                                  )}{" "}
                                  ago
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailAnalyticsModal;
