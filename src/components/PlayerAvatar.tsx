"use client";

import { useState } from "react";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (
    ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?"
  );
}

/**
 * Sleeper serves player headshots at
 * `content/nfl/players/thumb/{id}.jpg`. Team defenses use a team-code id
 * (e.g. "PHI") instead of a numeric one — those get the team logo.
 */
function photoUrl(playerId: string) {
  if (/^[A-Za-z]{2,4}$/.test(playerId)) {
    return `https://sleepercdn.com/images/team_logos/nfl/${playerId.toLowerCase()}.png`;
  }
  return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`;
}

/**
 * Circular player headshot with an initials fallback when the image is
 * missing (some rookies) or fails to load. Plain <img> rather than
 * next/image to avoid remote-domain config in this modified Next build.
 */
export function PlayerAvatar({
  playerId,
  name,
  size = 36,
}: {
  playerId: string;
  name: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };

  if (failed) {
    return (
      <span
        style={style}
        className="inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 font-semibold text-muted"
      >
        <span style={{ fontSize: size * 0.36 }}>{initials(name)}</span>
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl(playerId)}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={style}
      className="shrink-0 rounded-full border border-line bg-surface-2 object-cover"
    />
  );
}
