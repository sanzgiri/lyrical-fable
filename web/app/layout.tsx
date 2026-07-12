import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lyrical Fable Studio",
  description: "Write, save, narrate, and download luminous mythic fables.",
  authors: [{ name: "Ashutosh Sanzgiri" }],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
