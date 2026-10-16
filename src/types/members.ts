export type MemberAuthProvider = 'google' | 'password';

export type MemberViewerSource = 'member' | 'admin';

export type MemberViewer = {
  uid: string;
  email: string;
  name: string;
  provider: MemberAuthProvider | 'admin';
  source: MemberViewerSource;
};

export type MemberDocument = {
  uid: string;
  email: string;
  name: string;
  provider: MemberAuthProvider;
  createdAt: string;
  lastLoginAt: string;
};
