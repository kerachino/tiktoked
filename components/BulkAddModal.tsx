"use client";

import { useState, useEffect } from "react";
import { set } from "firebase/database";
import { ref } from "firebase/database";
import { db } from "@/lib/firebase";
import { TikTokAccount } from "@/types/tiktok";

interface BulkAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountsAdded: (newAccounts: TikTokAccount[]) => void;
  allAccounts: TikTokAccount[];
}

interface PreviewAccount {
  accountName: string;
  accountId: string;
  previewKey: string;
}

interface DuplicateAccount extends PreviewAccount {
  reason: string;
}

export default function BulkAddModal({
  isOpen,
  onClose,
  onAccountsAdded,
  allAccounts,
}: BulkAddModalProps) {
  const [bulkHtml, setBulkHtml] = useState("");
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<PreviewAccount[]>([]);
  const [bulkDuplicates, setBulkDuplicates] = useState<DuplicateAccount[]>([]);

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

      // 重複を除いたアカウントのみをフィルタリング
      const uniqueAccounts = accounts.filter(
        (account) =>
          !allAccounts.some((acc) => acc.accountId === account.accountId)
      );

      // プレビューにキー番号を追加（降順で振り分け）
      const previewWithKeys = uniqueAccounts.map((account, index) => ({
        ...account,
        previewKey: (maxKey + uniqueAccounts.length - index).toString(),
      }));

      setBulkPreview(previewWithKeys);

      // 重複チェック（プレビュー内での重複）
      const duplicates: DuplicateAccount[] = [];
      accounts.forEach((account) => {
        // 既存のアカウントと比較
        const existingAccount = allAccounts.find(
          (acc) => acc.accountId === account.accountId
        );

        if (existingAccount) {
          duplicates.push({
            ...account,
            previewKey: existingAccount.key,
            reason: `ID "${account.accountId}" が既に存在します（キー: ${existingAccount.key}）`,
          });
        }

        // プレビュー内での重複チェック
        const duplicateInAccounts = accounts.filter(
          (acc) => acc.accountId === account.accountId
        );

        if (
          duplicateInAccounts.length > 1 &&
          !duplicates.some((d) => d.accountId === account.accountId)
        ) {
          duplicates.push({
            ...account,
            previewKey: "",
            reason: `プレビュー内でIDが${duplicateInAccounts.length}回重複しています`,
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
      const maxKey = existingKeys.length > 0 ? Math.max(...existingKeys) : 0;

      // 重複を除いた追加対象アカウントをフィルタリング
      const uniqueAccounts = accounts.filter(
        (account) =>
          !allAccounts.some((acc) => acc.accountId === account.accountId)
      );

      if (uniqueAccounts.length === 0) {
        alert("すべてのアカウントが既に存在します");
        setBulkProcessing(false);
        return;
      }

      const today = new Date();
      const formattedDate = `${today.getFullYear()}/${(today.getMonth() + 1)
        .toString()
        .padStart(2, "0")}/${today.getDate().toString().padStart(2, "0")}`;

      const newAccounts: TikTokAccount[] = [];
      let addedCount = 0;

      // 重複を除いたアカウントを降順で追加
      for (let i = 0; i < uniqueAccounts.length; i++) {
        const account = uniqueAccounts[i];

        // 降順でキーを振り分け（最大値 + 追加件数 - インデックス）
        const newKey = maxKey + uniqueAccounts.length - i;

        // 新しいアカウントデータ
        const accountData = {
          AccountName: account.accountName,
          AccountID: account.accountId,
          Amount: "0",
          LastCheckedDate: formattedDate,
          AddedDate: formattedDate,
          Favorite: false,
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

      // 親コンポーネントに新しいアカウントを通知
      if (newAccounts.length > 0) {
        onAccountsAdded(newAccounts);
      }

      // モーダルを閉じてフォームをリセット
      onClose();
      setBulkHtml("");
      setBulkPreview([]);
      setBulkDuplicates([]);

      // 結果を通知
      alert(
        `${addedCount}件のアカウントを追加しました（${
          accounts.length - addedCount
        }件スキップ）`
      );
    } catch (error) {
      console.error("一括追加エラー:", error);
      alert("一括追加に失敗しました。コンソールを確認してください。");
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleClose = () => {
    setBulkHtml("");
    setBulkPreview([]);
    setBulkDuplicates([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 md:p-4 z-50">
      <div className="bg-white rounded-lg md:rounded-xl shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h3 className="text-lg md:text-xl font-bold text-gray-800">
              アカウント一括追加
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-5 h-5 md:w-6 md:h-6"
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

          <div className="space-y-4 md:space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                TikTokのHTMLを貼り付けてください
              </label>
              <textarea
                value={bulkHtml}
                onChange={(e) => handleBulkHtmlChange(e.target.value)}
                placeholder="TikTokのフォロー/フォロワーリストのHTMLをコピーして貼り付けてください"
                rows={6}
                className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs md:text-sm"
              />
              <p className="mt-1 md:mt-2 text-xs text-gray-500">
                TikTokのフォロー/フォロワーリストページで右クリック →
                「ページのソースを表示」または開発者ツールからHTMLをコピーしてください
              </p>
            </div>

            {/* プレビュー */}
            {bulkPreview.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <h4 className="font-medium text-gray-700 text-sm md:text-base">
                    検出されたアカウント: {bulkPreview.length}件
                  </h4>
                  <div className="text-xs md:text-sm text-gray-500">
                    {bulkDuplicates.length > 0 && (
                      <span className="text-orange-600">
                        {bulkDuplicates.length}件の重複あり
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg border border-gray-200 max-h-48 md:max-h-60 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 md:px-4 py-1 md:py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          キー
                        </th>
                        <th className="px-2 md:px-4 py-1 md:py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          アカウント名
                        </th>
                        <th className="px-2 md:px-4 py-1 md:py-2 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                          ID
                        </th>
                        <th className="px-2 md:px-4 py-1 md:py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          ステータス
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bulkPreview.map((account, index) => {
                        const isDuplicate = bulkDuplicates.some(
                          (d) => d.accountId === account.accountId
                        );

                        return (
                          <tr
                            key={index}
                            className={
                              isDuplicate ? "bg-orange-50" : "hover:bg-gray-50"
                            }
                          >
                            <td className="px-2 md:px-4 py-1 md:py-2 text-xs">
                              <div className="font-mono font-medium text-gray-700 text-center">
                                {account.previewKey}
                              </div>
                            </td>
                            <td className="px-2 md:px-4 py-1 md:py-2 text-xs">
                              <div className="font-medium">
                                {account.accountName || "（未設定）"}
                              </div>
                              <div className="md:hidden text-xs text-gray-500 font-mono truncate">
                                {account.accountId}
                              </div>
                            </td>
                            <td className="px-2 md:px-4 py-1 md:py-2 text-xs font-mono hidden md:table-cell">
                              {account.accountId}
                            </td>
                            <td className="px-2 md:px-4 py-1 md:py-2 text-xs">
                              {isDuplicate ? (
                                <span className="inline-flex items-center px-1 md:px-2 py-0.5 md:py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  <svg
                                    className="w-2 h-2 md:w-3 md:h-3 mr-0.5 md:mr-1"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  重複
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1 md:px-2 py-0.5 md:py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <svg
                                    className="w-2 h-2 md:w-3 md:h-3 mr-0.5 md:mr-1"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  追加可能
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 重複の詳細 */}
                {bulkDuplicates.length > 0 && (
                  <div className="mt-2 md:mt-3">
                    <h5 className="text-xs md:text-sm font-medium text-orange-700 mb-1 md:mb-2">
                      重複アカウントの詳細:
                    </h5>
                    <ul className="text-xs text-gray-600 space-y-0.5 md:space-y-1">
                      {bulkDuplicates.map((dup, index) => (
                        <li key={index} className="flex items-start">
                          <span className="inline-block w-1.5 h-1.5 md:w-2 md:h-2 bg-orange-400 rounded-full mt-0.5 md:mt-1 mr-1 md:mr-2"></span>
                          <span>
                            <span className="font-mono mr-0.5 md:mr-1">
                              #{dup.previewKey}:
                            </span>
                            <span className="font-medium">
                              {dup.accountName}
                            </span>
                            <span className="font-mono mx-0.5 md:mx-1">
                              ({dup.accountId})
                            </span>
                            - {dup.reason}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-gray-200 pt-3 md:pt-4">
              <div className="text-xs md:text-sm text-gray-600 mb-3 md:mb-4">
                <p className="font-medium">追加される情報（各アカウント）:</p>
                <ul className="mt-1 md:mt-2 space-y-0.5 md:space-y-1">
                  <li>• 最終確認日: 今日の日付</li>
                  <li>• 追加日: 今日の日付</li>
                  <li>• Amount: 0（初期値）</li>
                  <li>• Favorite: false（初期値）</li>
                  <li>• 重複するIDは自動的にスキップされます</li>
                  <li>• 自動的に連番でIDが採番されます</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-2 md:space-x-3 pt-3 md:pt-4">
              <button
                onClick={handleClose}
                className="px-3 md:px-4 py-1 md:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                disabled={bulkProcessing}
              >
                キャンセル
              </button>
              <button
                onClick={handleBulkAddAccounts}
                disabled={bulkProcessing || bulkPreview.length === 0}
                className="px-3 md:px-4 py-1 md:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
              >
                {bulkProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-white mr-1 md:mr-2"></div>
                    追加中...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2"
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
                    {bulkDuplicates.length > 0
                      ? `重複を除いて${bulkPreview.length}件を追加`
                      : `${bulkPreview.length}件を追加`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
