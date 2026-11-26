'use client';

type InvestigacionFrameProps = {
  slug: string;
  title: string;
};

export function InvestigacionFrame({ slug, title }: InvestigacionFrameProps) {
  return (
    <iframe
      src={`/investigaciones/${encodeURIComponent(slug)}/vista`}
      title={title}
      className="block h-[calc(100dvh-9.5rem)] min-h-[40rem] w-full border-0 bg-[var(--surface-raised)]"
      referrerPolicy="same-origin"
    />
  );
}
