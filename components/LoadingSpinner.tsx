// components/LoadingSpinner.tsx
interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({
  message = "データを読み込み中...",
}: LoadingSpinnerProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <div className="text-xl">{message}</div>
      </div>
    </div>
  );
}
