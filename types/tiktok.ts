export interface TikTokAccount {
  key: string; // Firebaseのキー（1, 2など）
  accountName: string;
  accountId: string;
  lastCheckedDate: string;
  amount: string;
  addedDate: string;
}

export interface BulkPreviewAccount {
  accountName: string;
  accountId: string;
  previewKey: string;
}

export interface BulkDuplicateAccount {
  accountName: string;
  accountId: string;
  previewKey: string;
  reason: string;
}

export type SortField =
  | "key"
  | "accountName"
  | "accountId"
  | "lastCheckedDate"
  | "amount"
  | "addedDate";
export type SortOrder = "asc" | "desc";
