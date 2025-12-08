
interface GoogleAccounts {
  id: {
    initialize: (config: GoogleInitConfig) => void;
    prompt: (
      callback?: (notification: GooglePromptNotification) => void
    ) => void;
    renderButton: (parent: HTMLElement, options: GoogleButtonConfig) => void;
  };
}

interface GoogleInitConfig {
  client_id: string;
  callback: (response: GoogleCallbackResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: "signin" | "signup" | "use";
}

interface GoogleCallbackResponse {
  credential: string;
  select_by?: string;
}

interface GooglePromptNotification {
  isDisplayed: () => boolean;
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  isDismissedMoment: () => boolean;
  getMomentType: () => string;
  getDismissedReason: () => string;
}

interface GoogleButtonConfig {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number;
  locale?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: GoogleAccounts;
    };
  }
}

export {};
