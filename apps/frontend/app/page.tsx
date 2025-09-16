import { redirect } from 'next/navigation';

/**
 * Root page - redirects to dashboard
 * The actual redirect is handled in next.config.js
 */
export default function HomePage() {
  redirect('/dashboard');
}