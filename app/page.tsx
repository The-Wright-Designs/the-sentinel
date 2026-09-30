import { Metadata } from "next";
import AdSpaceBillboard from "@/_components/ad-spaces/ad-space-billboard";
import HomePageCategoryServer from "@/_components/home-page/home-page-categories/home-page-categories-server";
import TopStoriesComponent from "@/_components/home-page/top-stories/top-stories-component";
import NewsletterSubscriptionComponent from "@/_lib/utils/newsletter-subscription-component";
import PageWrapper from "@/_lib/utils/page-wrapper";
import { fetchAdData } from "@/_components/fetch-ad-data";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "The Sentinel - Local News",
  description:
    "Read the latest local news from The Sentinel. Independent coverage of news, sport and events across the Somerset and Moreton Bay regions of Queensland.",
};

export default async function HomePage() {
  const adData = await fetchAdData();

  return (
    <PageWrapper>
      <TopStoriesComponent />
      <HomePageCategoryServer />
      <div className="my-10">
        <AdSpaceBillboard
          src={adData?.image_billboard || ""}
          alt={adData?.company_name_billboard || "Advertisement"}
          url={adData?.link_billboard || "#"}
        />
      </div>
      <HomePageCategoryServer categorySlug="sport" adData={adData} />
      <HomePageCategoryServer categorySlug="time-out" adData={adData} />
      <NewsletterSubscriptionComponent />
      <HomePageCategoryServer categorySlug="community" adData={adData} />
      <HomePageCategoryServer categorySlug="real-estate" />
    </PageWrapper>
  );
}
