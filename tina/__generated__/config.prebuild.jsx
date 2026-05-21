// tina/config.ts
import { defineConfig } from "tinacms";
var branch = process.env.NEXT_PUBLIC_TINA_BRANCH || process.env.HEAD || process.env.GITHUB_BRANCH || "main";
var config_default = defineConfig({
  branch,
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID || null,
  token: process.env.TINA_TOKEN || null,
  build: {
    outputFolder: "admin",
    publicFolder: "public",
    basePath: "personal-travel-blog"
  },
  media: {
    tina: {
      publicFolder: "public",
      mediaRoot: "assets/uploads"
    }
  },
  telemetry: "disabled",
  schema: {
    collections: [
      {
        name: "post",
        label: "\u6587\u7AE0",
        path: "content/posts",
        format: "mdx",
        ui: {
          router: ({ document }) => {
            const filename = document?._sys?.filename;
            const routeSlug = filename || String(document?.slug || "").replace(/^\/?articles\//, "").replace(/\/$/, "");
            return `/personal-travel-blog/articles/${routeSlug}/`;
          }
        },
        fields: [
          {
            type: "string",
            name: "title",
            label: "\u6A19\u984C",
            isTitle: true,
            required: true
          },
          {
            type: "string",
            name: "slug",
            label: "Slug"
          },
          {
            type: "datetime",
            name: "date",
            label: "\u6587\u7AE0\u65E5\u671F",
            required: true
          },
          {
            type: "string",
            name: "category",
            label: "\u5206\u985E",
            required: true,
            options: [
              { value: "city-walk", label: "\u57CE\u5E02\u6563\u6B65" },
              { value: "nature", label: "\u81EA\u7136\u98A8\u666F" },
              { value: "food", label: "\u7F8E\u98DF\u9910\u684C" },
              { value: "overseas", label: "\u570B\u5916\u65C5\u904A" },
              { value: "\u570B\u5916\u65C5\u904A", label: "\u570B\u5916\u65C5\u904A" },
              { value: "\u570B\u5167\u65C5\u904A", label: "\u570B\u5167\u65C5\u904A" },
              { value: "\u7FFB\u8B6F\u96DC\u8AC7", label: "\u7FFB\u8B6F\u96DC\u8AC7" }
            ]
          },
          {
            type: "string",
            name: "excerpt",
            label: "\u6458\u8981",
            required: true,
            ui: {
              component: "textarea"
            }
          },
          {
            type: "image",
            name: "cover",
            label: "\u5C01\u9762\u5716",
            required: true
          },
          {
            type: "string",
            name: "coverAlt",
            label: "\u5C01\u9762\u5716\u66FF\u4EE3\u6587\u5B57"
          },
          {
            type: "boolean",
            name: "draft",
            label: "\u8349\u7A3F"
          },
          {
            type: "rich-text",
            name: "body",
            label: "\u5167\u6587",
            isBody: true,
            parser: {
              type: "mdx"
            },
            templates: [
              {
                name: "Youtube",
                label: "YouTube Embed",
                fields: [
                  {
                    type: "string",
                    name: "url",
                    label: "YouTube \u7DB2\u5740\u6216\u5F71\u7247 ID",
                    required: true
                  },
                  {
                    type: "string",
                    name: "title",
                    label: "\u6A19\u984C"
                  }
                ]
              },
              {
                name: "ImageWithCaption",
                label: "\u5716\u7247\u8207\u5716\u8AAA",
                fields: [
                  {
                    type: "image",
                    name: "src",
                    label: "\u5716\u7247",
                    required: true
                  },
                  {
                    type: "string",
                    name: "alt",
                    label: "\u66FF\u4EE3\u6587\u5B57"
                  },
                  {
                    type: "string",
                    name: "caption",
                    label: "\u5716\u8AAA"
                  },
                  {
                    type: "string",
                    name: "width",
                    label: "\u986F\u793A\u5BEC\u5EA6",
                    options: [
                      { value: "", label: "\u9810\u8A2D 760px" },
                      { value: "100%", label: "\u6EFF\u7248\u5BEC\u5EA6" },
                      { value: "760px", label: "\u5927\u5716 760px" },
                      { value: "640px", label: "\u4E2D\u5927 640px" },
                      { value: "520px", label: "\u4E2D\u5716 520px" },
                      { value: "420px", label: "\u5C0F\u5716 420px" }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
});
export {
  config_default as default
};
