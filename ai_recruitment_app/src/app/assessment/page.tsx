import { SocialAuthCard } from "~/components/auth/social-auth-card";
import { getSession } from "~/server/better-auth/server";
import AssessmentClientPage from "./assessment-client";

export default async function AssessmentPage() {
  const session = await getSession();
  if (!session?.user) {
    return <SocialAuthCard title="HR Login" callbackURL="/assessment" />;
  }

  return <AssessmentClientPage />;
}
