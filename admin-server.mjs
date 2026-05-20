import { createServer } from "node:http";
import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const port = Number(process.env.PORT || 4174);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

const tagLabels = {
  city: "城市路線",
  nature: "自然風景",
  food: "美食餐桌",
};

const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character];
  });

const slugify = (value) =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);

const fallbackSlug = () => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const time = `${now.getHours()}`.padStart(2, "0") + `${now.getMinutes()}`.padStart(2, "0");
  return `post-${date}-${time}`;
};

const getSafeSlug = (value) => slugify(value) || fallbackSlug();

const readRequestBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
};

const paragraphsToHtml = (body) =>
  body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (block.startsWith("## ")) {
        return `<section>\n              <h2>${escapeHtml(block.slice(3))}</h2>\n            </section>`;
      }

      return `<section>\n              <p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>\n            </section>`;
    })
    .join("\n\n            ");

const sanitizeArticleHtml = (html = "") =>
  html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/\scontenteditable="[^"]*"/gi, "")
    .replace(/\u200b/g, "")
    .replace(/javascript:/gi, "");

const extractDataUrlImages = async (html, slug) => {
  let imageIndex = 0;
  let nextHtml = html;
  const matches = [...html.matchAll(/src="data:(image\/[a-zA-Z0-9.+-]+);base64,([^"]+)"/g)];

  for (const match of matches) {
    imageIndex += 1;
    const extension = match[1].split("/")[1].replace("jpeg", "jpg");
    const imageFilename = `${slug}-inline-${String(imageIndex).padStart(2, "0")}.${extension}`;
    const imagePath = path.join(root, "assets", "uploads", imageFilename);
    await writeFile(imagePath, Buffer.from(match[2], "base64"));
    nextHtml = nextHtml.replace(match[0], `src="../assets/uploads/${imageFilename}"`);
  }

  return nextHtml;
};

const articleHeader = () => `
    <header class="site-header" data-header>
      <a class="brand" href="../index.html" aria-label="宇揚的旅行筆記首頁">
        <span class="brand-mark">旅</span>
        <span>宇揚的旅行筆記</span>
      </a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" data-nav-toggle>
        <span></span>
        <span></span>
        <span></span>
      </button>
      <nav class="site-nav" id="site-nav" data-nav>
        <a href="../index.html#stories">文章</a>
        <a href="../index.html#subscribe">訂閱</a>
      </nav>
    </header>`;

const articleFooter = () => `
    <footer class="site-footer">
      <p>© 2026 宇揚的旅行筆記</p>
      <div>
        <a href="../index.html#stories">文章</a>
        <a href="../index.html#subscribe">訂閱</a>
      </div>
    </footer>`;

const buildArticleHtml = ({ title, excerpt, category, bodyHtml, coverPath }) => `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)} | 宇揚的旅行筆記</title>
    <meta name="description" content="${escapeHtml(excerpt)}" />
    <link rel="stylesheet" href="../styles.css" />
  </head>
  <body>${articleHeader()}

    <main>
      <article class="article-page">
        <section class="article-hero">
          <img src="${escapeHtml(coverPath)}" alt="${escapeHtml(title)}" />
          <div class="article-hero-content">
            <a class="back-link" href="../index.html#stories">返回文章列表</a>
            <p class="eyebrow">${escapeHtml(tagLabels[category] || "旅行文章")}</p>
            <h1>${escapeHtml(title)}</h1>
            <p>${escapeHtml(excerpt)}</p>
          </div>
        </section>

        <div class="article-layout single-column">
          <div class="article-body">
            ${bodyHtml}
          </div>
        </div>
      </article>
    </main>
${articleFooter()}

    <script src="../script.js"></script>
  </body>
</html>
`;

const buildPdfArticleHtml = ({ title, excerpt, category, coverPath, pdfPath }) => `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)} | 宇揚的旅行筆記</title>
    <meta name="description" content="${escapeHtml(excerpt)}" />
    <link rel="stylesheet" href="../styles.css" />
  </head>
  <body>${articleHeader()}

    <main>
      <article class="article-page pdf-post-page">
        <section class="article-hero">
          <img src="${escapeHtml(coverPath)}" alt="${escapeHtml(title)}" />
          <div class="article-hero-content">
            <a class="back-link" href="../index.html#stories">返回文章列表</a>
            <p class="eyebrow">${escapeHtml(tagLabels[category] || "旅行文章")}</p>
            <h1>${escapeHtml(title)}</h1>
            <p>${escapeHtml(excerpt)}</p>
          </div>
        </section>

        <div class="article-layout single-column">
          <div class="article-body">
            <div class="pdf-rendered-article" data-pdf-renderer data-pdf-url="${escapeHtml(pdfPath)}" data-title="${escapeHtml(title)}" data-excerpt="${escapeHtml(excerpt)}">
              <p class="pdf-loading">正在載入 PDF 文章...</p>
              <iframe
                class="pdf-article-frame"
                src="${escapeHtml(pdfPath)}#toolbar=0&navpanes=0&scrollbar=0&view=FitH"
                title="${escapeHtml(title)}"
                hidden
              ></iframe>
            </div>
          </div>
        </div>
      </article>
    </main>
${articleFooter()}

    <script src="../script.js"></script>
    <script type="module" src="../pdf-blog-renderer.js"></script>
  </body>
</html>
`;

