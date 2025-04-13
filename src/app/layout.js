import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from '../components/ClientLayout';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Remote Desktop",
  description: "Remote Desktop Management Application",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <MantineProvider defaultColorScheme="light">
          <ClientLayout>
            {children}
          </ClientLayout>
        </MantineProvider>
      </body>
    </html>
  );
}
