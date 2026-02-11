"use server";

import { adminDb } from "@/lib/firebase/admin";
import { verifyIdToken } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function seedData(idToken: string) {
    try {
        const user = await verifyIdToken(idToken);
        if (!user || user.role !== "ADMIN") throw new Error("Unauthorized");
        if (!adminDb) throw new Error("Database not initialized");

        const categories = [
            { id: "productivity", name: "Productivity", sortOrder: 1, isActive: true },
            { id: "development", name: "Development", sortOrder: 2, isActive: true },
            { id: "finance", name: "Finance", sortOrder: 3, isActive: true },
            { id: "hr", name: "HR & People", sortOrder: 4, isActive: true },
        ];

        const apps = [
            {
                name: "Jira",
                url: "https://jira.atlassian.com",
                description: "Issue tracking and project management.",
                iconUrl: "https://w7.pngwing.com/pngs/433/762/png-transparent-jira-hugo-jira-software-confluence-atlassian-cor-jira-software-blue-angle-text-thumbnail.png",
                categoryId: "productivity",
                tags: ["Project Management", "Agile"],
                isActive: true,
            },
            {
                name: "Slack",
                url: "https://slack.com",
                description: "Team communication and collaboration.",
                iconUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Slack_icon_2019.svg/2048px-Slack_icon_2019.svg.png",
                categoryId: "productivity",
                tags: ["Communication", "Chat"],
                isActive: true,
            },
            {
                name: "GitHub",
                url: "https://github.com",
                description: "Code hosting and version control.",
                iconUrl: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
                categoryId: "development",
                tags: ["Git", "Code"],
                isActive: true,
            },
            {
                name: "Workday",
                url: "https://workday.com",
                description: "Finance and HR management system.",
                iconUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Workday_Inc._logo.svg/1200px-Workday_Inc._logo.svg.png",
                categoryId: "hr",
                tags: ["HR", "Finance"],
                isActive: true,
            }
        ];

        // Batch write
        const batch = adminDb.batch();

        for (const cat of categories) {
            const ref = adminDb.collection("categories").doc(cat.id);
            batch.set(ref, cat, { merge: true });
        }

        for (const app of apps) {
            const ref = adminDb.collection("apps").doc(); // Auto ID
            batch.set(ref, { ...app, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        }

        // Also set default settings
        const settingsRef = adminDb.collection("settings").doc("global");
        batch.set(settingsRef, { portalName: "VPortal", logoUrl: "" }, { merge: true });

        await batch.commit();

        revalidatePath("/");
        return { success: true, message: "Data seeded successfully" };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