const sendJson = (response, status, payload) => {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
};

const postsPath = () => path.join(root, "posts", "posts.json");

const readPosts = async () => JSON.parse(await readFile(postsPath(), "utf8"));

const writePosts = async (posts) => {
  await writeFile(postsPath(), `${JSON.stringify(posts, null, 2)}\n`, "utf8");
};

const commitAndPush = async (files, message) => {
  try {
    await execFileAsync("git", ["add", ...files]);
  } catch (error) {
    return { ok: false, message: `Git 暫存失敗：${error.message}` };
  }

  try {
    await execFileAsync("git", ["diff", "--cached", "--quiet"]);
    return { ok: true, pushed: false, message: "沒有新的 Git 變更需要同步。" };
  } catch {
    try {
      await execFileAsync("git", ["commit", "-m", message]);
      await execFileAsync("git", ["push"]);
      return { ok: true, pushed: true, message: "Git 已提交並推送。" };
    } catch (error) {
      return { ok: false, message: `文章已寫入本機，但 Git 同步失敗：${error.message}` };
    }
  }
};

const getSafeArticlePath = (url) => {
  const normalized = String(url || "").replaceAll("\\", "/");
  if (!normalized.startsWith("articles/") || !normalized.endsWith(".html") || normalized.includes("..")) {
    throw new Error("文章路徑不安全。");
  }

  const articlePath = path.resolve(root, normalized);
  const articlesRoot = path.resolve(root, "articles");
  if (!articlePath.startsWith(articlesRoot + path.sep)) {
    throw new Error("文章路徑不安全。");
  }

  return articlePath;
};

const updateArticleShell = async ({ url, title, excerpt, category }) => {
  const articlePath = getSafeArticlePath(url);
  let html = await readFile(articlePath, "utf8");
  const tag = tagLabels[category] || tagLabels.city;

  html = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)} | 宇揚的旅行筆記</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeHtml(excerpt)}" />`)
    .replace(/<p class="eyebrow">[\s\S]*?<\/p>/, `<p class="eyebrow">${escapeHtml(tag)}</p>`)
    .replace(/<h1>[\s\S]*?<\/h1>\s*<p>[\s\S]*?<\/p>/, `<h1>${escapeHtml(title)}</h1>\n            <p>${escapeHtml(excerpt)}</p>`)
    .replace(/(<img src="[^"]*" alt=")[^"]*(" \/>)/, `$1${escapeHtml(title)}$2`)
    .replace(/data-title="[^"]*"/, `data-title="${escapeHtml(title)}"`)
    .replace(/data-excerpt="[^"]*"/, `data-excerpt="${escapeHtml(excerpt)}"`)
    .replace(/title="[^"]*"\s+hidden/, `title="${escapeHtml(title)}"\n                hidden`);

  await writeFile(articlePath, html, "utf8");
};

const updatePost = async (payload) => {
  const originalUrl = String(payload.originalUrl || "").trim();
  const title = String(payload.title || "").trim();
  const excerpt = String(payload.excerpt || "").trim();
  const category = String(payload.category || "city");

  if (!originalUrl || !title || !excerpt) {
    throw new Error("請填寫文章標題、摘要與原始文章網址。");
  }

  const posts = await readPosts();
  const index = posts.findIndex((post) => post.url === originalUrl);
  if (index < 0) throw new Error("找不到要更新的文章。");

  const tag = tagLabels[category] || tagLabels.city;
  posts[index] = {
    ...posts[index],
    title,
    excerpt,
    category,
    tag,
    keywords: `${title} ${excerpt} ${tag}`,
    imageAlt: title,
  };

  await updateArticleShell({ url: originalUrl, title, excerpt, category });
  await writePosts(posts);

  const sync = await commitAndPush(["articles", "posts/posts.json"], `Update ${title}`);

  return { postEntry: posts[index], sync };
};

