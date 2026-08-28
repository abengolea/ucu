import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EducationModuleArticle } from '@/components/educacion-financiera/EducationModuleArticle';
import { JsonLd } from '@/components/seo/JsonLd';
import {
  EDUCATION_MODULES,
  educationModulePath,
  getEducationModuleBySlug,
} from '@/lib/educacion-financiera/modules';
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  faqPageJsonLd,
  truncateMeta,
  webPageJsonLd,
} from '@/lib/seo';

export function generateStaticParams() {
  return EDUCATION_MODULES.map((mod) => ({ slug: mod.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const mod = getEducationModuleBySlug(slug);
  if (!mod) return { title: 'Módulo no encontrado' };

  return buildPageMetadata({
    title: `${mod.title} — Educación financiera`,
    description: truncateMeta(`${mod.content.intro} ${mod.urgency}. Curso gratuito de UCU.`),
    path: educationModulePath(mod),
    keywords: [
      mod.title,
      'educación financiera',
      'consumidores Argentina',
      'UCU',
      'BCRA',
    ],
  });
}

export default async function EducationModulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mod = getEducationModuleBySlug(slug);
  if (!mod) notFound();

  const index = EDUCATION_MODULES.findIndex((item) => item.id === mod.id);
  const next = index >= 0 ? EDUCATION_MODULES[index + 1] : undefined;
  const path = educationModulePath(mod);
  const description = truncateMeta(mod.content.intro);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 lg:px-6">
      <JsonLd
        data={[
          webPageJsonLd({
            title: mod.title,
            description,
            path,
            type: 'LearningResource',
          }),
          faqPageJsonLd(
            [
              {
                question: mod.content.quiz.question,
                answer: mod.content.quiz.explanation,
              },
            ],
            path
          ),
          breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: 'Educación financiera', path: '/educacion-financiera' },
            { name: mod.title, path },
          ]),
        ]}
      />
      <Link href="/educacion-financiera?seccion=curso" className="ucu-btn-ghost mb-6 inline-flex">
        ← Volver al recorrido
      </Link>
      <EducationModuleArticle
        mod={mod}
        nextHref={next ? educationModulePath(next) : '/educacion-financiera?seccion=calculadoras'}
        nextTitle={next ? next.title : 'Calculadoras'}
      />
    </main>
  );
}
