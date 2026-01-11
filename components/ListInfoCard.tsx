// components/ListInfoCard.tsx
interface ListInfoCardProps {
  currentList: {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    accountCount: number;
  };
  onDeleteList: (listId: string) => void;
  formatDate: (dateString: string) => string;
}

export default function ListInfoCard({
  currentList,
  onDeleteList,
  formatDate,
}: ListInfoCardProps) {
  return (
    <div className="mb-4 p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h3 className="font-medium text-blue-800">{currentList.name}</h3>
          {currentList.description && (
            <p className="text-sm text-blue-600 mt-1">
              {currentList.description}
            </p>
          )}
          <p className="text-xs text-blue-500 mt-1">
            作成日: {formatDate(currentList.createdAt)} • アカウント数:{" "}
            {currentList.accountCount}件
          </p>
        </div>
        <div className="flex space-x-2 mt-2 md:mt-0">
          <button
            onClick={() => {
              if (currentList.id !== "myfollow") {
                onDeleteList(currentList.id);
              } else {
                alert("デフォルトリストは削除できません");
              }
            }}
            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm"
          >
            リスト削除
          </button>
        </div>
      </div>
    </div>
  );
}