const deletePost = async (payload) => {
  const url = String(payload.url || "").trim();
  if (!url) throw new Error("請提供要刪除的文章。");

  const articlePath = getSafeArticlePath(url);
  const posts = await readPosts();
  const post = posts.find((item) => item.url === url);
  const nextPosts = posts.filter((item) => item.url !== url);
  if (nextPosts.length === posts.length) throw new Error("找不到要刪除的文章。");

  await writePosts(nextPosts);
  try {
    await unlink(articlePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const sync = await commitAndPush(["articles", "posts/posts.json"], `Delete ${post?.title || url}`);

  return { deletedUrl: url, sync };
};

const publishPost = async (payload) => {
  const title = String(payload.title || "").trim();
  const excerpt = String(payload.excerpt || "").trim();
  const category = String(payload.category || "city");
  const body = String(payload.body || "").trim();
  const rawBodyHtml = String(payload.bodyHtml || "").trim();
  const slug = getSafeSlug(String(payload.slug || title));
  const isPdfPost = Boolean(payload.pdf?.dataUrl);
  const bodyHtml = rawBodyHtml ? sanitizeArticleHtml(rawBodyHtml) : paragraphsToHtml(body);

  if (!title || !excerpt || !slug || (!isPdfPost && !bodyHtml)) {
    throw new Error("請提供文章標題、摘要，以及 PDF 檔案或內文。");
  }

  await mkdir(path.join(root, "articles"), { recursive: true });
  await mkdir(path.join(root, "assets", "uploads"), { recursive: true });

  let image = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80";
  let coverPath = image.replace("w=900", "w=1800");

  if (payload.cover?.dataUrl) {
    const match = String(payload.cover.dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) throw new Error("封面圖片格式不正確。");

    const extension = match[1].split("/")[1].replace("jpeg", "jpg");
    const imageFilename = `${slug}.${extension}`;
    const imagePath = path.join(root, "assets", "uploads", imageFilename);
    await writeFile(imagePath, Buffer.from(match[2], "base64"));
    image = `assets/uploads/${imageFilename}`;
    coverPath = `../${image}`;
  }

  let pdfPath = "";
  if (isPdfPost) {
    const match = String(payload.pdf.dataUrl).match(/^data:application\/pdf;base64,(.+)$/);
    if (!match) throw new Error("PDF 檔案格式不正確。");

    const pdfFilename = `${slug}.pdf`;
    const pdfFilePath = path.join(root, "assets", "uploads", pdfFilename);
    await writeFile(pdfFilePath, Buffer.from(match[1], "base64"));
    pdfPath = `../assets/uploads/${pdfFilename}`;
  }

  const articleFilename = `${slug}.html`;
  const articlePath = path.join(root, "articles", articleFilename);
  const articleHtml = isPdfPost
    ? buildPdfArticleHtml({ title, excerpt, category, coverPath, pdfPath })
    : buildArticleHtml({
        title,
        excerpt,
        category,
        bodyHtml: await extractDataUrlImages(bodyHtml, slug),
        coverPath,
      });
  await writeFile(articlePath, articleHtml, "utf8");

  const tag = tagLabels[category] || "旅行文章";
  const posts = await readPosts();
  const postEntry = {
    title,
    excerpt,
    category,
    tag,
    keywords: `${title} ${excerpt} ${tag}`,
    image,
    imageAlt: title,
    url: `articles/${articleFilename}`,
    featured: false,
  };
  const nextPosts = [postEntry, ...posts.filter((post) => post.url !== postEntry.url)];
  await writePosts(nextPosts);

  const sync = await commitAndPush(["articles", "assets/uploads", "posts/posts.json"], `Add ${title}`);

  return { url: `articles/${articleFilename}`, postEntry, sync };
};

const serveStatic = async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(url.pathname);
  const requestedPath = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.resolve(root, requestedPath);

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    });
    response.end(file);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

  if (url.pathname === "/api/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/posts") {
    try {
      sendJson(response, 200, { ok: true, posts: await readPosts() });
    } catch (error) {
      sendJson(response, 500, { ok: false, message: error.message });
    }
    return;
  }

  if (url.pathname === "/api/publish" && request.method === "POST") {
    try {
      const payload = JSON.parse(await readRequestBody(request));
      const result = await publishPost(payload);
      sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      sendJson(response, 400, { ok: false, message: error.message });
    }
    return;
  }

  if (url.pathname === "/api/update-post" && request.method === "POST") {
    try {
      const payload = JSON.parse(await readRequestBody(request));
      const result = await updatePost(payload);
      sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      sendJson(response, 400, { ok: false, message: error.message });
    }
    return;
  }

  if (url.pathname === "/api/delete-post" && request.method === "POST") {
    try {
      const payload = JSON.parse(await readRequestBody(request));
      const result = await deletePost(payload);
      sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      sendJson(response, 400, { ok: false, message: error.message });
    }
    return;
  }

  await serveStatic(request, response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Admin available at http://127.0.0.1:${port}/admin.html`);
});
