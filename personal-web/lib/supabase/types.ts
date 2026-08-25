export type PortfolioSection = "work" | "projects" | "reviews" | "media";

export type PortfolioItem = {
  id: string;
  section: PortfolioSection;
  title: string;
  period: string;
  location: string;
  description: string;
  tags: string[];
  media_url: string | null;
  link_url: string | null;
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
};

