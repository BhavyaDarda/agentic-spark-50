export function privatePageHead(title: string, description: string) {
  return { meta: [
    { title: `${title} · REACHER AI` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} · REACHER AI` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] };
}