import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import { SupportNotifier } from "@/components/support-notifier";
import { MobileTabBar } from "@/components/mobile-tab-bar";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-8xl text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground hover:bg-clay transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-3xl text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-full bg-primary px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground hover:bg-clay transition-colors"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-full border border-foreground/10 px-6 py-3 text-xs font-bold uppercase tracking-[0.2em]"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#ffffff", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#0f1a2e", media: "(prefers-color-scheme: dark)" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "google-site-verification", content: "xLDIPAFQNPql6cbeyIEyEPM6pOHXhn8g2UylireLFuM" },
      { title: "Salonzee — Book Ghana's finest salons" },
      { name: "description", content: "Discover and book the best salons in Accra, Kumasi, and across Ghana. Professional grooming, hair, and beauty bookings — simple and instant." },
      { name: "author", content: "Salonzee" },
      { property: "og:title", content: "Salonzee — Book Ghana's finest salons" },
      { property: "og:description", content: "Discover and book the best salons in Accra, Kumasi, and across Ghana. Professional grooming, hair, and beauty bookings — simple and instant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Salonzee — Book Ghana's finest salons" },
      { name: "twitter:description", content: "Discover and book the best salons in Accra, Kumasi, and across Ghana. Professional grooming, hair, and beauty bookings — simple and instant." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/7f9157ec-648a-41a3-9ec0-dbe1bebcb2a5" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/7f9157ec-648a-41a3-9ec0-dbe1bebcb2a5" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Salonzee",
          url: "https://salonzee.lovable.app",
          description:
            "Salonzee helps customers across Ghana discover and book vetted hair, braid, barber, and nail salons with instant SMS confirmation.",
          areaServed: { "@type": "Country", name: "Ghana" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Salonzee",
          url: "https://salonzee.lovable.app",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SupportNotifier />
          <main id="main" className="min-h-dvh pb-[calc(env(safe-area-inset-bottom)+4rem)] md:pb-0">
            <Outlet />
          </main>
          <MobileTabBar />
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
