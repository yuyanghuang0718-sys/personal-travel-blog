import { defineConfig } from "tinacms";

const branch = process.env.NEXT_PUBLIC_TINA_BRANCH || process.env.HEAD || process.env.GITHUB_BRANCH || "main";

export default defineConfig({
  branch,
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID || null,
  token: process.env.TINA_TOKEN || null,
  build: {
    outputFolder: "admin",
    publicFolder: "public",
    basePath: "personal-travel-blog",
  },
  media: {
    tina: {
      publicFolder: "public",
      mediaRoot: "assets/uploads",
    },
  },
  telemetry: "disabled",
  schema: {
    collections: [
      {
        name: "post",
        label: "文章",
        path: "content/posts",
        format: "mdx",
        ui: {
          router: ({ document }) => `/articles/${document._sys.filename}/`,
        },
        fields: [
          {
            type: "string",
            name: "title",
            label: "標題",
            isTitle: true,
            required: true,
          },
          {
            type: "string",
            name: "slug",
            label: "Slug",
            required: true,
          },
          {
            type: "datetime",
            name: "date",
            label: "文章日期",
            required: true,
          },
          {
            type: "string",
            name: "category",
            label: "分類",
            required: true,
            options: [
              { value: "city-walk", label: "城市散步" },
              { value: "nature", label: "自然風景" },
              { value: "food", label: "美食餐桌" },
              { value: "overseas", label: "國外旅遊" },
            ],
          },
          {
            type: "string",
            name: "excerpt",
            label: "摘要",
            required: true,
            ui: {
              component: "textarea",
            },
          },
          {
            type: "image",
            name: "cover",
            label: "封面圖",
            required: true,
          },
          {
            type: "string",
            name: "coverAlt",
            label: "封面圖替代文字",
          },
          {
            type: "boolean",
            name: "draft",
            label: "草稿",
          },
          {
            type: "rich-text",
            name: "body",
            label: "內文",
            isBody: true,
            parser: {
              type: "mdx",
            },
            templates: [
              {
                name: "Youtube",
                label: "YouTube Embed",
                fields: [
                  {
                    type: "string",
                    name: "url",
                    label: "YouTube 網址或影片 ID",
                    required: true,
                  },
                  {
                    type: "string",
                    name: "title",
                    label: "標題",
                  },
                ],
              },
              {
                name: "ImageWithCaption",
                label: "圖片與圖說",
                fields: [
                  {
                    type: "image",
                    name: "src",
                    label: "圖片",
                    required: true,
                  },
                  {
                    type: "string",
                    name: "alt",
                    label: "替代文字",
                  },
                  {
                    type: "string",
                    name: "caption",
                    label: "圖說",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
});
