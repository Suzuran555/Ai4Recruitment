import { SocialAuthCard } from "~/components/auth/social-auth-card";
import { getSession } from "~/server/better-auth/server";
import HRRolesPageClient from "./roles-client";

export default async function HRRolesPage() {
  const session = await getSession();
  if (!session?.user) {
    return <SocialAuthCard title="HR Login" callbackURL="/hr/roles" />;
  }

  return <HRRolesPageClient user={session.user} />;
}
