"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Github, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignOutButton } from "~/components/auth/sign-out-button";
import { api } from "~/trpc/react";

export function CandidateInput() {
  const [githubInput, setGithubInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const setGithub = api.candidate.setGithub.useMutation();

  // #region agent log (hypothesis E: CandidateInput is or isn't the caller of setGithub)
  // Disabled: logging service not available
  // if (typeof window !== "undefined") {
  //   fetch("http://127.0.0.1:7244/ingest/8ef8dc20-215a-4ec2-b756-742be3be6758", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({
  //       sessionId: "debug-session",
  //       runId: "run2",
  //       hypothesisId: "E",
  //       location: "src/components/candidate-input.tsx:render",
  //       message: "CandidateInput rendered",
  //       data: { isAnalyzing },
  //       timestamp: Date.now(),
  //     }),
  //   }).catch(() => {});
  // }
  // #endregion

  function parseGithub(input: string): {
    githubLogin: string;
    githubUrl: string;
  } {
    const trimmed = input.trim();
    if (!trimmed) {
      return { githubLogin: "", githubUrl: "" };
    }

    // Accept:
    // - "octocat"
    // - "github.com/octocat" / "https://github.com/octocat"
    // - "owner/repo" (treated as owner login for profile; repo selection happens on /candidate/profile/me)
    // - "https://github.com/owner/repo" (treated as owner login for profile)
    const ownerRepoMatch = trimmed.match(/^([^/]+)\/([^/]+)$/);
    if (ownerRepoMatch) {
      const owner = ownerRepoMatch[1] ?? "";
      return {
        githubLogin: owner,
        githubUrl: `https://github.com/${owner}`,
      };
    }

    if (!trimmed.includes("/")) {
      return {
        githubLogin: trimmed,
        githubUrl: `https://github.com/${trimmed}`,
      };
    }

    try {
      const url = new URL(
        trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
      );
      const parts = url.pathname.split("/").filter(Boolean);
      const owner = parts[0] ?? "";
      return {
        githubLogin: owner,
        githubUrl: `https://github.com/${owner}`,
      };
    } catch {
      // Fallback: try to pull last segment
      const parts = trimmed.split("/").filter(Boolean);
      if (parts.length >= 2) {
        const owner = parts[0] ?? "";
        return {
          githubLogin: owner,
          githubUrl: `https://github.com/${owner}`,
        };
      }
      const login = parts[0] ?? "";
      return { githubLogin: login, githubUrl: `https://github.com/${login}` };
    }
  }

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubInput.trim()) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const { githubLogin, githubUrl } = parseGithub(githubInput);
      if (!githubLogin) {
        setError("Please enter a valid GitHub username or profile URL.");
        return;
      }

      // #region agent log (hypothesis E: CandidateInput is the setGithub caller, with what payload)
      // Disabled: logging service not available
      // fetch(
      //   "http://127.0.0.1:7244/ingest/8ef8dc20-215a-4ec2-b756-742be3be6758",
      //   {
      //     method: "POST",
      //     headers: { "Content-Type": "application/json" },
      //     body: JSON.stringify({
      //       sessionId: "debug-session",
      //       runId: "run2",
      //       hypothesisId: "E",
      //       location:
      //         "src/components/candidate-input.tsx:handleAnalyze:before-setGithub",
      //       message: "About to call candidate.setGithub",
      //       data: {
      //         githubLoginLen: githubLogin.length,
      //         githubUrlLen: githubUrl.length,
      //       },
      //       timestamp: Date.now(),
      //     }),
      //   },
      // ).catch(() => {});
      // #endregion

      await setGithub.mutateAsync({ githubLogin, githubUrl });
      // Do NOT auto-open track selection here.
      // The intended flow: go to /candidate/profile/me, pick a repo, then start challenge.
      router.push("/candidate/profile/me");
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to analyze. Please try again.";
      setError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link href="/">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
        <SignOutButton />
      </div>

      <div className="mx-auto max-w-2xl">
        <Card className="border-primary/10 shadow-xl">
          <CardHeader className="space-y-4 text-center">
            <div className="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
              <Github className="text-primary h-8 w-8" />
            </div>
            <CardTitle className="text-3xl">Analyze Your Code DNA</CardTitle>
            <CardDescription className="text-base">
              Enter your GitHub username or URL to discover your developer
              profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isAnalyzing ? (
              <form onSubmit={handleAnalyze} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="github.com/username or username"
                    value={githubInput}
                    onChange={(e) => setGithubInput(e.target.value)}
                    className="h-12 text-base"
                    required
                  />
                  <p className="text-muted-foreground text-sm">
                    Example: octocat or https://github.com/octocat
                  </p>
                </div>
                {error ? <p className="text-sm text-red-500">{error}</p> : null}
                <Button
                  type="submit"
                  className="h-12 w-full text-base font-semibold"
                  disabled={!githubInput.trim()}
                >
                  Analyze Code Genes
                </Button>
              </form>
            ) : (
              <div className="py-12 text-center">
                <div className="mb-6 flex justify-center">
                  <div className="relative">
                    <Loader2 className="text-primary h-16 w-16 animate-spin" />
                    <div className="bg-primary/20 absolute inset-0 h-16 w-16 animate-ping rounded-full" />
                  </div>
                </div>
                <h3 className="mb-2 text-xl font-semibold">
                  Analyzing code genes...
                </h3>
                <p className="text-muted-foreground">
                  Scanning repositories, analyzing patterns, and evaluating
                  skills
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feature highlights */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="text-center">
            <div className="text-primary mb-3 text-2xl font-bold">
              Deep Analysis
            </div>
            <p className="text-muted-foreground text-sm">
              Comprehensive code pattern recognition
            </p>
          </div>
          <div className="text-center">
            <div className="text-primary mb-3 text-2xl font-bold">
              AI-Powered
            </div>
            <p className="text-muted-foreground text-sm">
              Machine learning skill assessment
            </p>
          </div>
          <div className="text-center">
            <div className="text-primary mb-3 text-2xl font-bold">
              Instant Results
            </div>
            <p className="text-muted-foreground text-sm">
              Real-time profile generation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
