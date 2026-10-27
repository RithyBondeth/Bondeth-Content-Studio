import { getAuthMode } from "../../../../studio/auth-mode";
import { getAuth } from "../../../../studio/server/auth";

/** Better Auth's sign-in, sign-out, and session endpoints. Only with accounts on. */
const handle = async (request: Request) =>
  getAuthMode().kind === "accounts"
    ? (await getAuth()).handler(request)
    : new Response("Not found", { status: 404 });

export const GET = handle;
export const POST = handle;
