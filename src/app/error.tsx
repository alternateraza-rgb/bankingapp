"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
      <p className="text-sm text-wise-body">
        Something unexpected happened. You can try again without losing your data.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
