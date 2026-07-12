import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Lyrical Fable Studio",
    template: "%s · Lyrical Fable Studio",
  },
  description: "Write luminous mythic fables, listen to local Kokoro narration, and explore sample recordings.",
  applicationName: "Lyrical Fable Studio",
  authors: [{ name: "Ashutosh Sanzgiri", url: "https://github.com/sanzgiri" }],
  creator: "Ashutosh Sanzgiri",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Lyrical Fable Studio",
    title: "Lyrical Fable Studio",
    description: "A studio for writing luminous mythic fables and listening to sample narrations.",
  },
  twitter: {
    card: "summary",
    title: "Lyrical Fable Studio",
    description: "A studio for writing luminous mythic fables and listening to sample narrations.",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Lyrical Fable Studio",
  url: siteUrl,
  applicationCategory: "WritingApplication",
  description: "A studio for writing luminous mythic fables and listening to sample narrations.",
  creator: {
    "@type": "Person",
    name: "Ashutosh Sanzgiri",
    url: "https://github.com/sanzgiri",
    sameAs: ["https://github.com/sanzgiri"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        {children}
      </body>
    </html>
  );
}
