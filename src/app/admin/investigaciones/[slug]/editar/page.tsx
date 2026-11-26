import { InvestigacionEditor } from '@/components/admin/InvestigacionEditor';
import { RequirePermission } from '@/components/admin/AdminPermissionGuard';

export default async function EditarInvestigacionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <RequirePermission permission="posts:write">
      <InvestigacionEditor mode="edit" initialSlug={slug} />
    </RequirePermission>
  );
}
