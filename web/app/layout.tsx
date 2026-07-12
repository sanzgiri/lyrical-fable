import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const description = "Write luminous mythic fables, listen to local Kokoro narration, and explore sample recordings.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Lyrical Fable Studio",
    template: "%s · Lyrical Fable Studio",
  },
  description,
  applicationName: "Lyrical Fable Studio",
  authors: [{ name: "Ashutosh Sanzgiri", url: "https://github.com/sanzgiri" }],
  creator: "Ashutosh Sanzgiri",
  publisher: "Ashutosh Sanzgiri",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Lyrical Fable Studio",
    title: "Lyrical Fable Studio — Mythic fables, newly told",
    description,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Lyrical Fable Studio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lyrical Fable Studio — Mythic fables, newly told",
    description,
    images: ["/opengraph-image"],
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Lyrical Fable Studio",
  url: siteUrl,
  description,
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": "https://github.com/sanzgiri",
  name: "Ashutosh Sanzgiri",
  url: "https://github.com/sanzgiri",
  sameAs: ["https://github.com/sanzgiri"],
};

const applicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Lyrical Fable Studio",
  url: siteUrl,
  applicationCategory: "WritingApplication",
  description,
  creator: { "@id": "https://github.com/sanzgiri" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(applicationJsonLd) }} />
        {children}
      </body>
    </html>
  );
}
