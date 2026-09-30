"use client";

import { useState } from "react";
import { PostProps } from "@/_types/post-types";
import { AdData } from "@/_types/ad-types";
import Link from "next/link";
import HomePageNewsGrid from "./home-page-news-grid";
import classNames from "classnames";

interface HomePageCategoryClientProps {
  categorySlug?: string;
  posts: PostProps[];
  adData?: AdData | null;
}

const HomePageCategoryClient = ({
  categorySlug,
  posts,
  adData,
}: HomePageCategoryClientProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const formatCategoryTitle = (slug: string) => {
    return slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <main className="pt-5 flex flex-col gap-5 desktop:pt-10">
      <h3 className="desktop:text-center">
        <Link
          href={categorySlug ? `/${categorySlug}` : "/latest-news"}
          aria-label={`View our latest ${categorySlug} articles`}
          className="font-inter p-2 -m-2 text-24px text-black font-bold desktop:text-36px desktop:hover:text-teal desktop:p-0 desktop:m-0"
        >
          {categorySlug === "time-out"
            ? "Entertainment"
            : categorySlug
            ? formatCategoryTitle(categorySlug)
            : "Latest News"}
        </Link>
      </h3>
      <>
        {!categorySlug && (
          <HomePageNewsGrid
            posts={posts}
            hoveredIndex={hoveredIndex}
            setHoveredIndex={setHoveredIndex}
          />
        )}
        {categorySlug === "sport" && (
          <HomePageNewsGrid
            posts={posts}
            hoveredIndex={hoveredIndex}
            setHoveredIndex={setHoveredIndex}
            adData={adData}
            categorySlug={categorySlug}
          />
        )}
        {categorySlug === "time-out" && (
          <HomePageNewsGrid
            posts={posts}
            hoveredIndex={hoveredIndex}
            setHoveredIndex={setHoveredIndex}
            adData={adData}
            categorySlug={categorySlug}
          />
        )}
        {categorySlug === "community" && (
          <HomePageNewsGrid
            posts={posts}
            hoveredIndex={hoveredIndex}
            setHoveredIndex={setHoveredIndex}
            adData={adData}
            categorySlug={categorySlug}
          />
        )}
        {categorySlug === "real-estate" && (
          <HomePageNewsGrid
            posts={posts}
            hoveredIndex={hoveredIndex}
            setHoveredIndex={setHoveredIndex}
          />
        )}
      </>
    </main>
  );
};

export default HomePageCategoryClient;
