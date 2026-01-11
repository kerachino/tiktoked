// components/SearchFilterSection.tsx
interface SearchFilterSectionProps {
  searchInput: string;
  setSearchInput: (value: string) => void;
  searchQuery: string;
  searchType: "accountName" | "accountId";
  setSearchType: (type: "accountName" | "accountId") => void;
  dateFilterInput: {
    startDate: string;
    endDate: string;
    enabled: boolean;
  };
  setDateFilterInput: (
    filter: (prev: {
      startDate: string;
      endDate: string;
      enabled: boolean;
    }) => {
      startDate: string;
      endDate: string;
      enabled: boolean;
    }
  ) => void;
  handleSearchButtonClick: () => void;
  resetFilters: () => void;
  sortedAccountsLength: number;
  handleDateFilterInputChange: (
    field: "startDate" | "endDate" | "enabled",
    value: any
  ) => void;
  dateFilter: {
    startDate: string;
    endDate: string;
    enabled: boolean;
  };
}

export default function SearchFilterSection({
  searchInput,
  setSearchInput,
  searchQuery,
  searchType,
  setSearchType,
  dateFilterInput,
  setDateFilterInput,
  handleSearchButtonClick,
  resetFilters,
  sortedAccountsLength,
  handleDateFilterInputChange,
  dateFilter,
}: SearchFilterSectionProps) {
  return (
    <div className="mb-4 md:mb-6 bg-white rounded-lg md:rounded-xl shadow-md p-3 md:p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {/* 検索バー */}
        <div className="space-y-1 md:space-y-2">
          <label className="block text-xs md:text-sm font-medium text-gray-700">
            検索
          </label>
          <div className="flex space-x-1 md:space-x-2">
            <div className="flex border rounded-lg overflow-hidden">
              <button
                onClick={() => setSearchType("accountName")}
                className={`px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm ${
                  searchType === "accountName"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                名前
              </button>
              <button
                onClick={() => setSearchType("accountId")}
                className={`px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm ${
                  searchType === "accountId"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                ID
              </button>
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={`${
                searchType === "accountName" ? "名前" : "ID"
              }で検索...`}
              className="flex-1 px-3 md:px-4 py-1 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        {/* 日付フィルター */}
        <div className="space-y-1 md:space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs md:text-sm font-medium text-gray-700">
              追加日絞り込み
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={dateFilterInput.enabled}
                onChange={(e) =>
                  handleDateFilterInputChange("enabled", e.target.checked)
                }
                className="h-3 w-3 md:h-4 md:w-4 text-blue-600 rounded"
              />
              <span className="ml-1 md:ml-2 text-xs md:text-sm text-gray-600">
                有効
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1 md:gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">開始日</label>
              <input
                type="date"
                value={dateFilterInput.startDate}
                onChange={(e) =>
                  handleDateFilterInputChange("startDate", e.target.value)
                }
                disabled={!dateFilterInput.enabled}
                className="w-full px-2 md:px-3 py-1 md:py-2 border border-gray-300 rounded-lg text-xs md:text-sm disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">終了日</label>
              <input
                type="date"
                value={dateFilterInput.endDate}
                onChange={(e) =>
                  handleDateFilterInputChange("endDate", e.target.value)
                }
                disabled={!dateFilterInput.enabled}
                className="w-full px-2 md:px-3 py-1 md:py-2 border border-gray-300 rounded-lg text-xs md:text-sm disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex items-end space-x-1 md:space-x-2">
          <button
            onClick={handleSearchButtonClick}
            className="px-3 md:px-6 py-2 md:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm md:text-base"
          >
            検索
          </button>
          <button
            onClick={resetFilters}
            className="px-2 md:px-4 py-1 md:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-xs md:text-sm"
          >
            フィルターリセット
          </button>
          {(searchQuery || dateFilter.enabled) && (
            <div className="text-xs md:text-sm text-gray-600">
              {sortedAccountsLength}件
            </div>
          )}
        </div>
      </div>

      {/* 現在の検索条件表示 */}
      {(searchQuery || dateFilter.enabled) && (
        <div className="mt-3 p-2 md:p-3 bg-gray-50 rounded-lg">
          <p className="text-xs md:text-sm text-gray-700 font-medium mb-1">
            現在の検索条件:
          </p>
          <div className="flex flex-wrap gap-2">
            {searchQuery && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                {searchType === "accountName" ? "名前" : "ID"}: {searchQuery}
              </span>
            )}
            {dateFilter.enabled && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                追加日絞り込み:
                {dateFilter.startDate && ` ${dateFilter.startDate}`}
                {dateFilter.endDate && ` 〜 ${dateFilter.endDate}`}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
