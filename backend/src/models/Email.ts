import mongoose, { Model, Schema } from "mongoose";
import { IEmail } from "../types";

interface IEmailModel extends Model<IEmail> {
  findByUserId(
    userId: string,
    limit?: number,
    skip?: number,
  ): Promise<IEmail[]>;
  findByTrackingId(trackingId: string): Promise<IEmail | null>;
  getEmailStats(userId: string): Promise<any[]>;
  getEmailsByStatus(userId: string, status: string): Promise<IEmail[]>;
  getEmailsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<IEmail[]>;
}

const EmailSchema = new Schema<IEmail>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    messageId: {
      type: String,
      sparse: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    recipients: {
      to: {
        type: [String],
        required: true,
        validate: {
          validator: function (emails: string[]) {
            return (
              emails.length > 0 &&
              emails.every((email) =>
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email),
              )
            );
          },
          message: "At least one valid recipient email is required",
        },
      },
      cc: {
        type: [String],
        default: [],
        validate: {
          validator: function (emails: string[]) {
            return emails.every((email) =>
              /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email),
            );
          },
          message: "Invalid CC email address",
        },
      },
      bcc: {
        type: [String],
        default: [],
        validate: {
          validator: function (emails: string[]) {
            return emails.every((email) =>
              /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email),
            );
          },
          message: "Invalid BCC email address",
        },
      },
    },
    body: {
      type: String,
      required: true,
      maxlength: 50000,
    },
    htmlBody: {
      type: String,
      maxlength: 100000,
    },
    sendTimestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ["sent", "failed", "draft"],
      default: "draft",
      index: true,
    },
    provider: {
      type: String,
      required: true,
      enum: ["gmail", "outlook"],
      index: true,
    },
    trackingId: {
      type: String,
      required: true,
      unique: true,
    },
    error: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "emails",
  },
);

EmailSchema.index({ userId: 1, sendTimestamp: -1 });
EmailSchema.index({ trackingId: 1 });
EmailSchema.index({ status: 1, provider: 1 });

EmailSchema.virtual("recipientCount").get(function () {
  if (!this.recipients) return 0;
  return (
    (this.recipients.to?.length || 0) +
    (this.recipients.cc?.length || 0) +
    (this.recipients.bcc?.length || 0)
  );
});

EmailSchema.virtual("formattedSendTime").get(function () {
  return this.sendTimestamp.toISOString();
});

EmailSchema.pre("save", function (next) {
  if (this.recipients) {
    if (this.recipients.to && Array.isArray(this.recipients.to)) {
      this.recipients.to = this.recipients.to.map((email: string) =>
        email.toLowerCase().trim(),
      );
    }
    if (this.recipients.cc && Array.isArray(this.recipients.cc)) {
      this.recipients.cc = this.recipients.cc.map((email: string) =>
        email.toLowerCase().trim(),
      );
    }
    if (this.recipients.bcc && Array.isArray(this.recipients.bcc)) {
      this.recipients.bcc = this.recipients.bcc.map((email: string) =>
        email.toLowerCase().trim(),
      );
    }
  }

  if (!this.trackingId) {
    this.trackingId = new mongoose.Types.ObjectId().toString();
  }

  next();
});

EmailSchema.statics.findByUserId = async function (
  userId: string,
  limit?: number,
  skip?: number,
): Promise<IEmail[]> {
  const query = this.find({ userId }).sort({ sendTimestamp: -1 });

  if (skip) query.skip(skip);
  if (limit) query.limit(limit);

  return query.exec();
};

EmailSchema.statics.findByTrackingId = async function (
  trackingId: string,
): Promise<IEmail | null> {
  return this.findOne({ trackingId }).exec();
};

EmailSchema.statics.getEmailStats = async function (
  userId: string,
): Promise<any[]> {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]).exec();
};

EmailSchema.statics.getEmailsByStatus = async function (
  userId: string,
  status: string,
): Promise<IEmail[]> {
  return this.find({ userId, status }).sort({ sendTimestamp: -1 }).exec();
};

EmailSchema.statics.getEmailsByDateRange = async function (
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<IEmail[]> {
  return this.find({
    userId,
    sendTimestamp: { $gte: startDate, $lte: endDate },
  })
    .sort({ sendTimestamp: -1 })
    .exec();
};

export const Email = mongoose.model<IEmail, IEmailModel>("Email", EmailSchema);
