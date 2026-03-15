import { SocialAuthCard } from "~/components/auth/social-auth-card";
import { getSession } from "~/server/better-auth/server";
import HRAddRolePageClient from "./add-role-client";

export default async function HRAddRolePage() {
  const session = await getSession();
  if (!session?.user) {
    return <SocialAuthCard title="HR Login" callbackURL="/hr/roles/new" />;
  }

  return <HRAddRolePageClient user={session.user} />;
}
