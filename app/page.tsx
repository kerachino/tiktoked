"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { ref, get, update } from "firebase/database";
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

  // ソートされたアカウントを計算
  const sortedAccounts = useMemo(() => {
    if (allAccounts.length === 0) return [];

    debugLog(
      `ソート処理開始: ${sortField} ${sortOrder}, ${allAccounts.length}件`
    );

    const sorted = [...allAccounts].sort((a, b) => {
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
  }, [allAccounts, sortField, sortOrder]);

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

      // ローカル状態を更新
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

  // Amountを増減
  const updateAmount = async (accountKey: string, delta: number) => {
    try {
      const account = allAccounts.find((acc) => acc.key === accountKey);
      if (!account) return;

      // 現在のAmountを数値に変換（空の場合は0）
      const currentAmount =
        account.amount && account.amount !== "" ? parseInt(account.amount) : 0;
      const newAmount = Math.max(0, currentAmount + delta);

      const accountRef = ref(db, `__collections__/myfollow/${accountKey}`);

      await update(accountRef, {
        Amount: newAmount.toString(),
      });

      // ローカル状態を更新
      setAllAccounts((prevAccounts) =>
        prevAccounts.map((acc) =>
          acc.key === accountKey
            ? { ...acc, amount: newAmount.toString() }
            : acc
        )
      );

      debugLog(`Amountを更新しました: ${newAmount}`);
    } catch (error) {
      console.error("Amount更新エラー:", error);
      alert("Amountの更新に失敗しました。");
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

        {displayedAccounts.length > 0 ? (
          <>
            <div className="mb-4 text-sm text-gray-500">
              <p>※ ヘッダーをクリックすると並び替えができます</p>
            </div>

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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        アクション
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
                          <div className="font-medium text-gray-900">
                            {account.accountName}
                          </div>
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenLink(account)}
                            className="px-4 py-2 bg-gradient from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center space-x-2 shadow-sm hover:shadow-md"
                            title="TikTokで開く"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M12.52 3.02C13.16 2.39 14.21 2.39 14.85 3.02L16.87 5.04C17.24 5.41 17.87 5.41 18.24 5.04L20.66 2.62C21.25 2.03 22.2 2.03 22.79 2.62L23.38 3.21C23.97 3.8 23.97 4.75 23.38 5.34L20.96 7.76C20.59 8.13 20.59 8.76 20.96 9.13L22.98 11.15C23.61 11.79 23.61 12.84 22.98 13.48L13.48 22.98C12.84 23.61 11.79 23.61 11.15 22.98L9.13 20.96C8.76 20.59 8.13 20.59 7.76 20.96L5.34 23.38C4.75 23.97 3.8 23.97 3.21 23.38L2.62 22.79C2.03 22.2 2.03 21.25 2.62 20.66L5.04 18.24C5.41 17.87 5.41 17.24 5.04 16.87L3.02 14.85C2.39 14.21 2.39 13.16 3.02 12.52L12.52 3.02Z" />
                            </svg>
                            <span>開く</span>
                          </button>
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
              <p>※ ヘッダーをクリックすると並び替えができます</p>
              <p>
                ※
                TikTokリンクを開くと自動的に最終確認日が今日の日付に更新されます
              </p>
              <p>
                ※
                Amountはプラス/マイナスボタンで調整できます（0未満にはなりません）
              </p>
              <p className="mt-3 font-medium">
                データパス: __collections__/myfollow • ページサイズ: {PAGE_SIZE}
                件
              </p>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="text-4xl mb-4">📱</div>
            <p className="text-lg text-gray-600 mb-2">
              データが見つかりませんでした
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Firebaseにデータが存在するか確認してください
            </p>
            <button
              onClick={fetchAllData}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              データを読み込む
            </button>
          </div>
        )}
      </div>
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
