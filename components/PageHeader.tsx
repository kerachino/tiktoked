// components/PageHeader.tsx
import { AccountList } from "@/types/tiktok";

interface PageHeaderProps {
  currentList: AccountList | undefined;
  accountLists: AccountList[];
  currentListId: string;
  sortedAccountsLength: number;
  displayedAccountsLength: number;
  hasMore: boolean;
  sortField: string;
  sortOrder: string;
  showFavoritesOnly: boolean;
  showDeleted: boolean;
  onSwitchList: (listId: string) => void;
  onShowListManager: () => void;
  onShowAddModal: () => void;
  onShowBulkAddModal: () => void;
  onToggleFavoritesOnly: () => void;
  onToggleShowDeleted: () => void;
  getSortFieldName: (field: string) => string;
}

export default function PageHeader({
  currentList,
  accountLists,
  currentListId,
  sortedAccountsLength,
  displayedAccountsLength,
  hasMore,
  sortField,
  sortOrder,
  showFavoritesOnly,
  showDeleted,
  onSwitchList,
  onShowListManager,
  onShowAddModal,
  onShowBulkAddModal,
  onToggleFavoritesOnly,
  onToggleShowDeleted,
  getSortFieldName,
}: PageHeaderProps) {
  return (
    <header className="mb-6 md:mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          TikTokアカウント管理
          {currentList && (
            <span className="ml-2 text-lg md:text-xl text-blue-600">
              - {currentList.name}
            </span>
          )}
        </h1>

        {/* リスト選択ドロップダウン */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <select
              value={currentListId}
              onChange={(e) => onSwitchList(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              {accountLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name} ({list.accountCount}件)
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg
                className="fill-current h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>

          <button
            onClick={onShowListManager}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center text-sm"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            リスト追加
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 md:gap-4">
        <p className="text-sm md:text-base text-gray-600">
          全{sortedAccountsLength}件のアカウント（
          {displayedAccountsLength}件表示中）
        </p>
        <div className="text-xs md:text-sm bg-blue-100 text-blue-800 px-2 md:px-3 py-1 rounded-full">
          ソート: {getSortFieldName(sortField)} (
          {sortOrder === "asc" ? "昇順" : "降順"})
        </div>
        <div className="text-xs md:text-sm bg-green-100 text-green-800 px-2 md:px-3 py-1 rounded-full">
          ページ:{" "}
          {displayedAccountsLength > 0
            ? Math.ceil(displayedAccountsLength / 10)
            : 0}
          /{Math.ceil(sortedAccountsLength / 10) || 1}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onShowAddModal}
            className="text-xs md:text-sm bg-blue-600 text-white px-2 md:px-3 py-1 rounded-full hover:bg-blue-700 transition-colors flex items-center"
          >
            <svg
              className="w-3 h-3 md:w-4 md:h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            追加
          </button>
          <button
            onClick={onShowBulkAddModal}
            className="text-xs md:text-sm bg-purple-600 text-white px-2 md:px-3 py-1 rounded-full hover:bg-purple-700 transition-colors flex items-center"
          >
            <svg
              className="w-3 h-3 md:w-4 md:h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            一括
          </button>
          <button
            onClick={onToggleFavoritesOnly}
            className={`text-xs md:text-sm px-2 md:px-3 py-1 rounded-full transition-colors flex items-center ${
              showFavoritesOnly
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {showFavoritesOnly ? (
              <>
                <svg
                  className="w-3 h-3 md:w-4 md:h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                    clipRule="evenodd"
                  />
                </svg>
                お気に入り解除
              </>
            ) : (
              <>
                <svg
                  className="w-3 h-3 md:w-4 md:h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                お気に入りのみ
              </>
            )}
          </button>
          <button
            onClick={onToggleShowDeleted}
            className={`text-xs md:text-sm px-2 md:px-3 py-1 rounded-full transition-colors flex items-center ${
              showDeleted
                ? "bg-gray-600 text-white hover:bg-gray-700"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {showDeleted ? (
              <>
                <svg
                  className="w-3 h-3 md:w-4 md:h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                削除済非表示
              </>
            ) : (
              <>
                <svg
                  className="w-3 h-3 md:w-4 md:h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                  />
                </svg>
                削除済表示
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
