import mongoose, { Schema, Model } from "mongoose";
import bcrypt from "bcryptjs";
import { IUser } from "../types";

interface IUserModel extends Model<IUser> {
  findByProviderId(
    provider: "google" | "microsoft",
    providerId: string,
  ): Promise<IUser | null>;
  updateTokens(
    userId: string,
    accessToken: string,
    refreshToken?: string,
    accessTokenExpires?: Date,
  ): Promise<IUser | null>;
}

const UserSchema = new Schema<IUser, IUserModel>({
  username: { type: String, unique: true, sparse: true },
  password: { type: String },

  googleId: { type: String, unique: true, sparse: true },
  microsoftId: { type: String, unique: true, sparse: true },

  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },

  accessToken: { type: String },
  refreshToken: { type: String },
  accessTokenExpires: { type: Date },

  provider: {
    type: String,
    required: true,
    enum: ["local"],
  },

  connectedProviders: [
    {
      provider: { type: String, enum: ["google", "microsoft"] },
      providerId: { type: String },
      email: { type: String },
      accessToken: { type: String },
      refreshToken: { type: String },
      accessTokenExpires: { type: Date },
      connectedAt: { type: Date, default: Date.now },
    },
  ],

  lastLogin: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.statics.findByProviderId = async function (
  provider: "google" | "microsoft",
  providerId: string,
): Promise<IUser | null> {
  if (provider === "google") {
    return this.findOne({ googleId: providerId });
  } else if (provider === "microsoft") {
    return this.findOne({ microsoftId: providerId });
  }
  return null;
};

UserSchema.statics.updateTokens = async function (
  userId: string,
  accessToken: string,
  refreshToken?: string,
  accessTokenExpires?: Date,
): Promise<IUser | null> {
  const user = await this.findById(userId);
  if (user) {
    user.accessToken = accessToken;
    if (refreshToken) user.refreshToken = refreshToken;
    if (accessTokenExpires) user.accessTokenExpires = accessTokenExpires;
    user.updatedAt = new Date();
    await user.save();
  }
  return user;
};

export const User = mongoose.model<IUser, IUserModel>("User", UserSchema);
