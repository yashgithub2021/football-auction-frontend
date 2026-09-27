import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { RoomClientProvider } from "@/state/room/RoomClientProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Football Auction",
  description: "Random-draw football player auction for friends.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-emerald-950 text-white antialiased [touch-action:manipulation]">
        <RoomClientProvider>{children}</RoomClientProvider>
      </body>
    </html>
  );
}
