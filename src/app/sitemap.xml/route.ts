import { NextResponse } from 'next/server';
import {
  MINIMAL_SITEMAP_XML,
  buildStaticSitemapXml,
} from '@/lib/sitemap-static';

export const dynamic = 'force-static';
export const revalidate = 86400;
export const runtime = 'nodejs';

const XML_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=3600, s-maxage=86400',
};

function xmlResponse(body: string): NextResponse {
  return new NextResponse(body, {
    status: 200,
    headers: XML_HEADERS,
  });
}

export function GET() {
  try {
    return xmlResponse(buildStaticSitemapXml());
  } catch (error) {
    console.error('[sitemap] static build failed, serving minimal xml', error);
    return xmlResponse(MINIMAL_SITEMAP_XML);
  }
}
