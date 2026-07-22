import { redirect } from 'next/navigation';

/** Waitlist email lives at the start of /onboarding now. */
export default function WaitlistPage() {
  redirect('/onboarding');
}
