export default function DemoBoard() {
  const columns = [
    { name: "Todo", tasks: ["リリースノート作成", "ユーザーインタビュー", "料金ページ改修"] },
    { name: "進行中", tasks: ["API設計", "モバイル対応"] },
    { name: "レビュー", tasks: ["LP改修"] },
    { name: "完了", tasks: ["オンボーディング改善", "SSOリサーチ"] },
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">カンバンボード</h1>
      <div className="board-columns grid grid-cols-4 gap-4">
        {columns.map((c) => (
          <div key={c.name} className="rounded-xl bg-white p-3 shadow-sm">
            <h2 className="mb-2 text-xs font-bold text-gray-500">
              {c.name} <span className="text-gray-400">({c.tasks.length})</span>
            </h2>
            <div className="space-y-2">
              {c.tasks.map((t) => (
                <div key={t} className="cursor-grab rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm">
                  {t}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
