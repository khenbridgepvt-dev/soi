import type { Metadata } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import '@/styles/globals.css';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-ibm-plex-sans',
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? 'Task Manager',
  description: 'Team Scheduling & Task Management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${ibmPlexSans.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
