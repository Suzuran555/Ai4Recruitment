import { CandidateProfile } from "~/components/candidate-profile";
import { SocialAuthCard } from "~/components/auth/social-auth-card";
import { getSession } from "~/server/better-auth/server";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session?.user) {
    return <SocialAuthCard title="Candidate Login" callbackURL="/candidate" />;
  }

  const { id } = await params;
  if (id !== "me" && id !== session.user.id) {
    notFound();
  }

  // Create tRPC caller with session headers
  // Note: headers() returns a read-only Headers object, so we need to create a new one
  const originalHeaders = await headers();
  const headersList = new Headers(originalHeaders);
  headersList.set("x-trpc-source", "rsc");
  const context = await createTRPCContext({ headers: headersList });
  const trpcCaller = createCaller(context);
  
  const profile = await trpcCaller.candidate.me();
  const matches = await trpcCaller.match.listMine();

  const latestRepoFullName =
    matches[0]?.analysis?.repoFullName ??
    ((matches[0] as unknown as { repoFullName?: string })?.repoFullName ?? null);

  const bestMatch = matches
    .map((m) => m.score)
    .filter((n): n is number => typeof n === "number")
    .reduce((acc, n) => Math.max(acc, n), 0);

  const candidate = {
    id: session.user.id,
    name:
      session.user.name ??
      profile?.githubLogin ??
      (latestRepoFullName ? latestRepoFullName.split("/")[0] : null) ??
      "Candidate",
    bio: profile?.githubLogin
      ? `GitHub: ${profile.githubLogin}`
      : latestRepoFullName
        ? `Analyzed repo: ${latestRepoFullName}`
      : "Connect your GitHub to generate your profile.",
    avatar: session.user.image ?? "/placeholder.svg",
    location: undefined,
    joinedDate: "—",
    githubUrl: profile?.githubUrl ?? "https://github.com",
    matchScore: bestMatch || 0,
    tags: [
      ...(profile?.githubLogin ? ["GitHub Connected"] : ["GitHub Missing"]),
      ...(matches.length ? ["Matches Ready"] : ["No Matches Yet"]),
      ...(latestRepoFullName ? [`Repo: ${latestRepoFullName}`] : []),
    ],
    skills: [],
    stats: { repos: 0, contributions: 0, codeQuality: 0 },
  };

  return (
    <div className="bg-background relative min-h-screen overflow-hidden">
      {/* Grid background effect */}
      <div className="bg-grid-white/5 absolute inset-0 mask-[radial-gradient(ellipse_at_center,transparent_20%,black)]" />

      <div className="relative">
        <CandidateProfile candidate={candidate} />
      </div>
    </div>
  );
}
