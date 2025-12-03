import GoogleProvider from 'next-auth/providers/google';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Only allow the specified email to sign in
      const allowedEmail = process.env.ALLOWED_EMAIL;

      if (user.email === allowedEmail) {
        return true;
      }

      // Deny access for any other email
      return false;
    },
    async session({ session, token }) {
      // Add user info to session if needed
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
      }
      return token;
    },
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
