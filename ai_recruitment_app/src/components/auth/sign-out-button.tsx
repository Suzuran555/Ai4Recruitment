"use client";

import { useState } from "react";

import { authClient } from "~/server/better-auth/client";
import { Button } from "~/components/ui/button";

export function SignOutButton(props: {
  redirectTo?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
}) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Button
      type="button"
      variant={props.variant ?? "outline"}
      className={props.className}
      disabled={isLoading}
      onClick={async () => {
        try {
          setIsLoading(true);
          await authClient.signOut();
          // Small delay to ensure sign out completes
          await new Promise((resolve) => setTimeout(resolve, 100));
        } finally {
          window.location.assign(props.redirectTo ?? "/");
        }
      }}
    >
      {isLoading ? "Signing out…" : "Sign out"}
    </Button>
  );
}
