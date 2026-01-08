export interface TikTokAccount {
  key: string; // Firebaseのキー（1, 2など）
  accountName: string;
  accountId: string;
  lastCheckedDate: string;
  amount: string;
  addedDate: string;
}

export type SortField =
  | "key"
  | "accountName"
  | "accountId"
  | "lastCheckedDate"
  | "amount"
  | "addedDate";
export type SortOrder = "asc" | "desc";
