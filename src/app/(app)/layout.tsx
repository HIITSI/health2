import { supabase } from "@/lib/supabase/server";
import { Shell } from "@/components/shell";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = await supabase();
  const user = client ? (await client.auth.getUser()).data.user : null;
  if (client && !user) redirect("/login");
  return (
    <Shell email={user?.email} connected={!!user}>
      {children}
    </Shell>
  );
}
