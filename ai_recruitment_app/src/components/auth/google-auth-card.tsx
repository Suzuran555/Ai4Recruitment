"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { authClient } from "~/server/better-auth/client";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export function GoogleAuthCard(props: { title: string; callbackURL: string }) {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finalCallbackURL = useMemo(() => {
    const next = searchParams.get("next");
    return next && next.startsWith("/") ? next : props.callbackURL;
  }, [searchParams, props.callbackURL]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6">
      <Card className="w-full max-w-md border border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-zinc-100">{props.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-400">
            Sign in with Google to continue.
          </p>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <Button
            className="w-full bg-white text-black hover:bg-zinc-200"
            disabled={isLoading}
            onClick={async () => {
              try {
                setError(null);
                setIsLoading(true);
                
                // signIn.social should immediately redirect to Google OAuth
                // If it doesn't redirect, there's likely a configuration issue
                await authClient.signIn.social({
                  provider: "google",
                  callbackURL: finalCallbackURL,
                });
                
                // Note: If Google OAuth is not configured, this might not redirect
                // Check browser console and .env file for BETTER_AUTH_GOOGLE_CLIENT_ID
              } catch (e) {
                const errorMessage =
                  e instanceof Error
                    ? e.message
                    : "Sign in failed. Please check your Google OAuth configuration.";
                setError(errorMessage);
                setIsLoading(false);
                console.error("Google OAuth error:", e);
              }
            }}
          >
            {isLoading ? "Redirecting…" : "Continue with Google"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
