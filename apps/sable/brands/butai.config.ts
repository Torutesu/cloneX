// Butaiブランド(Sableクローンの独自ブランド)。
// 差し替え方法: 同じ形の brands/<brand>.config.ts を作り、src/brand/config.ts のimportを変える
export type SableBrandConfig = {
  name: string;
  tagline: string;
  colors: {
    primary: string;
    primaryDark: string;
    bg: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    success: string;
    warning: string;
    danger: string;
    stageBg: string;
  };
  font: string;
  radius: string;
};

export const butaiBrand: SableBrandConfig = {
  name: "Butai",
  tagline: "製品を実演しながら喋るAIデモ社員",
  colors: {
    primary: "#0F766E", // teal-700(白背景でAAコントラスト確保)
    primaryDark: "#115E59",
    bg: "#F4F8F7",
    surface: "#FFFFFF",
    text: "#132A29",
    textMuted: "#5C6B6A",
    border: "#DDE7E5",
    success: "#10B981",
    warning: "#D97706",
    danger: "#DC2626",
    stageBg: "#0F172A",
  },
  font: `-apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Noto Sans JP", sans-serif`,
  radius: "12px",
};
