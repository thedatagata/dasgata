// routes/_app.tsx
import { PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import ScrollToTop from "../islands/ScrollToTop.tsx";


export default function App({ Component }: PageProps) {
  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>DATA_GATA | Modern Data Architecture</title>
        <meta name="description" content="DATA_GATA LLC provides expert data architecture, analytics engineering, and lakehouse implementation services." />
        <link rel="icon" href="/nerdy_alligator_headshot.png" type="image/png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" />
        <link rel="stylesheet" href="/styles.css" />
        <script defer data-domain="dasgata.com" src="https://swamp-data-pipe.dasgata.com/js/script.hash.pageview-props.tagged-events.js"></script>
        {/* Google Tag Manager */}
        <script dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-MNFD4V4T');`
        }} />
        {/* End Google Tag Manager */}      
      </Head>
      <div class="font-sans text-gray-900 bg-[#F8F6F0] min-h-screen flex flex-col">
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MNFD4V4T" height="0" width="0" style={{display: "none", visibility: "hidden"}}></iframe></noscript>
        <Component />
        <ScrollToTop />
      </div>
    </>
  );
}