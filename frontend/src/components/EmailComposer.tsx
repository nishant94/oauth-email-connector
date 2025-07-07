import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Send,
  X,
  Plus,
  Mail,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiService } from "../services/api";
import { SendEmailRequest } from "../types";

interface EmailComposerProps {
  onEmailSent?: () => void;
}

const EmailComposer: React.FC<EmailComposerProps> = ({ onEmailSent }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [emailData, setEmailData] = useState<SendEmailRequest>({
    to: [],
    cc: [],
    bcc: [],
    subject: "",
    body: "",
    htmlBody: "",
    provider: "gmail",
  });
  const [toInput, setToInput] = useState("");
  const [ccInput, setCcInput] = useState("");
  const [bccInput, setBccInput] = useState("");
  const [showCC, setShowCC] = useState(false);
  const [showBCC, setShowBCC] = useState(false);
  const [showTrackingDetails, setShowTrackingDetails] = useState(false);
  const [trackingPreview, setTrackingPreview] = useState<{
    trackingPixelUrl: string;
    clickTrackingBaseUrl: string;
  } | null>(null);
  const [trackingConfig, setTrackingConfig] = useState<{
    appUrl: string;
    isLocalhost: boolean;
    trackingWillWork: boolean;
    recommendation: string;
  } | null>(null);
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  // Get available email providers from user's connected accounts
  const availableProviders =
    user?.connectedProviders?.map((conn) => conn.provider) || [];

  // Set default provider if available
  useEffect(() => {
    if (availableProviders.length > 0 && !emailData.provider) {
      setEmailData((prev) => ({
        ...prev,
        provider: availableProviders.includes("google") ? "gmail" : "outlook",
      }));
    }
  }, [availableProviders]);

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const addEmailToField = (
    _email: string,
    field: "to" | "cc" | "bcc",
    input: string,
    setInput: (value: string) => void,
  ) => {
    const emails = input
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e && isValidEmail(e));

    if (emails.length > 0) {
      setEmailData((prev) => ({
        ...prev,
        [field]: [...(prev[field] || []), ...emails],
      }));
      setInput("");
    }
  };

  const removeEmailFromField = (
    emailToRemove: string,
    field: "to" | "cc" | "bcc",
  ) => {
    setEmailData((prev) => ({
      ...prev,
      [field]: (prev[field] || []).filter((email) => email !== emailToRemove),
    }));
  };

  const handleKeyPress = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: "to" | "cc" | "bcc",
    input: string,
    setInput: (value: string) => void,
  ) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addEmailToField(input, field, input, setInput);
    }
  };

  const validateForm = () => {
    if (emailData.to.length === 0) {
      setStatus({
        type: "error",
        message: "Please add at least one recipient",
      });
      return false;
    }
    if (!emailData.subject.trim()) {
      setStatus({ type: "error", message: "Please enter a subject" });
      return false;
    }
    if (!emailData.body.trim()) {
      setStatus({ type: "error", message: "Please enter a message" });
      return false;
    }
    if (!emailData.provider) {
      setStatus({
        type: "error",
        message: "Please select an email provider",
      });
      return false;
    }
    return true;
  };

  const handleSendEmail = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setStatus({ type: null, message: "" });

    try {
      await apiService.sendEmail(emailData);
      setStatus({
        type: "success",
        message: "Email sent successfully!",
      });

      // Reset form
      setEmailData({
        to: [],
        cc: [],
        bcc: [],
        subject: "",
        body: "",
        htmlBody: "",
        provider: emailData.provider, // Keep the selected provider
      });
      setToInput("");
      setCcInput("");
      setBccInput("");
      setShowCC(false);
      setShowBCC(false);

      // Call callback if provided
      if (onEmailSent) {
        onEmailSent();
      }
    } catch (error: any) {
      console.error("Email send error:", error);

      let errorMessage = error.message || "Failed to send email";

      // Check for authentication-related errors
      if (
        errorMessage.includes("authentication expired") ||
        errorMessage.includes("reconnect") ||
        errorMessage.includes("No access token") ||
        errorMessage.includes("invalid_grant")
      ) {
        errorMessage = `${
          emailData.provider === "gmail" ? "Gmail" : "Outlook"
        } authentication has expired. Please go to Settings and reconnect your account.`;
      }

      setStatus({
        type: "error",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof SendEmailRequest, value: any) => {
    setEmailData((prev) => ({ ...prev, [field]: value }));
  };

  // Load tracking preview URLs
  const loadTrackingPreview = async () => {
    if (emailData.to.length === 0) return;

    try {
      const preview = await apiService.getTrackingPreview(emailData.to[0]);
      setTrackingPreview(preview);
    } catch (error) {
      console.error("Failed to load tracking preview:", error);
    }
  };

  // Check tracking configuration
  const checkTrackingConfig = async () => {
    try {
      const config = await apiService.checkTrackingConfig();
      setTrackingConfig(config);
    } catch (error) {
      console.error("Failed to check tracking config:", error);
    }
  };

  // Test tracking functionality (for debugging)
  const testTracking = async () => {
    if (!trackingPreview) return;

    try {
      // Open the tracking pixel URL to simulate an email open
      const pixelUrl = trackingPreview.trackingPixelUrl.replace(
        "preview_",
        "test_",
      );
      window.open(pixelUrl, "_blank", "width=1,height=1");

      setStatus({
        type: "success",
        message: "Tracking test initiated - check your dashboard for results",
      });
    } catch (error) {
      console.error("Tracking test failed:", error);
      setStatus({
        type: "error",
        message: "Failed to test tracking functionality",
      });
    }
  };

  // Load tracking preview when recipients change
  useEffect(() => {
    if (showTrackingDetails && emailData.to.length > 0) {
      loadTrackingPreview();
    }
    // Check tracking config when component mounts or when tracking details are shown
    if (showTrackingDetails) {
      checkTrackingConfig();
    }
  }, [showTrackingDetails, emailData.to]);

  // Show message if no connected providers
  if (availableProviders.length === 0) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="pt-6">
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No Email Accounts Connected</p>
            <p className="text-sm">
              Please connect a Gmail or Outlook account in Settings to send
              emails
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Compose Email
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Messages */}
        {status.type && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg ${
              status.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <div className="flex-1">
              <span className="text-sm">{status.message}</span>
              {status.type === "error" &&
                (status.message.includes("authentication") ||
                  status.message.includes("reconnect")) && (
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => (window.location.href = "/settings")}
                      className="text-xs"
                    >
                      Go to Settings
                    </Button>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Provider Selection */}
        <div className="space-y-2">
          <Label htmlFor="provider">Email Provider</Label>
          <Select
            value={emailData.provider}
            onValueChange={(value: string) =>
              handleInputChange("provider", value as "gmail" | "outlook")
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select email provider" />
            </SelectTrigger>
            <SelectContent>
              {availableProviders.includes("google") && (
                <SelectItem value="gmail">Gmail</SelectItem>
              )}
              {availableProviders.includes("microsoft") && (
                <SelectItem value="outlook">Outlook</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* To Field */}
        <div className="space-y-2">
          <Label htmlFor="to">To *</Label>
          <div className="space-y-2">
            {emailData.to.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {emailData.to.map((email, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {email}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeEmailFromField(email, "to")}
                    />
                  </Badge>
                ))}
              </div>
            )}
            <Input
              id="to"
              value={toInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setToInput(e.target.value)
              }
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                handleKeyPress(e, "to", toInput, setToInput)
              }
              placeholder="Enter email addresses (press Enter or comma to add)"
              onBlur={() => {
                if (toInput.trim()) {
                  addEmailToField(toInput, "to", toInput, setToInput);
                }
              }}
            />
          </div>
        </div>

        {/* CC/BCC Toggle Buttons */}
        <div className="flex gap-2">
          {!showCC && (
            <Button variant="outline" size="sm" onClick={() => setShowCC(true)}>
              <Plus className="h-3 w-3 mr-1" />
              CC
            </Button>
          )}
          {!showBCC && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBCC(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              BCC
            </Button>
          )}
        </div>

        {/* CC Field */}
        {showCC && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="cc">CC</Label>
              <X
                className="h-4 w-4 cursor-pointer text-muted-foreground"
                onClick={() => {
                  setShowCC(false);
                  setCcInput("");
                  setEmailData((prev) => ({ ...prev, cc: [] }));
                }}
              />
            </div>
            <div className="space-y-2">
              {emailData.cc && emailData.cc.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {emailData.cc.map((email, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {email}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeEmailFromField(email, "cc")}
                      />
                    </Badge>
                  ))}
                </div>
              )}
              <Input
                id="cc"
                value={ccInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCcInput(e.target.value)
                }
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                  handleKeyPress(e, "cc", ccInput, setCcInput)
                }
                placeholder="Enter CC email addresses"
                onBlur={() => {
                  if (ccInput.trim()) {
                    addEmailToField(ccInput, "cc", ccInput, setCcInput);
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* BCC Field */}
        {showBCC && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="bcc">BCC</Label>
              <X
                className="h-4 w-4 cursor-pointer text-muted-foreground"
                onClick={() => {
                  setShowBCC(false);
                  setBccInput("");
                  setEmailData((prev) => ({ ...prev, bcc: [] }));
                }}
              />
            </div>
            <div className="space-y-2">
              {emailData.bcc && emailData.bcc.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {emailData.bcc.map((email, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {email}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeEmailFromField(email, "bcc")}
                      />
                    </Badge>
                  ))}
                </div>
              )}
              <Input
                id="bcc"
                value={bccInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setBccInput(e.target.value)
                }
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                  handleKeyPress(e, "bcc", bccInput, setBccInput)
                }
                placeholder="Enter BCC email addresses"
                onBlur={() => {
                  if (bccInput.trim()) {
                    addEmailToField(bccInput, "bcc", bccInput, setBccInput);
                  }
                }}
              />
            </div>
          </div>
        )}

        <Separator />

        {/* Subject */}
        <div className="space-y-2">
          <Label htmlFor="subject">Subject *</Label>
          <Input
            id="subject"
            value={emailData.subject}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              handleInputChange("subject", e.target.value)
            }
            placeholder="Enter email subject"
          />
        </div>

        {/* Message Body */}
        <div className="space-y-2">
          <Label htmlFor="body">Message *</Label>
          <Textarea
            id="body"
            value={emailData.body}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              handleInputChange("body", e.target.value)
            }
            placeholder="Enter your message..."
            rows={8}
            className="min-h-32"
          />
        </div>

        {/* Tracking Information */}
        {emailData.to.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-blue-700">
                  Email Tracking Enabled
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowTrackingDetails(!showTrackingDetails);
                  if (!showTrackingDetails) {
                    loadTrackingPreview();
                  }
                }}
                className="text-xs h-6 px-2"
              >
                {showTrackingDetails ? (
                  <>
                    <EyeOff className="h-3 w-3 mr-1" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    Show URLs
                  </>
                )}
              </Button>
            </div>
            <div className="text-xs text-blue-600 space-y-1">
              <p>
                Open tracking: A tiny invisible pixel will be added to track
                when recipients open your email
              </p>
              <p>
                Click tracking: Links in your email will be monitored for clicks
              </p>
              <p>
                Recipient-specific analytics: Individual stats for each
                recipient
              </p>
              {showTrackingDetails && trackingPreview && (
                <div className="mt-3 p-2 bg-white rounded border text-xs">
                  <p className="font-medium text-gray-700 mb-2">
                    Preview of tracking URLs that will be added:
                  </p>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium text-gray-600">
                        Tracking Pixel:
                      </span>
                      <div className="bg-gray-100 p-1 rounded font-mono text-xs break-all">
                        {trackingPreview.trackingPixelUrl}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">
                        Click Tracking Base:
                      </span>
                      <div className="bg-gray-100 p-1 rounded font-mono text-xs break-all">
                        {trackingPreview.clickTrackingBaseUrl}
                      </div>
                    </div>
                  </div>
                  {trackingConfig && (
                    <div
                      className={`mt-2 p-2 rounded text-xs ${
                        trackingConfig.trackingWillWork
                          ? "bg-green-100 text-green-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {trackingConfig.trackingWillWork ? (
                        <p>
                          Configuration OK: Tracking will work for external
                          recipients
                        </p>
                      ) : (
                        <>
                          <p>⚠️ {trackingConfig.recommendation}</p>
                          <p className="mt-1 text-xs">
                            Current APP_URL: {trackingConfig.appUrl}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={testTracking}
                      className="text-xs h-6 px-2"
                    >
                      Test Pixel
                    </Button>
                    <span className="text-xs text-gray-500 self-center">
                      (Opens tracking pixel to test functionality)
                    </span>
                  </div>
                </div>
              )}
              <p className="text-blue-500 italic">
                Tracking data will be available in your dashboard after sending
              </p>
            </div>
          </div>
        )}

        {/* Send Button */}
        <div className="flex justify-between items-center pt-4">
          <div className="text-sm text-muted-foreground">
            {emailData.to.length > 0 &&
              `${
                emailData.to.length +
                (emailData.cc?.length || 0) +
                (emailData.bcc?.length || 0)
              } recipient(s)`}
            {emailData.to.length > 0 && (
              <span className="block text-xs mt-1">
                📊 Email tracking enabled - opens and clicks will be monitored
              </span>
            )}
          </div>
          <Button
            onClick={handleSendEmail}
            disabled={isLoading || availableProviders.length === 0}
            className="min-w-32"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Sending...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Send Email
              </div>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailComposer;
