import { PageHeader } from "@/components/shared/page-header";
import { LabStats } from "@/components/members/lab-stats";
import { getSessionProfile } from "@/lib/session";
import { loadLabStats } from "@/lib/lab-stats";

export const metadata = { title: "Lab statistics" };

export default async function StatsPage() {
  const { supabase } = await getSessionProfile();
  const stats = await loadLabStats(supabase);
  return (
    <>
      <PageHeader title="Lab statistics" description="How the whole lab is reading." />
      <LabStats {...stats} />
    </>
  );
}
