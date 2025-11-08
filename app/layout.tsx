import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from "react-hot-toast";
import { ProjectProvider } from "./context/ProjectContext";
import { FeedbackChatProvider } from "./context/FeedbackChatContext";
import AppBootstrap from "./AppBootstrap";
import {
  DEFAULT_LOGO_DATA_URL,
  DEFAULT_LOGO_SVG,
} from "./utils/logoSvg";
import FeedbackChatWidget from "./components/feedback/FeedbackChatWidget";
import { spaceMono, geistMono, geistSans } from "@/lib/fonts";

export const metadata: Metadata = {
  metadataBase: new URL("https://my-task-manager-web.vercel.app"),
  title: "My Task Manager Web",
  description:
    "Tạo, sắp xếp và giải quyết các công việc cần làm. Công cụ sẽ thúc đẩy năng suất làm việc của bạn. My Task Manager Web sẽ giúp bạn làm được nhiều việc hơn.",
  keywords: [
    "công việc",
    "task",
    "quản lý công việc",
    "quản lý task",
    "quản lý dự án",
    "task management",
    "project management",
    "productivity",
  ],
  icons: {
    icon: [{ url: DEFAULT_LOGO_DATA_URL, type: "image/svg+xml" }],
    shortcut: [{ url: DEFAULT_LOGO_DATA_URL, type: "image/svg+xml" }],
    apple: [{ url: DEFAULT_LOGO_DATA_URL, type: "image/svg+xml" }],
  },
  openGraph: {
    title: "My Task Manager Web",
    description:
      "Tạo, sắp xếp và giải quyết các công việc cần làm. Công cụ sẽ thúc đẩy năng suất làm việc của bạn. My Task Manager Web sẽ giúp bạn làm được nhiều việc hơn.",
    url: "https://my-task-manager-web.vercel.app",
    siteName: "My Task Manager Web",
    type: "website",
    images: [
      {
        url: DEFAULT_LOGO_DATA_URL,
        alt: "My Task Manager Web logo",
        type: "image/svg+xml",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "My Task Manager Web",
    description:
      "Tạo, sắp xếp và giải quyết các công việc cần làm. Công cụ sẽ thúc đẩy năng suất làm việc của bạn. My Task Manager Web sẽ giúp bạn làm được nhiều việc hơn.",
    images: [DEFAULT_LOGO_DATA_URL],
  },
  other: {
    "brand-orb-svg": DEFAULT_LOGO_SVG,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "My Task Manager Web",
    url: "https://my-task-manager-web.vercel.app",
    description:
      "Tạo, sắp xếp và giải quyết các công việc cần làm. Công cụ sẽ thúc đẩy năng suất làm việc của bạn. My Task Manager Web sẽ giúp bạn làm được nhiều việc hơn.",
    applicationCategory: "ProjectManagementApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <html lang="vi">
      <head>
        <meta name="google-site-verification" content="V0jxoZ75WmbUT9EDrQUSLKiTKy21fGEjKMKPQ4Z3zfk" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${spaceMono.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <ProjectProvider>
            <ThemeProvider>
              <FeedbackChatProvider>
                <AppBootstrap>
                  <Toaster position="top-right" />
                  {children}
                  <FeedbackChatWidget />
                </AppBootstrap>
              </FeedbackChatProvider>
            </ThemeProvider>
          </ProjectProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
