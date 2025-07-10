import { browser } from "$app/environment";
import { attemptAsync } from "ts-utils/check"

export const getTitle = (url: string) => {
    return attemptAsync(async () => {
        if (!browser) {
            throw new Error("getTitle can only be called in the browser");
        }
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                cache: 'no-cache',
            }
        }).then(res => res.text());

        const parse = new DOMParser();
        const doc = parse.parseFromString(res, 'text/html');
        const tilte = doc.querySelector('title');
        if (!tilte) {
            throw new Error("Title not found in the document");
        }
        return tilte.textContent || "No title found";
    });
}