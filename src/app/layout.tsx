import type { Metadata } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import '@/styles/globals.css';
import { getAppDisplayName } from '@/lib/app/display-name';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-ibm-plex-sans',
});

export const metadata: Metadata = {
  title: getAppDisplayName(),
  description: 'Immigration case and task management for Soi',
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
