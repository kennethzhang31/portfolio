export const portfolioCategories = ["work", "projects", "reviews", "media"] as const;

export type PortfolioCategory = (typeof portfolioCategories)[number];

export type PortfolioItem = {
  id: string;
  category: PortfolioCategory;
  title: string;
  date_label: string | null;
  start_date: string | null;
  end_date: string | null;
  is_ongoing: boolean;
  published_date: string | null;
  location: string | null;
  description: string;
  tags: string[];
  external_url: string | null;
  image_url: string | null;
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
};
