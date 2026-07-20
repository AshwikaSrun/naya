import type { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';

/**
 * Wraps the app in Clerk only when keys are present. This keeps the live site
 * fully functional before/without Clerk configured: if the publishable key is
 * missing we render children untouched, and the auth UI (NayaAuth) gracefully
 * hides itself using the same env check.
 */
export default function AuthProvider({ children }: { children: ReactNode }) {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!pk) return <>{children}</>;

  return (
    <ClerkProvider
      publishableKey={pk}
      afterSignOutUrl="/"
      signUpForceRedirectUrl="/onboarding"
      signInFallbackRedirectUrl="/for-you"
      appearance={{
        variables: {
          colorPrimary: '#0a0a0a',
          colorText: '#0a0a0a',
          colorBackground: '#ffffff',
          borderRadius: '0.75rem',
          fontFamily: '"DM Sans", "Inter", sans-serif',
        },
        elements: {
          card: 'shadow-2xl border border-black/5',
          headerTitle: 'font-naya-serif',
          formButtonPrimary:
            'bg-black hover:bg-neutral-800 text-white normal-case tracking-[0.02em]',
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
