import express, { Request, Response } from "express";
import mongoose from "mongoose";
import { config } from "../config/env";
import { requireAuth } from "../middleware/auth";
import { trackingRateLimit } from "../middleware/rateLimiter";
import {
  validateClickTracking,
  validateObjectId,
} from "../middleware/validation";
import { Email, EmailTracking } from "../models";
import { EmailAnalytics, IUser, OverviewStats } from "../types";
import { asyncHandler } from "../utils/asyncHandler";
import {
  checkTrackingCooldown,
  logTrackingCooldown,
  logTrackingSuccess,
} from "../utils/trackingUtils";

const router = express.Router();

router.get(
  "/pixel/:trackingId/:recipient",
  trackingRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { trackingId, recipient } = req.params;

    if (!trackingId || typeof trackingId !== "string") {
      return res.status(400).json({
        success: false,
        error: "Missing or invalid trackingId parameter",
      });
    }
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get("User-Agent");

    console.log(
      `👁️ Email open tracked: ${trackingId}${
        recipient ? ` for ${recipient}` : ""
      }`,
    );
    console.log(`📍 IP: ${ipAddress}, User-Agent: ${userAgent}`);

    const email = await Email.findOne({ trackingId });

    if (email) {
      const cooldownStatus = checkTrackingCooldown(email.sendTimestamp);

      if (cooldownStatus.isActive) {
        logTrackingCooldown(
          trackingId,
          "open",
          cooldownStatus.remainingSeconds,
        );
      } else {
        const trackingEvent = new EmailTracking({
          trackingId,
          emailId: email._id,
          eventType: "open",
          ipAddress,
          userAgent,
          recipientEmail: recipient as string,
          metadata: {
            timestamp: new Date().toISOString(),
            referer: req.get("Referer"),
            acceptLanguage: req.get("Accept-Language"),
          },
        });

        await trackingEvent.save();
        logTrackingSuccess("open");
      }
    } else {
      console.log(`No email found with trackingId: ${trackingId}`);
    }

    const pixel = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64",
    );

    res.set({
      "Content-Type": "image/png",
      "Content-Length": pixel.length,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });

    return res.send(pixel);
  }),
);

router.get(
  "/click/:trackingId/:url/:recipient",
  trackingRateLimit,
  validateClickTracking,
  asyncHandler(async (req: Request, res: Response) => {
    const { trackingId, url, recipient } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get("User-Agent");

    console.log(
      `🖱️ Email click tracked: ${trackingId} -> ${url}${
        recipient ? ` by ${recipient}` : ""
      }`,
    );

    const email = await Email.findOne({ trackingId });

    if (email) {
      const trackingEvent = new EmailTracking({
        trackingId,
        emailId: email._id,
        eventType: "click",
        ipAddress,
        userAgent,
        clickedUrl: url as string,
        recipientEmail: recipient as string,
        metadata: {
          timestamp: new Date().toISOString(),
          referer: req.get("Referer"),
          acceptLanguage: req.get("Accept-Language"),
        },
      });

      await trackingEvent.save();
      logTrackingSuccess("click");
    }

    return res.redirect(url as string);
  }),
);

router.get(
  "/analytics/:emailId",
  requireAuth,
  validateObjectId("emailId"),
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as IUser;
    const { emailId } = req.params;

    const email = await Email.findOne({
      _id: emailId,
      userId: user._id,
    });

    if (!email) {
      return res.status(404).json({
        success: false,
        error: "Email not found",
      });
    }

    const trackingEvents = await EmailTracking.find({
      emailId,
    }).sort({ timestamp: 1 });

    const opens = trackingEvents.filter((event) => event.eventType === "open");
    const clicks = trackingEvents.filter(
      (event) => event.eventType === "click",
    );

    const uniqueOpens = new Set(opens.map((event) => event.ipAddress)).size;
    const uniqueClicks = new Set(clicks.map((event) => event.ipAddress)).size;

    const clickedUrls: Record<string, number> = {};
    clicks.forEach((click) => {
      if (click.clickedUrl) {
        clickedUrls[click.clickedUrl] =
          (clickedUrls[click.clickedUrl] || 0) + 1;
      }
    });

    const analytics: EmailAnalytics = {
      emailId: (email._id as mongoose.Types.ObjectId).toString(),
      subject: email.subject,
      sentAt: email.sendTimestamp.toISOString(),
      status: email.status,
      recipients: email.recipients,
      totalOpens: opens.length,
      uniqueOpens,
      totalClicks: clicks.length,
      uniqueClicks,
      clickedUrls,
      firstOpenAt:
        opens.length > 0 ? opens[0].timestamp.toISOString() : undefined,
      lastActivityAt:
        trackingEvents.length > 0
          ? trackingEvents[trackingEvents.length - 1].timestamp.toISOString()
          : undefined,
      events: trackingEvents.map((event) => ({
        type: event.eventType,
        timestamp: event.timestamp.toISOString(),
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        clickedUrl: event.clickedUrl,
        metadata: event.metadata,
      })),
    };

    return res.json({
      success: true,
      data: analytics,
    });
  }),
);

