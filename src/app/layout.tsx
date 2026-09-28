import type { Metadata, Viewport } from "next";
import { Geist_Mono, Instrument_Sans, Newsreader } from "next/font/google";
import { DotField } from "@/components/dot-field";
import { Toaster } from "@/components/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DESCRIPTION, SITE_NAME, TAGLINE, siteUrl } from "@/lib/site";
import "./globals.css";

const sans = Instrument_Sans({ variable: "--font-instrument-sans", subsets: ["latin"] });
// Serif for headings and answers: long-form reading is what this app is for.
const serif = Newsreader({ variable: "--font-newsreader", subsets: ["latin"], style: ["normal", "italic"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Pages set a short title ("Chat"); the template adds the brand. Icons come
// from the file conventions in this folder (favicon.ico, icon.svg, apple-icon.png).
export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: `${SITE_NAME} · ${TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { type: "website", siteName: SITE_NAME, title: `${SITE_NAME} · ${TAGLINE}`, description: DESCRIPTION, url: "/" },
  twitter: { card: "summary", title: `${SITE_NAME} · ${TAGLINE}`, description: DESCRIPTION },
};

// Matches --background in each theme, so the mobile browser bar blends in.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#181715" },
  ],
};

// Dark is the default. Runs before paint so a light-mode visitor never sees a dark flash.
const themeScript = `try{if(localStorage.getItem("verity-theme")==="light")document.documentElement.classList.remove("dark")}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Font variables live on <html> because the font-sans rule is applied there.
    <html lang="en" className={`dark ${sans.variable} ${serif.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <DotField />
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
