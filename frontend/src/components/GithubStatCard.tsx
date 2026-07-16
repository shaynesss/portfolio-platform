interface GithubStatCardProps {
  url: string;
  stars: number;
  language: string;
}

export default function GithubStatCard({ url, stars, language }: GithubStatCardProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex w-fit items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
    >
      <span>★ {stars}</span>
      <span className="text-zinc-600">·</span>
      <span>{language}</span>
    </a>
  );
}
