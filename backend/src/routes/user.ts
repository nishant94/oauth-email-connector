import express, { Request, Response } from "express";
import { User, Email, EmailTracking } from "../models";
import { requireAuth } from "../middleware/auth";
import {
  validateUserUpdate,
} from "../middleware/validation";
import { IUser, OverviewStats } from "../types";
import { asyncHandler } from "../utils/asyncHandler";

const router = express.Router();

router.get(
  "/profile",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as IUser;
    return res.json({ success: true, data: user });
  }),
);

router.put(
  "/profile",
  requireAuth,
  validateUserUpdate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as IUser;
    const { name, email } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return res
        .status(400)
        .json({ success: false, error: "Email already in use" });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    await user.save();

    return res.json({ success: true, data: user });
  }),
);

router.get(
  "/dashboard/overview",
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

    return res.json({ success: true, data: overviewStats });
  }),
);

router.get(
  "/emails",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as IUser;
    const emails = await Email.find({ userId: user._id }).sort({
      sendTimestamp: -1,
    });
    return res.json({ success: true, data: emails });
  }),
);

router.get(
  "/emails/with-tracking",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as IUser;
    const emails = await Email.find({ userId: user._id }).sort({
      sendTimestamp: -1,
    });

    const emailsWithTracking = await Promise.all(
      emails.map(async (email) => {
        const trackingEvents = await EmailTracking.find({
          emailId: email._id,
        });

        const totalRecipients =
          email.recipients.to.length +
          email.recipients.cc.length +
          email.recipients.bcc.length;

        const opens = trackingEvents.filter(
          (event) => event.eventType === "open",
        );
        const clicks = trackingEvents.filter(
          (event) => event.eventType === "click",
        );

        const uniqueOpens = new Set(
          opens
            .filter((event) => event.recipientEmail)
            .map((event) => event.recipientEmail),
        ).size;

        const uniqueClicks = new Set(
          clicks
            .filter((event) => event.recipientEmail)
            .map((event) => event.recipientEmail),
        ).size;

        const openRate =
          totalRecipients > 0
            ? ((uniqueOpens / totalRecipients) * 100).toFixed(2)
            : "0";
        const clickRate =
          uniqueOpens > 0
            ? ((uniqueClicks / uniqueOpens) * 100).toFixed(2)
            : "0";

        const firstOpenAt =
          opens.length > 0 ? opens[0].timestamp.toISOString() : undefined;
        const lastActivityAt =
          trackingEvents.length > 0
            ? trackingEvents[trackingEvents.length - 1].timestamp.toISOString()
            : undefined;

        return {
          ...email.toJSON(),
          trackingStats: {
            totalRecipients,
            totalOpens: opens.length,
            uniqueOpens,
            totalClicks: clicks.length,
            uniqueClicks,
            openRate,
            clickRate,
            firstOpenAt,
            lastActivityAt,
          },
        };
      }),
    );

    return res.json({ success: true, data: emailsWithTracking });
  }),
);

router.get(
  "/export",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as IUser;
    const format = (req.query.format as string) || "json";

    if (!["json"].includes(format)) {
      return res.status(400).json({
        success: false,
        error: "Invalid export format. Only json is supported.",
      });
    }

    const userData = await User.findById(user._id).lean();
    const userEmails = await Email.find({ userId: user._id }).lean();
    const userTracking = await EmailTracking.find({ userId: user._id }).lean();

    const exportData = {
      user: userData,
      emails: userEmails,
      tracking: userTracking,
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="user_data_${user._id}.json"`,
    );
    return res.json(exportData);
  }),
);

export default router;
