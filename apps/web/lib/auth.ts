import NextAuth, { type NextAuthConfig, type Session } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@sports/db";

export type UserRole = "USER" | "ADMIN";

const config: NextAuthConfig = {
  adapter: PrismaAdapter(db),
  providers: [
    GoogleProvider({
      clientId: process.env["GOOGLE_CLIENT_ID"]!,
      clientSecret: process.env["GOOGLE_CLIENT_SECRET"]!,
    }),
  ],
  session: {
    strategy: "database",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // PrismaAdapter extends AdapterUser with our User model fields
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session.user.role = ((user as any).role as UserRole) ?? "USER";
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nextAuth = NextAuth(config) as any;

export const handlers = nextAuth.handlers as {
  GET: (req: Request) => Promise<Response>;
  POST: (req: Request) => Promise<Response>;
};

export const auth = nextAuth.auth as () => Promise<Session | null>;
export const signIn = nextAuth.signIn as (...args: unknown[]) => Promise<void>;
export const signOut = nextAuth.signOut as (...args: unknown[]) => Promise<void>;

// Type augmentation for NextAuth session
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
    };
  }
}
