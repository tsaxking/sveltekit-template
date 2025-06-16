import type { Post } from '$lib/types/posts';

export const load = async ({ fetch }) => {
	const response = await fetch('/posts/all');
    const posts = await response.json() as Post[];
    return {
        posts,
    }
}
