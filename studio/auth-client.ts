import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Sign-in, sign-out, and the session, from the browser. */
export const authClient = createAuthClient({ plugins: [emailOTPClient()] });
