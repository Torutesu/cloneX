export default function DemoSettings() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">設定</h1>
      <div className="settings-form max-w-lg space-y-4 rounded-xl bg-white p-5 shadow-sm">
        <div>
          <p className="text-sm font-bold text-gray-600">Slack連携</p>
          <label className="mt-1 flex items-center gap-2 text-sm">
            <input type="checkbox" defaultChecked readOnly /> タスク更新を #product に通知
          </label>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-600">メール通知</p>
          <label className="mt-1 flex items-center gap-2 text-sm">
            <input type="checkbox" defaultChecked readOnly /> 期限超過タスクの朝のダイジェスト
          </label>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-600">ワークスペース名</p>
          <input className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm" defaultValue="ACME プロダクトチーム" readOnly />
        </div>
      </div>
    </div>
  );
}
