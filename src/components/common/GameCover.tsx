import { useEffect, useState } from "react";

interface GameCoverProps {
  coverUrl?: string;
  title: string;
  /** Show the game title as a text fallback when there's no image or it fails to load. */
  showTitleFallback?: boolean;
  className?: string;
  placeholderClassName?: string;
}

/**
 * Cover art can fail to load even when a URL is set — most commonly a guessed
 * Steam CDN path that doesn't exist for a given game (newer titles sometimes
 * use a different, hash-based asset path Steam's own site resolves but we
 * can't predict). Without this, that shows the browser's broken-image icon
 * forever; with it, we fall back gracefully instead.
 */
export function GameCover({
  coverUrl,
  title,
  showTitleFallback,
  className = "w-full h-full object-cover",
  placeholderClassName = "w-full h-full flex items-center justify-center text-xs text-slate-400 p-2 text-center",
}: GameCoverProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [coverUrl]);

  if (coverUrl && !failed) {
    return <img src={coverUrl} alt="" className={className} onError={() => setFailed(true)} />;
  }
  if (showTitleFallback) {
    return <div className={placeholderClassName}>{title}</div>;
  }
  return null;
}
