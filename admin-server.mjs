import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const port = Number(process.env.PORT || 4173);
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
  city: "城市散步",
  nature: "自然風景",
  food: "美食咖啡",
};

const escapeHtml = (value = "") =>
  value.replace(/[&<>"']/g, (character) => {
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
  value
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

const buildArticleHtml = ({ title, excerpt, category, bodyHtml, coverPath }) => `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)} | 宇揚的旅遊札記</title>
    <meta name="description" content="${escapeHtml(excerpt)}" />
    <link rel="stylesheet" href="../styles.css" />
  </head>
  <body>
    <header class="site-header" data-header>
      <a class="brand" href="../index.html" aria-label="宇揚的旅遊札記首頁">
        <span class="brand-mark">途</span>
        <span>宇揚的旅遊札記</span>
      </a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" data-nav-toggle>
        <span></span>
        <span></span>
        <span></span>
      </button>
      <nav class="site-nav" id="site-nav" data-nav>
        <a href="../index.html#stories">旅行文章</a>
        <a href="../index.html#journal">旅程日誌</a>
        <a href="../index.html#subscribe">訂閱</a>
      </nav>
    </header>

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

    <footer class="site-footer">
      <p>© 2026 宇揚的旅遊札記</p>
      <div>
        <a href="../index.html#stories">文章</a>
        <a href="../index.html#subscribe">訂閱</a>
      </div>
    </footer>

    <script src="../script.js"></script>
  </body>
</html>
`;

const buildPdfArticleHtml = ({ title, excerpt, category, coverPath, pdfPath }) => `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)} | 宇揚的旅遊札記</title>
    <meta name="description" content="${escapeHtml(excerpt)}" />
    <link rel="stylesheet" href="../styles.css" />
  </head>
  <body>
    <header class="site-header" data-header>
      <a class="brand" href="../index.html" aria-label="宇揚的旅遊札記首頁">
        <span class="brand-mark">途</span>
        <span>宇揚的旅遊札記</span>
      </a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" data-nav-toggle>
        <span></span>
        <span></span>
        <span></span>
      </button>
      <nav class="site-nav" id="site-nav" data-nav>
        <a href="../index.html#stories">旅行文章</a>
        <a href="../index.html#journal">旅程日誌</a>
        <a href="../index.html#subscribe">訂閱</a>
      </nav>
    </header>

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
            <div class="pdf-rendered-article" data-pdf-renderer data-pdf-url="${escapeHtml(pdfPath)}">
              <p class="pdf-loading">正在載入文章內容...</p>
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

    <footer class="site-footer">
      <p>© 2026 宇揚的旅遊札記</p>
      <div>
        <a href="../index.html#stories">文章</a>
        <a href="../index.html#subscribe">訂閱</a>
      </div>
    </footer>

    <script src="../script.js"></script>
    <script type="module">
      import * as pdfjsLib from "../assets/vendor/pdfjs/pdf.min.mjs";

      pdfjsLib.GlobalWorkerOptions.workerSrc = "../assets/vendor/pdfjs/pdf.worker.min.mjs";

      const container = document.querySelector("[data-pdf-renderer]");
      const loading = container?.querySelector(".pdf-loading");

      const renderPdf = async () => {
        if (!container) return;

        const fallbackFrame = container.querySelector(".pdf-article-frame");
        const fallbackTimer = window.setTimeout(() => {
          if (container.querySelectorAll(".pdf-page-canvas").length > 0) return;
          if (loading) loading.remove();
          if (fallbackFrame) fallbackFrame.hidden = false;
        }, 2500);

        try {
          const pdf = await pdfjsLib.getDocument(container.dataset.pdfUrl).promise;
          if (loading) loading.remove();
          if (fallbackFrame) fallbackFrame.remove();

          for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            const page = await pdf.getPage(pageNumber);
            const baseViewport = page.getViewport({ scale: 1 });
            const availableWidth = Math.min(container.clientWidth || 900, 980);
            const scale = availableWidth / baseViewport.width;
            const viewport = page.getViewport({ scale });
            const pixelRatio = window.devicePixelRatio || 1;
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");

            canvas.className = "pdf-page-canvas";
            canvas.width = Math.floor(viewport.width * pixelRatio);
            canvas.height = Math.floor(viewport.height * pixelRatio);
            canvas.style.width = Math.floor(viewport.width) + "px";
            canvas.style.height = Math.floor(viewport.height) + "px";

            await page.render({
              canvasContext: context,
              viewport,
              transform: pixelRatio === 1 ? null : [pixelRatio, 0, 0, pixelRatio, 0, 0],
            }).promise;

            container.append(canvas);
          }
          window.clearTimeout(fallbackTimer);
        } catch {
          if (loading) loading.remove();
          if (fallbackFrame) fallbackFrame.hidden = false;
        }
      };

      renderPdf();
    </script>
  </body>
</html>
`;

const sendJson = (response, status, payload) => {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
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
    throw new Error("文章標題、摘要與 PDF 檔都必填。");
  }

  await mkdir(path.join(root, "articles"), { recursive: true });
  await mkdir(path.join(root, "assets", "uploads"), { recursive: true });

  let image = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80";
  let coverPath = image.replace("w=900", "w=1800");

  if (payload.cover?.dataUrl) {
    const match = String(payload.cover.dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) throw new Error("封面圖片格式無法辨識。");

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
    if (!match) throw new Error("PDF 檔案格式無法辨識。");

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

  const postsPath = path.join(root, "posts", "posts.json");
  const posts = JSON.parse(await readFile(postsPath, "utf8"));
  const postEntry = {
    title,
    excerpt,
    category,
    tag: tagLabels[category] || "旅行文章",
    keywords: `${title} ${excerpt} ${tagLabels[category] || "旅行文章"}`,
    image,
    imageAlt: title,
    url: `articles/${articleFilename}`,
    featured: false,
  };
  const nextPosts = [postEntry, ...posts.filter((post) => post.url !== postEntry.url)];
  await writeFile(postsPath, `${JSON.stringify(nextPosts, null, 2)}\n`, "utf8");

  await execFileAsync("git", ["add", "articles", "assets/uploads", "posts/posts.json"]);
  await execFileAsync("git", ["commit", "-m", `Add ${title}`]);
  await execFileAsync("git", ["push"]);

  return { url: `articles/${articleFilename}`, postEntry };
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

  await serveStatic(request, response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Admin available at http://127.0.0.1:${port}/admin.html`);
});
