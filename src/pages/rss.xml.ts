import { getCollection } from "astro:content";
import { getPostRouteSlug } from "../utils/postRoute";

const siteUrl = "https://yuyanghuang0718-sys.github.io";
const basePath = "/personal-travel-blog";
const feedTitle = "譯黃大帝";
const feedDescription = "譯黃大帝最新旅遊文章";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export async function GET() {
  const posts = (await getCollection("posts"))
    .filter((post) => !post.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  const items = posts
    .map((post) => {
      const url = `${siteUrl}${basePath}/articles/${getPostRouteSlug(post)}/`;

      return [
        "    <item>",
        `      <title>${escapeXml(post.data.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `      <pubDate>${post.data.date.toUTCString()}</pubDate>`,
        `      <description>${escapeXml(post.data.excerpt)}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  const latestDate = posts[0]?.data.date ?? new Date();
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "  <channel>",
    `    <title>${escapeXml(feedTitle)}</title>`,
    `    <link>${siteUrl}${basePath}/</link>`,
    `    <description>${escapeXml(feedDescription)}</description>`,
    `    <lastBuildDate>${latestDate.toUTCString()}</lastBuildDate>`,
    "    <language>zh-TW</language>",
    items,
    "  </channel>",
    "</rss>",
  ].join("\n");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
