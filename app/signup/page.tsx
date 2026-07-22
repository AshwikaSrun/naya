import { redirect } from 'next/navigation';

/** Sign up is onboarding (email waitlist first, then taste profile). */
export default function SignupPage() {
  redirect('/onboarding');
}
