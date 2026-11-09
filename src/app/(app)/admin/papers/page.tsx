import { PapersModeration } from "@/components/admin/papers-moderation";
import { requireAdmin } from "@/lib/session";
import { PAPER_SELECT, normalizePapers } from "@/lib/queries";

export const metadata = { title: "Admin · Papers" };

export default async function AdminPapersPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("papers").select(PAPER_SELECT).order("created_at", { ascending: false });
  return <PapersModeration papers={normalizePapers(data)} />;
}
