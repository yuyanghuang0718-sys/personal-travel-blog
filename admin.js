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
    adminMode.textContent = "目前是 PDF 文章發布模式：上傳 PDF 後會直接產生文章頁。";
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
    const pdfFile = formData.get("pdf");
    const slug = slugify(title) || fallbackSlug();

    if (!pdfFile?.size) {
      adminOutput.innerHTML = "<h2>尚未發布</h2><p>請先選擇 PDF 文章檔。</p>";
      return;
    }

    adminOutput.innerHTML = "<h2>發布中</h2><p>正在上傳 PDF 並產生文章頁。</p>";

    try {
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
      if (!response.ok || !result.ok) throw new Error(result.message || "發布失敗");

      const publicUrl = `https://yuyanghuang0718-sys.github.io/personal-travel-blog/${result.url}`;
      adminOutput.innerHTML = `
        <h2>已發布</h2>
        <p>PDF 文章已送出。GitHub Pages 通常會在 30 到 60 秒內更新。</p>
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
