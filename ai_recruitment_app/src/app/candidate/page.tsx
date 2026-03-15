import { CandidateInput } from "~/components/candidate-input";
import { SocialAuthCard } from "~/components/auth/social-auth-card";
import { getSession } from "~/server/better-auth/server";

export default async function CandidatePage() {
  const session = await getSession();

  if (!session?.user) {
    return <SocialAuthCard title="Candidate Login" callbackURL="/candidate" />;
  }

  return (
    <div className="bg-background relative min-h-screen overflow-hidden">
      {/* Grid background effect */}
      <div className="bg-grid-white/5 absolute inset-0 mask-[radial-gradient(ellipse_at_center,transparent_20%,black)]" />

      <div className="relative">
        <CandidateInput />
      </div>
    </div>
  );
}
