"use client";

import { TikTokAccount, SortField, SortOrder } from "@/types/tiktok";

// デバッグ用のログ関数
const debugLog = (...args: any[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log("[DEBUG]", ...args);
  }
};

interface AccountTableProps {
  accounts: TikTokAccount[];
  loadingMore: boolean;
  hasMore: boolean;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  onOpenLink: (account: TikTokAccount) => void;
  onUpdateAmount: (accountKey: string, delta: number) => void;
  onToggleFavorite: (accountKey: string) => void;
  onToggleDeleted: (accountKey: string) => void; // 削除済み切り替え追加
  getAmountMeaning: (amount: string) => string;
  getAmountStyle: (amount: string) => string;
  formatDate: (dateString: string) => string;
  getDateCellStyle: (dateString: string) => string;
  getSortIcon: (field: SortField) => string;
  onManualLoadMore?: () => void;
  loadMoreRef?: React.RefObject<HTMLDivElement | null>;
  showDeleted: boolean; // 削除済み表示状態追加
  // リスト比較関連のプロパティ追加（複数リスト対応）
  listComparisonMode?: "none" | "intersection" | "difference";
  comparisonListNames?: string[];
  // マイフォロー除外関連のプロパティ追加
  excludeMyFollow?: boolean;
  myFollowAccountsCount?: number;
}

