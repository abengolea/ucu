import 'server-only';

import { getAdminDb } from '@/lib/firebase-admin';
import type { MemberAuthProvider, MemberDocument } from '@/types/members';

const COLLECTION = 'members';

export async function upsertMember(input: {
  uid: string;
  email: string;
  name: string;
  provider: MemberAuthProvider;
}): Promise<void> {
  const db = getAdminDb();
  if (!db) return;

  const now = new Date().toISOString();
  const ref = db.collection(COLLECTION).doc(input.uid);
  const snap = await ref.get();
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  if (!snap.exists) {
    const doc: MemberDocument = {
      uid: input.uid,
      email,
      name,
      provider: input.provider,
      createdAt: now,
      lastLoginAt: now,
    };
    await ref.set(doc);
    return;
  }

  await ref.update({
    email,
    name: name || snap.data()?.name || '',
    provider: input.provider,
    lastLoginAt: now,
  });
}
