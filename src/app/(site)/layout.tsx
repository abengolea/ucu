import { SiteFooter, SiteHeader } from '@/components/SiteHeader';

export const dynamic = 'force-dynamic';

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </>
  );
}
