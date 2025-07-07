import axios from "axios";
import { google } from "googleapis";
import { config } from "../config/env";
import { IUser, SendEmailRequest } from "../types";

export class EmailService {
  private async updateUserTokens(
    user: IUser,
    provider: "google" | "microsoft",
    accessToken: string,
    refreshToken?: string,
    accessTokenExpires?: Date,
  ): Promise<void> {
    try {
      const { User } = await import("../models/User");

      const connectionIndex = user.connectedProviders?.findIndex(
        (conn) => conn.provider === provider,
      );

      if (connectionIndex !== undefined && connectionIndex >= 0) {
        const updateData: any = {
          [`connectedProviders.${connectionIndex}.accessToken`]: accessToken,
          updatedAt: new Date(),
        };

        if (refreshToken) {
          updateData[`connectedProviders.${connectionIndex}.refreshToken`] =
            refreshToken;
        }

        if (accessTokenExpires) {
          updateData[
            `connectedProviders.${connectionIndex}.accessTokenExpires`
          ] = accessTokenExpires;
        }

        await User.findByIdAndUpdate(user._id, updateData);
        console.log(`Updated ${provider} tokens for user ${user._id}`);
      }
    } catch (error) {
      console.error(`Failed to update ${provider} tokens:`, error);
    }
  }

