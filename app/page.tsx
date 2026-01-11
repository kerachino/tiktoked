"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ref, get, update, set, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import {
  TikTokAccount,
  AccountList,
  SortField,
  SortOrder,
} from "@/types/tiktok";
import AddAccountModal from "@/components/AddAccountModal";
import BulkAddModal from "@/components/BulkAddModal";
import AccountTable from "@/components/AccountTable";
import ListManagerModal from "@/components/ListManagerModal";
import PageHeader from "@/components/PageHeader";
import SearchFilterSection from "@/components/SearchFilterSection";
import ListInfoCard from "@/components/ListInfoCard";

// デバッグ用のログ関数
const debugLog = (...args: any[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log("[DEBUG]", ...args);
  }
};

// Amountの意味を定義
const AMOUNT_MEANINGS = {
  "-1": "無視してよいアカウント",
  "0": "通常アカウント（未チェック）",
  "1": "1回チェック済み",
  "2": "2回チェック済み",
  // ... それ以上は単純なカウント
};

// デフォルトのリスト設定
const DEFAULT_LISTS: AccountList[] = [
  {
    id: "myfollow",
    name: "マイフォロー",
    description: "デフォルトのフォローリスト",
    createdAt: new Date().toISOString(),
    accountCount: 0,
  },
];

