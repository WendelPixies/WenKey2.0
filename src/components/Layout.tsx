import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

/**
 * Legacy Layout component wrapper.
 * This is now a "dumb" component that just renders children.
 * The actual Layout structure (Sidebar, etc.) is handled by AppLayout in App.tsx routing.
 * We keep this to avoid modifying all page components that wrap their content in <Layout>.
 */
export function Layout({ children }: LayoutProps) {
  return <>{children}</>;
}