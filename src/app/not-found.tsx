import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold text-white">Page not found</h1>
      <p className="text-sm text-wise-body">
        That page doesn&apos;t exist.
      </p>
      <Button asChild>
        <Link href="/home">Back to home</Link>
      </Button>
    </div>
  );
}
