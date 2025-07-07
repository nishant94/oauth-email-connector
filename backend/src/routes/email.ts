import express, { Request, Response } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth";
import { validateEmailSend, validateObjectId } from "../middleware/validation";
import { Email } from "../models";
import { emailService } from "../services/emailService";
import { IUser, SendEmailRequest } from "../types";
import { asyncHandler } from "../utils/asyncHandler";

const router = express.Router();

router.post(
  "/send",
  requireAuth,
  validateEmailSend,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as IUser;
    const { to, cc, bcc, subject, body, htmlBody, provider } = req.body;

    const trackingId = new mongoose.Types.ObjectId().toString();

    let messageId: string | undefined;
    let status: "sent" | "failed" = "failed";
    let error: string | undefined;
    let sentCount = 0;

    const emailData: SendEmailRequest = {
      to: Array.isArray(to) ? to : [to],
      cc: cc || [],
      bcc: bcc || [],
      subject,
      body,
      htmlBody,
      provider,
    };

    try {
      const result = await emailService.sendEmailWithTracking(
        user,
        emailData,
        trackingId,
      );
      messageId = result.messageId;
      sentCount = result.sentCount;
      status = sentCount > 0 ? "sent" : "failed";
    } catch (err: any) {
      error = err.message;
      console.error("Email send failed:", err);
    }

    const newEmail = new Email({
      userId: user._id,
      messageId,
      subject,
      recipients: {
        to: emailData.to,
        cc: emailData.cc || [],
        bcc: emailData.bcc || [],
      },
      body,
      htmlBody,
      sendTimestamp: new Date(),
      status,
      provider,
      trackingId,
      error,
    });

    await newEmail.save();

    if (status === "sent") {
      res.status(200).json({
        success: true,
        message: `Email sent successfully to ${sentCount} recipient(s)`,
        data: {
          emailId: newEmail._id,
          trackingId: newEmail.trackingId,
          sentCount,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: error || "Failed to send email",
        data: {
          emailId: newEmail._id,
          trackingId: newEmail.trackingId,
          sentCount,
        },
      });
    }
  }),
);

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as IUser;
    const emails = await Email.find({ userId: user._id }).sort({
      sendTimestamp: -1,
    });
    res.json({ success: true, data: emails });
  }),
);

router.get(
  "/:id",
  requireAuth,
  validateObjectId(),
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as IUser;
    const { id } = req.params;

    const email = await Email.findOne({ _id: id, userId: user._id });

    if (!email) {
      res.status(404).json({ success: false, error: "Email not found" });
      return;
    }

    res.json({ success: true, data: email });
  }),
);

router.delete(
  "/:id",
  requireAuth,
  validateObjectId(),
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as IUser;
    const { id } = req.params;

    const email = await Email.findOneAndDelete({
      _id: id,
      userId: user._id,
    });

    if (!email) {
      res.status(404).json({ success: false, error: "Email not found" });
      return;
    }

    res.json({ success: true, message: "Email deleted successfully" });
  }),
);

export default router;
