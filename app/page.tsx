"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { ref, get, update, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { TikTokAccount, SortField, SortOrder } from "@/types/tiktok";
import AddAccountModal from "@/components/AddAccountModal";
import BulkAddModal from "@/components/BulkAddModal";

// デバッグ用のログ関数
const debugLog = (...args: any[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log("[DEBUG]", ...args);
  }
};

// Amountの意味を定義
const AMOUNT_MEANINGS = {
  "-2": "削除済みアカウント",
  "-1": "無視してよいアカウント",
  "0": "通常アカウント（未チェック）",
  "1": "1回チェック済み",
  "2": "2回チェック済み",
  // ... それ以上は単純なカウント
};

export default function Home() {
  const [allAccounts, setAllAccounts] = useState<TikTokAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<TikTokAccount[]>([]);
  const [sortedAccounts, setSortedAccounts] = useState<TikTokAccount[]>([]);
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

  // お気に入りフィルター状態
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // アカウント追加モーダル状態
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccount, setNewAccount] = useState({
    accountName: "",
    accountId: "",
    amount: "0",
    favorite: false,
  });
  const [addingAccount, setAddingAccount] = useState(false);

  // 一括アカウント追加時のハンドラー
  const handleAccountsAdded = useCallback((newAccounts: TikTokAccount[]) => {
    setAllAccounts((prev) => [...prev, ...newAccounts]);
  }, []);

  // アカウント追加時のハンドラー
  const handleAccountAdded = useCallback((newAccount: TikTokAccount) => {
    setAllAccounts((prev) => [...prev, newAccount]);
  }, []);

  // 一括追加モーダル状態
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [bulkHtml, setBulkHtml] = useState("");
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<
    Array<{ accountName: string; accountId: string; previewKey: string }>
  >([]);
  const [bulkDuplicates, setBulkDuplicates] = useState<
    Array<{
      accountName: string;
      accountId: string;
      previewKey: string;
      reason: string;
    }>
  >([]);

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
              favorite: account.Favorite || account.favorite || false,
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
  useEffect(() => {
    if (allAccounts.length === 0) {
      setFilteredAccounts([]);
      return;
    }

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

    // お気に入りフィルター
    if (showFavoritesOnly) {
      filtered = filtered.filter((account) => account.favorite);
    }

    debugLog(
      `フィルタリング完了: ${filtered.length}件（検索: "${searchQuery}", 日付絞り込み: ${dateFilter.enabled}, お気に入りのみ: ${showFavoritesOnly})`
    );
    setFilteredAccounts(filtered);
  }, [allAccounts, searchQuery, searchType, dateFilter, showFavoritesOnly]);

  // ソートされたアカウントを計算（並び替え条件が変更された時のみ）
  useEffect(() => {
    if (filteredAccounts.length === 0) {
      setSortedAccounts([]);
      return;
    }

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

      // Favoriteの場合は真偽値として比較
      if (sortField === "favorite") {
        // お気に入りを優先して表示（降順の場合は逆）
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

    debugLog(
      `表示アカウント計算: ページ${page}, ${displayed.length}/${sortedAccounts.length}件`
    );

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

  // Amountの意味を取得
  const getAmountMeaning = (amount: string) => {
    const amountNum = parseInt(amount) || 0;
    if (amountNum >= -2 && amountNum <= 2) {
      return (
        AMOUNT_MEANINGS[amount as keyof typeof AMOUNT_MEANINGS] ||
        `${amountNum}回チェック済み`
      );
    } else if (amountNum > 2) {
      return `${amountNum}回チェック済み`;
    } else {
      return "無効な値";
    }
  };

  // Amountのスタイルを取得
  const getAmountStyle = (amount: string) => {
    const amountNum = parseInt(amount) || 0;

    if (amountNum === -2) {
      return "bg-gray-100 text-gray-600"; // 削除済み
    } else if (amountNum === -1) {
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

      const accountRef = ref(db, `__collections__/myfollow/${accountKey}`);
      await update(accountRef, {
        Favorite: newFavorite,
      });

      // ローカル状態を即時更新（並び替えを維持）
      setAllAccounts((prevAccounts) =>
        prevAccounts.map((acc) =>
          acc.key === accountKey ? { ...acc, favorite: newFavorite } : acc
        )
      );

      debugLog(`お気に入りを${newFavorite ? "追加" : "解除"}: ${accountKey}`);
    } catch (error) {
      console.error("お気に入り更新エラー:", error);
      alert("お気に入りの更新に失敗しました。");
    }
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

      // ローカル状態を即時更新（並び替えを維持）
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

      // -2まで減らせるようにする
      const newAmount = Math.max(-2, currentAmount + delta);

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

      // ローカル状態を即時更新（並び替えを維持）
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

      // 既存の全キーを取得して数値に変換
      const existingKeys = allAccounts.map((acc) => parseInt(acc.key) || 0);

      // 既存のキーが存在する場合は最大値、なければ0から開始
      const maxKey = existingKeys.length > 0 ? Math.max(...existingKeys) : 0;

      // 降順でキーを振り分け（常に最大値+1）
      const newKey = maxKey + 1;

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
        Favorite: newAccount.favorite,
      };

      // Firebaseに追加
      const accountRef = ref(db, `__collections__/myfollow/${newKey}`);
      await set(accountRef, accountData);

      // ローカル状態に追加
      const newAccountObj: TikTokAccount = {
        key: newKey.toString(),
        accountName: newAccount.accountName.trim(),
        accountId: newAccount.accountId.trim(),
        amount: newAccount.amount || "0",
        lastCheckedDate: formattedDate,
        addedDate: formattedDate,
        favorite: newAccount.favorite,
      };

      setAllAccounts((prev) => [...prev, newAccountObj]);

      // モーダルを閉じてフォームをリセット
      setShowAddModal(false);
      setNewAccount({
        accountName: "",
        accountId: "",
        amount: "0",
        favorite: false,
      });

      alert("アカウントを追加しました");
    } catch (error) {
      console.error("アカウント追加エラー:", error);
      alert("アカウントの追加に失敗しました。");
    } finally {
      setAddingAccount(false);
    }
  };

  // HTMLからアカウント情報を抽出してプレビュー
  const parseBulkHtml = (html: string) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    // TikTokのHTML構造からアカウント情報を抽出
    const accountElements = tempDiv.querySelectorAll(
      "li .css-ra8pvn-5e6d46e3--DivUserItem"
    );
    const accounts: Array<{ accountName: string; accountId: string }> = [];

    accountElements.forEach((element) => {
      // アカウント名を取得（SpanNicknameクラス）
      const nicknameElement = element.querySelector(
        ".css-spk7wm-5e6d46e3--SpanNickname"
      );
      const accountName = nicknameElement?.textContent?.trim() || "";

      // IDを取得（PUniqueIdクラス）
      const uniqueIdElement = element.querySelector(
        ".css-8sip1d-5e6d46e3--PUniqueId"
      );
      const accountId = uniqueIdElement?.textContent?.trim() || "";

      // またはリンクからIDを取得
      const linkElement = element.querySelector('a[href^="/@"]');
      if (linkElement) {
        const href = linkElement.getAttribute("href") || "";
        const idFromHref = href.replace("/@", "").trim();
        if (idFromHref && !accountId) {
          // リンクから取得したIDを使用
          accounts.push({
            accountName,
            accountId: idFromHref,
          });
          return;
        }
      }

      if (accountName && accountId) {
        accounts.push({ accountName, accountId });
      }
    });

    return accounts;
  };

  // 一括追加のHTMLを解析してプレビュー
  const handleBulkHtmlChange = (html: string) => {
    setBulkHtml(html);

    if (html.trim()) {
      const accounts = parseBulkHtml(html);

      // 既存の全キーを取得して数値に変換
      const existingKeys = allAccounts.map((acc) => parseInt(acc.key) || 0);
      const maxKey = existingKeys.length > 0 ? Math.max(...existingKeys) : 0;

      // プレビューにキー番号を追加（降順で振り分け）
      // 例: 既存の最大キーが10で3件追加の場合 → 13, 12, 11
      const previewWithKeys = accounts.map((account, index) => ({
        ...account,
        previewKey: (maxKey + accounts.length - index).toString(),
      }));

      setBulkPreview(previewWithKeys);

      // 重複チェック
      const duplicates: Array<{
        accountName: string;
        accountId: string;
        previewKey: string;
        reason: string;
      }> = [];
      previewWithKeys.forEach((account, index) => {
        // 既存のアカウントと比較
        const existingAccount = allAccounts.find(
          (acc) => acc.accountId === account.accountId
        );

        if (existingAccount) {
          duplicates.push({
            ...account,
            reason: `ID "${account.accountId}" が既に存在します`,
          });
        }

        // プレビュー内での重複チェック
        const duplicateInPreview = previewWithKeys.find(
          (acc, idx) => idx !== index && acc.accountId === account.accountId
        );

        if (
          duplicateInPreview &&
          !duplicates.some((d) => d.accountId === account.accountId)
        ) {
          duplicates.push({
            ...account,
            reason: `プレビュー内でIDが重複しています`,
          });
        }
      });

      setBulkDuplicates(duplicates);
    } else {
      setBulkPreview([]);
      setBulkDuplicates([]);
    }
  };

  // 一括アカウント追加処理
  const handleBulkAddAccounts = async () => {
    if (!bulkHtml.trim()) {
      alert("HTMLを入力してください");
      return;
    }

    const accounts = parseBulkHtml(bulkHtml);
    if (accounts.length === 0) {
      alert("有効なアカウント情報が見つかりませんでした");
      return;
    }

    try {
      setBulkProcessing(true);

      // 既存の全キーを取得して数値に変換
      const existingKeys = allAccounts.map((acc) => parseInt(acc.key) || 0);

      // 既存のキーが存在する場合は最大値、なければ0から開始
      const maxKey = existingKeys.length > 0 ? Math.max(...existingKeys) : 0;

      const today = new Date();
      const formattedDate = `${today.getFullYear()}/${(today.getMonth() + 1)
        .toString()
        .padStart(2, "0")}/${today.getDate().toString().padStart(2, "0")}`;

      const newAccounts: TikTokAccount[] = [];
      let addedCount = 0;
      let skippedCount = 0;

      // 重複を除いてアカウントを追加（降順でキーを振り分け）
      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];

        // 重複チェック
        const existingAccount = allAccounts.find(
          (acc) => acc.accountId === account.accountId
        );

        if (existingAccount) {
          skippedCount++;
          continue;
        }

        // 降順でキーを振り分け（最大値 + 追加件数 - インデックス）
        const newKey = maxKey + accounts.length - i;

        // 新しいアカウントデータ
        const accountData = {
          AccountName: account.accountName,
          AccountID: account.accountId,
          Amount: "0", // 初期値は0
          LastCheckedDate: formattedDate,
          AddedDate: formattedDate,
          Favorite: false, // 初期値はfalse
        };

        // Firebaseに追加
        const accountRef = ref(db, `__collections__/myfollow/${newKey}`);
        await set(accountRef, accountData);

        // ローカル状態に追加
        newAccounts.push({
          key: newKey.toString(),
          accountName: account.accountName,
          accountId: account.accountId,
          amount: "0",
          lastCheckedDate: formattedDate,
          addedDate: formattedDate,
          favorite: false,
        });

        addedCount++;
      }

      // ローカル状態を更新
      if (newAccounts.length > 0) {
        setAllAccounts((prev) => [...prev, ...newAccounts]);
      }

      // モーダルを閉じてフォームをリセット
      setShowBulkAddModal(false);
      setBulkHtml("");
      setBulkPreview([]);
      setBulkDuplicates([]);

      // 結果を通知
      alert(
        `${addedCount}件のアカウントを追加しました（${skippedCount}件スキップ）`
      );
    } catch (error) {
      console.error("一括追加エラー:", error);
      alert("一括追加に失敗しました。コンソールを確認してください。");
    } finally {
      setBulkProcessing(false);
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
    } catch {
      // 日付パースエラー時はデフォルトスタイル
    }

    return "px-4 py-3 whitespace-nowrap";
  };

  // 検索とフィルターのリセット
  const resetFilters = () => {
    setSearchQuery("");
    resetDateFilter();
    setShowFavoritesOnly(false);
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
    <div className="min-h-screen bg-gray-50 p-3 md:p-8" ref={containerRef}>
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            TikTokアカウント管理
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 md:gap-4">
            <p className="text-sm md:text-base text-gray-600">
              全{sortedAccounts.length}件のアカウント（
              {displayedAccounts.length}件表示中）
              {hasMore && `（さらに読み込み可能）`}
            </p>
            <div className="text-xs md:text-sm bg-blue-100 text-blue-800 px-2 md:px-3 py-1 rounded-full">
              ソート: {getSortFieldName(sortField)} (
              {sortOrder === "asc" ? "昇順" : "降順"})
            </div>
            <div className="text-xs md:text-sm bg-green-100 text-green-800 px-2 md:px-3 py-1 rounded-full">
              ページ: {currentPage}/{totalPages}
            </div>
            <button
              onClick={fetchAllData}
              className="text-xs md:text-sm bg-gray-100 text-gray-700 px-2 md:px-3 py-1 rounded-full hover:bg-gray-200 transition-colors"
            >
              データ更新
            </button>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowAddModal(true)}
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
                onClick={() => setShowBulkAddModal(true)}
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
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
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
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 md:p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm md:text-base text-red-700 font-semibold">
                エラー: {error}
              </p>
              <button
                onClick={fetchAllData}
                className="mt-2 px-3 md:px-4 py-1 md:py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                再読み込み
              </button>
            </div>
          )}
        </header>

        {/* 検索とフィルターセクション */}
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
                    onClick={() => handleSearchTypeChange("accountName")}
                    className={`px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm ${
                      searchType === "accountName"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    名前
                  </button>
                  <button
                    onClick={() => handleSearchTypeChange("accountId")}
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
                  value={searchQuery}
                  onChange={handleSearch}
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
                    checked={dateFilter.enabled}
                    onChange={(e) =>
                      handleDateFilterChange("enabled", e.target.checked)
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
                    className="w-full px-2 md:px-3 py-1 md:py-2 border border-gray-300 rounded-lg text-xs md:text-sm disabled:bg-gray-100 disabled:text-gray-400"
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
                    className="w-full px-2 md:px-3 py-1 md:py-2 border border-gray-300 rounded-lg text-xs md:text-sm disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex items-end space-x-1 md:space-x-2">
              <button
                onClick={resetFilters}
                className="px-2 md:px-4 py-1 md:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-xs md:text-sm"
              >
                フィルターリセット
              </button>
              {(searchQuery || dateFilter.enabled || showFavoritesOnly) && (
                <div className="text-xs md:text-sm text-gray-600">
                  {sortedAccounts.length}件
                </div>
              )}
            </div>
          </div>
        </div>

        {displayedAccounts.length > 0 ? (
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
                        onClick={() => handleSort("key")}
                      >
                        <div className="flex items-center justify-between">
                          <span className="group-hover:text-blue-600">#</span>
                          <span className="ml-1">{getSortIcon("key")}</span>
                        </div>
                      </th>
                      <th
                        className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors group"
                        onClick={() => handleSort("accountName")}
                      >
                        <div className="flex items-center justify-between">
                          <span className="group-hover:text-blue-600">
                            アカウント
                          </span>
                          <span className="ml-1">
                            {getSortIcon("accountName")}
                          </span>
                        </div>
                      </th>
                      {/* スマホではID列を非表示 */}
                      <th
                        className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors group hidden md:table-cell"
                        onClick={() => handleSort("accountId")}
                      >
                        <div className="flex items-center justify-between">
                          <span className="group-hover:text-blue-600">ID</span>
                          <span className="ml-1">
                            {getSortIcon("accountId")}
                          </span>
                        </div>
                      </th>
                      <th
                        className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors group"
                        onClick={() => handleSort("lastCheckedDate")}
                      >
                        <div className="flex items-center justify-between">
                          <span className="group-hover:text-blue-600">
                            最終確認
                          </span>
                          <span className="ml-1">
                            {getSortIcon("lastCheckedDate")}
                          </span>
                        </div>
                      </th>
                      <th
                        className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors group"
                        onClick={() => handleSort("amount")}
                      >
                        <div className="flex items-center justify-between">
                          <span className="group-hover:text-blue-600">
                            Amount
                          </span>
                          <span className="ml-1">{getSortIcon("amount")}</span>
                        </div>
                      </th>
                      <th
                        className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors group"
                        onClick={() => handleSort("favorite")}
                      >
                        <div className="flex items-center justify-between">
                          <span className="group-hover:text-blue-600">♡</span>
                          <span className="ml-1">
                            {getSortIcon("favorite")}
                          </span>
                        </div>
                      </th>
                      <th
                        className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors group"
                        onClick={() => handleSort("addedDate")}
                      >
                        <div className="flex items-center justify-between">
                          <span className="group-hover:text-blue-600">
                            追加日
                          </span>
                          <span className="ml-1">
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
                        <td className="px-3 md:px-6 py-2 md:py-3 whitespace-nowrap">
                          <div className="font-medium text-gray-900 font-mono text-sm">
                            {account.key}
                          </div>
                        </td>
                        <td className="px-3 md:px-6 py-2 md:py-3">
                          <div>
                            <button
                              onClick={() => handleOpenLink(account)}
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
                        <td
                          className={getDateCellStyle(account.lastCheckedDate)}
                        >
                          <div className="text-gray-700 text-sm">
                            {formatDate(account.lastCheckedDate)}
                          </div>
                        </td>
                        <td className="px-3 md:px-6 py-2 md:py-3 whitespace-nowrap">
                          <div className="flex items-center space-x-1 md:space-x-3">
                            <button
                              onClick={() => updateAmount(account.key, -1)}
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
                              onClick={() => updateAmount(account.key, 1)}
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
                            onClick={() => toggleFavorite(account.key)}
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
                <div className="text-center">
                  <button
                    onClick={handleManualLoadMore}
                    className="px-3 md:px-4 py-1 md:py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs md:text-sm"
                  >
                    クリックして次の10件を読み込む
                  </button>
                </div>
              </div>
            )}

            {/* 全件表示完了のメッセージ */}
            {!hasMore && displayedAccounts.length > 0 && (
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
                  <span className="ml-1 md:ml-2 text-xs md:text-sm">
                    （全{sortedAccounts.length}件）
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
        ) : (
          <div className="bg-white rounded-lg md:rounded-xl shadow-md p-6 md:p-8 text-center">
            <div className="text-3xl md:text-4xl mb-3 md:mb-4">📱</div>
            <p className="text-base md:text-lg text-gray-600 mb-2">
              {searchQuery || dateFilter.enabled || showFavoritesOnly
                ? "検索条件に一致するデータがありません"
                : "データが見つかりませんでした"}
            </p>
            <p className="text-xs md:text-sm text-gray-500 mb-4 md:mb-6">
              {searchQuery || dateFilter.enabled || showFavoritesOnly
                ? "検索条件を変更するか、フィルターをリセットしてください"
                : "Firebaseにデータが存在するか確認してください"}
            </p>
            <div className="space-x-2 md:space-x-4">
              <button
                onClick={fetchAllData}
                className="px-4 md:px-6 py-2 md:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm md:text-base"
              >
                データを読み込む
              </button>
              {(searchQuery || dateFilter.enabled || showFavoritesOnly) && (
                <button
                  onClick={resetFilters}
                  className="px-4 md:px-6 py-2 md:py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm md:text-base"
                >
                  フィルターをリセット
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* アカウント追加モーダル */}
      <AddAccountModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAccountAdded={handleAccountAdded}
        allAccounts={allAccounts}
      />

      {/* 一括追加モーダル */}
      <BulkAddModal
        isOpen={showBulkAddModal}
        onClose={() => setShowBulkAddModal(false)}
        onAccountsAdded={handleAccountsAdded}
        allAccounts={allAccounts}
      />
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
    case "favorite":
      return "お気に入り";
    case "addedDate":
      return "追加日";
    default:
      return field;
  }
}
