import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

/** Session for the current request, deduplicated per render. */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** For pages: the signed-in user, or a redirect to sign-in. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session.user;
}

/** For route handlers: the signed-in user, or null (caller returns 401). */
export async function getApiUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user ?? null;
}
