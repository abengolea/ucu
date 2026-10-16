import { SiteFooter, SiteHeader } from '@/components/SiteHeader';
import { getViewer } from '@/lib/member-session';

export const dynamic = 'force-dynamic';

export default async function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const viewer = await getViewer();

  return (
    <>
      <SiteHeader viewer={viewer} />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </>
  );
}
