"use server";

import { verifyIdToken } from "@/lib/auth";

async function verifyAdmin(idToken: string) {
    const decodedToken = await verifyIdToken(idToken);
    if (!decodedToken || decodedToken.role !== "ADMIN") {
        throw new Error("Unauthorized: Admin access required");
    }
    return decodedToken;
}

const MAX_ICON_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 6000;

function extractIconHrefs(html: string): string[] {
    const hrefs: string[] = [];
    const linkRegex = /<link\b[^>]*>/gi;
    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(html))) {
        const tag = match[0];
        if (!/rel=["'][^"']*icon[^"']*["']/i.test(tag)) continue;
        const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
        if (hrefMatch) hrefs.push(hrefMatch[1]);
    }
    return hrefs;
}

async function toDataUri(response: Response): Promise<string | null> {
    const contentType = (response.headers.get("content-type") || "").split(";")[0].trim();
    if (contentType && !contentType.startsWith("image/")) return null;

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_ICON_BYTES) return null;

    const base64 = Buffer.from(buffer).toString("base64");
    return `data:${contentType || "image/x-icon"};base64,${base64}`;
}

async function tryFetchIcon(url: string): Promise<string | null> {
    try {
        const res = await fetch(url, {
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            redirect: "follow",
        });
        if (!res.ok) return null;
        return await toDataUri(res);
    } catch {
        return null;
    }
}

export async function fetchSiteIcon(idToken: string, siteUrl: string) {
    try {
        await verifyAdmin(idToken);

        let target: URL;
        try {
            target = new URL(/^https?:\/\//i.test(siteUrl) ? siteUrl : `https://${siteUrl}`);
        } catch {
            return { success: false, message: "Enter a valid website URL first." };
        }

        if (target.protocol !== "http:" && target.protocol !== "https:") {
            return { success: false, message: "Only http/https URLs are supported." };
        }

        // 1. Look at the page's own <link rel="icon"> declarations - most accurate.
        const candidates: string[] = [];
        try {
            const pageRes = await fetch(target.toString(), {
                signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
                redirect: "follow",
            });
            if (pageRes.ok) {
                const html = await pageRes.text();
                for (const href of extractIconHrefs(html)) {
                    try {
                        candidates.push(new URL(href, pageRes.url).toString());
                    } catch {
                        // ignore unparsable href
                    }
                }
            }
        } catch {
            // Site unreachable from the server; fall through to other strategies.
        }

        // 2. Conventional /favicon.ico location.
        try {
            candidates.push(new URL("/favicon.ico", target).toString());
        } catch {
            // unreachable, target already validated above
        }

        for (const candidate of candidates) {
            const dataUri = await tryFetchIcon(candidate);
            if (dataUri) return { success: true, iconUrl: dataUri };
        }

        // 3. Last resort: Google's favicon service, fetched server-side so client-side
        // tracker/ad blockers (which commonly block google.com/s2/favicons) can't break it.
        const fallback = await tryFetchIcon(`https://www.google.com/s2/favicons?domain=${target.hostname}&sz=128`);
        if (fallback) return { success: true, iconUrl: fallback };

        return { success: false, message: "Couldn't find an icon for that site. Try uploading one instead." };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch site icon";
        return { success: false, message };
    }
}
