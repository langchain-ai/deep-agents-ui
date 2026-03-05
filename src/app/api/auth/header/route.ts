import { NextResponse } from "next/server";
import { headers } from "next/headers";

/** Return Authorization header from request (auth proxy). Same-origin only. */
export async function GET() {
  const headersList = await headers();
  const authorization = headersList.get("authorization");
  return NextResponse.json({ authorization: authorization ?? null });
}
