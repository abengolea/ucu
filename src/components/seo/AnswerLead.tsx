import Link from 'next/link';

type AnswerLeadProps = {
  question: string;
  answer: string;
  href?: string;
  hrefLabel?: string;
};

/** Pregunta + respuesta visible (sin accordion) para que un crawler la lea. */
export function AnswerLead({ question, answer, href, hrefLabel = 'Ver más →' }: AnswerLeadProps) {
  return (
    <article className="border-b border-[var(--border)] py-6 first:pt-0 last:border-b-0 last:pb-0">
      <h2 className="font-display text-lg font-bold tracking-tight text-[var(--ink)] md:text-xl">
        {question}
      </h2>
      <p className="mt-2 max-w-prose font-serif text-base leading-relaxed text-[var(--ink)]">
        {answer}
      </p>
      {href ? (
        <Link
          href={href}
          className="mt-3 inline-flex font-display text-sm font-semibold text-ucu-blue underline-offset-2 hover:underline"
        >
          {hrefLabel}
        </Link>
      ) : null}
    </article>
  );
}
