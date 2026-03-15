import { SocialAuthCard } from "~/components/auth/social-auth-card";
import { getSession } from "~/server/better-auth/server";
import ReviewClientPage from "./review-client";

export default async function ReviewPage() {
  const session = await getSession();
  if (!session?.user) {
    return <SocialAuthCard title="HR Login" callbackURL="/review" />;
  }

  return <ReviewClientPage />;
}