export default function Home() {
  const [currentListId, setCurrentListId] = useState<string>("myfollow");
  const [accountLists, setAccountLists] =
    useState<AccountList[]>(DEFAULT_LISTS);
  const [allAccounts, setAllAccounts] = useState<TikTokAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<TikTokAccount[]>([]);
  const [sortedAccounts, setSortedAccounts] = useState<TikTokAccount[]>([]);
  const [displayedAccounts, setDisplayedAccounts] = useState<TikTokAccount[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [sortField, setSortField] = useState<SortField>("key");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [page, setPage] = useState(1);

  // 検索関連の状態
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"accountName" | "accountId">(
    "accountName"
  );

  // 日付フィルター関連の状態
  const [dateFilterInput, setDateFilterInput] = useState<{
    startDate: string;
    endDate: string;
    enabled: boolean;
  }>({
    startDate: "",
    endDate: "",
    enabled: false,
  });
  const [dateFilter, setDateFilter] = useState<{
    startDate: string;
    endDate: string;
    enabled: boolean;
  }>({
    startDate: "",
    endDate: "",
    enabled: false,
  });

  // フィルター状態
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showDeleted, setShowDeleted] = useState(true);

  // モーダル状態
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [showListManager, setShowListManager] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Firebaseクエリの制限
  const PAGE_SIZE = 10;

  // アカウントリストを取得
  const fetchAccountLists = useCallback(async () => {
    try {
      setLoadingLists(true);
      console.log("📋 リスト取得開始...");

      const lists: AccountList[] = [];

      // 1. まず _lists からメタデータを取得
      const listsMetaRef = ref(db, "__collections__/_lists");
      const metaSnapshot = await get(listsMetaRef);

      if (metaSnapshot.exists()) {
        const metaData = metaSnapshot.val();
        console.log("📊 メタデータ取得完了:", Object.keys(metaData));

        // 2. 各リストのメタデータを処理
        for (const listId in metaData) {
          console.log(`🔍 リスト処理中: ${listId}`, metaData[listId]);

          try {
            const meta = metaData[listId];
            let accountCount = 0;

            // 3. 実際のリストデータが存在するか確認
            try {
              const listDataRef = ref(db, `__collections__/${listId}`);
              const listDataSnapshot = await get(listDataRef);

              if (listDataSnapshot.exists()) {
                const listData = listDataSnapshot.val();
                accountCount = listData ? Object.keys(listData).length : 0;
                console.log(
                  `✅ ${listId} のアカウントデータあり: ${accountCount}件`
                );
              } else {
                console.log(
                  `⚠️ ${listId} のアカウントデータなし（空のリスト）`
                );
              }
            } catch (dataError) {
              console.log(
                `⚠️ ${listId} のデータ取得エラー（空として扱う）:`,
                dataError
              );
            }

            // 4. リスト情報を作成
            const accountList: AccountList = {
              id: listId,
              name: meta.name || listId,
              description: meta.description || "",
              createdAt: meta.createdAt || new Date().toISOString(),
              accountCount: accountCount,
            };

            console.log(
              `📝 リスト追加: ${listId} - ${accountList.name} (${accountCount}件)`
            );
            lists.push(accountList);
          } catch (error) {
            console.error(`❌ リスト ${listId} の処理中にエラー:`, error);
          }
        }
      } else {
        console.log("ℹ️ メタデータが存在しません");
      }

      // 5. myfollow がメタデータにない場合の処理
      if (!lists.some((list) => list.id === "myfollow")) {
        console.log("🔧 myfollow がメタデータにないので追加処理");

        let myfollowAccountCount = 0;
        try {
          const myfollowDataRef = ref(db, "__collections__/myfollow");
          const myfollowSnapshot = await get(myfollowDataRef);

          if (myfollowSnapshot.exists()) {
            const myfollowData = myfollowSnapshot.val();
            myfollowAccountCount = myfollowData
              ? Object.keys(myfollowData).length
              : 0;
          }
        } catch (error) {
          console.error("myfollow データ取得エラー:", error);
        }

        const myfollowList: AccountList = {
          id: "myfollow",
          name: "マイフォロー",
          description: "デフォルトのフォローリスト",
          createdAt: new Date().toISOString(),
          accountCount: myfollowAccountCount,
        };

        lists.push(myfollowList);
        console.log(`📝 myfollow リスト追加: ${myfollowAccountCount}件`);
      }

      console.log("📦 取得したリスト一覧:", lists);

      // 6. リストが空の場合はデフォルトリストを作成
      if (lists.length === 0) {
        console.log("🆕 リストが空なのでデフォルトリストを作成");
        await createDefaultList();
        return fetchAccountLists(); // 再帰的に呼び出し
      }

      // 7. リストをソート（myfollowを先頭に）
      const sortedLists = lists.sort((a, b) => {
        if (a.id === "myfollow") return -1;
        if (b.id === "myfollow") return 1;
        return a.name.localeCompare(b.name, "ja");
      });

      console.log("🔠 ソート後のリスト:", sortedLists);

      setAccountLists(sortedLists);

      // 8. 現在のリストが存在しない場合は最初のリストを選択
      if (
        currentListId === "" ||
        !sortedLists.some((list) => list.id === currentListId)
      ) {
        const firstListId = sortedLists[0].id;
        console.log(`🔄 リスト切り替え: ${currentListId} -> ${firstListId}`);
        setCurrentListId(firstListId);
      } else {
        console.log(`✅ 現在のリスト維持: ${currentListId}`);
      }
    } catch (error) {
      console.error("❌ リスト取得エラー:", error);
      // エラー時は最低限のリストを設定
      const defaultList: AccountList = {
        id: "myfollow",
        name: "マイフォロー",
        description: "デフォルトのフォローリスト",
        createdAt: new Date().toISOString(),
        accountCount: 0,
      };
      setAccountLists([defaultList]);
      setCurrentListId("myfollow");
    } finally {
      setLoadingLists(false);
    }
  }, [currentListId]);

  // デフォルトリストを作成する関数
  const createDefaultList = async () => {
    try {
      // myfollow リストを作成
      const myfollowRef = ref(db, "__collections__/myfollow");
      await set(myfollowRef, {});

      // メタデータを作成
      const metaRef = ref(db, "__collections__/_lists/myfollow");
      await set(metaRef, {
        name: "マイフォロー",
        description: "デフォルトのフォローリスト",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const defaultList: AccountList = {
        id: "myfollow",
        name: "マイフォロー",
        description: "デフォルトのフォローリスト",
        createdAt: new Date().toISOString(),
        accountCount: 0,
      };

      setAccountLists([defaultList]);
      setCurrentListId("myfollow");
    } catch (error) {
      console.error("デフォルトリスト作成エラー:", error);
    }
  };

  // 新しいリストを作成（修正版）
  const createNewList = async () => {
    if (!newListName.trim()) {
      alert("リスト名を入力してください");
      return;
    }

    try {
      // リストIDを生成（英数字とアンダースコアのみ）
      const listId = newListName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");

      if (!listId) {
        alert("有効なリスト名を入力してください");
        return;
      }

      console.log(
        `新しいリストを作成: ID=${listId}, Name=${newListName.trim()}`
      );

      // 1. リストデータを作成（空のオブジェクト）
      const listRef = ref(db, `__collections__/${listId}`);
      const existingList = await get(listRef);

      if (existingList.exists()) {
        alert("同じ名前のリストが既に存在します");
        return;
      }

      await set(listRef, {});
      console.log(`リスト ${listId} を作成しました`);

      // 2. メタデータを作成
      const listMetaRef = ref(db, `__collections__/_lists/${listId}`);
      const listMetaData = {
        name: newListName.trim(),
        description: newListDescription.trim() || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await set(listMetaRef, listMetaData);
      console.log(`リスト ${listId} のメタデータを作成しました:`, listMetaData);

      // 3. 状態を更新
      const newList: AccountList = {
        id: listId,
        name: newListName.trim(),
        description: newListDescription.trim() || "",
        createdAt: new Date().toISOString(),
        accountCount: 0,
      };

      console.log("新しいリストを状態に追加:", newList);

      setAccountLists((prev) => {
        const newLists = [...prev, newList];
        console.log("更新後のリスト一覧:", newLists);
        return newLists;
      });

      // 4. 作成したリストに切り替え
      console.log(`作成したリストに切り替え: ${listId}`);
      setCurrentListId(listId);

      // 5. フォームをリセットしてモーダルを閉じる
      setNewListName("");
      setNewListDescription("");
      setShowListManager(false);

      alert("リストを作成しました");
    } catch (error) {
      console.error("リスト作成エラー:", error);
      alert(
        `リストの作成に失敗しました: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  // リストを削除
  const deleteList = async (listId: string) => {
    if (
      !confirm(
        "このリストを削除しますか？リスト内のすべてのアカウントも削除されます。"
      )
    ) {
      return;
    }

    try {
      // リストデータを削除
      const listRef = ref(db, `__collections__/${listId}`);
      await remove(listRef);

      // リストメタデータを削除
      const listMetaRef = ref(db, `__collections__/_lists/${listId}`);
      await remove(listMetaRef);

      // 状態を更新
      setAccountLists((prev) => prev.filter((list) => list.id !== listId));

      // 現在のリストを削除した場合は別のリストに切り替え
      if (listId === currentListId) {
        const remainingLists = accountLists.filter(
          (list) => list.id !== listId
        );
        if (remainingLists.length > 0) {
          setCurrentListId(remainingLists[0].id);
        } else {
          // リストがなくなった場合はデフォルトリストを作成
          const defaultListId = "myfollow";
          await set(ref(db, `__collections__/${defaultListId}`), {});
          await set(ref(db, `__collections__/_lists/${defaultListId}`), {
            name: "マイフォロー",
            description: "デフォルトリスト",
            createdAt: new Date().toISOString(),
          });
          fetchAccountLists();
          setCurrentListId(defaultListId);
        }
      }

      alert("リストを削除しました");
    } catch (error) {
      console.error("リスト削除エラー:", error);
      alert("リストの削除に失敗しました");
    }
  };

  // リストを切り替え
  const switchList = useCallback(
    (listId: string) => {
      console.log(`リスト切り替え要求: ${listId}`);
      console.log(
        `現在のリスト一覧:`,
        accountLists.map((l) => l.id)
      );

      const targetList = accountLists.find((list) => list.id === listId);
      if (targetList) {
        setCurrentListId(listId);
        setPage(1);
        setSearchInput("");
        setSearchQuery("");
        setShowFavoritesOnly(false);
        setDateFilterInput({
          startDate: "",
          endDate: "",
          enabled: false,
        });
        setDateFilter({
          startDate: "",
          endDate: "",
          enabled: false,
        });
        console.log(`リストを ${listId} に切り替えました`);
      } else {
        console.error(`リスト ${listId} が見つかりません`);
      }
    },
    [accountLists]
  );
  // 全データを取得
  const fetchAllData = useCallback(async () => {
    if (!currentListId) return;

    try {
      setLoading(true);
      setError(null);
      setHasMore(true);
      setPage(1);

      debugLog(`全データ取得開始: ${currentListId}`);

      // 全データを取得
      const accountsRef = ref(db, `__collections__/${currentListId}`);
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
              favorite: account.Favorite || account.favorite || false,
              deleted: account.Deleted || account.deleted || false,
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
  }, [currentListId]);

  // 検索ボタン押下時の処理
  const handleSearchButtonClick = useCallback(() => {
    setSearchQuery(searchInput);
    setDateFilter(dateFilterInput);
    setPage(1);
  }, [searchInput, dateFilterInput]);

  // フィルタリングされたアカウントを計算
  useEffect(() => {
    if (allAccounts.length === 0) {
      setFilteredAccounts([]);
      return;
    }

    let filtered = [...allAccounts];

    // 削除済みフィルター
    if (!showDeleted) {
      filtered = filtered.filter((account) => !account.deleted);
    }

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

    // お気に入りフィルター
    if (showFavoritesOnly) {
      filtered = filtered.filter((account) => account.favorite);
    }

    debugLog(`フィルタリング完了: ${filtered.length}件`);
    setFilteredAccounts(filtered);
  }, [
    allAccounts,
    searchQuery,
    searchType,
    dateFilter,
    showFavoritesOnly,
    showDeleted,
  ]);

  // ソートされたアカウントを計算
  useEffect(() => {
    if (filteredAccounts.length === 0) {
      setSortedAccounts([]);
      return;
    }

    debugLog(`ソート処理開始: ${sortField} ${sortOrder}`);

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

      // Favoriteの場合は真偽値として比較
      if (sortField === "favorite") {
        if (sortOrder === "desc") {
          return (valueA ? 1 : 0) - (valueB ? 1 : 0);
        } else {
          return (valueB ? 1 : 0) - (valueA ? 1 : 0);
        }
      }

      // 削除済みの場合は真偽値として比較
      if (sortField === "deleted") {
        if (sortOrder === "desc") {
          return (valueA ? 1 : 0) - (valueB ? 1 : 0);
        } else {
          return (valueB ? 1 : 0) - (valueA ? 1 : 0);
        }
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
    setSortedAccounts(sorted);
  }, [filteredAccounts, sortField, sortOrder]);

  // 表示するアカウントを計算（ページネーション）
  useEffect(() => {
    if (sortedAccounts.length === 0) {
      setDisplayedAccounts([]);
      return;
    }

    const endIndex = page * PAGE_SIZE;
    const displayed = sortedAccounts.slice(0, endIndex);

    // さらに読み込めるかどうかを更新
    const hasMoreItems = sortedAccounts.length > endIndex;
    if (hasMore !== hasMoreItems) {
      setHasMore(hasMoreItems);
    }

    setDisplayedAccounts(displayed);
  }, [sortedAccounts, page, hasMore]);

  // 次のページを読み込む
  const loadNextPage = useCallback(() => {
    if (loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);
    const nextPage = page + 1;
    setTimeout(() => {
      setPage(nextPage);
      setLoadingMore(false);
    }, 300);
  }, [loadingMore, hasMore, page]);

  // ソートハンドラー
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      const newOrder = sortOrder === "asc" ? "desc" : "asc";
      setSortOrder(newOrder);
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  // ソートアイコンの取得
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return "↕️";
    }
    return sortOrder === "asc" ? "↑" : "↓";
  };

  // Amountの意味を取得
  const getAmountMeaning = (amount: string) => {
    const amountNum = parseInt(amount) || 0;
    if (amountNum >= -1 && amountNum <= 2) {
      return (
        AMOUNT_MEANINGS[amount as keyof typeof AMOUNT_MEANINGS] ||
        `${amountNum}回チェック済み`
      );
    } else {
      return "無効な値";
    }
  };

  // Amountのスタイルを取得
  const getAmountStyle = (amount: string) => {
    const amountNum = parseInt(amount) || 0;

    // 通常のAmountスタイル
    if (amountNum === -1) {
      return "bg-yellow-100 text-yellow-700"; // 無視してよい
    } else if (amountNum === 0) {
      return "bg-blue-100 text-blue-700"; // 未チェック
    } else if (amountNum > 0) {
      return "bg-green-100 text-green-700"; // チェック済み
    } else {
      return "bg-red-100 text-red-700"; // その他（エラー）
    }
  };

  // お気に入りを切り替え
  const toggleFavorite = async (accountKey: string) => {
    try {
      const account = allAccounts.find((acc) => acc.key === accountKey);
      if (!account) return;

      const newFavorite = !account.favorite;

      const accountRef = ref(
        db,
        `__collections__/${currentListId}/${accountKey}`
      );
      await update(accountRef, {
        Favorite: newFavorite,
      });

      setAllAccounts((prevAccounts) =>
        prevAccounts.map((acc) =>
          acc.key === accountKey ? { ...acc, favorite: newFavorite } : acc
        )
      );
    } catch (error) {
      console.error("お気に入り更新エラー:", error);
      alert("お気に入りの更新に失敗しました。");
    }
  };

  // 削除済み状態を切り替え
  const toggleDeleted = async (accountKey: string) => {
    try {
      const account = allAccounts.find((acc) => acc.key === accountKey);
      if (!account) return;

      const newDeleted = !account.deleted;

      const accountRef = ref(
        db,
        `__collections__/${currentListId}/${accountKey}`
      );
      await update(accountRef, {
        Deleted: newDeleted,
      });

      setAllAccounts((prevAccounts) =>
        prevAccounts.map((acc) =>
          acc.key === accountKey ? { ...acc, deleted: newDeleted } : acc
        )
      );

      // リストのアカウント数を更新（削除済み状態の変更によってもカウントは変わらない）
    } catch (error) {
      console.error("削除済み更新エラー:", error);
      alert("削除済み状態の更新に失敗しました。");
    }
  };

  // 検索入力ハンドラー
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  // 検索タイプ切り替え
  const handleSearchTypeChange = (type: "accountName" | "accountId") => {
    setSearchType(type);
  };

  // 日付フィルター入力変更ハンドラー
  const handleDateFilterInputChange = useCallback(
    (field: "startDate" | "endDate" | "enabled", value: any) => {
      setDateFilterInput((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

  // 日付フィルターリセット
  const resetDateFilter = () => {
    setDateFilterInput({
      startDate: "",
      endDate: "",
      enabled: false,
    });
    setDateFilter({
      startDate: "",
      endDate: "",
      enabled: false,
    });
  };

  // 無限スクロールの設定
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) {
      return;
    }

    const options = {
      root: null,
      rootMargin: "100px",
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !loadingMore) {
        loadNextPage();
      }
    }, options);

    observer.observe(loadMoreRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore, loadNextPage]);

  // 初期データ読み込み
  useEffect(() => {
    const initializeData = async () => {
      await fetchAccountLists();
      await fetchAllData();
    };
    initializeData();
  }, [fetchAccountLists]);

  // リストが変更されたときにデータを再取得
  useEffect(() => {
    if (currentListId) {
      fetchAllData();
    }
  }, [currentListId, fetchAllData]);

  // 手動で次のページを読み込むボタンのハンドラー
  const handleManualLoadMore = () => {
    loadNextPage();
  };

  // TikTokリンクを開き、最終確認日を更新
  const handleOpenLink = async (account: TikTokAccount) => {
    window.open(`https://www.tiktok.com/@${account.accountId}`, "_blank");

    const today = new Date();
    const formattedDate = `${today.getFullYear()}/${(today.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${today.getDate().toString().padStart(2, "0")}`;

    try {
      const accountRef = ref(
        db,
        `__collections__/${currentListId}/${account.key}`
      );
      await update(accountRef, {
        LastCheckedDate: formattedDate,
      });

      setAllAccounts((prevAccounts) =>
        prevAccounts.map((acc) =>
          acc.key === account.key
            ? { ...acc, lastCheckedDate: formattedDate }
            : acc
        )
      );
    } catch (error) {
      console.error("更新エラー:", error);
      alert("更新に失敗しました。");
    }
  };

  // Amountを増減（最終確認日も更新）-1が最低値
  const updateAmount = async (accountKey: string, delta: number) => {
    try {
      const account = allAccounts.find((acc) => acc.key === accountKey);
      if (!account) return;

      const currentAmount =
        account.amount && account.amount !== "" ? parseInt(account.amount) : 0;

      // -1まで減らせるようにする
      const newAmount = Math.max(-1, currentAmount + delta);

      const today = new Date();
      const formattedDate = `${today.getFullYear()}/${(today.getMonth() + 1)
        .toString()
        .padStart(2, "0")}/${today.getDate().toString().padStart(2, "0")}`;

      const accountRef = ref(
        db,
        `__collections__/${currentListId}/${accountKey}`
      );

      await update(accountRef, {
        Amount: newAmount.toString(),
        LastCheckedDate: formattedDate,
      });

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
    } catch (error) {
      console.error("Amount更新エラー:", error);
      alert("Amountの更新に失敗しました。");
    }
  };

  // 日付のフォーマット
  const formatDate = useCallback((dateString: string) => {
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
  }, []);

  // 未確認の日付を強調表示するスタイル
  const getDateCellStyle = (dateString: string) => {
    if (!dateString || dateString.trim() === "") {
      return "px-4 py-3 whitespace-nowrap bg-yellow-50";
    }

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "px-4 py-3 whitespace-nowrap bg-yellow-50";
      }

      const today = new Date();
      const diffTime = today.getTime() - date.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 30) {
        return "px-4 py-3 whitespace-nowrap bg-red-50";
      } else if (diffDays > 7) {
        return "px-4 py-3 whitespace-nowrap bg-orange-50";
      }
    } catch {}

    return "px-4 py-3 whitespace-nowrap";
  };

  // 検索とフィルターのリセット
  const resetFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    resetDateFilter();
    setShowFavoritesOnly(false);
    setPage(1);
  };

  // アカウント追加時のハンドラー
  const handleAccountAdded = useCallback(
    (newAccount: TikTokAccount) => {
      setAllAccounts((prev) => [...prev, newAccount]);
      // リストのアカウント数を更新
      setAccountLists((prev) =>
        prev.map((list) =>
          list.id === currentListId
            ? { ...list, accountCount: list.accountCount + 1 }
            : list
        )
      );
    },
    [currentListId]
  );

  // 一括アカウント追加時のハンドラー
  const handleAccountsAdded = useCallback(
    (newAccounts: TikTokAccount[]) => {
      setAllAccounts((prev) => [...prev, ...newAccounts]);
      // リストのアカウント数を更新
      setAccountLists((prev) =>
        prev.map((list) =>
          list.id === currentListId
            ? { ...list, accountCount: list.accountCount + newAccounts.length }
            : list
        )
      );
    },
    [currentListId]
  );
  // ソートフィールド名を日本語に変換する関数
  const getSortFieldName = useCallback((field: string): string => {
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
      case "favorite":
        return "お気に入り";
      case "addedDate":
        return "追加日";
      case "deleted":
        return "削除済み";
      default:
        return field;
    }
  }, []);

  if (loading || loadingLists) {
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
  const currentList = accountLists.find((list) => list.id === currentListId);

  return (
    <div className="min-h-screen bg-gray-50 p-3 md:p-8" ref={containerRef}>
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <PageHeader
          currentList={currentList}
          accountLists={accountLists}
          currentListId={currentListId}
          sortedAccountsLength={sortedAccounts.length}
          displayedAccountsLength={displayedAccounts.length}
          hasMore={hasMore}
          sortField={sortField}
          sortOrder={sortOrder}
          showFavoritesOnly={showFavoritesOnly}
          showDeleted={showDeleted}
          onSwitchList={switchList}
          onShowListManager={() => setShowListManager(true)}
          onRefreshData={fetchAllData}
          onShowAddModal={() => setShowAddModal(true)}
          onShowBulkAddModal={() => setShowBulkAddModal(true)}
          onToggleFavoritesOnly={() => setShowFavoritesOnly(!showFavoritesOnly)}
          onToggleShowDeleted={() => setShowDeleted(!showDeleted)}
          getSortFieldName={getSortFieldName}
        />

        {/* リスト情報表示 */}
        {currentList && (
          <ListInfoCard
            currentList={currentList}
            onDeleteList={deleteList}
            formatDate={formatDate}
          />
        )}

        {/* 検索とフィルターセクション */}
        <SearchFilterSection
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          searchQuery={searchQuery}
          searchType={searchType}
          setSearchType={setSearchType}
          dateFilterInput={dateFilterInput}
          setDateFilterInput={setDateFilterInput}
          handleSearchButtonClick={handleSearchButtonClick}
          resetFilters={resetFilters}
          sortedAccountsLength={sortedAccounts.length}
          handleDateFilterInputChange={handleDateFilterInputChange}
          dateFilter={dateFilter}
        />

        {/* アカウントテーブル */}
        <AccountTable
          accounts={displayedAccounts}
          loadingMore={loadingMore}
          hasMore={hasMore}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
          onOpenLink={handleOpenLink}
          onUpdateAmount={updateAmount}
          onToggleFavorite={toggleFavorite}
          onToggleDeleted={toggleDeleted}
          getAmountMeaning={getAmountMeaning}
          getAmountStyle={getAmountStyle}
          formatDate={formatDate}
          getDateCellStyle={getDateCellStyle}
          getSortIcon={getSortIcon}
          onManualLoadMore={handleManualLoadMore}
          loadMoreRef={loadMoreRef}
          showDeleted={showDeleted}
        />
      </div>

      {/* アカウント追加モーダル */}
      <AddAccountModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAccountAdded={handleAccountAdded}
        allAccounts={allAccounts}
        currentListId={currentListId}
      />

      {/* 一括追加モーダル */}
      <BulkAddModal
        isOpen={showBulkAddModal}
        onClose={() => setShowBulkAddModal(false)}
        onAccountsAdded={handleAccountsAdded}
        allAccounts={allAccounts}
        currentListId={currentListId}
      />

      {/* リスト管理モーダル */}
      <ListManagerModal
        isOpen={showListManager}
        onClose={() => {
          setShowListManager(false);
          setNewListName("");
          setNewListDescription("");
        }}
        accountLists={accountLists}
        currentListId={currentListId}
        newListName={newListName}
        setNewListName={setNewListName}
        newListDescription={newListDescription}
        setNewListDescription={setNewListDescription}
        onCreateNewList={createNewList}
        onSwitchList={switchList}
        onDeleteList={deleteList}
      />
    </div>
  );
}
