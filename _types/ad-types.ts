export interface AdData {
  company_name_banner: string;
  link_banner: string;
  image_banner: string;
  company_name_tower_left: string;
  link_tower_left: string;
  image_tower_left: string;
  company_name_tower_right: string;
  link_tower_right: string;
  image_tower_right: string;
  company_name_billboard: string;
  link_billboard: string;
  image_billboard: string;
  company_name_tower: string;
  link_tower: string;
  image_tower: string;
  company_name_home_page_entertainment: string;
  link_home_page_entertainment: string;
  image_home_page_entertainment: string;
  company_name_home_page_community: string;
  link_home_page_community: string;
  image_home_page_community: string;
  company_name_home_page_sport: string;
  link_home_page_sport: string;
  image_home_page_sport: string;
  company_name_home_page_latest_news: string;
  link_home_page_latest_news: string;
  image_home_page_latest_news: string;
  company_name_home_page_real_estate: string;
  link_home_page_real_estate: string;
  image_home_page_real_estate: string;
}

export interface AdResponse {
  acf: AdData;
}

export interface AdProps {
  src: string;
  alt: string;
  url: string;
  cssClasses?: string;
}
