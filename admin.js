const adminForm = document.querySelector("[data-admin-form]");
const adminOutput = document.querySelector("[data-admin-output]");

const tagLabels = {
  city: "城市散步",
  nature: "自然風景",
  food: "美食咖啡",
};

const slugify = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);

const escapeHtmlAdmin = (value = "") =>
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

const downloadTextFile = (filename, content, type = "text/html") => {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const paragraphsToHtml = (body) =>
  body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (block.startsWith("## ")) {
        return `<section>\n              <h2>${escapeHtmlAdmin(block.slice(3))}</h2>\n            </section>`;
      }

      return `<section>\n              <p>${escapeHtmlAdmin(block).replace(/\n/g, "<br />")}</p>\n            </section>`;
    })
    .join("\n\n            ");

const buildArticleHtml = ({ title, excerpt, category, body, coverPath }) => `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtmlAdmin(title)} | 宇揚的旅遊札記</title>
    <meta name="description" content="${escapeHtmlAdmin(excerpt)}" />
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
        <a href="../index.html#destinations">目的地</a>
        <a href="../index.html#journal">旅程日誌</a>
        <a href="../index.html#subscribe">訂閱</a>
      </nav>
    </header>

    <main>
      <article class="article-page">
        <section class="article-hero">
          <img src="${escapeHtmlAdmin(coverPath)}" alt="${escapeHtmlAdmin(title)}" />
          <div class="article-hero-content">
            <a class="back-link" href="../index.html#stories">返回文章列表</a>
            <p class="eyebrow">${escapeHtmlAdmin(tagLabels[category])}</p>
            <h1>${escapeHtmlAdmin(title)}</h1>
            <p>${escapeHtmlAdmin(excerpt)}</p>
          </div>
        </section>

        <div class="article-layout single-column">
          <div class="article-body">
            ${paragraphsToHtml(body)}
          </div>
        </div>
      </article>
    </main>

    <footer class="site-footer">
      <p>© 2026 宇揚的旅遊札記</p>
      <div>
        <a href="../index.html#stories">文章</a>
        <a href="../index.html#destinations">目的地</a>
        <a href="../index.html#subscribe">訂閱</a>
      </div>
    </footer>

    <script src="../script.js"></script>
  </body>
</html>
`;

const renderResult = ({ articleHtml, postEntry, articleFilename, imageFilename, imageFile }) => {
  adminOutput.innerHTML = `
    <h2>產生完成</h2>
    <div class="publish-list">
      <div>
        <span>文章檔案</span>
        <strong>articles/${escapeHtmlAdmin(articleFilename)}</strong>
      </div>
      <div>
        <span>圖片位置</span>
        <strong>${escapeHtmlAdmin(imageFilename ? `assets/uploads/${imageFilename}` : "使用預設封面圖")}</strong>
      </div>
      <div>
        <span>首頁資料</span>
        <strong>加入 posts/posts.json</strong>
      </div>
    </div>
    <div class="admin-actions stacked">
      <button class="button primary" type="button" data-download-article>下載文章 HTML</button>
      ${
        imageFile
          ? `<button class="button neutral" type="button" data-download-image>下載封面圖片</button>`
          : ""
      }
      <button class="button neutral" type="button" data-copy-json>複製首頁文章資料</button>
    </div>
    <label class="snippet-box">
      <span>首頁文章資料</span>
      <textarea rows="10" readonly>${escapeHtmlAdmin(JSON.stringify(postEntry, null, 2))}</textarea>
    </label>
  `;

  adminOutput.querySelector("[data-download-article]").addEventListener("click", () => {
    downloadTextFile(articleFilename, articleHtml);
  });

  const imageButton = adminOutput.querySelector("[data-download-image]");
  if (imageButton && imageFile) {
    imageButton.addEventListener("click", () => {
      const url = URL.createObjectURL(imageFile);
      const link = document.createElement("a");
      link.href = url;
      link.download = imageFilename;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  adminOutput.querySelector("[data-copy-json]").addEventListener("click", async () => {
    await navigator.clipboard.writeText(JSON.stringify(postEntry, null, 2));
    adminOutput.querySelector("[data-copy-json]").textContent = "已複製";
  });
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (!file?.size) {
      resolve("");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });

const publishWithLocalServer = async (payload) => {
  const response = await fetch("/api/publish", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.message || "發布失敗");
  return result;
};

if (adminForm) {
  adminForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(adminForm);
    const title = formData.get("title").trim();
    const excerpt = formData.get("excerpt").trim();
    const category = formData.get("category");
    const body = formData.get("body").trim();
    const slug = slugify(formData.get("slug") || title);
    const keywords = formData.get("keywords").trim();
    const imageFile = formData.get("cover");
    const imageExtension = imageFile?.name?.split(".").pop()?.toLowerCase() || "jpg";
    const imageFilename = imageFile?.size ? `${slug}.${imageExtension}` : "";
    const coverPath = imageFilename
      ? `../assets/uploads/${imageFilename}`
      : "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80";
    const articleFilename = `${slug}.html`;
    const postEntry = {
      title,
      excerpt,
      category,
      tag: tagLabels[category],
      keywords,
      image: imageFilename
        ? `assets/uploads/${imageFilename}`
        : "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
      imageAlt: title,
      url: `articles/${articleFilename}`,
      featured: false,
    };
    const articleHtml = buildArticleHtml({ title, excerpt, category, body, coverPath });

    adminOutput.innerHTML = "<h2>處理中</h2><p>正在產生文章與圖片。</p>";

    try {
      const coverDataUrl = await fileToDataUrl(imageFile);
      const result = await publishWithLocalServer({
        title,
        excerpt,
        category,
        body,
        slug,
        keywords,
        cover: coverDataUrl ? { name: imageFile.name, dataUrl: coverDataUrl } : null,
      });

      adminOutput.innerHTML = `
        <h2>已發布</h2>
        <p>文章已寫入網站資料夾，並推送到 GitHub Pages。公開網站通常會在一分鐘內更新。</p>
        <div class="publish-list">
          <div>
            <span>文章網址</span>
            <strong>${escapeHtmlAdmin(result.url)}</strong>
          </div>
          <div>
            <span>首頁資料</span>
            <strong>已更新 posts/posts.json</strong>
          </div>
        </div>
      `;
    } catch {
      renderResult({ articleHtml, postEntry, articleFilename, imageFilename, imageFile: imageFile?.size ? imageFile : null });
    }
  });
}
