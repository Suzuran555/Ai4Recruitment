import HRClientPage from "./hr-client";
import { SocialAuthCard } from "~/components/auth/social-auth-card";
import { getSession } from "~/server/better-auth/server";

export default async function HRPage() {
  const session = await getSession();
  if (!session?.user) {
    return <SocialAuthCard title="HR Login" callbackURL="/hr" />;
  }
  return <HRClientPage user={session.user} />;
}

