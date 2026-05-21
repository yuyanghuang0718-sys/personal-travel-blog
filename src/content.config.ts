import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./content/posts" }),
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    date: z.coerce.date(),
    category: z.enum(["city-walk", "nature", "food", "overseas", "國外旅遊", "國內旅遊", "翻譯雜談"]),
    excerpt: z.string(),
    cover: z.string(),
    coverAlt: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
