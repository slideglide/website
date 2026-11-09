import type { APIRoute, GetStaticPaths } from "astro";
import { SITE } from "../../config/site";
import { renderOgImage, type OgCard } from "../../lib/og";
import { formatDate, getPosts } from "../../lib/posts";

export const getStaticPaths = (async () => {
    const posts = await getPosts();
    return [
        {
            params: { slug: "home" },
            props: { label: "Bio", title: `Hi, I'm ${SITE.shortName}!`, description: SITE.bio.work },
        },
        {
            params: { slug: "blog" },
            props: { label: "Blog", title: "All posts", description: SITE.blogDescription },
        },
        ...posts.map((post) => ({
            params: { slug: `blog/${post.id}` },
            props: {
                label: "Blog",
                date: formatDate(post.data.date),
                title: post.data.title,
                description: post.data.description ?? SITE.description,
            },
        })),
    ];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) =>
    new Response(new Uint8Array(await renderOgImage(props as OgCard)), {
        headers: { "Content-Type": "image/png" },
    });
