const EMOJI_REGEX =
  /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Extended_Pictographic})/gu;

export const containsEmoji = (value?: string | null): boolean => {
  if (!value) return false;
  return EMOJI_REGEX.test(value);
};

export const validateNoEmoji = (
  value: string | undefined,
  errorMessage = "Vui lòng không nhập biểu tượng đặc biệt."
) => {
  if (!value) return true;
  return containsEmoji(value) ? errorMessage : true;
};
