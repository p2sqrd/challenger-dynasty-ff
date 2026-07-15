import { PageHeader } from "@/components/PageHeader";
import { resolveTeam } from "@/lib/teams";

interface Vote {
  manager: string;
  vote: string;
  comment: string | null;
}

interface Proposal {
  title: string;
  date: string;
  votes: Vote[];
}

const PROPOSALS: Proposal[] = [
  {
    title: "Villegas Villages don't need to do a last place punishment bc it's Joe Villegas' birthday present",
    date: "2023-10-02",
    votes: [
      { manager: "Hirsch", vote: "Absolutely", comment: null },
      { manager: "Mukund", vote: "I can't believe this needed to be put to a vote", comment: null },
      { manager: "Arun", vote: "Beyond a fucking doubt", comment: null },
      { manager: "Harish", vote: "Without a question", comment: null },
      { manager: "Pranav", vote: "Yes!!!", comment: null },
      { manager: "Ari", vote: "Yes Immediately", comment: null },
      { manager: "Omar", vote: "Yes", comment: null },
      { manager: "Adi", vote: "Indubitably", comment: null },
      { manager: "Kartik", vote: "Obviously", comment: null },
      { manager: "Ahmad", vote: "No, people need to see how many pullups I can do", comment: null },
      { manager: "Vijay+Sahil", vote: "No, I want to see Joe run his mile shirtless", comment: null },
    ],
  },
  {
    title: "Change 1 Bench Spot to Starter",
    date: "2023-08-03",
    votes: [
      { manager: "Hirsch", vote: "Yes w/ 1 year of lead time.", comment: "3 WRs is standard now, too easy to stash players (speaking as a culprit myself)." },
      { manager: "Mukund", vote: "Yes w/ 1 year of lead time.", comment: null },
      { manager: "Arun", vote: "Yes immediately", comment: null },
      { manager: "Harish", vote: "Yes", comment: null },
      { manager: "Pranav", vote: "Yes immediately", comment: null },
      { manager: "Ari", vote: "Yes Immediately", comment: null },
      { manager: "Omar", vote: "Yes w/ 1 year of lead time.", comment: null },
      { manager: "Adi", vote: "Yes immediately", comment: null },
      { manager: "Kartik", vote: "No", comment: null },
      { manager: "Ahmad", vote: "No, less spots make it more fun", comment: "we're not adding a spot, just converting bench to starter" },
      { manager: "Vijay", vote: "No", comment: null },
    ],
  },
  {
    title: "2) If 1 Passes, then should starter be flex or WR",
    date: "2023-06-04",
    votes: [
      { manager: "Hirsch", vote: "WR", comment: null },
      { manager: "Ari", vote: "WR", comment: null },
      { manager: "Mukund", vote: "WR", comment: null },
      { manager: "Omar", vote: "Flex", comment: null },
      { manager: "Pranav", vote: "Flex", comment: null },
      { manager: "Arun", vote: "Flex", comment: null },
      { manager: "Adi", vote: "WR", comment: null },
      { manager: "Kartik", vote: "WR", comment: null },
      { manager: "Ahmad", vote: "Flex", comment: null },
      { manager: "Vijay", vote: "WR", comment: null },
    ],
  },
  {
    title: "3) If 2 passes, then should there be a 1 year lead time",
    date: "2023-05-05",
    votes: [
      { manager: "Hirsch", vote: "Yes", comment: null },
      { manager: "Ari", vote: "No", comment: null },
      { manager: "Mukund", vote: "Yes", comment: null },
      { manager: "Pranav", vote: "No", comment: null },
      { manager: "Arun", vote: "No", comment: null },
      { manager: "Omar", vote: "Yes", comment: null },
      { manager: "Adi", vote: "No", comment: null },
      { manager: "Kartik", vote: "Yes", comment: null },
      { manager: "Ahmad", vote: "Yes", comment: null },
      { manager: "Vijay", vote: "No", comment: null },
    ],
  },
  {
    title: "4) In Season Salary Cap from $265 to $250",
    date: "2023-01-09",
    votes: [
      { manager: "Hirsch", vote: "Yes *if Rule 1 is not accepted.", comment: "I'm not a pussy." },
      { manager: "Mukund", vote: "No", comment: "Why is it 265 and not 275?" },
      { manager: "Arun", vote: "No", comment: null },
      { manager: "Omar", vote: "No", comment: null },
      { manager: "Harish", vote: "No", comment: null },
      { manager: "Ari", vote: "No", comment: null },
      { manager: "Pranav", vote: "No", comment: "This rule will have zero effect if pre-keeper trading is allowed. You will always be able to leverage the next season's money over and over." },
      { manager: "Adi", vote: "No", comment: null },
      { manager: "Kartik", vote: "No", comment: null },
      { manager: "Ahmad", vote: "No", comment: null },
    ],
  },
  {
    title: "5) Failure to do punishment is -$50 Draft.",
    date: "2023-06-04",
    votes: [
      { manager: "Hirsch", vote: "Yes", comment: "Lack of music videos have been disappointing. Every additional year should be another $X too." },
      { manager: "Mukund", vote: "Yes", comment: "Yes for presidential fitness, no for music video. I also think the worst team should get some reward (e.g. $5 draft) for passing the presidential fitness." },
      { manager: "Omar", vote: "Yes", comment: null },
      { manager: "Pranav", vote: "Yes", comment: "Agreed with Hirsch + the punishment is way less embarrassing now (we already embarrass ourselves athletically on a daily basis, so failing the Presidential Physical Fitness shouldn't be shameful at all)" },
      { manager: "Ari", vote: "no", comment: null },
      { manager: "Arun", vote: "No", comment: "We need to vote on a punishment people are actually willing to do" },
      { manager: "Adi", vote: "No", comment: "Agree with Arun though I like presidential physical fitness as a punishment" },
      { manager: "Kartik", vote: "Yes", comment: "Failure to do it is -50. Failure to achieve a 13 year old males National Physical Fitness standards is -10 draft. Presidential is +5 draft. Ari, Pingles and I can do a combine to make up for the last 3 years. Remove sit and reach." },
      { manager: "Ahmad", vote: "No", comment: null },
      { manager: "Vijay", vote: "Yes", comment: null },
    ],
  },
  {
    title: "6) No Trades Allowed from End of Trade Deadline to after keepers are set",
    date: "2023-01-08",
    votes: [
      { manager: "Pranav", vote: "Yes", comment: "Same proposal as last year. That I'm pretty sure only 4 people actually read/thought about and everyone else learned about it on draft day lol" },
      { manager: "Ari", vote: "no", comment: null },
      { manager: "Hirsch", vote: "No", comment: "I like trading for people who inevitably get injured during training camp" },
      { manager: "Omar", vote: "no", comment: null },
      { manager: "Mukund", vote: "No", comment: "Couldn't have won my 3 championships without this" },
      { manager: "Arun", vote: "No", comment: null },
      { manager: "Adi", vote: "No", comment: null },
      { manager: "Kartik", vote: "No", comment: null },
      { manager: "Ahmad", vote: "No", comment: null },
    ],
  },
  {
    title: "7) Improved DST scoring (effectively treats DST more like a player, starting from 0 and scoring up vs. starting at 10 and possibly going down or up very arbitrarily)",
    date: "2023-07-02",
    votes: [
      { manager: "Pranav", vote: "Yes", comment: "https://draftysports.com/news/you-deserve-better-defense-scoring" },
      { manager: "Ari", vote: "Yes", comment: null },
      { manager: "Hirsch", vote: "Yes", comment: "Idk anything about defensive scoring other than the fact that it makes no sense rn" },
      { manager: "Omar", vote: "Yes", comment: null },
      { manager: "Mukund", vote: "No", comment: "y tho" },
      { manager: "Arun", vote: "Yes", comment: null },
      { manager: "Adi", vote: "Yes", comment: null },
      { manager: "Kartik", vote: "Yes", comment: null },
      { manager: "Ahmad", vote: "No", comment: "This seems too complicated lol" },
    ],
  },
];

export default function ProposalsPage() {
  return (
    <div>
      <PageHeader
        title="Rule Proposals"
        subtitle="The historical record of 23-24 rule proposal votes, kept around for posterity."
      />

      <div className="space-y-4">
        {PROPOSALS.map((p) => (
          <div
            key={p.title}
            className="rounded-md border border-line bg-surface p-5"
          >
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="font-medium text-ink">{p.title}</h3>
              <span className="tabular shrink-0 text-xs text-muted">
                {p.date}
              </span>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {p.votes.map((v, i) => {
                const team = resolveTeam(v.manager);
                return (
                  <li key={i} className="flex gap-2.5">
                    <span
                      aria-hidden
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: team.color }}
                    />
                    <span>
                      <span className="font-medium text-ink">{v.manager}</span>
                      <span className="text-muted"> · </span>
                      <span className="text-ink">{v.vote}</span>
                      {v.comment && (
                        <span className="text-muted"> — {v.comment}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
