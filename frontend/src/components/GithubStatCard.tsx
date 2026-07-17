import { HugeiconsIcon } from "@hugeicons/react";
import { GithubIcon } from "@hugeicons/core-free-icons";

interface GithubStatCardProps {
  url: string;
  stars: number;
  // GitHub reports no language at all for some repos (e.g. ones with
  // no detectable source files) — a real API response, not a fetch
  // failure, so this has to be handled rather than assumed present.
  language: string | null;
}

export default function GithubStatCard({ url, stars, language }: GithubStatCardProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex w-fit items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
    >
      <HugeiconsIcon icon={GithubIcon} size={16} />
      <span>★ {stars}</span>
      {language && (
        <>
          <span className="text-zinc-600">·</span>
          <span>{language}</span>
        </>
      )}
    </a>
  );
}
