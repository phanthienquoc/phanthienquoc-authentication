"use client";

import Keycloak from "keycloak-js";

let client: Keycloak | null = null;
let initPromise: Promise<boolean> | null = null;

function requiredEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing public Keycloak configuration: ${name}`);
  return value;
}

export function getKeycloakClient(): Keycloak {
  if (typeof window === "undefined") {
    throw new Error("Keycloak browser client can only be accessed in the browser.");
  }

  if (!client) {
    client = new Keycloak({
      url: requiredEnv("NEXT_PUBLIC_KEYCLOAK_URL", process.env.NEXT_PUBLIC_KEYCLOAK_URL),
      realm: requiredEnv("NEXT_PUBLIC_KEYCLOAK_REALM", process.env.NEXT_PUBLIC_KEYCLOAK_REALM),
      clientId: requiredEnv("NEXT_PUBLIC_KEYCLOAK_CLIENT_ID", process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID),
    });
  }

  return client;
}

/** Initialize once per browser page; Keycloak JS uses Authorization Code + PKCE by default. */
export function initializeKeycloak(): Promise<boolean> {
  if (!initPromise) {
    initPromise = getKeycloakClient().init({
      onLoad: "check-sso",
      pkceMethod: "S256",
      checkLoginIframe: false,
      responseMode: "query",
    }).catch((error: unknown) => {
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}

export function keycloakIsConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_KEYCLOAK_URL &&
    process.env.NEXT_PUBLIC_KEYCLOAK_REALM &&
    process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
  );
}
