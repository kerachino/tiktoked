"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { ref, get, update, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { TikTokAccount, SortField, SortOrder } from "@/types/tiktok";

// デバッグ用のログ関数
const debugLog = (...args: any[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log("[DEBUG]", ...args);
  }
};

export default function Home() {
  const [allAccounts, setAllAccounts] = useState<TikTokAccount[]>([]);
  const [displayedAccounts, setDisplayedAccounts] = useState<TikTokAccount[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [sortField, setSortField] = useState<SortField>("key");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"accountName" | "accountId">(
    "accountName"
  );
  const [dateFilter, setDateFilter] = useState<{
    startDate: string;
    endDate: string;
    enabled: boolean;
  }>({
    startDate: "",
    endDate: "",
    enabled: false,
  });

  // アカウント追加モーダル状態
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccount, setNewAccount] = useState({
    accountName: "",
    accountId: "",
    amount: "0",
  });
  const [addingAccount, setAddingAccount] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Firebaseクエリの制限（1ページあたりの件数）
  const PAGE_SIZE = 10;

  // 全データを取得
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setHasMore(true);
      setPage(1);

      debugLog(`全データ取得開始`);

      // 全データを取得
      const accountsRef = ref(db, "__collections__/myfollow");
      const snapshot = await get(accountsRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        const accounts: TikTokAccount[] = [];

        // オブジェクトから配列に変換
        Object.keys(data).forEach((key) => {
          const account = data[key];
          if (account && typeof account === "object") {
            accounts.push({
              key: key,
              accountName: account.AccountName || account.accountName || "",
              accountId: account.AccountID || account.accountId || "",
              lastCheckedDate:
                account.LastCheckedDate || account.lastCheckedDate || "",
              amount: account.Amount || account.amount || "",
              addedDate: account.AddedDate || account.addedDate || "",
            });
          }
        });

        debugLog(`全データ取得完了: ${accounts.length}件`);
        setAllAccounts(accounts);
        setHasMore(accounts.length > PAGE_SIZE);
      } else {
        debugLog(`データがありません`);
        setAllAccounts([]);
        setDisplayedAccounts([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error("データ取得エラー:", error);
      setError(
        `データ取得エラー: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      setAllAccounts([]);
      setDisplayedAccounts([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // フィルタリングされたアカウントを計算
  const filteredAccounts = useMemo(() => {
    if (allAccounts.length === 0) return [];

    let filtered = [...allAccounts];

    // 検索クエリでフィルタリング
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((account) => {
        if (searchType === "accountName") {
          return account.accountName.toLowerCase().includes(query);
        } else {
          return account.accountId.toLowerCase().includes(query);
        }
      });
    }

    // 日付範囲でフィルタリング
    if (dateFilter.enabled && (dateFilter.startDate || dateFilter.endDate)) {
      filtered = filtered.filter((account) => {
        if (!account.addedDate || account.addedDate.trim() === "") return false;

        try {
          const accountDate = new Date(account.addedDate);
          if (isNaN(accountDate.getTime())) return false;

          const accountTime = accountDate.getTime();

          if (dateFilter.startDate) {
            const startDate = new Date(dateFilter.startDate);
            startDate.setHours(0, 0, 0, 0);
            if (accountTime < startDate.getTime()) return false;
          }

          if (dateFilter.endDate) {
            const endDate = new Date(dateFilter.endDate);
            endDate.setHours(23, 59, 59, 999);
            if (accountTime > endDate.getTime()) return false;
          }

          return true;
        } catch {
          return false;
        }
      });
    }

    debugLog(
      `フィルタリング完了: ${filtered.length}件（検索: "${searchQuery}", 日付絞り込み: ${dateFilter.enabled})`
    );
    return filtered;
  }, [allAccounts, searchQuery, searchType, dateFilter]);

  // ソートされたアカウントを計算
  const sortedAccounts = useMemo(() => {
    if (filteredAccounts.length === 0) return [];

    debugLog(
      `ソート処理開始: ${sortField} ${sortOrder}, ${filteredAccounts.length}件`
    );

    const sorted = [...filteredAccounts].sort((a, b) => {
      let valueA: any = a[sortField];
      let valueB: any = b[sortField];

      // キーの場合は数値として比較
      if (sortField === "key") {
        valueA = parseInt(valueA) || 0;
        valueB = parseInt(valueB) || 0;
      }

      // 日付の場合はDateオブジェクトに変換
      if (sortField === "lastCheckedDate" || sortField === "addedDate") {
        valueA = valueA ? new Date(valueA).getTime() : 0;
        valueB = valueB ? new Date(valueB).getTime() : 0;
      }

      // Amountの場合は数値に変換
      if (sortField === "amount") {
        valueA = valueA ? parseInt(valueA) : 0;
        valueB = valueB ? parseInt(valueB) : 0;
      }

      // 文字列比較（日本語対応）
      if (typeof valueA === "string" && typeof valueB === "string") {
        if (sortOrder === "asc") {
          return valueA.localeCompare(valueB, "ja");
        } else {
          return valueB.localeCompare(valueA, "ja");
        }
      }

      // 数値比較
      if (sortOrder === "asc") {
        return (valueA || 0) - (valueB || 0);
      } else {
        return (valueB || 0) - (valueA || 0);
      }
    });

    debugLog(`ソート処理完了: ${sorted.length}件`);
    return sorted;
  }, [filteredAccounts, sortField, sortOrder]);

  // 表示するアカウントを計算（ページネーション）
  const currentDisplayedAccounts = useMemo(() => {
    if (sortedAccounts.length === 0) return [];

    const endIndex = page * PAGE_SIZE;
    const displayed = sortedAccounts.slice(0, endIndex);

    debugLog(
      `表示アカウント計算: ページ${page}, ${displayed.length}/${sortedAccounts.length}件`
    );

    // さらに読み込めるかどうかを更新
    const hasMoreItems = sortedAccounts.length > endIndex;
    if (hasMore !== hasMoreItems) {
      setHasMore(hasMoreItems);
    }

    return displayed;
  }, [sortedAccounts, page, hasMore]);

  // 次のページを読み込む
  const loadNextPage = useCallback(() => {
    if (loadingMore || !hasMore) {
      debugLog(
        `loadNextPage スキップ: loadingMore=${loadingMore}, hasMore=${hasMore}`
      );
      return;
    }

    debugLog(`次のページ読み込み開始: 現在ページ${page}`);
    setLoadingMore(true);

    // 次のページを設定
    const nextPage = page + 1;
    setTimeout(() => {
      setPage(nextPage);
      setLoadingMore(false);
      debugLog(`次のページ読み込み完了: ページ${nextPage}`);
    }, 300);
  }, [loadingMore, hasMore, page]);

  // ソートハンドラー
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // 同じフィールドの場合は昇順/降順を切り替え
      const newOrder = sortOrder === "asc" ? "desc" : "asc";
      setSortOrder(newOrder);
      debugLog(`ソート切り替え: ${field} ${newOrder}`);
    } else {
      // 異なるフィールドの場合は昇順で設定
      setSortField(field);
      setSortOrder("asc");
      debugLog(`ソート変更: ${field} asc`);
    }
    // ソート変更時は1ページ目に戻る
    setPage(1);
  };

  // ソートアイコンの取得
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return "↕️";
    }
    return sortOrder === "asc" ? "↑" : "↓";
  };

  // 検索処理
  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setPage(1); // 検索時は1ページ目に戻る
  }, []);

  // 検索タイプ切り替え
  const handleSearchTypeChange = (type: "accountName" | "accountId") => {
    setSearchType(type);
    setPage(1); // 切り替え時は1ページ目に戻る
  };

  // 日付フィルター変更
  const handleDateFilterChange = (
    field: "startDate" | "endDate" | "enabled",
    value: any
  ) => {
    setDateFilter((prev) => ({
      ...prev,
      [field]: value,
    }));
    setPage(1); // フィルター変更時は1ページ目に戻る
  };

  // 日付フィルターリセット
  const resetDateFilter = () => {
    setDateFilter({
      startDate: "",
      endDate: "",
      enabled: false,
    });
    setPage(1);
  };

  // 無限スクロールの設定 - IntersectionObserverの初期化
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) {
      debugLog(`IntersectionObserver 設定スキップ: hasMore=${hasMore}`);
      return;
    }

    debugLog(`IntersectionObserver 設定開始`);

    const options = {
      root: null, // ビューポートをルートとして使用
      rootMargin: "100px", // 100px手前で検出
      threshold: 0.1, // 10%表示された時点で検出
    };

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      debugLog(
        `IntersectionObserver 検出: isIntersecting=${entry.isIntersecting}, hasMore=${hasMore}, loadingMore=${loadingMore}`
      );

      if (entry.isIntersecting && hasMore && !loadingMore) {
        debugLog("スクロール検出、次のページを読み込みます");
        loadNextPage();
      }
    }, options);

    observer.observe(loadMoreRef.current);
    observerRef.current = observer;

    return () => {
      debugLog(`IntersectionObserver クリーンアップ`);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore, loadNextPage]);

  // 初期データ読み込み
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ソートやページ変更時に表示データを更新
  useEffect(() => {
    debugLog(`表示データ更新: ${currentDisplayedAccounts.length}件`);
    setDisplayedAccounts(currentDisplayedAccounts);
  }, [currentDisplayedAccounts]);

  // 手動で次のページを読み込むボタンのハンドラー
  const handleManualLoadMore = () => {
    debugLog(`手動で次のページを読み込み`);
    loadNextPage();
  };

  // TikTokリンクを開き、最終確認日を更新
  const handleOpenLink = async (account: TikTokAccount) => {
    // TikTokリンクを開く
    window.open(`https://www.tiktok.com/@${account.accountId}`, "_blank");

    // 今日の日付をYYYY/MM/DD形式で取得
    const today = new Date();
    const formattedDate = `${today.getFullYear()}/${(today.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${today.getDate().toString().padStart(2, "0")}`;

    try {
      // Firebase Realtime Databaseを更新
      const accountRef = ref(db, `__collections__/myfollow/${account.key}`);
      await update(accountRef, {
        LastCheckedDate: formattedDate,
      });

      // ローカル状態を即時更新
      setAllAccounts((prevAccounts) =>
        prevAccounts.map((acc) =>
          acc.key === account.key
            ? { ...acc, lastCheckedDate: formattedDate }
            : acc
        )
      );

      debugLog(
        `${account.accountName}の最終確認日を更新しました: ${formattedDate}`
      );
    } catch (error) {
      console.error("更新エラー:", error);
      alert("更新に失敗しました。コンソールを確認してください。");
    }
  };

  // Amountを増減（最終確認日も更新）
  const updateAmount = async (accountKey: string, delta: number) => {
    try {
      const account = allAccounts.find((acc) => acc.key === accountKey);
      if (!account) return;

      // 現在のAmountを数値に変換（空の場合は0）
      const currentAmount =
        account.amount && account.amount !== "" ? parseInt(account.amount) : 0;
      const newAmount = Math.max(0, currentAmount + delta);

      // 今日の日付をYYYY/MM/DD形式で取得
      const today = new Date();
      const formattedDate = `${today.getFullYear()}/${(today.getMonth() + 1)
        .toString()
        .padStart(2, "0")}/${today.getDate().toString().padStart(2, "0")}`;

      const accountRef = ref(db, `__collections__/myfollow/${accountKey}`);

      // Amountと最終確認日を同時に更新
      await update(accountRef, {
        Amount: newAmount.toString(),
        LastCheckedDate: formattedDate,
      });

      // ローカル状態を即時更新
      setAllAccounts((prevAccounts) =>
        prevAccounts.map((acc) =>
          acc.key === accountKey
            ? {
                ...acc,
                amount: newAmount.toString(),
                lastCheckedDate: formattedDate,
              }
            : acc
        )
      );

      debugLog(`Amountを更新しました: ${newAmount}, 最終確認日も更新`);
    } catch (error) {
      console.error("Amount更新エラー:", error);
      alert("Amountの更新に失敗しました。");
    }
  };

  // アカウント追加処理
  const handleAddAccount = async () => {
    if (!newAccount.accountName.trim() || !newAccount.accountId.trim()) {
      alert("アカウント名とIDは必須です");
      return;
    }

    try {
      setAddingAccount(true);

      // 新しいキーを生成（既存の最大キー + 1）
      const maxKey = allAccounts.reduce((max, acc) => {
        const keyNum = parseInt(acc.key) || 0;
        return keyNum > max ? keyNum : max;
      }, 0);

      const newKey = (maxKey + 1).toString();

      // 今日の日付をYYYY/MM/DD形式で取得
      const today = new Date();
      const formattedDate = `${today.getFullYear()}/${(today.getMonth() + 1)
        .toString()
        .padStart(2, "0")}/${today.getDate().toString().padStart(2, "0")}`;

      // 新しいアカウントデータ
      const accountData = {
        AccountName: newAccount.accountName.trim(),
        AccountID: newAccount.accountId.trim(),
        Amount: newAccount.amount || "0",
        LastCheckedDate: formattedDate,
        AddedDate: formattedDate,
      };

      // Firebaseに追加
      const accountRef = ref(db, `__collections__/myfollow/${newKey}`);
      await set(accountRef, accountData);

      // ローカル状態に追加
      const newAccountObj: TikTokAccount = {
        key: newKey,
        accountName: newAccount.accountName.trim(),
        accountId: newAccount.accountId.trim(),
        amount: newAccount.amount || "0",
        lastCheckedDate: formattedDate,
        addedDate: formattedDate,
      };

      setAllAccounts((prev) => [...prev, newAccountObj]);

      // モーダルを閉じてフォームをリセット
      setShowAddModal(false);
      setNewAccount({
        accountName: "",
        accountId: "",
        amount: "0",
      });

      alert("アカウントを追加しました");
    } catch (error) {
      console.error("アカウント追加エラー:", error);
      alert("アカウントの追加に失敗しました。");
    } finally {
      setAddingAccount(false);
    }
  };

  // 日付のフォーマット
  const formatDate = (dateString: string) => {
    if (!dateString || dateString.trim() === "") return "未確認";

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      return `${date.getFullYear()}/${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}`;
    } catch {
      return dateString;
    }
  };

  // 未確認の日付を強調表示するスタイル
  const getDateCellStyle = (dateString: string) => {
    if (!dateString || dateString.trim() === "") {
      return "px-6 py-4 whitespace-nowrap bg-yellow-50";
    }

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "px-6 py-4 whitespace-nowrap bg-yellow-50";
      }

      const today = new Date();
      const diffTime = today.getTime() - date.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 30) {
        return "px-6 py-4 whitespace-nowrap bg-red-50";
      } else if (diffDays > 7) {
        return "px-6 py-4 whitespace-nowrap bg-orange-50";
      }
    } catch {
      // 日付パースエラー時はデフォルトスタイル
    }

    return "px-6 py-4 whitespace-nowrap";
  };

  // 検索とフィルターのリセット
  const resetFilters = () => {
    setSearchQuery("");
    resetDateFilter();
    setPage(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-xl">データを読み込み中...</div>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(sortedAccounts.length / PAGE_SIZE);
  const currentPage = Math.min(page, totalPages);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8" ref={containerRef}>
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            TikTokアカウント管理
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <p className="text-gray-600">
              全{sortedAccounts.length}件のアカウント（
              {displayedAccounts.length}件表示中）
              {hasMore && `（さらに読み込み可能）`}
            </p>
            <div className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
              ソート: {getSortFieldName(sortField)} (
              {sortOrder === "asc" ? "昇順" : "降順"})
            </div>
            <div className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">
              ページ: {currentPage}/{totalPages}
            </div>
            <button
              onClick={fetchAllData}
              className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors"
            >
              データ更新
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-sm bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-700 transition-colors flex items-center"
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
              アカウント追加
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 font-semibold">エラー: {error}</p>
              <button
                onClick={fetchAllData}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                再読み込み
              </button>
            </div>
          )}
        </header>

        {/* 検索とフィルターセクション */}
        <div className="mb-6 bg-white rounded-xl shadow-md p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 検索バー */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                検索
              </label>
              <div className="flex space-x-2">
                <div className="flex border rounded-lg overflow-hidden">
                  <button
                    onClick={() => handleSearchTypeChange("accountName")}
                    className={`px-3 py-2 text-sm ${
                      searchType === "accountName"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    アカウント名
                  </button>
                  <button
                    onClick={() => handleSearchTypeChange("accountId")}
                    className={`px-3 py-2 text-sm ${
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
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder={`${
                    searchType === "accountName" ? "アカウント名" : "ID"
                  }で検索...`}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* 日付フィルター */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  追加日で絞り込み
                </label>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={dateFilter.enabled}
                    onChange={(e) =>
                      handleDateFilterChange("enabled", e.target.checked)
                    }
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600">有効</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    開始日
                  </label>
                  <input
                    type="date"
                    value={dateFilter.startDate}
                    onChange={(e) =>
                      handleDateFilterChange("startDate", e.target.value)
                    }
                    disabled={!dateFilter.enabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    終了日
                  </label>
                  <input
                    type="date"
                    value={dateFilter.endDate}
                    onChange={(e) =>
                      handleDateFilterChange("endDate", e.target.value)
                    }
                    disabled={!dateFilter.enabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex items-end space-x-2">
              <button
                onClick={resetFilters}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                フィルターをリセット
              </button>
              {(searchQuery || dateFilter.enabled) && (
                <div className="text-sm text-gray-600">
                  {sortedAccounts.length}件が見つかりました
                </div>
              )}
            </div>
          </div>
        </div>

        {displayedAccounts.length > 0 ? (
          <>
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors group"
                        onClick={() => handleSort("key")}
                      >
                        <div className="flex items-center justify-between">
                          <span className="group-hover:text-blue-600">#</span>
                          <span className="ml-2">{getSortIcon("key")}</span>
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors group"
                        onClick={() => handleSort("accountName")}
                      >
                        <div className="flex items-center justify-between">
                          <span className="group-hover:text-blue-600">
                            アカウント名
                          </span>
                          <span className="ml-2">
                            {getSortIcon("accountName")}
                          </span>
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors group"
                        onClick={() => handleSort("accountId")}
                      >
                        <div className="flex items-center justify-between">
                          <span className="group-hover:text-blue-600">ID</span>
                          <span className="ml-2">
                            {getSortIcon("accountId")}
                          </span>
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors group"
                        onClick={() => handleSort("lastCheckedDate")}
                      >
                        <div className="flex items-center justify-between">
                          <span className="group-hover:text-blue-600">
                            最終確認日
                          </span>
                          <span className="ml-2">
                            {getSortIcon("lastCheckedDate")}
                          </span>
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors group"
                        onClick={() => handleSort("amount")}
                      >
                        <div className="flex items-center justify-between">
                          <span className="group-hover:text-blue-600">
                            Amount
                          </span>
                          <span className="ml-2">{getSortIcon("amount")}</span>
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors group"
                        onClick={() => handleSort("addedDate")}
                      >
                        <div className="flex items-center justify-between">
                          <span className="group-hover:text-blue-600">
                            追加日
                          </span>
                          <span className="ml-2">
                            {getSortIcon("addedDate")}
                          </span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {displayedAccounts.map((account, index) => (
                      <tr
                        key={`${account.key}-${index}-${page}`}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900 font-mono">
                            {account.key}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenLink(account)}
                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors text-left"
                            title="TikTokで開く"
                          >
                            {account.accountName}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-700 font-mono">
                            {account.accountId}
                          </div>
                        </td>
                        <td
                          className={getDateCellStyle(account.lastCheckedDate)}
                        >
                          <div className="text-gray-700">
                            {formatDate(account.lastCheckedDate)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => updateAmount(account.key, -1)}
                              className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label="減らす"
                              disabled={
                                !account.amount || parseInt(account.amount) <= 0
                              }
                              title="減らす"
                            >
                              -
                            </button>
                            <span className="font-semibold text-lg min-w-12 text-center text-gray-800">
                              {account.amount || "0"}
                            </span>
                            <button
                              onClick={() => updateAmount(account.key, 1)}
                              className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors"
                              aria-label="増やす"
                              title="増やす"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-500">
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
              <div className="mt-6 text-center">
                <div className="inline-flex items-center justify-center space-x-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <div className="text-gray-600">次のデータを読み込み中...</div>
                </div>
              </div>
            )}

            {/* スクロール用のトリガー要素 */}
            {hasMore && !loadingMore && (
              <div className="mt-6 space-y-4">
                <div
                  ref={loadMoreRef}
                  className="h-20 flex items-center justify-center"
                >
                  <div className="text-center">
                    <div className="animate-bounce text-2xl text-blue-500">
                      ↓
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      スクロールしてさらに読み込む
                    </p>
                  </div>
                </div>
                <div className="text-center">
                  <button
                    onClick={handleManualLoadMore}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                  >
                    またはクリックして次の10件を読み込む
                  </button>
                </div>
              </div>
            )}

            {/* 全件表示完了のメッセージ */}
            {!hasMore && displayedAccounts.length > 0 && (
              <div className="mt-6 text-center">
                <div className="inline-flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-full">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium">
                    すべてのデータを表示しました
                  </span>
                  <span className="ml-2 text-sm">
                    （全{sortedAccounts.length}件）
                  </span>
                </div>
              </div>
            )}

            <div className="mt-8 text-sm text-gray-500 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span>未確認</span>
                <div className="w-3 h-3 bg-orange-400 rounded-full ml-4"></div>
                <span>1週間以上前</span>
                <div className="w-3 h-3 bg-red-400 rounded-full ml-4"></div>
                <span>1ヶ月以上前</span>
              </div>
              <p>※ アカウント名をクリックするとTikTokのページが開きます</p>
              <p>※ ヘッダーをクリックすると並び替えができます</p>
              <p>
                ※
                TikTokリンクを開くと自動的に最終確認日が今日の日付に更新されます
              </p>
              <p>
                ※
                Amountはプラス/マイナスボタンで調整できます（0未満にはなりません）
              </p>
              <p>※ Amountボタンを押すと最終確認日も同時に更新されます</p>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="text-4xl mb-4">📱</div>
            <p className="text-lg text-gray-600 mb-2">
              {searchQuery || dateFilter.enabled
                ? "検索条件に一致するデータがありません"
                : "データが見つかりませんでした"}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {searchQuery || dateFilter.enabled
                ? "検索条件を変更するか、フィルターをリセットしてください"
                : "Firebaseにデータが存在するか確認してください"}
            </p>
            <div className="space-x-4">
              <button
                onClick={fetchAllData}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                データを読み込む
              </button>
              {(searchQuery || dateFilter.enabled) && (
                <button
                  onClick={resetFilters}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  フィルターをリセット
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* アカウント追加モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">
                  アカウント追加
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    アカウント名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newAccount.accountName}
                    onChange={(e) =>
                      setNewAccount({
                        ...newAccount,
                        accountName: e.target.value,
                      })
                    }
                    placeholder="例: かわいい猫ちゃん"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    TikTok ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newAccount.accountId}
                    onChange={(e) =>
                      setNewAccount({
                        ...newAccount,
                        accountId: e.target.value,
                      })
                    }
                    placeholder="例: cute_cat_123"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    TikTokのURL: https://www.tiktok.com/@
                    <span className="font-semibold">ここに入力したID</span>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    初期Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newAccount.amount}
                    onChange={(e) =>
                      setNewAccount({ ...newAccount, amount: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    追加時の初期値（デフォルト: 0）
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600 mb-4">
                    <p className="font-medium">追加される情報:</p>
                    <ul className="mt-2 space-y-1">
                      <li>• 最終確認日: 今日の日付</li>
                      <li>• 追加日: 今日の日付</li>
                      <li>• 自動的にID採番されます</li>
                    </ul>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={addingAccount}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleAddAccount}
                    disabled={
                      addingAccount ||
                      !newAccount.accountName.trim() ||
                      !newAccount.accountId.trim()
                    }
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {addingAccount ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        追加中...
                      </>
                    ) : (
                      "アカウントを追加"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ソートフィールド名を日本語に変換する関数
function getSortFieldName(field: SortField): string {
  switch (field) {
    case "key":
      return "番号";
    case "accountName":
      return "アカウント名";
    case "accountId":
      return "ID";
    case "lastCheckedDate":
      return "最終確認日";
    case "amount":
      return "Amount";
    case "addedDate":
      return "追加日";
    default:
      return field;
  }
}
