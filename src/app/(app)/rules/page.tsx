import { PageHeader } from "@/components/PageHeader";

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="nameplate-type text-lg text-ink">{title}</h2>
      {note && <p className="mt-1 text-sm text-muted">{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function PenaltyTable({ rows }: { rows: [string, string][] }) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-surface">
      <table className="w-full max-w-xl text-sm">
        <tbody>
          {rows.map(([offense, penalty]) => (
            <tr key={offense} className="border-b border-line last:border-0">
              <td className="w-40 py-3 pl-4 pr-4 text-muted">{offense}</td>
              <td className="py-3 pr-4 text-ink">{penalty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function RulesPage() {
  return (
    <div>
      <PageHeader
        title="Rules"
        subtitle="The league constitution — auction economy, keeper pricing, penalties, and the amendments the group has voted in."
      />

      <Section title="Auction & keeper economy">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink">
          <li>Auction draft every year with a $200 budget.</li>
          <li>Any leftover money from the auction is relinquished.</li>
          <li>
            To keep a player from the previous year, take the previous
            year&apos;s salary and add $3.
            <div className="mt-1 text-muted">
              Ex: Drafted Colin Kaepernick for $7 in 2018 — to keep him in
              2019, spend $10 from the auction budget.
            </div>
          </li>
          <li>Players can be traded for money and/or other players.</li>
          <li>
            Tradebacks are only allowed after the draft. If a player has been
            traded, they cannot return via trade to the original team unless
            they&apos;ve been to a third team (via trade) in between.
          </li>
          <li>
            Players must always leave a minimum of $125 and a maximum of $275
            in the next year&apos;s draft money.
          </li>
          <li>
            The price to keep a waiver-wire pickup for its first year is the
            cost of FAAB paid (or a minimum of $5). The $3 tax is added in
            following years.
            <div className="mt-1 text-muted">
              Exception: if the player was drafted and dropped, you pay the
              original auction price instead.
            </div>
          </li>
        </ul>
      </Section>

      <Section
        title="Penalty for negligence"
        note="Not actively setting your roster, playing people who are on bye weeks/IR."
      >
        <PenaltyTable
          rows={[
            ["1st offense", "Warning"],
            ["2nd offense", "Lose $5 FAAB"],
            ["3rd offense", "Lose $5 auction for the following year"],
            ["4th offense", "Make new friends, you're out the league"],
          ]}
        />
        <p className="mt-2 text-sm text-muted">
          The team with the most negligence strikes has to make a music video.
        </p>
      </Section>

      <Section
        title="Penalty for collusion"
        note="“Collusion occurs when one team makes moves to benefit another team, without trying to improve its own position.”"
      >
        <PenaltyTable
          rows={[
            ["1st offense", "Party loses $10 auction"],
            ["2nd offense", "Party loses $30 auction"],
            ["3rd offense", "Party loses $50 auction"],
          ]}
        />
      </Section>

      <Section title="Last place punishment">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink">
          <li>Last place has to create a music video.</li>
          <li>
            Winner takes all — winnings go into the cost of jersey &amp; trophy
            engraving.
          </li>
          <li>Winner keeps all leftover money.</li>
          <li>
            Failure to submit a music video prior to the following season
            starting results in a $50 draft penalty.
          </li>
        </ul>
      </Section>

      <Section title="23 amendments">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink">
          <li>Bench converted to WR starting in the &apos;24-25 season.</li>
          <li>New defense scoring.</li>
        </ul>
      </Section>
    </div>
  );
}
