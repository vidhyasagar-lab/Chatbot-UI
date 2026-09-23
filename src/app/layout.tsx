import type { Metadata } from "next";
import { Geist_Mono, Instrument_Sans, Newsreader } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const sans = Instrument_Sans({ variable: "--font-instrument-sans", subsets: ["latin"] });
// Serif for headings and answers: long-form reading is what this app is for.
const serif = Newsreader({ variable: "--font-newsreader", subsets: ["latin"], style: ["normal", "italic"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Verity",
  description: "Answers from your documents, cited and checked before you see them.",
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
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