export default function AccountTable({
  accounts,
  loadingMore,
  hasMore,
  sortField,
  sortOrder,
  onSort,
  onOpenLink,
  onUpdateAmount,
  onToggleFavorite,
  onToggleDeleted, // 削除済み切り替え追加
  getAmountMeaning,
  getAmountStyle,
  formatDate,
  getDateCellStyle,
  getSortIcon,
  onManualLoadMore,
  loadMoreRef,
  showDeleted, // 削除済み表示状態追加
  // リスト比較関連のプロパティ追加（複数リスト対応）
  listComparisonMode = "none",
  comparisonListNames = [],
  // マイフォロー除外関連のプロパティ追加
  excludeMyFollow = false,
  myFollowAccountsCount = 0,
}: AccountTableProps) {
  if (accounts.length === 0) {
    return (
      <div className="bg-white rounded-lg md:rounded-xl shadow-md p-6 md:p-8 text-center">
        <div className="text-3xl md:text-4xl mb-3 md:mb-4">
          {listComparisonMode !== "none" ? "🔍" : "📱"}
        </div>
        <p className="text-base md:text-lg text-gray-600 mb-2">
          {listComparisonMode !== "none"
            ? "条件に一致するアカウントはありません"
            : "データが見つかりませんでした"}
        </p>
        <p className="text-xs md:text-sm text-gray-500 mb-4 md:mb-6">
          {listComparisonMode === "intersection" &&
          comparisonListNames.length > 0
            ? `現在のリストと選択された${
                comparisonListNames.length
              }個のリストのいずれかに存在するアカウントはありません${
                excludeMyFollow ? "（マイフォローのアカウントを除外中）" : ""
              }`
            : listComparisonMode === "difference" &&
              comparisonListNames.length > 0
            ? `現在のリストにのみ存在し選択された${comparisonListNames.length}個のリストのいずれにも存在しないアカウントはありません`
            : "データが存在するか確認してください"}
        </p>
      </div>
    );
  }

  // リスト比較モードに応じたヘッダーメッセージを取得（複数リスト対応）
  const getListComparisonHeader = () => {
    if (listComparisonMode === "none" || comparisonListNames.length === 0) {
      return null;
    }

    const listCount = comparisonListNames.length;
    const listsText =
      listCount > 2
        ? `${comparisonListNames.slice(0, 2).join("」「")}...他${
            listCount - 2
          }個`
        : comparisonListNames.join("」「");

    if (listComparisonMode === "intersection") {
      return `📊 共通のアカウント: 現在のリストと「${listsText}」のいずれかに存在するアカウント${
        excludeMyFollow ? "（マイフォローを除外）" : ""
      }`;
    } else if (listComparisonMode === "difference") {
      return `📊 このリストのみのアカウント: 「${listsText}」のいずれにも存在しないアカウント`;
    }

    return null;
  };

  const comparisonHeader = getListComparisonHeader();

  return (
    <>
      {/* リスト比較モードのヘッダー表示（複数リスト対応） */}
      {comparisonHeader && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm p-3 md:p-4">
          <div className="flex items-start">
            <div className="mr-2 md:mr-3">
              <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full">
                {listComparisonMode === "intersection" ? "↔️" : "➖"}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm md:text-base font-semibold text-blue-800 mb-1">
                {comparisonHeader}
              </h3>
              <div className="text-xs md:text-sm text-blue-600">
                <div className="mb-2">
                  <div className="flex items-center mb-1">
                    <div className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300 mr-2"></div>
                    <span>現在のリスト</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-100 border border-green-300 mr-2"></div>
                    <span>比較リスト: {comparisonListNames.length}個選択</span>
                  </div>
                  {/* マイフォロー除外の表示 */}
                  {excludeMyFollow && (
                    <div className="flex items-center mt-1">
                      <div className="w-3 h-3 rounded-full bg-red-100 border border-red-300 mr-2"></div>
                      <span className="text-red-600 font-medium">
                        マイフォローを除外中 ({myFollowAccountsCount}件)
                      </span>
                    </div>
                  )}
                </div>
                {/* 選択されたリストをタグ表示 */}
                {comparisonListNames.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 mb-1">
                      選択されたリスト:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {comparisonListNames.slice(0, 5).map((name, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                        >
                          {name}
                        </span>
                      ))}
                      {comparisonListNames.length > 5 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          +{comparisonListNames.length - 5}個
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* マイフォロー除外専用のヘッダー表示（intersectionモードでマイフォロー除外が有効な場合） */}
      {listComparisonMode === "intersection" && excludeMyFollow && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg shadow-sm p-3 md:p-4">
          <div className="flex items-start">
            <div className="mr-2 md:mr-3">
              <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-red-100 text-red-600 rounded-full">
                🚫
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm md:text-base font-semibold text-red-800 mb-1">
                マイフォローを除外中
              </h3>
              <div className="text-xs md:text-sm text-red-600">
                <p className="mb-2">
                  共通のアカウントから、マイフォローリストに含まれるアカウントを除外して表示しています。
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-100 border border-green-300 mr-2"></div>
                    <span>比較リスト: {comparisonListNames.length}個</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-red-100 border border-red-300 mr-2"></div>
                    <span>
                      除外中: マイフォロー ({myFollowAccountsCount}件)
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300 mr-2"></div>
                    <span>表示中: {accounts.length}件</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Amountの意味説明（モバイル用） */}
      <div className="mb-3 md:hidden bg-white rounded-lg shadow p-3">
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Amountの意味:
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-yellow-100 mr-2"></span>
            <span>-1: 無視してよい</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-blue-100 mr-2"></span>
            <span>0: 未チェック</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-green-100 mr-2"></span>
            <span>1+: チェック済み</span>
          </div>
        </div>
      </div>

      {/* リスト比較モードのバッジ（複数リスト対応） */}
      {listComparisonMode !== "none" && comparisonListNames.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between">
          <div className="flex items-center mb-2 md:mb-0">
            <div
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                excludeMyFollow
                  ? "bg-red-100 text-red-800"
                  : listComparisonMode === "intersection"
                  ? "bg-indigo-100 text-indigo-800"
                  : "bg-amber-100 text-amber-800"
              } mr-2`}
            >
              {listComparisonMode === "intersection" ? (
                <>
                  {excludeMyFollow ? "🚫 " : "↔️ "}
                  共通アカウント表示
                  {excludeMyFollow && "（マイフォロー除外）"}
                </>
              ) : (
                "➖ このリストのみ表示"
              )}
            </div>
            <div className="text-xs text-gray-600">
              {comparisonListNames.length}個のリストと比較中
              {excludeMyFollow && (
                <span className="ml-2 text-red-600">
                  （マイフォロー{myFollowAccountsCount}件を除外）
                </span>
              )}
            </div>
          </div>
          <div className="text-xs text-gray-500">
            表示中: {accounts.length}件
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg md:rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th
                  className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors group"
                  onClick={() => onSort("key")}
                >
                  <div className="flex items-center justify-between">
                    <span className="group-hover:text-blue-600">#</span>
                    <span className="ml-1">{getSortIcon("key")}</span>
                  </div>
                </th>
                <th
                  className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors group"
                  onClick={() => onSort("accountName")}
                >
                  <div className="flex items-center justify-between">
                    <span className="group-hover:text-blue-600">
                      アカウント
                    </span>
                    <span className="ml-1">{getSortIcon("accountName")}</span>
                  </div>
                </th>
                {/* スマホではID列を非表示 */}
                <th
                  className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors group hidden md:table-cell"
                  onClick={() => onSort("accountId")}
                >
                  <div className="flex items-center justify-between">
                    <span className="group-hover:text-blue-600">ID</span>
                    <span className="ml-1">{getSortIcon("accountId")}</span>
                  </div>
                </th>
                <th
                  className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors group"
                  onClick={() => onSort("lastCheckedDate")}
                >
                  <div className="flex items-center justify-between">
                    <span className="group-hover:text-blue-600">最終確認</span>
                    <span className="ml-1">
                      {getSortIcon("lastCheckedDate")}
                    </span>
                  </div>
                </th>
                <th
                  className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors group"
                  onClick={() => onSort("amount")}
                >
                  <div className="flex items-center justify-between">
                    <span className="group-hover:text-blue-600">Amount</span>
                    <span className="ml-1">{getSortIcon("amount")}</span>
                  </div>
                </th>
                <th
                  className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors group"
                  onClick={() => onSort("favorite")}
                >
                  <div className="flex items-center justify-between">
                    <span className="group-hover:text-blue-600">♡</span>
                    <span className="ml-1">{getSortIcon("favorite")}</span>
                  </div>
                </th>
                <th
                  className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors group"
                  onClick={() => onSort("addedDate")}
                >
                  <div className="flex items-center justify-between">
                    <span className="group-hover:text-blue-600">追加日</span>
                    <span className="ml-1">{getSortIcon("addedDate")}</span>
                  </div>
                </th>
                {/* 削除済列追加 */}
                <th
                  className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors group"
                  onClick={() => onSort("deleted")}
                >
                  <div className="flex items-center justify-between">
                    <span className="group-hover:text-blue-600">削除済</span>
                    <span className="ml-1">{getSortIcon("deleted")}</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accounts.map((account, index) => (
                <tr
                  key={`${account.key}-${index}`}
                  className={`transition-colors ${
                    account.deleted
                      ? "hover:bg-gray-400 bg-gray-300 text-gray-500" // 削除済み：グレー背景
                      : listComparisonMode === "intersection"
                      ? excludeMyFollow
                        ? "hover:bg-red-50 bg-red-50/20" // 共通アカウントでマイフォロー除外：薄い赤背景
                        : "hover:bg-blue-50 bg-blue-50/30" // 共通アカウント：ブルー背景
                      : listComparisonMode === "difference"
                      ? "hover:bg-yellow-50 bg-yellow-50/30" // このリストのみ：イエロー背景
                      : "hover:bg-gray-50 "
                  }`}
                >
                  <td className="px-3 md:px-6 py-2 md:py-3 whitespace-nowrap">
                    <div className="font-medium text-gray-900 font-mono text-sm">
                      {account.key}
                    </div>
                  </td>
                  <td className="px-3 md:px-6 py-2 md:py-3">
                    <div>
                      <button
                        onClick={() => onOpenLink(account)}
                        className={`font-medium hover:underline transition-colors text-left text-sm ${
                          account.deleted
                            ? "text-gray-400 hover:text-gray-600"
                            : listComparisonMode === "intersection"
                            ? excludeMyFollow
                              ? "text-red-700 hover:text-red-900"
                              : "text-blue-700 hover:text-blue-900"
                            : listComparisonMode === "difference"
                            ? "text-amber-700 hover:text-amber-900"
                            : "text-blue-600 hover:text-blue-800"
                        }`}
                        title="TikTokで開く"
                        disabled={account.deleted}
                      >
                        {account.accountName}
                      </button>
                      {/* スマホのみ：アカウント名の下に小さくIDを表示 */}
                      <div className="md:hidden mt-1">
                        <div className="text-xs text-gray-500 font-mono truncate">
                          {account.accountId}
                        </div>
                      </div>
                    </div>
                  </td>
                  {/* スマホではID列を非表示 */}
                  <td className="px-3 md:px-6 py-2 md:py-3 whitespace-nowrap hidden md:table-cell">
                    <div
                      className={`font-mono text-sm ${
                        account.deleted ? "text-gray-400" : "text-gray-700"
                      }`}
                    >
                      {account.accountId}
                    </div>
                  </td>
                  <td className={getDateCellStyle(account.lastCheckedDate)}>
                    <div className="text-gray-700 text-sm">
                      {formatDate(account.lastCheckedDate)}
                    </div>
                  </td>
                  <td className="px-3 md:px-6 py-2 md:py-3 whitespace-nowrap">
                    <div className="flex items-center space-x-1 md:space-x-3">
                      <button
                        onClick={() => onUpdateAmount(account.key, -1)}
                        className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="減らす"
                        disabled={
                          parseInt(account.amount) <= -1 || account.deleted
                        }
                        title="減らす"
                      >
                        -
                      </button>
                      <div className="relative group">
                        <span
                          className={`font-semibold text-sm md:text-lg min-w-8 md:min-w-12 text-center px-2 py-1 rounded ${getAmountStyle(
                            account.amount || "0"
                          )} ${account.deleted ? "opacity-50" : ""}`}
                        >
                          {account.amount || "0"}
                        </span>
                        <div className="absolute z-10 invisible group-hover:visible bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap">
                          {getAmountMeaning(account.amount || "0")}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                        </div>
                      </div>
                      <button
                        onClick={() => onUpdateAmount(account.key, 1)}
                        className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="増やす"
                        title="増やす"
                        disabled={account.deleted}
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="px-3 md:px-6 py-2 md:py-3 whitespace-nowrap">
                    <button
                      onClick={() => onToggleFavorite(account.key)}
                      className={`text-2xl transition-all hover:scale-110 ${
                        account.deleted
                          ? "text-gray-300 cursor-not-allowed"
                          : account.favorite
                          ? "text-red-500 hover:text-red-700"
                          : "text-gray-300 hover:text-red-400"
                      }`}
                      title={
                        account.deleted
                          ? "削除済み"
                          : account.favorite
                          ? "お気に入りを解除"
                          : "お気に入りに追加"
                      }
                      disabled={account.deleted}
                    >
                      {account.favorite ? "♥" : "♡"}
                    </button>
                  </td>
                  <td className="px-3 md:px-6 py-2 md:py-3 whitespace-nowrap">
                    <div className="text-gray-500 text-sm">
                      {formatDate(account.addedDate)}
                    </div>
                  </td>
                  {/* 削除済みセル追加 */}
                  <td className="px-3 md:px-6 py-2 md:py-3 whitespace-nowrap">
                    <button
                      onClick={() => onToggleDeleted(account.key)}
                      className={`text-lg transition-all hover:scale-110 ${
                        account.deleted
                          ? "text-red-500 hover:text-red-700"
                          : "text-gray-300 hover:text-gray-500"
                      }`}
                      title={
                        account.deleted ? "削除済みを解除" : "削除済みに設定"
                      }
                    >
                      {account.deleted ? "🗑️" : "📁"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* リスト比較モードのフィルター情報（複数リスト対応） */}
      {listComparisonMode !== "none" &&
        comparisonListNames.length > 0 &&
        accounts.length > 0 && (
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">表示中のアカウント:</span>
                  <span className="ml-2">
                    {accounts.length}件
                    {listComparisonMode === "intersection" && (
                      <span
                        className={`ml-2 ${
                          excludeMyFollow ? "text-red-600" : "text-blue-600"
                        }`}
                      >
                        ({comparisonListNames.length}
                        個のリストとの共通アカウント
                        {excludeMyFollow && `、マイフォロー除外`})
                      </span>
                    )}
                    {listComparisonMode === "difference" && (
                      <span className="ml-2 text-amber-600">
                        ({comparisonListNames.length}個のリストと比較)
                      </span>
                    )}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  比較対象リスト: {comparisonListNames.length}個
                  {excludeMyFollow && (
                    <span className="ml-2 text-red-600">
                      （マイフォロー{myFollowAccountsCount}件を除外）
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">
                  <span className="font-medium">比較リスト:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {comparisonListNames.map((name, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      {/* 読み込み中の表示 */}
      {loadingMore && (
        <div className="mt-4 md:mt-6 text-center">
          <div className="inline-flex items-center justify-center space-x-2 md:space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-blue-600"></div>
            <div className="text-sm md:text-base text-gray-600">
              読み込み中...
            </div>
          </div>
        </div>
      )}

      {/* スクロール用のトリガー要素 */}
      {hasMore && !loadingMore && (
        <div className="mt-4 md:mt-6 space-y-3 md:space-y-4">
          <div
            ref={loadMoreRef}
            className="h-12 md:h-20 flex items-center justify-center"
          >
            <div className="text-center">
              <div className="animate-bounce text-xl md:text-2xl text-blue-500">
                ↓
              </div>
              <p className="mt-1 md:mt-2 text-xs md:text-sm text-gray-500">
                スクロールしてさらに読み込む
              </p>
            </div>
          </div>
          {onManualLoadMore && (
            <div className="text-center">
              <button
                onClick={onManualLoadMore}
                className="px-3 md:px-4 py-1 md:py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs md:text-sm"
              >
                クリックして次の10件を読み込む
              </button>
            </div>
          )}
        </div>
      )}

      {/* 全件表示完了のメッセージ（複数リスト対応） */}
      {!hasMore && accounts.length > 0 && (
        <div className="mt-4 md:mt-6 text-center">
          <div
            className={`inline-flex items-center px-3 md:px-4 py-1 md:py-2 rounded-full ${
              listComparisonMode === "intersection"
                ? excludeMyFollow
                  ? "bg-red-50 text-red-700"
                  : "bg-blue-50 text-blue-700"
                : listComparisonMode === "difference"
                ? "bg-amber-50 text-amber-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            <svg
              className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm md:text-base font-medium">
              {listComparisonMode === "intersection"
                ? `共通アカウントのすべてのデータを表示しました${
                    excludeMyFollow ? "（マイフォローを除外）" : ""
                  } (${comparisonListNames.length}個のリスト比較)`
                : listComparisonMode === "difference"
                ? `このリストのみのアカウントのすべてのデータを表示しました (${comparisonListNames.length}個のリスト比較)`
                : "すべてのデータを表示しました"}
            </span>
          </div>
        </div>
      )}

      <div className="mt-6 md:mt-8 text-xs md:text-sm text-gray-500 space-y-2">
        {/* リスト比較モードの説明（複数リスト対応） */}
        {listComparisonMode !== "none" && comparisonListNames.length > 0 && (
          <div
            className={`border rounded-lg p-3 mb-2 ${
              excludeMyFollow
                ? "bg-red-50 border-red-100"
                : "bg-indigo-50 border-indigo-100"
            }`}
          >
            <div className="flex items-start">
              <div className="mr-2">
                <div
                  className={`w-6 h-6 flex items-center justify-center ${
                    excludeMyFollow
                      ? "bg-red-100 text-red-600"
                      : "bg-indigo-100 text-indigo-600"
                  } rounded-full`}
                >
                  {excludeMyFollow ? "🚫" : "ℹ️"}
                </div>
              </div>
              <div className="flex-1">
                <p
                  className={`font-medium mb-1 ${
                    excludeMyFollow ? "text-red-800" : "text-indigo-800"
                  }`}
                >
                  {listComparisonMode === "intersection"
                    ? excludeMyFollow
                      ? "共通アカウント表示モード（マイフォロー除外）"
                      : "共通アカウント表示モード"
                    : "このリストのみ表示モード"}
                  <span
                    className={`ml-2 text-xs ${
                      excludeMyFollow
                        ? "bg-red-100 text-red-800"
                        : "bg-indigo-100 text-indigo-800"
                    } px-2 py-0.5 rounded-full`}
                  >
                    {comparisonListNames.length}個のリスト比較中
                    {excludeMyFollow &&
                      `、マイフォロー${myFollowAccountsCount}件除外`}
                  </span>
                </p>
                <p
                  className={
                    excludeMyFollow
                      ? "text-red-600 mb-2"
                      : "text-indigo-600 mb-2"
                  }
                >
                  {listComparisonMode === "intersection"
                    ? `現在のリストと選択された${
                        comparisonListNames.length
                      }個のリストのいずれかに存在するアカウントを表示しています${
                        excludeMyFollow
                          ? "（マイフォローリストに含まれるアカウントは除外）"
                          : ""
                      }`
                    : `現在のリストにのみ存在し、選択された${comparisonListNames.length}個のリストのいずれにも存在しないアカウントを表示しています`}
                </p>
                <div className="mt-2">
                  <div className="text-xs text-gray-600 mb-1">比較リスト:</div>
                  <div className="flex flex-wrap gap-1">
                    {comparisonListNames.map((name, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-100 rounded-full mr-2"></div>
            <span>-1: 無視してよいアカウント</span>
          </div>
          <div className="flex items-center ml-4">
            <div className="w-3 h-3 bg-blue-100 rounded-full mr-2"></div>
            <span>0: 通常アカウント（未チェック）</span>
          </div>
          <div className="flex items-center ml-4">
            <div className="w-3 h-3 bg-green-100 rounded-full mr-2"></div>
            <span>1+: チェック済み</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-2">
          <p>※ アカウント名をクリックするとTikTokのページが開きます</p>
          <p>※ ヘッダーをクリックすると並び替えができます</p>
          <p>※ TikTokリンクを開くと最終確認日が更新されます</p>
          <p>※ Amountボタンで-1から調整可能（ホバーで意味表示）</p>
          <p>※ ♡をクリックでお気に入りに追加/解除できます</p>
          <p>※ 🗑️をクリックで削除済みに設定/解除できます</p>
        </div>
      </div>
    </>
  );
}
