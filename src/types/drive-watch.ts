export type DriveAlertStatus = 'open' | 'needs_review' | 'ignored' | 'reviewed';

export type DriveAlertTier = 'high' | 'medium';

export type DriveChangeAlert = {
  id: string;
  reclamoId: number;
  fileId: string;
  fileName: string;
  status: DriveAlertStatus;
  tier: DriveAlertTier;
  relevanceScore: number;
  matchedSignals: string[];
  detectedAt: string;
  lastActivityAt: string;
  diffStats?: {
    percentChanged: number;
    paragraphsAdded: number;
    paragraphsModified: number;
    paragraphsRemoved: number;
    charsDelta: number;
  } | null;
  diffSnippet?: string | null;
  driveUrl?: string | null;
  reviewedBy?: string;
  reviewedAt?: string;
};

export type DrivePollingState = {
  lastPolledAt?: string;
  filesProcessed?: number;
  contentChanged?: number;
  alertsCreated?: number;
  alertsUpdated?: number;
};
