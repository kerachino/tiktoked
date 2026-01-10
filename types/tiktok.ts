// TikTokアカウント関連の型定義
export interface TikTokAccount {
  key: string; // Firebaseのキー（1, 2など）
  accountName: string;
  accountId: string;
  lastCheckedDate: string;
  amount: string;
  addedDate: string;
  favorite: boolean;
  deleted?: boolean;
  // listIdはFirebaseの構造上、パスに含まれているため、ここでは持たない
}

// リストのメタデータ型定義（_lists以下に保存される）
export interface ListMetadata {
  id: string; // リストID（Firebaseのキーと同じ）
  name: string; // 表示名
  description: string; // 空文字列も許容するために必須にする
  createdAt: string;
  updatedAt?: string;
  isDefault?: boolean; // デフォルトリストかどうか
  accountCount?: number; // アカウント数（動的に計算）
  icon?: string; // オプション：リストアイコン（絵文字など）
  color?: string; // オプション：リストのカラーコード
}

// リストの完全なデータ型（メタデータ + アカウントデータ）
export interface AccountList {
  id: string; // リストID
  name: string; // 表示名
  description: string; // 空文字列も許容するために必須にする
  createdAt: string;
  accountCount: number; // 実際のアカウント数
  icon?: string;
  color?: string;
  // オプション：追加の設定
  settings?: {
    sortByDefault?: SortField;
    sortOrderDefault?: SortOrder;
    autoArchiveDeleted?: boolean;
    notificationEnabled?: boolean;
  };
}

// 一括追加用のプレビュー型
export interface BulkPreviewAccount {
  accountName: string;
  accountId: string;
  previewKey: string;
  // listIdはモーダルのpropsとして渡すため、ここでは持たない
}

// 一括追加用の重複アカウント型
export interface BulkDuplicateAccount {
  accountName: string;
  accountId: string;
  previewKey: string;
  reason: string;
  existingKey?: string; // 既存のキー（存在する場合）
}

// ソート関連の型
export type SortField =
  | "key"
  | "accountName"
  | "accountId"
  | "lastCheckedDate"
  | "amount"
  | "favorite"
  | "addedDate"
  | "deleted";

export type SortOrder = "asc" | "desc";

// フィルター設定の型
export interface FilterSettings {
  searchQuery: string;
  searchType: "accountName" | "accountId";
  dateFilter: {
    startDate: string;
    endDate: string;
    enabled: boolean;
  };
  showFavoritesOnly: boolean;
  showDeleted: boolean;
  currentListId: string; // 現在選択中のリストID（必須）
}

// 新規リスト作成用の型
export interface NewListData {
  name: string;
  description: string; // 空文字列も許容するために必須にする
  icon?: string;
  color?: string;
  templateListId?: string; // テンプレートとして使用するリストID（コピー元）
  copyAccounts?: boolean; // アカウントをコピーするかどうか
}

// リスト操作の結果型
export interface ListOperationResult {
  success: boolean;
  message: string;
  listId?: string;
  error?: string;
}

// アカウント移動用の型
export interface AccountMoveData {
  accountKey: string;
  fromListId: string;
  toListId: string;
  copy?: boolean; // コピーする場合はtrue、移動する場合はfalse
}

// リスト統計情報の型
export interface ListStatistics {
  totalAccounts: number;
  activeAccounts: number;
  deletedAccounts: number;
  favoriteAccounts: number;
  checkedAccounts: number; // amount > 0
  ignoredAccounts: number; // amount = -1
  lastUpdated?: string;
}

// アカウント追加用の型
export interface AddAccountData {
  accountName: string;
  accountId: string;
  amount?: string;
  favorite?: boolean;
  addedDate?: string;
  listId: string; // 追加先リストID
}

// バッチ処理用の型
export interface BatchOperation<T> {
  type: "add" | "update" | "delete" | "move";
  data: T;
  timestamp: string;
}

// エクスポート設定の型
export interface ExportSettings {
  format: "json" | "csv" | "excel";
  includeDeleted: boolean;
  includeMetadata: boolean;
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
}

// インポート設定の型
export interface ImportSettings {
  format: "json" | "csv" | "excel";
  targetListId: string;
  conflictResolution: "skip" | "overwrite" | "rename";
}

// 型ガード関数
export function isAccountList(obj: any): obj is AccountList {
  return (
    obj !== null &&
    typeof obj === "object" &&
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    typeof obj.description === "string" && // descriptionは必須
    typeof obj.createdAt === "string" &&
    typeof obj.accountCount === "number"
  );
}

// 型変換ヘルパー関数
export function createAccountList(
  id: string,
  name: string,
  description: string = "", // デフォルト値として空文字列
  createdAt: string,
  accountCount: number = 0,
  icon?: string,
  color?: string
): AccountList {
  return {
    id,
    name,
    description,
    createdAt,
    accountCount,
    icon,
    color,
  };
}

// ListMetadataからAccountListへの変換関数
export function convertListMetadataToAccountList(
  metadata: ListMetadata,
  accountCount: number = 0
): AccountList {
  return {
    id: metadata.id,
    name: metadata.name,
    description: metadata.description || "",
    createdAt: metadata.createdAt,
    accountCount,
    icon: metadata.icon,
    color: metadata.color,
  };
}
