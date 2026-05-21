# 譯黃大帝 Astro Blog

Astro + MDX migration for the travel and translation blog.

## Local Development

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local URL shown by Astro, usually:

```text
http://127.0.0.1:4321/personal-travel-blog/
```

## Build

```powershell
$env:ASTRO_TELEMETRY_DISABLED='1'
npm.cmd run build
```

## Content

New articles live in:

```text
content/posts/*.mdx
```

Supported categories:

- 城市散步
- 自然風景
- 美食餐桌
- 國外旅遊

Legacy PDF/HTML articles are copied into `public/articles` and `public/assets` so they remain available during the migration.
