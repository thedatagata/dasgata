// routes/index.tsx
import { Head } from "$fresh/runtime.ts";

import Nav from "../components/Nav.tsx";
import Hero from "../components/Hero.tsx";
import Solutions from "../components/Solutions.tsx";
import Expertise from "../components/Expertise.tsx";
import Technologies from "../components/Technologies.tsx";
import Testimonials from "../components/Testimonials.tsx";
import Contact from "../components/Contact.tsx";
import Footer from "../components/Footer.tsx";

export default function Home() {
  return (
    <>
      <Head>
        <title>DATA_GATA | Modern Data Architecture</title>
        <meta name="description" content="DATA_GATA provides expert data architecture, analytics engineering, and lakehouse implementation services to help organizations build scalable, reliable data platforms." />
        <meta property="og:title" content="DATA_GATA | Modern Data Architecture" />
        <meta property="og:description" content="Expert data architecture, analytics engineering, and lakehouse implementation services." />
        <meta property="og:image" content="/nerdy_alligator_headshot.png" />
        <meta property="og:url" content="https://datagata.com" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      
      <Nav />
      <main>
        <Hero />
        <Solutions />
        <Expertise />
        <Technologies />
        <Testimonials />
        <Contact />
      </main>
      <Footer />
    </>
  );
}