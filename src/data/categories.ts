export const categories = [
  { value: "city-walk", label: "城市散步" },
  { value: "nature", label: "自然風景" },
  { value: "food", label: "美食餐桌" },
  { value: "overseas", label: "國外旅遊" },
] as const;

export const homepageTabs = [
  { value: "overseas,city,國外旅遊", label: "國外旅遊" },
  { value: "city-walk,nature,國內旅遊", label: "國內旅遊" },
  { value: "food,翻譯雜談", label: "翻譯雜談" },
];

export type CategoryValue = (typeof categories)[number]["value"];

export const categoryLabel = (value: string) =>
  categories.find((category) => category.value === value)?.label ?? value;
