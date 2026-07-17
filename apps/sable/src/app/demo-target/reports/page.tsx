export default function DemoReports() {
  const bars = [65, 58, 52, 44, 38, 30, 22, 14];
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">レポート</h1>
      <div className="report-chart rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-gray-600">バーンダウンチャート(今スプリント)</h2>
        <div className="flex h-40 items-end gap-2">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: "#6366F1" }} />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-gray-400">
          <span>Day 1</span>
          <span>Day 8</span>
        </div>
      </div>
      <div className="rounded-xl bg-white p-4 text-sm shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-gray-600">ベロシティ</h2>
        <p>直近3スプリント平均: <strong>42pt</strong>(+8%)。CSVエクスポートは右上のメニューから。</p>
      </div>
    </div>
  );
}
