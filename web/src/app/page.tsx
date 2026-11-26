import { AuthScreen } from "@features/auth/auth-screen";

export default function HomePage() {
  // The existing NestJS/Supabase password and passkey UI remains the only login route.
  return <AuthScreen />;
}
