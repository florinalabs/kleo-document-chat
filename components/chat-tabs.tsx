"use client";

export type ChatTab =
  | "chat"
  | "sources";

type ChatTabsProps = {
  activeTab: ChatTab;
  sourceCount: number;
  onChange: (
    tab: ChatTab
  ) => void;
};

export function ChatTabs({
  activeTab,
  sourceCount,
  onChange,
}: ChatTabsProps) {
  return (
    <div className="flex border-b border-gray-200 px-6">
      <button
        type="button"
        onClick={() =>
          onChange("chat")
        }
        className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
          activeTab === "chat"
            ? "border-green-600 text-green-700"
            : "border-transparent text-gray-500 hover:text-gray-900"
        }`}
      >
        Chat
      </button>

      <button
        type="button"
        onClick={() =>
          onChange("sources")
        }
        className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
          activeTab === "sources"
            ? "border-green-600 text-green-700"
            : "border-transparent text-gray-500 hover:text-gray-900"
        }`}
      >
        Sources

        {sourceCount > 0 && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              activeTab ===
              "sources"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {sourceCount}
          </span>
        )}
      </button>
    </div>
  );
}