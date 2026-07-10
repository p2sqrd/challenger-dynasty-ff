export default function RulesPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Rules</h1>

      <section className="mt-6">
        <h2 className="text-lg font-medium">Auction &amp; keeper economy</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Auction draft every year with a $200 budget.</li>
          <li>Any leftover money from the auction is relinquished.</li>
          <li>
            To keep a player from the previous year, take the previous
            year&apos;s salary and add $3.
            <div className="mt-1 text-neutral-500">
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
            <div className="mt-1 text-neutral-500">
              Exception: if the player was drafted and dropped, you pay the
              original auction price instead.
            </div>
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Penalty for negligence</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Not actively setting your roster, playing people who are on bye
          weeks/IR.
        </p>
        <table className="mt-3 w-full max-w-md text-sm">
          <tbody>
            <tr className="border-b border-neutral-100 dark:border-neutral-900">
              <td className="py-2 text-neutral-500">1st offense</td>
              <td className="py-2">Warning</td>
            </tr>
            <tr className="border-b border-neutral-100 dark:border-neutral-900">
              <td className="py-2 text-neutral-500">2nd offense</td>
              <td className="py-2">Lose $5 FAAB</td>
            </tr>
            <tr className="border-b border-neutral-100 dark:border-neutral-900">
              <td className="py-2 text-neutral-500">3rd offense</td>
              <td className="py-2">Lose $5 auction for the following year</td>
            </tr>
            <tr className="border-b border-neutral-100 dark:border-neutral-900">
              <td className="py-2 text-neutral-500">4th offense</td>
              <td className="py-2">Make new friends, you&apos;re out the league</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-sm text-neutral-500">
          The team with the most negligence strikes has to make a music
          video.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Penalty for collusion</h2>
        <p className="mt-1 text-sm text-neutral-500">
          &ldquo;Collusion occurs when one team makes moves to benefit another
          team, without trying to improve its own position.&rdquo;
        </p>
        <table className="mt-3 w-full max-w-md text-sm">
          <tbody>
            <tr className="border-b border-neutral-100 dark:border-neutral-900">
              <td className="py-2 text-neutral-500">1st offense</td>
              <td className="py-2">Party loses $10 auction</td>
            </tr>
            <tr className="border-b border-neutral-100 dark:border-neutral-900">
              <td className="py-2 text-neutral-500">2nd offense</td>
              <td className="py-2">Party loses $30 auction</td>
            </tr>
            <tr className="border-b border-neutral-100 dark:border-neutral-900">
              <td className="py-2 text-neutral-500">3rd offense</td>
              <td className="py-2">Party loses $50 auction</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Last place punishment</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Last place has to create a music video.</li>
          <li>Winner takes all — winnings go into the cost of jersey &amp; trophy engraving.</li>
          <li>Winner keeps all leftover money.</li>
          <li>
            Failure to submit a music video prior to the following season
            starting results in a $50 draft penalty.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">23 amendments</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Bench converted to WR starting in the &apos;24-25 season.</li>
          <li>New defense scoring.</li>
        </ul>
      </section>
    </div>
  );
}
