# TCE Keycloak session exchange: trusted unverified-email exception

The default behavior requires email_verified=true before the central Auth service links a Keycloak identity to an existing TCE account. Do not remove this check globally: account linking currently uses the email address, so accepting any unverified email would allow a newly registered identity to impersonate an existing account.

For a controlled no-email-verification setup, the service supports an optional server-side allowlist:

    KEYCLOAK_TCE_UNVERIFIED_EMAIL_SUBJECTS=<exact-sub-1>,<exact-sub-2>

- Values are exact Keycloak sub claim values from access tokens issued by the configured realm.
- The allowlist only bypasses the email-verification requirement for those exact subjects. A non-empty email and the configured azp=KEYCLOAK_TCE_CLIENT_ID are still required.
- Account linking still requires an existing ACTIVE application account with the exact matching email. No account is auto-provisioned and no role is granted from Keycloak claims.
- Keep the variable empty unless an administrator has independently verified the Keycloak account/subject. Never expose this variable to frontend builds or NEXT_PUBLIC_* configuration.
- This exception is opt-in and must be set in the Auth service's server-side runtime Secret, then deployed through the normal platform-infra release flow. Changing source code alone does not alter production behavior.

The safer long-term design is an explicit account-linking flow based on issuer + subject after the user proves control of their existing TCE account. This allowlist is a narrow operational bridge, not a replacement for that design.
