import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Plus, Trash2, Mail, Calendar } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { OAuthConnection } from "../types";

interface ConnectionsCardProps {
  className?: string;
}

const ConnectionsCard: React.FC<ConnectionsCardProps> = ({ className }) => {
  const { user, connectProvider, disconnectProvider } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  if (!user) return null;

  const handleConnect = (provider: "google" | "microsoft") => {
    setLoadingProvider(provider);
    connectProvider(provider);
  };

  const handleDisconnect = async (provider: "google" | "microsoft") => {
    try {
      setLoadingProvider(provider);
      await disconnectProvider(provider);
    } catch (error) {
      console.error(`Failed to disconnect ${provider}:`, error);
    } finally {
      setLoadingProvider(null);
    }
  };

  const isConnected = (provider: "google" | "microsoft") => {
    return (
      user.connectedProviders?.some((conn) => conn.provider === provider) ||
      false
    );
  };

  const getConnection = (
    provider: "google" | "microsoft",
  ): OAuthConnection | undefined => {
    return user.connectedProviders?.find((conn) => conn.provider === provider);
  };

  const googleConnection = getConnection("google");
  const microsoftConnection = getConnection("microsoft");

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Connections
        </CardTitle>
        <CardDescription>
          Connect your email accounts to send and track emails
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Google Connection */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <div>
              <div className="font-medium">Google (Gmail)</div>
              {googleConnection ? (
                <div className="text-sm text-muted-foreground">
                  {googleConnection.email}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Connect to send and track Gmail emails
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected("google") ? (
              <>
                <Badge
                  variant="outline"
                  className="text-green-600 border-green-600"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisconnect("google")}
                  disabled={loadingProvider === "google"}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleConnect("google")}
                disabled={loadingProvider === "google"}
              >
                <Plus className="h-4 w-4 mr-1" />
                Connect
              </Button>
            )}
          </div>
        </div>

        {/* Microsoft Connection */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#0078d4">
              <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" />
            </svg>
            <div>
              <div className="font-medium">Microsoft (Outlook)</div>
              {microsoftConnection ? (
                <div className="text-sm text-muted-foreground">
                  {microsoftConnection.email}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Connect to send and track Outlook emails
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected("microsoft") ? (
              <>
                <Badge
                  variant="outline"
                  className="text-green-600 border-green-600"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisconnect("microsoft")}
                  disabled={loadingProvider === "microsoft"}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleConnect("microsoft")}
                disabled={loadingProvider === "microsoft"}
              >
                <Plus className="h-4 w-4 mr-1" />
                Connect
              </Button>
            )}
          </div>
        </div>

        {user.connectedProviders && user.connectedProviders.length > 0 && (
          <>
            <Separator />
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center gap-1 mb-2">
                <Calendar className="h-4 w-4" />
                Connection Details
              </div>
              {user.connectedProviders.map((conn, index) => (
                <div key={index} className="text-xs">
                  {conn.provider === "google" ? "Gmail" : "Outlook"} connected
                  on {new Date(conn.connectedAt).toLocaleDateString()}
                </div>
              ))}
            </div>
          </>
        )}

        {(!user.connectedProviders || user.connectedProviders.length === 0) && (
          <div className="text-center p-4 text-muted-foreground">
            <p className="text-sm">
              Connect at least one email account to start sending and tracking
              emails.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConnectionsCard;
