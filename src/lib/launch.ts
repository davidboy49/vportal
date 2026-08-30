import { User } from "firebase/auth";
import { App } from "@/lib/types";
import { logRecentApp } from "@/actions/user-ops";

/**
 * Records "recently opened" (server-side for real users, localStorage for
 * guests) and opens the app in a new tab. Shared by AppCard and the command
 * palette so launch behavior stays identical everywhere an app can be opened.
 */
export function launchApp(user: User | null, app: App) {
    if (user) {
        const isGuest = user.isAnonymous || user.email === "guest@vportal.com";
        if (!isGuest) {
            user.getIdToken().then(token => logRecentApp(token, app.id));
        } else {
            try {
                const stored = localStorage.getItem("vportal_guest_recent") || "[]";
                const recentList: string[] = JSON.parse(stored);
                const filtered = recentList.filter(id => id !== app.id);
                filtered.unshift(app.id);
                localStorage.setItem("vportal_guest_recent", JSON.stringify(filtered.slice(0, 10)));
                window.dispatchEvent(new Event("vportal_guest_data_updated"));
            } catch (e) {
                console.error("Failed to log guest recent app", e);
            }
        }
    }
    window.open(app.url, "_blank");
}
