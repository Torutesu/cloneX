export default function DemoDashboard() {
  const kpis = [
    { label: "進行中タスク", value: "24", trend: "+3 今週" },
    { label: "完了率", value: "78%", trend: "+5pt" },
    { label: "期限超過", value: "2", trend: "-1" },
    { label: "チーム稼働", value: "92%", trend: "安定" },
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">ダッシュボード</h1>
      <div className="kpi-cards grid grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className="text-2xl font-bold">{k.value}</p>
            <p className="text-xs text-emerald-600">{k.trend}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-gray-600">最近のアクティビティ</h2>
        <ul className="space-y-2 text-sm">
          <li>✅ 佐藤さんが「LP改修」を完了しました</li>
          <li>💬 田中さんが「API設計」にコメントしました</li>
          <li>📌 新しいタスク「リリースノート作成」が追加されました</li>
        </ul>
      </div>
    </div>
  );
}
