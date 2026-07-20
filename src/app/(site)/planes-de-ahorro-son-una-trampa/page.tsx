import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CampaignLanding } from '@/components/campaign/CampaignLanding';
import { JsonLd } from '@/components/seo/JsonLd';
import { getPageBySlug, getPostsByCategory } from '@/lib/content';
import { decodeHtmlEntities } from '@/lib/format';
import { resolveMediaUrl } from '@/lib/media';
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  webPageJsonLd,
} from '@/lib/seo';
import { extractBackgroundImages } from '@/lib/wordpress-html';

const CAMPAIGN_PATH = '/planes-de-ahorro-son-una-trampa';
const CAMPAIGN_DESCRIPTION =
  'Campaña nacional de UCU por la reforma integral del sistema de planes de ahorro automotor. Exigencias, recursos, FAQ y asesoramiento para ahorristas afectados.';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug('planes-de-ahorro-son-una-trampa').catch(() => null);
  const title = page
    ? decodeHtmlEntities(page.title)
    : 'Planes de ahorro son una trampa';

  return buildPageMetadata({
    title,
    description: CAMPAIGN_DESCRIPTION,
    path: CAMPAIGN_PATH,
    keywords: [
      'planes de ahorro',
      'planes de ahorro son una trampa',
      'planes de ahorro automotor',
      'reforma planes de ahorro',
      'UCU',
      'ahorristas',
    ],
  });
}

export default async function CampanaPlanesAhorroPage() {
  const [page, relatedPosts] = await Promise.all([
    getPageBySlug('planes-de-ahorro-son-una-trampa').catch(() => null),
    getPostsByCategory('planes-de-ahorros', 6).catch(() => []),
  ]);

  if (!page) notFound();

  const bgImages = extractBackgroundImages(page.content);
  const heroImageUrl = resolveMediaUrl(bgImages[0] ?? null);
  const title = decodeHtmlEntities(page.title);

  return (
    <main>
      <JsonLd
        data={[
          webPageJsonLd({
            title,
            description: CAMPAIGN_DESCRIPTION,
            path: CAMPAIGN_PATH,
            type: 'WebPage',
          }),
          breadcrumbJsonLd([
            { name: 'Inicio', path: '/' },
            { name: title, path: CAMPAIGN_PATH },
          ]),
        ]}
      />
      <CampaignLanding heroImageUrl={heroImageUrl} relatedPosts={relatedPosts} />
    </main>
  );
}
