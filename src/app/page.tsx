"use client";

import { useEffect, useState } from "react";
import { DashboardClient } from "@/components/dashboard-client";
import { App, Category } from "@/lib/types";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { db } from "@/lib/firebase/client";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";

export default function Dashboard() {
  const { user, loading } = useRequireAuth();
  const [apps, setApps] = useState<App[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch apps
        const appsQuery = query(
          collection(db, "apps"),
          where("isActive", "==", true)
        );
        const appsSnapshot = await getDocs(appsQuery);
        const appsData = appsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as App[];

        // Fetch categories
        const categoriesQuery = query(
          collection(db, "categories"),
          where("isActive", "==", true)
          // TODO: Add back orderBy("sortOrder", "asc") after creating composite index
        );
        const categoriesSnapshot = await getDocs(categoriesQuery);
        const categoriesData = categoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Category[];

        // Fetch user favorites
        const favoritesQuery = collection(db, "users", user.uid, "favorites");
        const favoritesSnapshot = await getDocs(favoritesQuery);
        const favoritesData = favoritesSnapshot.docs.map(doc => doc.id);

        // Fetch user recent
        const recentQuery = query(
          collection(db, "users", user.uid, "recent"),
          orderBy("lastOpenedAt", "desc"),
          limit(10)
        );
        const recentSnapshot = await getDocs(recentQuery);
        const recentData = recentSnapshot.docs.map(doc => doc.id);

        setApps(appsData);
        setCategories(categoriesData);
        setFavorites(favoritesData);
        setRecent(recentData);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading || dataLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <DashboardClient
      initialApps={apps}
      categories={categories}
      initialFavorites={favorites}
      initialRecent={recent}
    />
  );
}
