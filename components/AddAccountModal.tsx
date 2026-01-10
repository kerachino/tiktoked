"use client";

import { useState } from "react";
import { set } from "firebase/database";
import { ref } from "firebase/database";
import { db } from "@/lib/firebase";
import { TikTokAccount } from "@/types/tiktok";

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountAdded: (newAccount: TikTokAccount) => void;
  allAccounts: TikTokAccount[];
  currentListId: string; // 現在のリストIDを追加
}

export default function AddAccountModal({
  isOpen,
  onClose,
  onAccountAdded,
  allAccounts,
  currentListId, // 現在のリストIDを受け取る
}: AddAccountModalProps) {
  const [newAccount, setNewAccount] = useState({
    accountName: "",
    accountId: "",
    amount: "0",
    favorite: false,
  });
  const [addingAccount, setAddingAccount] = useState(false);

  if (!isOpen) return null;

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
        Deleted: false, // 削除済みフラグを追加
      };

      // Firebaseに追加（現在のリストに追加）
      const accountRef = ref(db, `__collections__/${currentListId}/${newKey}`);
      await set(accountRef, accountData);

      // 親コンポーネントに新しいアカウントを通知
      const newAccountObj: TikTokAccount = {
        key: newKey.toString(),
        accountName: newAccount.accountName.trim(),
        accountId: newAccount.accountId.trim(),
        amount: newAccount.amount || "0",
        lastCheckedDate: formattedDate,
        addedDate: formattedDate,
        favorite: newAccount.favorite,
        deleted: false, // 削除済みフラグを追加
      };

      onAccountAdded(newAccountObj);

      // モーダルを閉じてフォームをリセット
      onClose();
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

  const handleClose = () => {
    setNewAccount({
      accountName: "",
      accountId: "",
      amount: "0",
      favorite: false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 md:p-4 z-50">
      <div className="bg-white rounded-lg md:rounded-xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h3 className="text-lg md:text-xl font-bold text-gray-800">
              アカウント追加
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

          <div className="space-y-3 md:space-y-4">
            {/* 現在のリスト表示 */}
            <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-700 font-medium">
                追加先リスト: <span className="font-bold">{currentListId}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
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
                className="w-full px-3 md:px-4 py-1 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
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
                className="w-full px-3 md:px-4 py-1 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                TikTokのURL: https://www.tiktok.com/@
                <span className="font-semibold">ここに入力したID</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                初期Amount
              </label>
              <input
                type="number"
                min="-1"
                max="100"
                value={newAccount.amount}
                onChange={(e) =>
                  setNewAccount({ ...newAccount, amount: e.target.value })
                }
                className="w-full px-3 md:px-4 py-1 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                初期値（-1:無視してよい, 0:通常）
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                お気に入りに追加
              </label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={newAccount.favorite}
                  onChange={(e) =>
                    setNewAccount({
                      ...newAccount,
                      favorite: e.target.checked,
                    })
                  }
                  className="h-4 w-4 text-red-600 rounded focus:ring-red-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">
                  追加時にお気に入りに登録する
                </span>
              </div>
            </div>

            <div className="pt-3 md:pt-4 border-t border-gray-200">
              <div className="text-xs md:text-sm text-gray-600 mb-3 md:mb-4">
                <p className="font-medium">追加される情報:</p>
                <ul className="mt-1 md:mt-2 space-y-1">
                  <li>• 最終確認日: 今日の日付</li>
                  <li>• 追加日: 今日の日付</li>
                  <li>• 自動的にID採番されます</li>
                  <li>• 削除済みフラグ: false（初期値）</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-2 md:space-x-3 pt-3 md:pt-4">
              <button
                onClick={handleClose}
                className="px-3 md:px-4 py-1 md:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
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
                className="px-3 md:px-4 py-1 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
              >
                {addingAccount ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-white mr-1 md:mr-2"></div>
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
  );
}