router.get(
  "/analytics/:emailId/recipients",
  requireAuth,
  validateObjectId("emailId"),
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as IUser;
    const { emailId } = req.params;

    const email = await Email.findOne({
      _id: emailId,
      userId: user._id,
    });

    if (!email) {
      return res.status(404).json({
        success: false,
        error: "Email not found",
      });
    }

    const allRecipients = [
      ...email.recipients.to,
      ...email.recipients.cc,
      ...email.recipients.bcc,
    ];

    const trackingEvents = await EmailTracking.find({
      emailId,
    }).sort({ timestamp: 1 });

    const recipientStats = allRecipients.map((recipientEmail) => {
      const recipientEvents = trackingEvents.filter(
        (event) => event.recipientEmail === recipientEmail,
      );

      const opens = recipientEvents.filter(
        (event) => event.eventType === "open",
      );
      const clicks = recipientEvents.filter(
        (event) => event.eventType === "click",
      );

      return {
        email: recipientEmail,
        opened: opens.length > 0,
        openCount: opens.length,
        firstOpenAt: opens.length > 0 ? opens[0].timestamp.toISOString() : null,
        lastOpenAt:
          opens.length > 0
            ? opens[opens.length - 1].timestamp.toISOString()
            : null,
        clicked: clicks.length > 0,
        clickCount: clicks.length,
        firstClickAt:
          clicks.length > 0 ? clicks[0].timestamp.toISOString() : null,
        lastClickAt:
          clicks.length > 0
            ? clicks[clicks.length - 1].timestamp.toISOString()
            : null,
        events: recipientEvents.map((event) => ({
          type: event.eventType,
          timestamp: event.timestamp.toISOString(),
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          clickedUrl: event.clickedUrl,
        })),
      };
    });

    const totalRecipients = allRecipients.length;
    const openedCount = recipientStats.filter((stat) => stat.opened).length;
    const clickedCount = recipientStats.filter((stat) => stat.clicked).length;
    const openRate =
      totalRecipients > 0
        ? ((openedCount / totalRecipients) * 100).toFixed(2)
        : "0";
    const clickRate =
      openedCount > 0 ? ((clickedCount / openedCount) * 100).toFixed(2) : "0";

    const response = {
      emailId: (email._id as mongoose.Types.ObjectId).toString(),
      subject: email.subject,
      sentAt: email.sendTimestamp.toISOString(),
      totalRecipients,
      openedCount,
      clickedCount,
      openRate,
      clickRate,
      recipients: recipientStats,
    };

    return res.json({
      success: true,
      data: response,
    });
  }),
);

router.get(
  "/stats/overview",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as IUser;

    const emailStats = await Email.getEmailStats(user._id.toString());
    const emailStatsData = emailStats[0] || {
      totalEmails: 0,
      sentEmails: 0,
      failedEmails: 0,
    };

    const trackingStats = await EmailTracking.getUserActivityStats(
      user._id.toString(),
    );

    let totalOpens = 0;
    let totalClicks = 0;
    let uniqueOpens = 0;
    let uniqueClicks = 0;

    trackingStats.forEach((stat: any) => {
      if (stat.eventType === "open") {
        totalOpens = stat.totalEvents;
        uniqueOpens = stat.uniqueEvents;
      } else if (stat.eventType === "click") {
        totalClicks = stat.totalEvents;
        uniqueClicks = stat.uniqueEvents;
      }
    });

    const openRate =
      emailStatsData.sentEmails > 0
        ? ((uniqueOpens / emailStatsData.sentEmails) * 100).toFixed(2)
        : "0";

    const clickRate =
      uniqueOpens > 0 ? ((uniqueClicks / uniqueOpens) * 100).toFixed(2) : "0";

    const recentActivity = await EmailTracking.getRecentActivity(
      user._id.toString(),
      10,
    );

    const overviewStats: OverviewStats = {
      totalEmails: emailStatsData.totalEmails,
      sentEmails: emailStatsData.sentEmails,
      failedEmails: emailStatsData.failedEmails,
      totalOpens,
      totalClicks,
      uniqueOpens,
      uniqueClicks,
      openRate,
      clickRate,
      recentActivity: recentActivity.map((activity: any) => ({
        emailId: activity.emailId,
        subject: activity.subject,
        type: activity.eventType,
        timestamp: activity.timestamp.toISOString(),
        clickedUrl: activity.clickedUrl,
      })),
    };

    return res.json({
      success: true,
      data: overviewStats,
    });
  }),
);

export default router;
