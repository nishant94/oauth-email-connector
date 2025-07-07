import mongoose, { Model, Schema } from "mongoose";
import { IEmailTracking } from "../types";

interface IEmailTrackingModel extends Model<IEmailTracking> {
  findByEmailId(emailId: string): Promise<IEmailTracking[]>;
  findByTrackingId(trackingId: string): Promise<IEmailTracking[]>;
  getEventsByType(
    emailId: string,
    eventType: string,
  ): Promise<IEmailTracking[]>;
  getUniqueOpens(emailId: string): Promise<any[]>;
  getUniqueClicks(emailId: string): Promise<any[]>;
  getClickedUrls(emailId: string): Promise<any[]>;
  getEventStats(emailId: string): Promise<any[]>;
  getUserActivityStats(userId: string): Promise<any[]>;
  getRecentActivity(userId: string, limit?: number): Promise<any[]>;
  getActivityByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]>;
}

const EmailTrackingSchema = new Schema<IEmailTracking>(
  {
    trackingId: {
      type: String,
      required: true,
    },
    emailId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Email",
      index: true,
    },
    eventType: {
      type: String,
      enum: ["open", "click", "reply", "forward"],
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    ipAddress: {
      type: String,
      validate: {
        validator: function (ip: string) {
          if (!ip) return true;

          const ipv4Regex =
            /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
          const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
          return ipv4Regex.test(ip) || ipv6Regex.test(ip);
        },
        message: "Invalid IP address format",
      },
    },
    userAgent: {
      type: String,
      maxlength: 1000,
    },
    clickedUrl: {
      type: String,
      maxlength: 2000,
      validate: {
        validator: function (url: string) {
          if (!url) return true;
          try {
            new URL(url);
            return true;
          } catch {
            return false;
          }
        },
        message: "Invalid URL format",
      },
    },
    recipientEmail: {
      type: String,
      validate: {
        validator: function (email: string) {
          if (!email) return true;
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(email);
        },
        message: "Invalid email format",
      },
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

EmailTrackingSchema.index({ emailId: 1, eventType: 1 });
EmailTrackingSchema.index({ emailId: 1, timestamp: -1 });
EmailTrackingSchema.index({ trackingId: 1, eventType: 1 });
EmailTrackingSchema.index({ eventType: 1, timestamp: -1 });

EmailTrackingSchema.methods.isFirstEvent = async function (): Promise<boolean> {
  const count = await (this.constructor as IEmailTrackingModel).countDocuments({
    emailId: this.emailId,
    eventType: this.eventType,
    timestamp: { $lt: this.timestamp },
  });
  return count === 0;
};

EmailTrackingSchema.methods.getEventsByEmail = function () {
  return (this.constructor as IEmailTrackingModel)
    .find({ emailId: this.emailId })
    .sort({ timestamp: 1 });
};

EmailTrackingSchema.statics.findByEmailId = function (emailId: string) {
  return this.find({ emailId }).sort({ timestamp: -1 });
};

EmailTrackingSchema.statics.findByTrackingId = function (trackingId: string) {
  return this.find({ trackingId }).sort({ timestamp: -1 });
};

EmailTrackingSchema.statics.getEventsByType = function (
  emailId: string,
  eventType: string,
) {
  return this.find({ emailId, eventType }).sort({ timestamp: -1 });
};

EmailTrackingSchema.statics.getUniqueOpens = function (emailId: string) {
  return this.aggregate([
    { $match: { emailId, eventType: "open" } },
    { $group: { _id: "$ipAddress" } },
    { $count: "uniqueOpens" },
  ]);
};

EmailTrackingSchema.statics.getUniqueClicks = function (emailId: string) {
  return this.aggregate([
    { $match: { emailId, eventType: "click" } },
    { $group: { _id: "$ipAddress" } },
    { $count: "uniqueClicks" },
  ]);
};

EmailTrackingSchema.statics.getClickedUrls = function (emailId: string) {
  return this.aggregate([
    {
      $match: {
        emailId,
        eventType: "click",
        clickedUrl: { $exists: true, $ne: null },
      },
    },
    { $group: { _id: "$clickedUrl", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
};

EmailTrackingSchema.statics.getEventStats = function (emailId: string) {
  return this.aggregate([
    { $match: { emailId } },
    {
      $group: {
        _id: "$eventType",
        count: { $sum: 1 },
        firstEvent: { $min: "$timestamp" },
        lastEvent: { $max: "$timestamp" },
      },
    },
  ]);
};

EmailTrackingSchema.statics.getUserActivityStats = function (userId: string) {
  return this.aggregate([
    {
      $lookup: {
        from: "emails",
        localField: "emailId",
        foreignField: "emailId",
        as: "email",
      },
    },
    { $unwind: "$email" },
    { $match: { "email.userId": userId } },
    {
      $group: {
        _id: "$eventType",
        count: { $sum: 1 },
        uniqueEvents: { $addToSet: "$ipAddress" },
      },
    },
    {
      $project: {
        eventType: "$_id",
        totalEvents: "$count",
        uniqueEvents: { $size: "$uniqueEvents" },
      },
    },
  ]);
};

EmailTrackingSchema.statics.getRecentActivity = function (
  userId: string,
  limit: number = 10,
) {
  return this.aggregate([
    {
      $lookup: {
        from: "emails",
        localField: "emailId",
        foreignField: "emailId",
        as: "email",
      },
    },
    { $unwind: "$email" },
    { $match: { "email.userId": userId } },
    { $sort: { timestamp: -1 } },
    { $limit: limit },
    {
      $project: {
        emailId: "$email.emailId",
        subject: "$email.subject",
        eventType: 1,
        timestamp: 1,
        clickedUrl: 1,
        ipAddress: 1,
      },
    },
  ]);
};

EmailTrackingSchema.statics.getActivityByDateRange = function (
  userId: string,
  startDate: Date,
  endDate: Date,
) {
  return this.aggregate([
    {
      $lookup: {
        from: "emails",
        localField: "emailId",
        foreignField: "emailId",
        as: "email",
      },
    },
    { $unwind: "$email" },
    {
      $match: {
        "email.userId": userId,
        timestamp: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          eventType: "$eventType",
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.date": 1, "_id.eventType": 1 } },
  ]);
};

EmailTrackingSchema.pre("save", function (next) {
  if (!(this as any).metadata) {
    (this as any).metadata = {};
  }

  if (!(this as any).metadata.recordedAt) {
    (this as any).metadata.recordedAt = new Date().toISOString();
  }

  next();
});

export const EmailTracking = mongoose.model<
  IEmailTracking,
  IEmailTrackingModel
>("EmailTracking", EmailTrackingSchema);
