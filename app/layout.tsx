import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Use system fonts for better Docker build compatibility
const fontSans = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const fontMono = "Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

export const metadata: Metadata = {
  title: "LGU-Chat - Secure Internal Messaging",
  description: "Secure, private messaging for the Local Government of Quezon Bukidnon requiring air-gapped communication.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased"
        style={{
          fontFamily: fontSans,
          '--font-sans': fontSans,
          '--font-mono': fontMono,
        } as React.CSSProperties}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
