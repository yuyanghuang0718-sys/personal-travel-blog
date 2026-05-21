export function getPostRouteSlug(post: { id?: string; slug?: string; filePath?: string; data?: { slug?: string } }) {
  const id = post.filePath || post.id || post.slug || post.data?.slug || "";
  const filename = id.replace(/\\/g, "/").split("/").pop()?.replace(/\.(md|mdx)$/i, "");

  return filename || post.data?.slug || "";
}
