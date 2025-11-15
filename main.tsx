import { App, staticFiles } from "fresh";

if (Deno.env.get("BUILD_PHASE") !== "true") {
  await import("$std/dotenv/load.ts");
}

function AppWrapper({ Component }: { Component: any }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>DATA_GATA | Modern Data Architecture</title>
        <meta
          name="description"
          content="DATA_GATA LLC provides expert data architecture, analytics engineering, and lakehouse implementation services."
        />
        <link rel="icon" href="/nerdy_alligator_headshot.png" type="image/png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css"
        />
      </head>
      <body class="font-sans text-gray-900 bg-[#F8F6F0] min-h-screen flex flex-col">
        <Component />
      </body>
    </html>
  );
}

export const app = new App()
  .use(staticFiles())
  .appWrapper(AppWrapper)
  .fsRoutes();
