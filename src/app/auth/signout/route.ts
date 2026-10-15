import { supabase } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  let sameOrigin = false;
  try {
    const parsed = new URL(origin || "");
    sameOrigin =
      parsed.host === request.headers.get("host") &&
      parsed.protocol === request.nextUrl.protocol;
  } catch {}
  if (!sameOrigin) return new NextResponse("Forbidden", { status: 403 });
  const client = await supabase();
  const result = client ? await client.auth.signOut() : null;
  if (result?.error)
    return new NextResponse("로그아웃 실패. 다시 시도하세요.", { status: 500 });
  return new NextResponse(null, {
    status: 303,
    headers: { Location: "/login" },
  });
}
