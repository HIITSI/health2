import { supabase } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const client = await supabase();
  if (code && client) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error)
      return new NextResponse(null, {
        status: 303,
        headers: { Location: "/" },
      });
  }
  return new NextResponse(null, {
    status: 303,
    headers: { Location: "/login" },
  });
}
