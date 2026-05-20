const adminForm = document.querySelector("[data-admin-form]");
const adminOutput = document.querySelector("[data-admin-output]");
const adminMode = document.querySelector("[data-admin-mode]");

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

const updateAdminMode = async () => {
  if (!adminMode) return;

  try {
    const response = await fetch("/api/health");
    if (!response.ok) throw new Error("not local");
    adminMode.textContent = "目前是直接發布模式：填完後按「產生文章」就會上線。";
    adminMode.classList.add("ready");
  } catch {
    adminMode.textContent = "請用 open-admin.cmd 開啟後台，才可以直接發布。";
    adminMode.classList.remove("ready");
  }
};

if (adminForm) {
  adminForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(adminForm);
    const title = formData.get("title").trim();
    const coverFile = formData.get("cover");
    const slug = slugify(formData.get("slug") || title) || fallbackSlug();

    adminOutput.innerHTML = "<h2>發布中</h2><p>正在寫入文章並推送到 GitHub Pages。</p>";

    try {
      const coverDataUrl = await fileToDataUrl(coverFile);
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          excerpt: formData.get("excerpt").trim(),
          category: formData.get("category"),
          body: formData.get("body").trim(),
          slug,
          keywords: formData.get("keywords").trim(),
          cover: coverDataUrl ? { name: coverFile.name, dataUrl: coverDataUrl } : null,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "發布失敗");

      const publicUrl = `https://yuyanghuang0718-sys.github.io/personal-travel-blog/${result.url}`;
      adminOutput.innerHTML = `
        <h2>已發布</h2>
        <p>文章已送出。GitHub Pages 通常會在 30 到 60 秒內更新。</p>
        <div class="publish-list">
          <div>
            <span>文章網址</span>
            <strong><a href="${publicUrl}" target="_blank" rel="noreferrer">${publicUrl}</a></strong>
          </div>
          <div>
            <span>網站首頁</span>
            <strong><a href="https://yuyanghuang0718-sys.github.io/personal-travel-blog/" target="_blank" rel="noreferrer">打開首頁</a></strong>
          </div>
        </div>
      `;
    } catch (error) {
      adminOutput.innerHTML = `
        <h2>尚未發布</h2>
        <p>${error.message}。請用 open-admin.cmd 開啟後台，再按一次「產生文章」。</p>
      `;
    }
  });
}

updateAdminMode();
