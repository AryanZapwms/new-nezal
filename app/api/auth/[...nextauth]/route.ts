// app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { verifyPassword } from "@/lib/auth";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const email = credentials.email.trim().toLowerCase();

        try {
          await connectDB();
        } catch (err) {
          console.error("💥 DB connection failed:", err);
          throw new Error("DB error");
        }

        const userDoc = await User.findOne({ email }).lean();

        if (!userDoc) {
          throw new Error("Invalid email or password");
        }

        if (!userDoc.isVerified) {
          throw new Error("Please verify your email before logging in");
        }

        if (!userDoc.password) {
          // This account was created via Google — no password to check against
          throw new Error("This account uses Google sign-in. Please continue with Google.");
        }

        const isValid = await verifyPassword(credentials.password, userDoc.password);

        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: userDoc._id.toString(),
          email: userDoc.email,
          name: userDoc.name || "User",
          role: userDoc.role || "user",
        };
      },
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    /**
     * Runs before jwt/session — used here to find-or-create a User
     * for Google sign-ins, since Google never touches our DB on its own.
     */
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;

      await connectDB();

      const email = user.email?.trim().toLowerCase();
      if (!email) return false;

      let dbUser = await User.findOne({ email });

      if (!dbUser) {
        dbUser = await User.create({
          email,
          name: user.name || "User",
          isVerified: true, // Google already verified this email
          provider: "google",
          role: "user",
          // no password field — schema now allows this
        });
      }

      return true;
    },

    async jwt({ token, user, account }) {
      // On initial sign-in, `user` is the object returned by authorize() or
      // the Google profile. For Google we need to re-look-up our own User
      // doc to get OUR _id and role, since `user.id` here is Google's id.
      if (account?.provider === "google" && user?.email) {
        await connectDB();
        const dbUser = await User.findOne({ email: user.email.toLowerCase() });
        if (dbUser) {
          token.id = dbUser._id.toString();
          token.role = dbUser.role || "user";
        }
      } else if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },

  /**
   * Session configuration — both values now match deliberately.
   * 30 days = standard "remember me" e-commerce behavior, rolling
   * forward on activity (NextAuth's default rolling-session behavior).
   */
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60,   // re-issue token at most once per day
  },

  jwt: {
    maxAge: 30 * 24 * 60 * 60, // matches session.maxAge — no more mismatch
  },

  secret: process.env.NEXTAUTH_SECRET,

  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };