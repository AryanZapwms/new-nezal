// app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
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
  console.log("🔑 authorize() called", { email: credentials?.email, hasPassword: !!credentials?.password });

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

  const isValid = await verifyPassword(credentials.password, userDoc.password);

  if (!isValid) {
    throw new Error("Invalid email or password");
  }

  // ✅ THIS is what was missing — must return the user object
  return {
    id: userDoc._id.toString(),
    email: userDoc.email,
    name: userDoc.name || "User",
    role: userDoc.role || "user",
  };
},
    }),
  ],

  callbacks: {
    /**
     * Add custom fields to JWT
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },

    /**
     * Attach token data to session
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },

  /**
   * Redirect routes
   */
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },

  /**
   * Security & Session configuration
   */
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 1 hour session lifespan
    updateAge: 60 * 60, // Refresh token every 15 minutes
  },

  jwt: {
    maxAge: 60 * 60, // Match session maxAge
  },

  /**
   * Security secret
   */
  secret: process.env.NEXTAUTH_SECRET,

  /**
   * Enable debug logging in dev only
   */
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
