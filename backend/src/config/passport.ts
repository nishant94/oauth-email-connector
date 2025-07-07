import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as MicrosoftStrategy } from "passport-microsoft";
import { User } from "../models";
import { IUser } from "../types";
import { config } from "./env";

import "express-session";

declare module "express-session" {
  interface SessionData {
    connectingUserId?: string;
  }
}

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    if (user) {
      done(null, user);
    } else {
      done(new Error("User not found"), null);
    }
  } catch (error) {
    done(error as Error, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      callbackURL: config.GOOGLE_REDIRECT_URI,
      scope: [
        "profile",
        "email",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.readonly",
      ],
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value || "";

        if (req.session?.connectingUserId) {
          const authenticatedUser = await User.findById(
            req.session.connectingUserId,
          );

          if (authenticatedUser) {
            const existingConnection =
              authenticatedUser.connectedProviders.find(
                (conn) => conn.provider === "google",
              );

            if (!existingConnection) {
              authenticatedUser.connectedProviders.push({
                provider: "google",
                providerId: googleId,
                email,
                accessToken,
                refreshToken: refreshToken || "",
                accessTokenExpires: new Date(Date.now() + 3600 * 1000),
                connectedAt: new Date(),
              });
              authenticatedUser.updatedAt = new Date();
              await authenticatedUser.save();
              console.log(
                "Google connected to authenticated user:",
                authenticatedUser.email,
              );
            } else {
              existingConnection.accessToken = accessToken;
              existingConnection.refreshToken =
                refreshToken || existingConnection.refreshToken;
              existingConnection.accessTokenExpires = new Date(
                Date.now() + 3600 * 1000,
              );
              authenticatedUser.updatedAt = new Date();
              await authenticatedUser.save();
              console.log(
                "Google connection updated for user:",
                authenticatedUser.email,
              );
            }
            return done(null, authenticatedUser);
          } else {
            console.log(
              "Connecting user not found in database:",
              req.session.connectingUserId,
            );
            return done(
              new Error(
                "Connecting user not found. Please try logging in again.",
              ),
              undefined,
            );
          }
        }

        let user = await User.findOne({ googleId });

        if (user) {
          user.accessToken = accessToken;
          user.refreshToken = refreshToken || user.refreshToken;
          user.accessTokenExpires = new Date(Date.now() + 3600 * 1000);
          user.lastLogin = new Date();
          await user.save();
          console.log("Existing Google user updated:", user.email);
          return done(null, user);
        }

        const existingLocalUser = await User.findOne({
          email,
          provider: "local",
        });

        if (existingLocalUser) {
          const existingConnection = existingLocalUser.connectedProviders.find(
            (conn) => conn.provider === "google",
          );

          if (!existingConnection) {
            existingLocalUser.connectedProviders.push({
              provider: "google",
              providerId: googleId,
              email,
              accessToken,
              refreshToken: refreshToken || "",
              accessTokenExpires: new Date(Date.now() + 3600 * 1000),
              connectedAt: new Date(),
            });
            existingLocalUser.updatedAt = new Date();
            await existingLocalUser.save();
            console.log(
              "Google connected to existing local user:",
              existingLocalUser.email,
            );
          }
          return done(null, existingLocalUser);
        }

        console.log("Google login attempt blocked - connections only");
        return done(
          new Error(
            "Google login is not available. Please create a local account first and then connect Google for email sending.",
          ),
          undefined,
        );
      } catch (error) {
        console.error("Google OAuth error:", error);
        return done(error as Error, undefined);
      }
    },
  ),
);

passport.use(
  new MicrosoftStrategy(
    {
      clientID: config.MICROSOFT_CLIENT_ID,
      clientSecret: config.MICROSOFT_CLIENT_SECRET,
      callbackURL: config.MICROSOFT_REDIRECT_URI,
      scope: ["User.Read", "Mail.Send", "Mail.Read"],
      tenant: config.MICROSOFT_TENANT_ID,
      passReqToCallback: true,
    },
    async (
      req: any,
      accessToken: string,
      refreshToken: string | undefined,
      profile: { id: any; emails: { value: any }[]; displayName: any },
      done: (arg0: Error | null, arg1: IUser | undefined) => any,
    ) => {
      try {
        const microsoftId = profile.id;
        const email = profile.emails?.[0]?.value || "";

        if (req.session?.connectingUserId) {
          console.log(
            "🔍 Found connecting user ID in session:",
            req.session.connectingUserId,
          );
          const authenticatedUser = await User.findById(
            req.session.connectingUserId,
          );

          if (authenticatedUser) {
            console.log("Found connecting user:", authenticatedUser.email);

            const existingConnection =
              authenticatedUser.connectedProviders.find(
                (conn) => conn.provider === "microsoft",
              );

            if (!existingConnection) {
              authenticatedUser.connectedProviders.push({
                provider: "microsoft",
                providerId: microsoftId,
                email,
                accessToken,
                refreshToken: refreshToken || "",
                accessTokenExpires: new Date(Date.now() + 3600 * 1000),
                connectedAt: new Date(),
              });
              authenticatedUser.updatedAt = new Date();
              await authenticatedUser.save();
              console.log(
                "Microsoft connected to authenticated user:",
                authenticatedUser.email,
              );
            } else {
              existingConnection.accessToken = accessToken;
              existingConnection.refreshToken =
                refreshToken || existingConnection.refreshToken;
              existingConnection.accessTokenExpires = new Date(
                Date.now() + 3600 * 1000,
              );
              authenticatedUser.updatedAt = new Date();
              await authenticatedUser.save();
              console.log(
                "Microsoft connection updated for user:",
                authenticatedUser.email,
              );
            }
            return done(null, authenticatedUser);
          } else {
            console.log(
              "Connecting user not found in database:",
              req.session.connectingUserId,
            );
            return done(
              new Error(
                "Connecting user not found. Please try logging in again.",
              ),
              undefined,
            );
          }
        } else {
          console.log("No connecting user ID found in session");
        }

        let user = await User.findOne({ microsoftId });

        if (user) {
          user.accessToken = accessToken;
          user.refreshToken = refreshToken || user.refreshToken;
          user.accessTokenExpires = new Date(Date.now() + 3600 * 1000);
          user.lastLogin = new Date();
          await user.save();
          console.log("Existing Microsoft user updated:", user.email);
          return done(null, user);
        }

        const existingLocalUser = await User.findOne({
          email,
          provider: "local",
        });

        if (existingLocalUser) {
          const existingConnection = existingLocalUser.connectedProviders.find(
            (conn) => conn.provider === "microsoft",
          );

          if (!existingConnection) {
            existingLocalUser.connectedProviders.push({
              provider: "microsoft",
              providerId: microsoftId,
              email,
              accessToken,
              refreshToken: refreshToken || "",
              accessTokenExpires: new Date(Date.now() + 3600 * 1000),
              connectedAt: new Date(),
            });
            existingLocalUser.updatedAt = new Date();
            await existingLocalUser.save();
            console.log(
              "Microsoft connected to existing local user:",
              existingLocalUser.email,
            );
          }
          return done(null, existingLocalUser);
        }

        console.log("Microsoft login attempt blocked - connections only");
        return done(
          new Error(
            "Microsoft login is not available. Please create a local account first and then connect Microsoft for email sending.",
          ),
          undefined,
        );
      } catch (error) {
        console.error("Microsoft OAuth error:", error);
        return done(error as Error, undefined);
      }
    },
  ),
);

export default passport;
