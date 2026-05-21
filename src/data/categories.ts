export const categories = [
  { value: "city-walk", label: "城市散步" },
  { value: "nature", label: "自然風景" },
  { value: "food", label: "美食餐桌" },
  { value: "overseas", label: "國外旅遊" },
] as const;

export type CategoryValue = (typeof categories)[number]["value"];

export const categoryLabel = (value: string) =>
  categories.find((category) => category.value === value)?.label ?? value;
