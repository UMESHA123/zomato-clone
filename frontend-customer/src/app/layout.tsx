import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { AppProvider } from "@/context/AppContext";
import "./globals.css";
import CustomerHeader from "@/components/CustomerHeader";
import ChatWidget from "@/components/ChatWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zomato - Order Food Online",
  description: "Order food online from your favourite restaurants",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <AppProvider>
            <CustomerHeader />
            <main className="mx-auto max-w-7xl w-full px-4 pt-32 pb-8 sm:px-6 md:pt-24">
              {children}
            </main>
            <ChatWidget />
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