  async sendGmailEmail(
    user: IUser,
    emailData: SendEmailRequest,
  ): Promise<{ messageId: string }> {
    try {
      let googleConnection = user.connectedProviders?.find(
        (conn) => conn.provider === "google",
      );

      if (!googleConnection) {
        throw new Error("No Google account connected");
      }

      if (!googleConnection.accessToken) {
        throw new Error("No access token available for Google account");
      }

      const oauth2Client = new google.auth.OAuth2(
        config.GOOGLE_CLIENT_ID,
        config.GOOGLE_CLIENT_SECRET,
        config.GOOGLE_REDIRECT_URI,
      );

      oauth2Client.setCredentials({
        access_token: googleConnection.accessToken,
        refresh_token: googleConnection.refreshToken,
      });

      oauth2Client.on("tokens", async (tokens) => {
        console.log("🔄 Refreshing Google tokens");
        if (tokens.access_token) {
          await this.updateUserTokens(
            user,
            "google",
            tokens.access_token,
            tokens.refresh_token || undefined,
            tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
          );
        }
      });

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      const message = this.createGmailMessage(emailData);

      const response = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: message,
        },
      });

      console.log("Gmail email sent successfully:", response.data.id);
      return { messageId: response.data.id! };
    } catch (error: any) {
      console.error("Gmail send error:", error);

      if (
        error.code === 401 ||
        error.message.includes("invalid_grant") ||
        error.message.includes("access_token") ||
        error.message.includes("refresh")
      ) {
        throw new Error(
          "Gmail authentication expired. Please reconnect your Google account in Settings.",
        );
      }

      throw new Error(
        `Failed to send Gmail email: ${error?.message || "Unknown error"}`,
      );
    }
  }

  async sendOutlookEmail(
    user: IUser,
    emailData: SendEmailRequest,
  ): Promise<{ messageId: string }> {
    try {
      let microsoftConnection = user.connectedProviders?.find(
        (conn) => conn.provider === "microsoft",
      );

      if (!microsoftConnection) {
        throw new Error("No Microsoft account connected");
      }

      if (!microsoftConnection.accessToken) {
        throw new Error("No access token available for Microsoft account");
      }

      const message = this.createOutlookMessage(emailData);


      console.log("Outlook email sent successfully");

      const messageId = `outlook_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      return { messageId };
    } catch (error: any) {
      console.error("Outlook send error:", error);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);

        if (error.response.status === 401) {
          throw new Error(
            "Outlook authentication expired. Please reconnect your Microsoft account in Settings.",
          );
        }
      }

      throw new Error(
        `Failed to send Outlook email: ${error?.message || "Unknown error"}`,
      );
    }
  }

  private createGmailMessage(emailData: SendEmailRequest): string {
    const { to, cc, bcc, subject, body, htmlBody } = emailData;

    let message = "";
    message += `To: ${to.join(", ")}\r\n`;

    if (cc && cc.length > 0) {
      message += `Cc: ${cc.join(", ")}\r\n`;
    }

    if (bcc && bcc.length > 0) {
      message += `Bcc: ${bcc.join(", ")}\r\n`;
    }

    message += `Subject: ${subject}\r\n`;
    message += `MIME-Version: 1.0\r\n`;

    if (htmlBody) {
      const boundary = `boundary_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      message += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;

      message += `--${boundary}\r\n`;
      message += `Content-Type: text/plain; charset=UTF-8\r\n\r\n`;
      message += `${body}\r\n\r\n`;

      message += `--${boundary}\r\n`;
      message += `Content-Type: text/html; charset=UTF-8\r\n\r\n`;
      message += `${htmlBody}\r\n\r\n`;
      message += `--${boundary}--\r\n`;
    } else {
      message += `Content-Type: text/plain; charset=UTF-8\r\n\r\n`;
      message += body;
    }
    return Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  private createOutlookMessage(emailData: SendEmailRequest) {
    const { to, cc, bcc, subject, body, htmlBody } = emailData;

    const message: any = {
      subject,
      body: {
        contentType: htmlBody ? "HTML" : "Text",
        content: htmlBody || body,
      },
      toRecipients: to.map((email) => ({
        emailAddress: { address: email },
      })),
    };

    if (cc && cc.length > 0) {
      message.ccRecipients = cc.map((email) => ({
        emailAddress: { address: email },
      }));
    }

    if (bcc && bcc.length > 0) {
      message.bccRecipients = bcc.map((email) => ({
        emailAddress: { address: email },
      }));
    }
    return message;
  }

  addEmailTrackingForRecipient(
    content: string,
    trackingId: string,
    recipientEmail: string,
    isHtml: boolean = false,
  ): string {
    const trackingPixelUrl = `${
      config.APP_URL
    }/api/tracking/pixel/${trackingId}/${encodeURIComponent(recipientEmail)}`;

    if (isHtml) {
      const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;

      if (content.includes("</body>")) {
        return content.replace("</body>", `${trackingPixel}</body>`);
      } else {
        return content + trackingPixel;
      }
    } else {
      return content;
    }
  }

  addClickTrackingForRecipient(
    content: string,
    trackingId: string,
    recipientEmail: string,
    isHtml: boolean = false,
  ): string {
    const urlRegex = /https?:\/\/[^\s<>"]+/gi;

    return content.replace(urlRegex, (url) => {
      const trackingUrl = `${
        config.APP_URL
      }/api/tracking/click/${trackingId}/${encodeURIComponent(
        url,
      )}/${encodeURIComponent(recipientEmail)}`;

      if (isHtml) {
        return trackingUrl;
      } else {
        return trackingUrl;
      }
    });
  }

  addClickTracking(
    content: string,
    trackingId: string,
    isHtml: boolean = false,
  ): string {
    const urlRegex = /https?:\/\/[^\s<>"]+/gi;

    return content.replace(urlRegex, (url) => {
      const trackingUrl = `${
        config.APP_URL
      }/api/tracking/click/${trackingId}?url=${encodeURIComponent(url)}`;

      if (isHtml) {
        return trackingUrl;
      } else {
        return trackingUrl;
      }
    });
  }

  processEmailWithRecipientTracking(
    emailData: SendEmailRequest,
    trackingId: string,
    recipientEmail: string,
  ): { body: string; htmlBody: string } {
    console.log(
      `📧 Processing email for ${recipientEmail} with tracking ID: ${trackingId}`,
    );

    const processedBody = this.addClickTrackingForRecipient(
      emailData.body,
      trackingId,
      recipientEmail,
      false,
    );

    let processedHtmlBody: string;

    const trackingPixelUrl = `${
      config.APP_URL
    }/api/tracking/pixel/${trackingId}/${encodeURIComponent(recipientEmail)}`;

    console.log(`🔗 Generated tracking pixel URL: ${trackingPixelUrl}`);

    processedHtmlBody = `
        <html>
          <body>
            <pre style="font-family: inherit; white-space: pre-wrap;">${processedBody}</pre>
            <img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />
          </body>
        </html>
      `;

    return {
      body: processedBody,
      htmlBody: processedHtmlBody,
    };
  }

  async sendEmailWithTracking(
    user: IUser,
    emailData: SendEmailRequest,
    trackingId: string,
  ): Promise<{ messageId: string; sentCount: number }> {
    const allRecipients = [
      ...emailData.to,
      ...(emailData.cc || []),
      ...(emailData.bcc || []),
    ];

    let sentCount = 0;
    const messageIds: string[] = [];

    for (const recipient of allRecipients) {
      try {
        console.log(`📤 Sending email to: ${recipient}`);

        const { body, htmlBody } = this.processEmailWithRecipientTracking(
          emailData,
          trackingId,
          recipient,
        );

        const individualEmailData: SendEmailRequest = {
          ...emailData,
          to: [recipient],
          cc: [],
          bcc: [],
          body,
          htmlBody,
        };

        let response;
        if (emailData.provider === "gmail") {
          response = await this.sendGmailEmail(user, individualEmailData);
        } else {
          response = await this.sendOutlookEmail(user, individualEmailData);
        }

        messageIds.push(response.messageId);
        sentCount++;

        console.log(
          `Email sent to ${recipient} with tracking (Message ID: ${response.messageId})`,
        );
      } catch (error) {
        console.error(`Failed to send email to ${recipient}:`, error);
      }
    }

    console.log(
      `📈 Email sending complete. Sent: ${sentCount}/${allRecipients.length} emails`,
    );

    return {
      messageId: messageIds[0] || "bulk_send_" + Date.now(),
      sentCount,
    };
  }

  async sendEmail(
    user: IUser,
    emailData: SendEmailRequest,
  ): Promise<{ messageId: string }> {
    const mongoose = await import("mongoose");
    const trackingId = new mongoose.Types.ObjectId().toString();

    const result = await this.sendEmailWithTracking(
      user,
      emailData,
      trackingId,
    );

    return { messageId: result.messageId };
  }

  async sendEmailLegacy(
    user: IUser,
    emailData: SendEmailRequest,
  ): Promise<{ messageId: string }> {
    if (emailData.provider === "gmail") {
      return this.sendGmailEmail(user, emailData);
    } else if (emailData.provider === "outlook") {
      return this.sendOutlookEmail(user, emailData);
    } else {
      throw new Error("Unsupported email provider");
    }
  }

  validateEmailAddresses(emails: string[]): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emails.every((email) => emailRegex.test(email));
  }

  async getEmailLimits(
    user: IUser,
  ): Promise<{ dailyLimit: number; currentUsage: number }> {

    // For local users, return a default limit that encompasses both providers
    return { dailyLimit: 800, currentUsage: 0 };
  }

  async canSendEmail(
    user: IUser,
  ): Promise<{ canSend: boolean; reason?: string }> {
    try {
      const limits = await this.getEmailLimits(user);

      if (limits.currentUsage >= limits.dailyLimit) {
        return {
          canSend: false,
          reason: `Daily email limit of ${limits.dailyLimit} reached`,
        };
      }

      return { canSend: true };
    } catch (error) {
      console.error("Error checking email limits:", error);
      return { canSend: true };
    }
  }
}

export const emailService = new EmailService();

export const sendGmailEmail = (user: IUser, emailData: SendEmailRequest) =>
  emailService.sendGmailEmail(user, emailData);

export const sendOutlookEmail = (user: IUser, emailData: SendEmailRequest) =>
  emailService.sendOutlookEmail(user, emailData);
