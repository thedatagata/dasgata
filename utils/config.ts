export const config = {
  admin: {
    email: Deno.env.get("ADMIN_EMAIL") || "thedatagata@dasgata.com",
    password: Deno.env.get("ADMIN_PASSWORD"),
  },
  session: {
    secret: Deno.env.get("SESSION_SECRET"),
    cookieName: "data_gata_session",
    maxAge: 86400,
  },
  posthog: {
    apiKey: Deno.env.get("POSTHOG_API_KEY"),
    apiHost: Deno.env.get("POSTHOG_API_HOST") || "https://swamp-data-pipe.dasgata.com",
  }
};