import { IUser } from "./index";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
    interface User extends IUser {}
  }
}

declare module "express-session" {
  interface SessionData {
    connectingUserId?: string;
  }
}
