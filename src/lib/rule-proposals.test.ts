import { describe, expect, it } from "vitest";
import {
  buildComments,
  buildProposals,
  computeStatus,
  majorityThreshold,
} from "./rule-proposals";

describe("majorityThreshold", () => {
  it("needs more than half of the league", () => {
    expect(majorityThreshold(12)).toBe(7);
    expect(majorityThreshold(10)).toBe(6);
    expect(majorityThreshold(11)).toBe(6);
  });
});

describe("computeStatus", () => {
  it("stays open until voting is locked", () => {
    expect(computeStatus(9, 7, false)).toBe("open");
  });
  it("passes only when yes reaches the whole-league threshold", () => {
    expect(computeStatus(7, 7, true)).toBe("passed");
    expect(computeStatus(6, 7, true)).toBe("failed");
  });
  it("fails a proposal nobody rallied behind, even with no opposition", () => {
    // 3 yes, 0 no, but threshold is 7 → still fails at the deadline.
    expect(computeStatus(3, 7, true)).toBe("failed");
  });
});

describe("buildProposals", () => {
  const nameById = new Map([
    ["m1", "ppradhan"],
    ["m2", "omarels"],
    ["m3", "sprtzfan17"],
  ]);

  it("splits voters into yes/no with the viewer's own vote surfaced", () => {
    const [p] = buildProposals({
      proposals: [
        { id: "p1", title: "Bench to starter", body: null, author_id: "m1", created_at: "2026-01-01" },
      ],
      votes: [
        { proposal_id: "p1", manager_id: "m1", vote: true },
        { proposal_id: "p1", manager_id: "m2", vote: true },
        { proposal_id: "p1", manager_id: "m3", vote: false },
      ],
      nameById,
      viewerId: "m3",
      threshold: 7,
      locked: false,
    });

    expect(p.yes.map((v) => v.name).sort()).toEqual(["Omar", "Pranav"]);
    expect(p.no.map((v) => v.name)).toEqual(["Hirsch"]);
    expect(p.myVote).toBe(false);
    expect(p.authorName).toBe("Pranav");
    expect(p.status).toBe("open");
  });

  it("lets a commissioner override pin the status regardless of votes or lock", () => {
    const [forced] = buildProposals({
      proposals: [
        {
          id: "p1",
          title: "x",
          body: null,
          author_id: "m1",
          created_at: "2026-01-01",
          override_status: "passed",
        },
      ],
      votes: [{ proposal_id: "p1", manager_id: "m2", vote: false }],
      nameById,
      viewerId: null,
      threshold: 7,
      locked: false, // still open, and only a No vote…
    });
    expect(forced.status).toBe("passed"); // …but the override wins
    expect(forced.overridden).toBe(true);
  });

  it("marks a locked proposal passed once it clears the threshold", () => {
    const votes = Array.from({ length: 7 }, (_, i) => ({
      proposal_id: "p1",
      manager_id: `y${i}`,
      vote: true,
    }));
    const [p] = buildProposals({
      proposals: [
        { id: "p1", title: "x", body: null, author_id: "m1", created_at: "2026-01-01" },
      ],
      votes,
      nameById: new Map(),
      viewerId: null,
      threshold: 7,
      locked: true,
    });
    expect(p.yes).toHaveLength(7);
    expect(p.status).toBe("passed");
    expect(p.myVote).toBeNull();
  });
});

describe("buildComments", () => {
  const nameById = new Map([
    ["m1", "ppradhan"],
    ["m2", "omarels"],
    ["m3", "sprtzfan17"],
  ]);

  it("groups comments per proposal and tallies reactions per emoji", () => {
    const byProposal = buildComments({
      comments: [
        { id: "c1", proposal_id: "p1", manager_id: "m1", body: "yes please", created_at: "2026-01-01T00:00:00Z" },
        { id: "c2", proposal_id: "p1", manager_id: "m2", body: "no way", created_at: "2026-01-01T00:01:00Z" },
        { id: "c3", proposal_id: "p2", manager_id: "m3", body: "other", created_at: "2026-01-01T00:02:00Z" },
      ],
      reactions: [
        { comment_id: "c1", manager_id: "m2", emoji: "🔥" },
        { comment_id: "c1", manager_id: "m3", emoji: "🔥" },
        { comment_id: "c1", manager_id: "m1", emoji: "👍" },
      ],
      nameById,
      viewerId: "m3",
    });

    const p1 = byProposal.get("p1")!;
    expect(p1).toHaveLength(2);
    expect(byProposal.get("p2")).toHaveLength(1);

    const c1 = p1[0];
    // 🔥 has 2 (sorted before 👍 with 1), and m3 (viewer) is in the 🔥 set.
    expect(c1.reactions[0]).toMatchObject({ emoji: "🔥", count: 2, mine: true });
    expect(c1.reactions[0].names.sort()).toEqual(["Hirsch", "Omar"]);
    expect(c1.reactions[1]).toMatchObject({ emoji: "👍", count: 1, mine: false });
    expect(c1.authorName).toBe("Pranav");
  });
});
