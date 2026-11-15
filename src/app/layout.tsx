import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { APP_NAME } from "@/modules/registry";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "ระบบงานภายในบริษัท",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
