import * as pdfjsLib from "./assets/vendor/pdfjs/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("./assets/vendor/pdfjs/pdf.worker.min.mjs", import.meta.url).href;

const renderPdfPages = async (container) => {
  const loading = container.querySelector(".pdf-loading");
  const fallbackFrame = container.querySelector(".pdf-article-frame");

  try {
    const pdf = await pdfjsLib.getDocument(container.dataset.pdfUrl).promise;
    if (loading) loading.remove();
    if (fallbackFrame) fallbackFrame.remove();

    const pages = document.createElement("div");
    pages.className = "pdf-rendered-pages";
    container.append(pages);

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
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      await page.render({
        canvasContext: context,
        viewport,
        transform: pixelRatio === 1 ? null : [pixelRatio, 0, 0, pixelRatio, 0, 0],
      }).promise;

      pages.append(canvas);
    }
  } catch {
    if (loading) loading.remove();
    if (fallbackFrame) fallbackFrame.hidden = false;
  }
};

document.querySelectorAll("[data-pdf-renderer]").forEach((container) => {
  renderPdfPages(container);
});
