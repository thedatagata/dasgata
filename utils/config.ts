export const config = {
  admin: {
    email: Deno.env.get("ADMIN_EMAIL") || "thedatagata@gmail.com"
  },
  session: {
    secret: Deno.env.get("SESSION_SECRET"),
    cookieName: "data_gata_session",
    maxAge: 86400,
  },
  oauth: {
    googleClientId: Deno.env.get("GOOGLE_CLIENT_ID"),
    googleClientSecret: Deno.env.get("GOOGLE_CLIENT_SECRET"),
  }
};