import { PageHeader } from "@/components/shared/page-header";
import { ActivityFeed } from "@/components/members/activity-feed";
import { getSessionProfile } from "@/lib/session";
import { loadActivity } from "@/lib/activity";

export const metadata = { title: "Activity" };

export default async function ActivityPage() {
  const { supabase } = await getSessionProfile();
  const items = await loadActivity(supabase, 60);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Lab activity" description="The latest papers and submission plans across the lab." />
      <ActivityFeed items={items} />
    </div>
  );
}
