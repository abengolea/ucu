import { InvestigacionEditor } from '@/components/admin/InvestigacionEditor';
import { RequirePermission } from '@/components/admin/AdminPermissionGuard';

export default function NuevaInvestigacionPage() {
  return (
    <RequirePermission permission="posts:write">
      <InvestigacionEditor mode="create" />
    </RequirePermission>
  );
}
