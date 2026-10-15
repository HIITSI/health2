import { supabase } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const client = await supabase();
  if (
    client &&
    token_hash &&
    (type === "invite" || type === "recovery" || type === "signup")
  ) {
    const { error } = await client.auth.verifyOtp({ token_hash, type });
    if (!error)
      return new NextResponse(null, {
        status: 303,
        headers: { Location: type === "signup" ? "/" : "/account/password" },
      });
  }
  return new NextResponse(null, {
    status: 303,
    headers: { Location: "/login?error=expired" },
  });
}
