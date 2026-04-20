import NextAuth, { type NextAuthConfig, type Session } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@sports/db";

export type UserRole = "USER" | "ADMIN";

const isDev = process.env["NODE_ENV"] !== "production";

const config: NextAuthConfig = {
  adapter: PrismaAdapter(db),
  providers: [
    ...(process.env["GOOGLE_CLIENT_ID"] && process.env["GOOGLE_CLIENT_SECRET"]
      ? [
          GoogleProvider({
            clientId: process.env["GOOGLE_CLIENT_ID"],
            clientSecret: process.env["GOOGLE_CLIENT_SECRET"],
          }),
        ]
      : []),
    // Dev-only credentials provider — never available in production
    ...(isDev
      ? [
          CredentialsProvider({
            id: "dev-credentials",
            name: "Dev Login",
            credentials: {
              email: { label: "Email", type: "email" },
              password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
              if (credentials?.password !== "admin123") return null;
              const email = credentials.email as string;
              if (!email) return null;
              let user = await db.user.findUnique({ where: { email } });
              if (!user) {
                user = await db.user.create({
                  data: { email, name: email.split("@")[0], role: "ADMIN" },
                });
              }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return { id: user.id, email: user.email, name: user.name, role: (user as any).role };
            },
          }),
        ]
      : []),
  ],
  session: {
    // JWT strategy required for CredentialsProvider; works equally well for OAuth
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token["userId"] = user.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token["role"] = ((user as any).role as UserRole) ?? "USER";
      }
      // For OAuth sign-ins, fetch role from DB (PrismaAdapter doesn't populate user.role in JWT flow)
      if (account && account.provider !== "dev-credentials" && user?.id) {
        const dbUser = await db.user.findUnique({ where: { id: user.id } });
        if (dbUser) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          token["role"] = ((dbUser as any).role as UserRole) ?? "USER";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token["userId"] as string;
        session.user.role = (token["role"] as UserRole) ?? "USER";
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
