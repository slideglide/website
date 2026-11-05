import { getCollection } from "astro:content";

export async function getPosts() {
    const posts = await getCollection("blog", ({ data }) => import.meta.env.DEV || !data.draft);
    return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function formatDate(date: Date) {
    return date.toISOString().slice(0, 10);
}
