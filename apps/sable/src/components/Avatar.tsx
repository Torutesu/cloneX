"use client";

// 簡易SVGアニメアバター [USER-REQ: 簡易でよいがアバターは必須]
// state: idle(瞬き) / thinking(揺れ+ドット) / speaking(口パク+リング)

export type AvatarState = "idle" | "thinking" | "speaking";

export function Avatar({
  preset,
  accentColor,
  state = "idle",
  size = 96,
  testId = "avatar",
}: {
  preset: string;
  accentColor: string;
  state?: AvatarState;
  size?: number;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      data-avatar={preset}
      data-state={state}
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <div
        className="avatar-ring absolute inset-0 rounded-full"
        style={{ background: accentColor, opacity: state === "speaking" ? 0.35 : 0 }}
      />
      <svg
        viewBox="0 0 100 100"
        width={size * 0.92}
        height={size * 0.92}
        className="avatar-body relative"
      >
        <Face preset={preset} accentColor={accentColor} />
      </svg>
      {state === "thinking" && (
        <div className="absolute -top-1 -right-1 flex gap-0.5 rounded-full px-1.5 py-1 card">
          <span className="thinking-dot h-1.5 w-1.5 rounded-full" style={{ background: accentColor }} />
          <span className="thinking-dot h-1.5 w-1.5 rounded-full" style={{ background: accentColor }} />
          <span className="thinking-dot h-1.5 w-1.5 rounded-full" style={{ background: accentColor }} />
        </div>
      )}
    </div>
  );
}

function Face({ preset, accentColor }: { preset: string; accentColor: string }) {
  switch (preset) {
    case "CIRCLE_B":
      return (
        <>
          <rect x="10" y="10" width="80" height="80" rx="26" fill={accentColor} />
          <g className="avatar-eye">
            <circle cx="36" cy="44" r="6" fill="#fff" />
            <circle cx="64" cy="44" r="6" fill="#fff" />
          </g>
          <rect className="avatar-mouth" x="38" y="60" width="24" height="10" rx="5" fill="#fff" />
        </>
      );
    case "ROBOT":
      return (
        <>
          <line x1="50" y1="4" x2="50" y2="14" stroke={accentColor} strokeWidth="4" />
          <circle cx="50" cy="6" r="4" fill={accentColor} />
          <rect x="14" y="16" width="72" height="68" rx="14" fill={accentColor} />
          <g className="avatar-eye">
            <rect x="30" y="38" width="12" height="12" rx="3" fill="#fff" />
            <rect x="58" y="38" width="12" height="12" rx="3" fill="#fff" />
          </g>
          <rect className="avatar-mouth" x="34" y="62" width="32" height="8" rx="4" fill="#fff" />
        </>
      );
    case "SPARK":
      return (
        <>
          <path
            d="M50 4 L61 34 L94 38 L68 58 L76 92 L50 74 L24 92 L32 58 L6 38 L39 34 Z"
            fill={accentColor}
          />
          <g className="avatar-eye">
            <circle cx="41" cy="46" r="4.5" fill="#fff" />
            <circle cx="59" cy="46" r="4.5" fill="#fff" />
          </g>
          <ellipse className="avatar-mouth" cx="50" cy="60" rx="9" ry="5" fill="#fff" />
        </>
      );
    case "CIRCLE_A":
    default:
      return (
        <>
          <circle cx="50" cy="50" r="42" fill={accentColor} />
          <g className="avatar-eye">
            <circle cx="36" cy="44" r="5.5" fill="#fff" />
            <circle cx="64" cy="44" r="5.5" fill="#fff" />
          </g>
          <ellipse className="avatar-mouth" cx="50" cy="62" rx="11" ry="6" fill="#fff" />
        </>
      );
  }
}
