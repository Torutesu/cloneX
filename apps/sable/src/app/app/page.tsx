"use client";

// SCR-011: AI社員一覧
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";

type Employee = {
  id: string;
  name: string;
  productName: string;
  status: string;
  brainStatus: string;
  persona: { displayName: string; avatarPreset: string; accentColor: string } | null;
};

export default function EmployeeListPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[] | null>(null);

  useEffect(() => {
    fetch("/api/ai-employees").then(async (res) => {
      if (res.ok) setEmployees((await res.json()).employees);
    });
  }, []);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-lg font-bold">AI社員</h1>
        <Link href="/app/new" className="btn btn-primary" data-testid="create-employee">
          + AI社員を作成
        </Link>
      </div>

      {employees === null ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="card h-32 animate-pulse" />
          <div className="card h-32 animate-pulse" />
        </div>
      ) : employees.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <p className="font-bold">最初のAI社員を作成しましょう</p>
          <p className="text-sm" style={{ color: "var(--brand-text-muted)" }}>
            製品URLを渡すだけで、デモ台本とナレッジを自動で用意します
          </p>
          <Link href="/app/new" className="btn btn-primary">
            + 作成
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {employees.map((e) => (
            <button
              key={e.id}
              data-testid="employee-card"
              className="card flex items-center gap-4 p-5 text-left"
              onClick={() => router.push(`/app/${e.id}/sessions`)}
            >
              <Avatar
                preset={e.persona?.avatarPreset ?? "CIRCLE_A"}
                accentColor={e.persona?.accentColor ?? "#6C5CE7"}
                size={56}
                testId={`card-avatar-${e.id}`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{e.persona?.displayName ?? e.name}</p>
                <p className="truncate text-sm" style={{ color: "var(--brand-text-muted)" }}>
                  {e.productName}
                </p>
                <div className="mt-1.5 flex gap-1.5">
                  <span className={`badge ${e.status === "PUBLISHED" ? "badge-success" : "badge-muted"}`}>
                    {e.status}
                  </span>
                  <span
                    className={`badge ${
                      e.brainStatus === "READY"
                        ? "badge-success"
                        : e.brainStatus === "FAILED"
                          ? "badge-warning"
                          : "badge-muted"
                    }`}
                  >
                    Brain: {e.brainStatus}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
