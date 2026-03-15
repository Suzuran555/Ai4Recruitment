import { SocialAuthCard } from "~/components/auth/social-auth-card";
import { getSession } from "~/server/better-auth/server";
import HRRoleDetailPageClient from "./role-detail-client";

export default async function HRRoleDetailPage({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  const session = await getSession();
  if (!session?.user) {
    return <SocialAuthCard title="HR Login" callbackURL="/hr/roles" />;
  }

  const { roleId } = await params;
  return <HRRoleDetailPageClient user={session.user} roleId={roleId} />;
}
