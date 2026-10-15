import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { configured } from "@/lib/config";
export async function supabase() {
  if (!configured) return null;
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll(values) {
          try {
            values.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {
            /* refreshed by proxy */
          }
        },
      },
    },
  );
}
