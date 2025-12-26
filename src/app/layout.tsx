import type {Metadata} from 'next';
import './globals.css';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/toaster';
import { LogPanelProvider } from '@/components/logs/log-panel-context';
// import { DashboardConnection } from '@/components/dashboard-connection';

export const metadata: Metadata = {
  title: 'StreamWeaver',
  description: 'The AI-powered streaming bot for creators.',
  manifest: '/manifest.json',
  icons: {
    icon: '/StreamWeaver.png',
    apple: '/StreamWeaver.png',
  },
};

export function generateViewport() {
  return {
    themeColor: '#667eea',
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#667eea" />
        <link rel="icon" href="/StreamWeaver.png" />
        <link rel="apple-touch-icon" href="/StreamWeaver.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Code+Pro:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        {/* <DashboardConnection /> */}
        <LogPanelProvider>
            <SidebarProvider>
            {children}
            </SidebarProvider>
        </LogPanelProvider>
        <Toaster />
      </body>
    </html>
  );
}
