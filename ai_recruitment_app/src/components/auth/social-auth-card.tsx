"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Github } from "lucide-react";

import { authClient } from "~/server/better-auth/client";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

type SocialProvider = "google" | "github";

export function SocialAuthCard(props: { title: string; callbackURL: string }) {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const finalCallbackURL = useMemo(() => {
    const next = searchParams.get("next");
    return next && next.startsWith("/") ? next : props.callbackURL;
  }, [searchParams, props.callbackURL]);

  const handleSocialLogin = async (provider: SocialProvider) => {
    try {
      setError(null);
      setIsLoading(provider);

      await authClient.signIn.social({
        provider,
        callbackURL: finalCallbackURL,
      });

      // Note: signIn.social should redirect immediately
      // If it doesn't redirect, there's likely a configuration issue
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : `Sign in with ${provider === "github" ? "GitHub" : "Google"} failed. Please check your OAuth configuration.`;
      setError(errorMessage);
      setIsLoading(null);
      console.error(`${provider} OAuth error:`, e);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6">
      <Card className="w-full max-w-md border border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-zinc-100">{props.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-400">
            Sign in with your preferred provider to continue.
          </p>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="space-y-3">
            {/* GitHub Login Button */}
            <Button
              className="w-full bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700"
              disabled={isLoading !== null}
              onClick={() => handleSocialLogin("github")}
            >
              {isLoading === "github" ? (
                "Redirecting…"
              ) : (
                <>
                  <Github className="mr-2 h-4 w-4" />
                  Continue with GitHub
                </>
              )}
            </Button>

            {/* Google Login Button */}
            <Button
              className="w-full bg-white text-black hover:bg-zinc-200"
              disabled={isLoading !== null}
              onClick={() => handleSocialLogin("google")}
            >
              {isLoading === "google" ? (
                "Redirecting…"
              ) : (
                "Continue with Google"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


