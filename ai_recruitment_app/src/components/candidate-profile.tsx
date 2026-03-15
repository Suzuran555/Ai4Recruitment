"use client";

import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  ArrowLeft,
  Github,
  MapPin,
  Calendar,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { SignOutButton } from "~/components/auth/sign-out-button";
import { recommendRoleFromCandidate } from "~/lib/role-recommendation";
import { api } from "~/trpc/react";
import { parseGithubOwner } from "~/lib/github/parse";
import { TrackChallengeModal } from "~/components/track-challenge-modal";

type CandidateViewModel = {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  location?: string;
  joinedDate: string;
  githubUrl: string;
  matchScore: number;
  tags: string[];
  skills: Array<{ name: string; level: number }>;
  stats: { repos: number; contributions: number; codeQuality: number };
};

export function CandidateProfile({
  candidate,
}: {
  candidate: CandidateViewModel;
}) {
  const roleRecommendation = recommendRoleFromCandidate(candidate);

  const owner = useMemo(
    () => parseGithubOwner(candidate.githubUrl),
    [candidate.githubUrl],
  );
  const [reposPage, setReposPage] = useState(1);
  const [selected, setSelected] = useState<{
    owner: string;
    repo: string;
  } | null>(null);
  const [challenge, setChallenge] = useState<{
    analysisId: number;
    repoFullName: string;
  } | null>(null);
  const [isStartingChallenge, setIsStartingChallenge] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const initForRepo = api.jobMatch.initForRepo.useMutation();
  const runAnalysis = api.analysis.runPublic.useMutation();
  const computeMatches = api.match.compute.useMutation();

  const userOverview = api.github.getUserOverview.useQuery(
    { owner },
    { enabled: Boolean(owner) },
  );
  const userRepos = api.github.listUserRepos.useQuery(
    { owner, page: reposPage, perPage: 20 },
    { enabled: Boolean(owner) },
  );
  const repoOverview = api.github.getRepoOverview.useQuery(
    { owner: selected?.owner ?? "", repo: selected?.repo ?? "" },
    { enabled: Boolean(selected?.owner && selected?.repo) },
  );

  async function startChallengeForSelectedRepo() {
    if (!selected) return;
    const repoFullName = `${selected.owner}/${selected.repo}`;
    setIsStartingChallenge(true);
    setStartError(null);
    try {
      await initForRepo.mutateAsync({ repoFullName });
      const analysis = await runAnalysis.mutateAsync({ repoFullName });
      await computeMatches.mutateAsync({ analysisId: analysis.analysisId });
      setChallenge({ analysisId: analysis.analysisId, repoFullName });
    } catch (e) {
      setStartError(
        e instanceof Error ? e.message : "Failed to start challenge.",
      );
    } finally {
      setIsStartingChallenge(false);
    }
  }

  const displayedStats = useMemo(() => {
    const repos =
      typeof userOverview.data?.user?.public_repos === "number"
        ? userOverview.data.user.public_repos
        : candidate.stats.repos;

    // Unauthed GitHub APIs don’t expose true “contribution” counts; use a tiny signal.
    const contributions =
      Array.isArray(userOverview.data?.eventsPreview) &&
      userOverview.data.eventsPreview.length
        ? userOverview.data.eventsPreview.length
        : candidate.stats.contributions;

    return {
      repos,
      contributions,
      codeQuality: candidate.stats.codeQuality,
    };
  }, [candidate.stats, userOverview.data]);

  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link href="/candidate">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Input
          </Button>
        </Link>
        <SignOutButton />
      </div>

      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header Card */}
        <Card className="border-primary/10 shadow-xl">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-6 md:flex-row">
              <Avatar className="border-primary/20 h-24 w-24 border-4">
                <AvatarImage
                  src={candidate.avatar || "/placeholder.svg"}
                  alt={candidate.name}
                />
                <AvatarFallback>{candidate.name.charAt(0)}</AvatarFallback>
              </Avatar>

              <div className="flex-1 text-center md:text-left">
                <h1 className="mb-2 text-3xl font-bold">{candidate.name}</h1>
                <p className="text-muted-foreground mb-4 text-lg">
                  {candidate.bio}
                </p>

                <div className="flex flex-wrap items-center justify-center gap-4 md:justify-start">
                  {candidate.location && (
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4" />
                      {candidate.location}
                    </div>
                  )}
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    Joined {candidate.joinedDate}
                  </div>
                  <a
                    href={candidate.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary flex items-center gap-2 text-sm hover:underline"
                  >
                    <Github className="h-4 w-4" />
                    GitHub Profile
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {/* Match Score */}
              <div className="border-primary/20 bg-primary/5 flex flex-col items-center gap-2 rounded-xl border-2 px-8 py-4">
                <div className="text-muted-foreground text-sm font-medium">
                  Match Score
                </div>
                <div className="text-primary text-5xl font-bold">
                  {candidate.matchScore}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Best Fit Role */}
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle>Best Fit Role</CardTitle>
            <CardDescription>
              Matched from your code genes and detected signals
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-sm">
                Recommended:
              </span>
              <Badge className="border-purple-500/30 bg-purple-500/10 text-purple-200">
                {roleRecommendation.roleName}
              </Badge>
            </div>
            {roleRecommendation.matchedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {roleRecommendation.matchedTags.slice(0, 6).map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-muted-foreground text-sm leading-relaxed">
              {roleRecommendation.conclusion}
            </p>
          </CardContent>
        </Card>

        {/* AI Tags */}
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle>AI-Analyzed Skills</CardTitle>
            <CardDescription>
              Skills and expertise automatically detected from code patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {candidate.tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="px-4 py-2 text-sm font-medium"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Skill Breakdown */}
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle>Skill Analysis</CardTitle>
            <CardDescription>
              Detailed breakdown of technical competencies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {candidate.skills.map((skill, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{skill.name}</span>
                  <span className="text-primary text-sm font-semibold">
                    {skill.level}%
                  </span>
                </div>
                <Progress value={skill.level} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="border-primary/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Repositories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-primary text-3xl font-bold">
                {displayedStats.repos}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Contributions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-primary text-3xl font-bold">
                {displayedStats.contributions}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Code Quality
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-primary text-3xl font-bold">
                {displayedStats.codeQuality}/10
              </div>
            </CardContent>
          </Card>
        </div>

        {/* GitHub Data */}
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle>GitHub Data</CardTitle>
            <CardDescription>
              Live public GitHub data (no-auth, cached). Paste a different
              username on the input page to change this.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!owner ? (
              <div className="text-muted-foreground text-sm">
                No GitHub owner detected. Go back and enter your GitHub
                username.
              </div>
            ) : userOverview.isLoading ? (
              <div className="text-muted-foreground text-sm">
                Loading GitHub profile…
              </div>
            ) : userOverview.error ? (
              <div className="text-sm text-red-400">
                Failed to load GitHub profile: {userOverview.error.message}
              </div>
            ) : (
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-medium">
                    {userOverview.data?.user?.name ??
                      userOverview.data?.user?.login ??
                      owner}
                  </div>
                  <div className="text-muted-foreground text-sm">
                    {userOverview.data?.user?.bio ?? "—"}
                  </div>
                </div>
                <div className="text-muted-foreground text-xs">
                  Rate limit:{" "}
                  <span className="font-mono">
                    {userOverview.data?.rateLimit?.remaining ?? "?"}/
                    {userOverview.data?.rateLimit?.limit ?? "?"}
                  </span>
                </div>
              </div>
            )}

            {owner ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">Repositories</div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={reposPage <= 1 || userRepos.isLoading}
                      onClick={() => setReposPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </Button>
                    <div className="text-muted-foreground text-xs">
                      Page <span className="font-mono">{reposPage}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={userRepos.isLoading}
                      onClick={() => setReposPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>

                {userRepos.isLoading ? (
                  <div className="text-muted-foreground text-sm">
                    Loading repositories…
                  </div>
                ) : userRepos.error ? (
                  <div className="text-sm text-red-400">
                    Failed to load repos: {userRepos.error.message}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {(userRepos.data?.items ?? []).map((r: any) => {
                      const fullName: string = r.full_name ?? "";
                      const [o, name] = fullName.split("/");
                      const sel =
                        selected?.owner === o && selected?.repo === name;
                      return (
                        <button
                          key={fullName || r.id}
                          type="button"
                          onClick={() =>
                            setSelected(
                              o && name ? { owner: o, repo: name } : null,
                            )
                          }
                          className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                            sel
                              ? "border-cyan-500/50 bg-cyan-500/10"
                              : "border-primary/10 hover:bg-primary/5"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="truncate text-sm font-medium">
                              {r.name ?? fullName}
                            </div>
                            <div className="text-muted-foreground font-mono text-xs">
                              ★ {r.stargazers_count ?? 0}
                            </div>
                          </div>
                          <div className="text-muted-foreground line-clamp-1 text-xs">
                            {r.description ?? "—"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selected ? (
                  <div className="border-primary/10 mt-2 rounded-lg border p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-semibold">
                        {selected.owner}/{selected.repo}
                      </div>
                      {repoOverview.isFetching ? (
                        <div className="text-muted-foreground text-xs">
                          Loading…
                        </div>
                      ) : null}
                    </div>

                    {repoOverview.error ? (
                      <div className="text-sm text-red-400">
                        Failed to load repo: {repoOverview.error.message}
                      </div>
                    ) : repoOverview.data ? (
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="border-primary/10 rounded-md border p-3">
                          <div className="text-muted-foreground text-xs">
                            Stars
                          </div>
                          <div className="font-mono text-lg font-semibold">
                            {repoOverview.data.repo?.stargazers_count ?? 0}
                          </div>
                        </div>
                        <div className="border-primary/10 rounded-md border p-3">
                          <div className="text-muted-foreground text-xs">
                            Forks
                          </div>
                          <div className="font-mono text-lg font-semibold">
                            {repoOverview.data.repo?.forks_count ?? 0}
                          </div>
                        </div>
                        <div className="border-primary/10 rounded-md border p-3">
                          <div className="text-muted-foreground text-xs">
                            Open issues
                          </div>
                          <div className="font-mono text-lg font-semibold">
                            {repoOverview.data.repo?.open_issues_count ?? 0}
                          </div>
                        </div>
                        <div className="md:col-span-3">
                          <div className="text-muted-foreground mb-1 text-xs">
                            Languages
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {Object.keys(repoOverview.data.languages ?? {})
                              .length ? (
                              Object.keys(repoOverview.data.languages ?? {})
                                .slice(0, 10)
                                .map((lang) => (
                                  <Badge key={lang} variant="secondary">
                                    {lang}
                                  </Badge>
                                ))
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                —
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-sm">
                        Select a repo to load details.
                      </div>
                    )}

                    <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      {startError ? (
                        <div className="text-sm text-red-400">{startError}</div>
                      ) : (
                        <div className="text-xs text-zinc-500">
                          Use this repo to generate tracks and pick an
                          assignment.
                        </div>
                      )}
                      <Button
                        className="bg-cyan-600 text-black hover:bg-cyan-500"
                        disabled={
                          !selected ||
                          isStartingChallenge ||
                          runAnalysis.isPending ||
                          computeMatches.isPending
                        }
                        onClick={() => void startChallengeForSelectedRepo()}
                      >
                        {isStartingChallenge
                          ? "Starting…"
                          : "Start Challenge with this repo"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    Select a repo above to see details.
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex justify-center pt-8">
          <Button
            size="lg"
            className="group relative overflow-hidden bg-linear-to-r from-emerald-600 to-cyan-600 px-12 py-6 text-lg font-semibold shadow-lg transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
            disabled={!selected || isStartingChallenge}
            onClick={() => void startChallengeForSelectedRepo()}
          >
            <span className="relative z-10">
              {selected ? "Start Coding Challenge" : "Select a repo to start"}
            </span>
            <div className="absolute inset-0 bg-linear-to-r from-emerald-500 to-cyan-500 opacity-0 transition-opacity group-hover:opacity-100" />
          </Button>
        </div>
      </div>

      {challenge ? (
        <TrackChallengeModal
          analysisId={challenge.analysisId}
          repoFullName={challenge.repoFullName}
          onClose={() => setChallenge(null)}
        />
      ) : null}
    </div>
  );
}
