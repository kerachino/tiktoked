// components/ListManagerModal.tsx
import { AccountList } from "@/types/tiktok";

interface ListManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountLists: AccountList[];
  currentListId: string;
  newListName: string;
  setNewListName: (name: string) => void;
  newListDescription: string;
  setNewListDescription: (description: string) => void;
  onCreateNewList: () => void;
  onSwitchList: (listId: string) => void;
  onDeleteList: (listId: string) => void;
}

// 日付フォーマット関数（元のコードから移動）
const formatDate = (dateString: string) => {
  if (!dateString || dateString.trim() === "") return "未設定";

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

export default function ListManagerModal({
  isOpen,
  onClose,
  accountLists,
  currentListId,
  newListName,
  setNewListName,
  newListDescription,
  setNewListDescription,
  onCreateNewList,
  onSwitchList,
  onDeleteList,
}: ListManagerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">リスト管理</h3>

          {/* 新しいリスト作成フォーム */}
          <div className="space-y-4 mb-6">
            <h4 className="text-lg font-medium text-gray-700">
              新しいリストを作成
            </h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                リスト名 *
              </label>
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="例: フォローリスト1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                説明（オプション）
              </label>
              <textarea
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                placeholder="このリストの説明を入力"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              onClick={onCreateNewList}
              disabled={!newListName.trim()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              リストを作成
            </button>
          </div>

          {/* 既存のリスト一覧 */}
          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-3">
              既存のリスト ({accountLists.length})
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {accountLists.map((list) => (
                <div
                  key={list.id}
                  className={`p-3 border rounded-lg flex justify-between items-center ${
                    list.id === currentListId
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 flex items-center">
                      {list.name}
                      {list.id === currentListId && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          現在選択中
                        </span>
                      )}
                    </div>
                    {list.description && (
                      <div className="text-sm text-gray-600 mt-1">
                        {list.description}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      アカウント数: {list.accountCount}件 • 作成日:{" "}
                      {formatDate(list.createdAt)}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onSwitchList(list.id)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                    >
                      選択
                    </button>
                    {list.id !== "myfollow" && (
                      <button
                        onClick={() => onDeleteList(list.id)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
