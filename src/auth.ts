import type { JWT } from "next-auth/jwt";
type AppJWT = JWT & {
  id?: string;
  role?: AppRole;
};

import { compare } from "bcryptjs";
import NextAuth, {
  type DefaultSession,
  type NextAuthConfig,
} from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import {
  DASHBOARD_ROOT_PATH,
  SIGN_IN_PATH,
  getSafeDashboardCallbackPath,
  isAppRole,
  type AppRole,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
    } & DefaultSession["user"];
  }

  interface User {
    role: AppRole;
  }
}

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

export const authConfig = {
  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: SIGN_IN_PATH,
  },

  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret:
        process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      issuer:
        process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER!,
    }),

    Credentials({
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        const parsedCredentials =
          credentialsSchema.safeParse(credentials);

        if (!parsedCredentials.success) {
          return null;
        }

        const { email, password } =
          parsedCredentials.data;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            name: true,
            passwordHash: true,
            role: true,
            isActive: true,
          },
        });

        if (
          !user?.isActive ||
          !user.passwordHash ||
          !isAppRole(user.role)
        ) {
          return null;
        }

        const isPasswordValid = await compare(
          password,
          user.passwordHash,
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name:
            user.name ??
            `${user.firstName} ${user.lastName}`.trim(),
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "microsoft-entra-id") {
        if (!user.email) {
          return false;
        }

        const existingUser =
          await prisma.user.findUnique({
            where: {
              email: user.email.toLowerCase(),
            },
            select: {
              id: true,
              isActive: true,
            },
          });

        return !!existingUser?.isActive;
      }

      return true;
    },

    async jwt({
      token,
      user,
    }: {
      token: AppJWT;
      user?: {
        id?: string;
        role?: AppRole;
        email?: string | null;
      };
    }) {
      const email =
        user?.email ??
        (typeof token.email === "string"
          ? token.email
          : null);

      if (email) {
        const existingUser =
          await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              role: true,
            },
          });

        if (
          existingUser &&
          isAppRole(existingUser.role)
        ) {
          token.id = existingUser.id;
          token.role = existingUser.role;
        }
      }

      return token;
    },

    async session({
      session,
      token,
    }: {
      session: DefaultSession & {
        user: {
          id: string;
          role: AppRole;
        } & DefaultSession["user"];
      };
      token: AppJWT;
    }) {
      if (!session.user) {
        return session;
      }

      if (typeof token.id === "string") {
        session.user.id = token.id;
      }

      if (
        typeof token.role === "string" &&
        isAppRole(token.role)
      ) {
        session.user.role = token.role;
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      if (
        url === baseUrl ||
        url === `${baseUrl}/`
      ) {
        return `${baseUrl}${DASHBOARD_ROOT_PATH}`;
      }

      if (url.startsWith("/")) {
        const safePath =
          getSafeDashboardCallbackPath(url);

        return `${baseUrl}${safePath}`;
      }

      try {
        const parsedUrl = new URL(url);

        if (parsedUrl.origin === baseUrl) {
          return url;
        }
      } catch {
        return baseUrl;
      }

      return baseUrl;
    },
  },
} satisfies NextAuthConfig;

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig);

export const { GET, POST } = handlers;