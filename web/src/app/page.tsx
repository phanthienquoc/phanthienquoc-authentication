import { AuthScreen } from "@features/auth/auth-screen";
import { KeycloakAuthScreen } from "@features/auth/keycloak-auth-screen";

export default function HomePage() {
  if (process.env.NEXT_PUBLIC_AUTH_MODE === "keycloak") {
    return <KeycloakAuthScreen />;
  }

  // Preserve the existing NestJS auth UI until OIDC is configured and tested.
  return <AuthScreen />;
}
