(() => {
const adminForm = document.querySelector("[data-admin-form]");
const adminOutput = document.querySelector("[data-admin-output]");
const adminMode = document.querySelector("[data-admin-mode]");
const postList = document.querySelector("[data-post-list]");
const refreshPostsButton = document.querySelector("[data-refresh-posts]");
const originalUrlInput = document.querySelector("[data-original-url]");
const pdfInput = document.querySelector("[data-pdf-input]");
const submitLabel = document.querySelector("[data-submit-label]");
const cancelEditButton = document.querySelector("[data-cancel-edit]");

let posts = [];

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

const isEditing = () => Boolean(originalUrlInput?.value);

const setCreateMode = () => {
  if (!adminForm) return;
  adminForm.reset();
  if (originalUrlInput) originalUrlInput.value = "";
  if (pdfInput) pdfInput.required = true;
  if (submitLabel) submitLabel.textContent = "產生文章";
  if (cancelEditButton) cancelEditButton.textContent = "清空";
};

const setEditMode = (post) => {
  adminForm.elements.title.value = post.title || "";
  adminForm.elements.category.value = post.category || "city";
  adminForm.elements.excerpt.value = post.excerpt || "";
  if (originalUrlInput) originalUrlInput.value = post.url;
  if (pdfInput) {
    pdfInput.required = false;
    pdfInput.value = "";
  }
  if (submitLabel) submitLabel.textContent = "儲存修改";
  if (cancelEditButton) cancelEditButton.textContent = "取消編輯";
  adminForm.scrollIntoView({ behavior: "smooth", block: "start" });
};

const renderPosts = () => {
  if (!postList) return;

  if (!posts.length) {
    postList.innerHTML = '<p class="empty-state">目前沒有文章。</p>';
    return;
  }

  postList.innerHTML = posts
    .map(
      (post) => `
        <article class="admin-post-item" data-url="${escapeHtml(post.url)}">
          <img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.imageAlt || post.title)}" />
          <div>
            <span>${escapeHtml(post.tag || post.category || "")}</span>
            <strong>${escapeHtml(post.title)}</strong>
            <p>${escapeHtml(post.excerpt)}</p>
          </div>
          <div class="admin-post-actions">
            <a class="button neutral" href="${escapeHtml(post.url)}" target="_blank" rel="noreferrer">查看</a>
            <button class="button neutral" type="button" data-edit-post>編輯</button>
            <button class="button danger" type="button" data-delete-post>刪除</button>
          </div>
        </article>
      `
    )
    .join("");
};

const loadPosts = async () => {
  if (!postList) return;
  postList.innerHTML = '<p class="empty-state">正在載入文章...</p>';

  try {
    const response = await fetch("/api/posts");
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || "文章清單載入失敗。");
    posts = result.posts;
    renderPosts();
  } catch (error) {
    postList.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
  }
};

const updateAdminMode = async () => {
  if (!adminMode) return;

  try {
    const response = await fetch("/api/health");
    if (!response.ok) throw new Error("not local");
    adminMode.textContent = "本機後台已連線，可以新增、編輯、刪除文章。";
    adminMode.classList.add("ready");
  } catch {
    adminMode.textContent = "請用 open-admin.cmd 啟動後台，才能發布或管理文章。";
    adminMode.classList.remove("ready");
  }
};

const publishPost = async (formData) => {
  const title = formData.get("title").trim();
  const coverFile = formData.get("cover");
  const pdfFile = formData.get("pdf");
  const slug = slugify(title) || fallbackSlug();

  if (!pdfFile?.size) {
    throw new Error("請選擇 PDF 文章檔。");
  }

  const coverDataUrl = await fileToDataUrl(coverFile);
  const pdfDataUrl = await fileToDataUrl(pdfFile);
  const response = await fetch("/api/publish", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      excerpt: formData.get("excerpt").trim(),
      category: formData.get("category"),
      slug,
      cover: coverDataUrl ? { name: coverFile.name, dataUrl: coverDataUrl } : null,
      pdf: { name: pdfFile.name, dataUrl: pdfDataUrl },
    }),
  });

  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.message || "發布失敗。");
  return result;
};

const updatePost = async (formData) => {
  const response = await fetch("/api/update-post", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      originalUrl: formData.get("originalUrl"),
      title: formData.get("title").trim(),
      excerpt: formData.get("excerpt").trim(),
      category: formData.get("category"),
    }),
  });

  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.message || "儲存失敗。");
  return result;
};

if (adminForm) {
  adminForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(adminForm);
    const editing = isEditing();

    adminOutput.innerHTML = editing
      ? "<h2>正在儲存</h2><p>正在更新文章基本資料。</p>"
      : "<h2>正在發布</h2><p>正在上傳 PDF 並產生文章。</p>";

    try {
      const result = editing ? await updatePost(formData) : await publishPost(formData);
      const publicUrl = `https://yuyanghuang0718-sys.github.io/personal-travel-blog/${result.url || result.postEntry.url}`;
      adminOutput.innerHTML = `
        <h2>${editing ? "已儲存修改" : "已產生文章"}</h2>
        <p>文章清單已更新，GitHub Pages 通常需要 30 到 60 秒才會看到最新內容。</p>
        <div class="publish-list">
          <div>
            <span>文章網址</span>
            <strong><a href="${publicUrl}" target="_blank" rel="noreferrer">${publicUrl}</a></strong>
          </div>
        </div>
      `;
      setCreateMode();
      await loadPosts();
    } catch (error) {
      adminOutput.innerHTML = `
        <h2>操作失敗</h2>
        <p>${escapeHtml(error.message)}</p>
      `;
    }
  });

  adminForm.addEventListener("reset", () => {
    window.setTimeout(setCreateMode);
  });
}

postList?.addEventListener("click", async (event) => {
  const item = event.target.closest("[data-url]");
  if (!item) return;

  const post = posts.find((entry) => entry.url === item.dataset.url);
  if (!post) return;

  if (event.target.matches("[data-edit-post]")) {
    setEditMode(post);
    adminOutput.innerHTML = "<h2>編輯模式</h2><p>目前只修改標題、分類和摘要；PDF 檔案維持不變。</p>";
  }

  if (event.target.matches("[data-delete-post]")) {
    const confirmed = window.confirm(`確定刪除「${post.title}」？這會從首頁清單移除，並刪除文章 HTML。`);
    if (!confirmed) return;

    adminOutput.innerHTML = "<h2>正在刪除</h2><p>正在移除文章。</p>";
    try {
      const response = await fetch("/api/delete-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: post.url }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "刪除失敗。");
      adminOutput.innerHTML = "<h2>已刪除</h2><p>文章已從清單移除。</p>";
      setCreateMode();
      await loadPosts();
    } catch (error) {
      adminOutput.innerHTML = `<h2>刪除失敗</h2><p>${escapeHtml(error.message)}</p>`;
    }
  }
});

refreshPostsButton?.addEventListener("click", loadPosts);

updateAdminMode();
loadPosts();
})();
