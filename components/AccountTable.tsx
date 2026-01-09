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
  getAmountMeaning: (amount: string) => string;
  getAmountStyle: (amount: string) => string;
  formatDate: (dateString: string) => string;
  getDateCellStyle: (dateString: string) => string;
  getSortIcon: (field: SortField) => string;
  onManualLoadMore?: () => void;
  loadMoreRef?: React.RefObject<HTMLDivElement | null>;
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
  getAmountMeaning,
  getAmountStyle,
  formatDate,
  getDateCellStyle,
  getSortIcon,
  onManualLoadMore,
  loadMoreRef,
}: AccountTableProps) {
  if (accounts.length === 0) {
    return (
      <div className="bg-white rounded-lg md:rounded-xl shadow-md p-6 md:p-8 text-center">
        <div className="text-3xl md:text-4xl mb-3 md:mb-4">📱</div>
        <p className="text-base md:text-lg text-gray-600 mb-2">
          データが見つかりませんでした
        </p>
        <p className="text-xs md:text-sm text-gray-500 mb-4 md:mb-6">
          データが存在するか確認してください
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Amountの意味説明（モバイル用） */}
      <div className="mb-3 md:hidden bg-white rounded-lg shadow p-3">
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Amountの意味:
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-gray-100 mr-2"></span>
            <span>-2: 削除済み</span>
          </div>
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
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accounts.map((account, index) => (
                <tr
                  key={`${account.key}-${index}`}
                  className="hover:bg-gray-50 transition-colors"
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
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors text-left text-sm"
                        title="TikTokで開く"
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
                    <div className="text-gray-700 font-mono text-sm">
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
                        disabled={parseInt(account.amount) <= -2}
                        title="減らす"
                      >
                        -
                      </button>
                      <div className="relative group">
                        <span
                          className={`font-semibold text-sm md:text-lg min-w-8 md:min-w-12 text-center px-2 py-1 rounded ${getAmountStyle(
                            account.amount || "0"
                          )}`}
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
                        className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors"
                        aria-label="増やす"
                        title="増やす"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="px-3 md:px-6 py-2 md:py-3 whitespace-nowrap">
                    <button
                      onClick={() => onToggleFavorite(account.key)}
                      className={`text-2xl transition-all hover:scale-110 ${
                        account.favorite
                          ? "text-red-500 hover:text-red-700"
                          : "text-gray-300 hover:text-red-400"
                      }`}
                      title={
                        account.favorite
                          ? "お気に入りを解除"
                          : "お気に入りに追加"
                      }
                    >
                      {account.favorite ? "♥" : "♡"}
                    </button>
                  </td>
                  <td className="px-3 md:px-6 py-2 md:py-3 whitespace-nowrap">
                    <div className="text-gray-500 text-sm">
                      {formatDate(account.addedDate)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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

      {/* 全件表示完了のメッセージ */}
      {!hasMore && accounts.length > 0 && (
        <div className="mt-4 md:mt-6 text-center">
          <div className="inline-flex items-center px-3 md:px-4 py-1 md:py-2 bg-green-50 text-green-700 rounded-full">
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
              すべてのデータを表示しました
            </span>
          </div>
        </div>
      )}

      <div className="mt-6 md:mt-8 text-xs md:text-sm text-gray-500 space-y-2">
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-100 rounded-full mr-2"></div>
            <span>-2: 削除済みアカウント</span>
          </div>
          <div className="flex items-center ml-4">
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
          <p>※ Amountボタンで-2から調整可能（ホバーで意味表示）</p>
          <p>※ ♡をクリックでお気に入りに追加/解除できます</p>
        </div>
      </div>
    </>
  );
}
