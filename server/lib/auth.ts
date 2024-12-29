import { pbkdf2Sync, randomBytes } from "crypto";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

import * as dotenv from 'dotenv';
dotenv.config();

// Hash password with salt
export function hashPassword(password: string, salt = randomBytes(16).toString('hex')): [string, string] {
  const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return [hash, salt];
}

// Verify password
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const [computedHash] = hashPassword(password, salt);
  return computedHash === hash;
}

passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.username, username)
    });

    if (!user) {
      return done(null, false, { message: "Incorrect username." });
    }

    // Split stored password into hash and salt
    const [storedHash, salt] = user.password.split(':');
    
    if (!verifyPassword(password, storedHash, salt)) {
      return done(null, false, { message: "Incorrect password." });
    }

    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id)
    });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Middleware to check if user is authenticated
export function requireAuth(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}
