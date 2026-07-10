/** Consistent page masthead: stadium-signage title + optional subtitle. */
export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="nameplate-type text-3xl leading-none text-ink">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-2xl text-sm text-muted">{subtitle}</p>
        )}
      </div>
      {right}
    </div>
  );
}
