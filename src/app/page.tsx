"use client";

import { useEffect, useState } from "react";
import { DashboardClient } from "@/components/dashboard-client";
import { App, Category } from "@/lib/types";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { db } from "@/lib/firebase/client";
import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from "firebase/firestore";

export default function Dashboard() {
  const { user, loading } = useRequireAuth();
  const [apps, setApps] = useState<App[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let appsLoaded = false;
    let categoriesLoaded = false;
    let userDataLoaded = false;

    const checkLoading = () => {
      if (appsLoaded && categoriesLoaded && userDataLoaded) {
        setDataLoading(false);
      }
    };

    // Real-time listener for apps
    const appsQuery = query(collection(db, "apps"));
    const unsubscribeApps = onSnapshot(appsQuery, (snapshot) => {
      const allApps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as App[];
      setApps(allApps.filter(app => app.isActive !== false));
      appsLoaded = true;
      checkLoading();
    }, (error) => console.error("Error fetching apps:", error));

    // Real-time listener for categories
    const categoriesQuery = query(collection(db, "categories"));
    const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
      const allCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Category[];
      setCategories(allCategories.filter(cat => cat.isActive !== false));
      categoriesLoaded = true;
      checkLoading();
    }, (error) => console.error("Error fetching categories:", error));

    const fetchUserData = async () => {
      try {
        const favoritesSnapshot = await getDocs(collection(db, "users", user.uid, "favorites"));
        setFavorites(favoritesSnapshot.docs.map(doc => doc.id));

        const recentQuery = query(collection(db, "users", user.uid, "recent"), orderBy("lastOpenedAt", "desc"), limit(10));
        const recentSnapshot = await getDocs(recentQuery);
        setRecent(recentSnapshot.docs.map(doc => doc.id));
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        userDataLoaded = true;
        checkLoading();
      }
    };

    fetchUserData();

    return () => {
      unsubscribeApps();
      unsubscribeCategories();
    };
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
