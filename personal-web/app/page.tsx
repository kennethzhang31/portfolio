// app/page.tsx
"use client";

import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import type { PortfolioItem } from "@/lib/portfolio";
import { createClient } from "@/lib/supabase/client";
import profilePicture from "@/assets/profile_pic.png";

const sections = [
  { id: "work", label: "Work" },
  { id: "projects", label: "Projects" },
  { id: "reviews", label: "Reviews" },
  { id: "media", label: "Media" },
];

type BaseDisplayItem = {
  title: string;
  description: string;
  tags: string[];
  externalUrl?: string;
  imageUrl?: string;
};

type WorkDisplayItem = BaseDisplayItem & { period: string; location: string };
type DatedDisplayItem = BaseDisplayItem & { year: string };

const heroPathX = [0, 137, 274, 411, 549, 686, 823, 960];
const heroPathFillsLight = [
  "#a8a492",
  "#998f81",
  "#897c71",
  "#776963",
  "#655754",
  "#524646",
];
const heroPathFillsDark = [
  "#77727a",
  "#68626b",
  "#59525c",
  "#4b444e",
  "#3d363f",
  "#302a32",
];
const heroPathStart = [
  [374, 394, 398, 401, 403, 361, 414, 399],
  [407, 428, 388, 429, 386, 399, 446, 413],
  [462, 449, 455, 417, 437, 449, 465, 416],
  [453, 441, 458, 484, 460, 469, 484, 445],
  [468, 479, 475, 496, 471, 498, 482, 476],
  [516, 506, 497, 495, 498, 509, 520, 515],
];
const heroPathEnd = [
  [292, 322, 328, 332, 334, 273, 351, 329],
  [340, 372, 313, 374, 310, 329, 399, 350],
  [423, 404, 413, 357, 386, 404, 429, 355],
  [410, 392, 417, 457, 420, 433, 457, 397],
  [432, 449, 443, 475, 438, 478, 453, 444],
  [505, 489, 476, 473, 478, 494, 510, 502],
];

function getHeroPath(layer: number, progress: number) {
  const ridge = heroPathX
    .map((x, index) => {
      const startY = heroPathStart[layer][index];
      const endY = heroPathEnd[layer][index];
      const y = startY + (endY - startY) * progress;
      return `${index === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join("");

  return `${ridge}L960 541L823 541L686 541L549 541L411 541L274 541L137 541L0 541Z`;
}

function CardTitle({ item, className }: { item: BaseDisplayItem; className: string }) {
  return item.externalUrl ? (
    <a href={item.externalUrl} target="_blank" rel="noreferrer" className={`${className} hover:text-ternary`}>
      {item.title}
    </a>
  ) : (
    <h3 className={className}>{item.title}</h3>
  );
}

function formatPortfolioDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(
    new Date(`${value}T00:00:00`),
  );
}

function formatDateRange(item: PortfolioItem) {
  if (item.date_label) return item.date_label;
  const start = formatPortfolioDate(item.start_date);
  if (!start) return item.is_ongoing ? "Ongoing" : "";
  const end = item.is_ongoing
    ? item.category === "work" ? "Present" : "Ongoing"
    : formatPortfolioDate(item.end_date);
  return end ? `${start} – ${end}` : start;
}

export default function HomePage() {
  const [fadeProgress, setFadeProgress] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [activeSection, setActiveSection] = useState<string>("work");
  const [workContent, setWorkContent] = useState<WorkDisplayItem[]>([]);
  const [projectContent, setProjectContent] = useState<DatedDisplayItem[]>([]);
  const [reviewContent, setReviewContent] = useState<DatedDisplayItem[]>([]);
  const [mediaContent, setMediaContent] = useState<DatedDisplayItem[]>([]);
  const heroPathFills = theme === "dark" ? heroPathFillsDark : heroPathFillsLight;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    async function loadPortfolio() {
      const { data, error } = await createClient()
        .from("portfolio_items")
        .select("*")
        .eq("published", true)
        .order("sort_order", { ascending: true });

      if (error || !data) return;
      const items = [...(data as PortfolioItem[])].sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        const aDate = a.category === "work" || a.category === "projects"
          ? a.start_date
          : a.published_date;
        const bDate = b.category === "work" || b.category === "projects"
          ? b.start_date
          : b.published_date;
        return (bDate ?? "").localeCompare(aDate ?? "");
      });
      const work = items.filter((item) => item.category === "work");
      const projects = items.filter((item) => item.category === "projects");
      const reviews = items.filter((item) => item.category === "reviews");
      const media = items.filter((item) => item.category === "media");

      setWorkContent(work.map((item) => ({
          title: item.title,
          period: formatDateRange(item),
          location: item.location ?? "",
          description: item.description,
          tags: item.tags,
          externalUrl: item.external_url ?? undefined,
          imageUrl: item.image_url ?? undefined,
        })));
      setProjectContent(projects.map((item) => ({
          title: item.title,
          year: formatDateRange(item),
          description: item.description,
          tags: item.tags,
          externalUrl: item.external_url ?? undefined,
          imageUrl: item.image_url ?? undefined,
        })));
      setReviewContent(reviews.map((item) => ({
          title: item.title,
          year: item.date_label ?? formatPortfolioDate(item.published_date),
          description: item.description,
          tags: item.tags,
          externalUrl: item.external_url ?? undefined,
          imageUrl: item.image_url ?? undefined,
        })));
      setMediaContent(media.map((item) => ({
          title: item.title,
          year: item.date_label ?? formatPortfolioDate(item.published_date),
          description: item.description,
          tags: item.tags,
          externalUrl: item.external_url ?? undefined,
          imageUrl: item.image_url ?? undefined,
        })));
    }

    void loadPortfolio();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const viewport = window.innerHeight;
      const rawProgress = Math.min(scrollY / (viewport * 0.7), 1);
      const progress = rawProgress * rawProgress * (3 - 2 * rawProgress);
      
      setFadeProgress(progress);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scrollspy for active section and sidebar sync
  const calculateSidebarPosition = useCallback(() => {
    const viewportCenter = window.innerHeight / 2;
    const centerY = window.scrollY + viewportCenter;

    // Get section centers
    const sectionCenters = sections
      .map((s) => {
        const el = document.getElementById(s.id);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          id: s.id,
          center: window.scrollY + rect.top + rect.height / 2,
        };
      })
      .filter((s): s is { id: string; center: number } => s !== null);

    if (sectionCenters.length === 0) return;

    // Find closest section to viewport center
    let closestIndex = 0;
    let minDistance = Math.abs(sectionCenters[0].center - centerY);

    for (let i = 1; i < sectionCenters.length; i++) {
      const distance = Math.abs(sectionCenters[i].center - centerY);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    setActiveSection(sectionCenters[closestIndex].id);
  }, []);

  useEffect(() => {
    // Use IntersectionObserver for active section detection
    const observer = new IntersectionObserver(
      () => calculateSidebarPosition(),
      {
        rootMargin: "-40% 0px -40% 0px",
        threshold: 0,
      }
    );

    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    // Throttle scroll handler with requestAnimationFrame for smooth updates
    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          calculateSidebarPosition();
          rafId = null;
        });
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // Initial calculation after mount
    requestAnimationFrame(calculateSidebarPosition);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [calculateSidebarPosition]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="mx-auto max-w-4xl px-4 pb-12">
      <button
        type="button"
        onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
        className="fixed right-5 top-5 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-secondary/60 bg-fourth/90 shadow-md backdrop-blur transition hover:scale-105 hover:border-ternary"
        aria-label={`Switch to ${theme === "light" ? "night" : "day"} mode`}
        title={`Switch to ${theme === "light" ? "night" : "day"} mode`}
      >
        <Image
          src={theme === "light" ? "/moon.svg" : "/sun.svg"}
          alt=""
          width={24}
          height={24}
          className={`transition duration-500 ${theme === "dark" ? "invert" : ""}`}
        />
      </button>

      {/* Hero / Intro */}
      <section
        className="relative mx-[calc(50%-50vw)] flex min-h-screen w-screen items-center overflow-hidden"
      >
        <div aria-hidden className="absolute inset-0 bg-[var(--hero-sky)]" />
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 h-full w-full"
          viewBox="0 0 960 540"
          preserveAspectRatio="xMidYMid slice"
        >
          {heroPathFills.map((fill, layer) => (
            <path
              key={layer}
              d={getHeroPath(layer, fadeProgress)}
              fill={fill}
              className="transition-[fill] duration-1000 ease-in-out"
            />
          ))}
        </svg>

        <div className="relative z-10 mx-auto w-full max-w-4xl px-4">
          <p className="text-sm uppercase tracking-[0.2em] text-[var(--hero-accent-text)]">
            Personal Website
          </p>

          <div className="md:flex md:items-center md:gap-8">
            <div className="flex-1 space-y-4">
              <h1 className="text-4xl font-bold sm:text-5xl">
                <span className="text-[var(--hero-accent-text)]">K</span>
                <span className="text-[var(--hero-muted-text)]">enneth</span>{" "}
                <span className="text-[var(--hero-accent-text)]">Z</span>
                <span className="text-[var(--hero-muted-text)]">hang</span>
              </h1>

              <p className="max-w-2xl text-[var(--hero-muted-text)]">
                Software engineer and ML practitioner working on RAG systems,
                text-to-SQL, and multimodal pipelines. I like building things
                that sit between research and production — tools that people
                actually use — and I occasionally ramble about movies, books,
                and music.
              </p>

              <h2 className="text-xl font-semibold text-[var(--hero-muted-text)]">
                Hsinchu / Taipei, Taiwan
              </h2>

              <div className="flex flex-wrap gap-3 pt-2 text-sm text-[var(--hero-muted-text)]">
                <a
                  href="mailto:kennethzhang31@gmail.com"
                  className="text-[var(--hero-accent-text)] underline underline-offset-4 hover:opacity-70"
                >
                  kennethzhang31@gmail.com
                </a>
                <span>·</span>
                <a
                  href="https://github.com/kennethzhang31"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--hero-accent-text)] underline underline-offset-4 hover:opacity-70"
                >
                  github.com/kennethzhang31
                </a>
                <span>·</span>
                <a
                  href="https://www.linkedin.com/in/kenneth-chandra-553a06238/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--hero-accent-text)] underline underline-offset-4 hover:opacity-70"
                >
                  linkedin.com/kennethzhang
                </a>
              </div>
            </div>
            <div className="hidden md:mt-0 md:block">
              <Image
                src={profilePicture}
                alt="Kenneth Zhang"
                width={180}
                height={180}
                className="aspect-square rounded-xl object-cover ring-1 ring-fourth/60"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {(() => {
        return (
          <div
            className="relative z-10 mx-[calc(50%-50vw)] -mb-12 min-h-[80vh] w-screen max-w-none space-y-10 rounded-none bg-fourth px-[15%] py-12 sm:rounded-t-2xl sm:py-16 md:px-[20%] md:py-20 lg:px-[25%] xl:px-[30%]"
          >
            <div className="md:grid md:grid-cols-12 md:gap-8">
              {/* Sidebar nav (desktop) */}
              <nav
                aria-label="Sections"
                className="hidden md:col-span-3 md:block"
              >
                <div className="sticky top-24">
                  <ul className="relative space-y-2 border-l border-secondary/35 py-1 text-sm">
                      {sections.map((section) => {
                        const isActive = activeSection === section.id;
                        return (
                          <li key={section.id}>
                            <button
                              onClick={() => scrollToSection(section.id)}
                              className={`group relative flex w-full items-center rounded-r-xl py-3 pl-6 pr-3 text-left transition-all ${
                                isActive
                                  ? "bg-ternary/10 font-semibold text-ternary"
                                  : "text-primary/70 hover:bg-fifth hover:text-primary"
                              }`}
                            >
                              <span
                                aria-hidden
                                className={`absolute -left-[5px] h-[9px] w-[9px] rounded-full ring-4 ring-fourth transition-all ${
                                  isActive
                                    ? "scale-125 bg-ternary shadow-[0_0_0_4px_rgba(236,91,56,0.14)]"
                                    : "bg-secondary group-hover:bg-ternary"
                                }`}
                              />
                              {section.label}
                            </button>
                          </li>
                        );
                      })}
                  </ul>
                </div>
              </nav>

              {/* Content */}
              <div className="md:col-span-9 space-y-10">
                {/* Mobile pills nav */}
                <nav className="mb-6 md:hidden" aria-label="Sections">
                  <ul className="flex flex-wrap gap-3 text-xs">
                    {sections.map((section) => {
                      const isActive = activeSection === section.id;
                      return (
                        <li key={section.id}>
                          <button
                            onClick={() => scrollToSection(section.id)}
                            className={`rounded-full border px-3 py-1 transition-colors ${
                              isActive
                                ? "border-ternary bg-ternary/10 text-ternary"
                                : "border-secondary/60 text-primary/80 hover:bg-secondary/10"
                            }`}
                          >
                            {section.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </nav>

                {/* Portfolio – Work */}
                <section id="work" className="space-y-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-2xl font-semibold text-ternary">Work</h2>
                    <p className="text-sm text-primary/60">
                      Internships, research, and teaching roles
                    </p>
                  </div>
                  <div className="space-y-4">
                    {workContent.length === 0 && (
                      <p className="rounded-xl bg-fifth p-4 text-sm text-primary/60">No published work entries yet.</p>
                    )}
                    {workContent.map((item) => (
                      <article
                        key={item.title}
                        className="rounded-xl border border-fourth bg-fourth p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-fifth hover:shadow-md"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <CardTitle item={item} className="text-lg font-semibold text-primary" />
                          <span className="text-xs font-medium uppercase tracking-wide text-primary/60">
                            {item.period}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-primary/60">
                          {item.location}
                        </p>
                        <p className="mt-2 text-sm text-primary/80">
                          {item.description}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-fourth bg-fourth px-2 py-0.5 text-xs text-primary/70"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                {/* Portfolio – Projects */}
                <section id="projects" className="space-y-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-2xl font-semibold text-ternary">
                      Projects
                    </h2>
                    <p className="text-sm text-primary/60">
                      Selected things I&apos;ve built or shipped
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {projectContent.length === 0 && (
                      <p className="rounded-xl bg-fifth p-4 text-sm text-primary/60 md:col-span-2">No published projects yet.</p>
                    )}
                    {projectContent.map((item) => (
                      <article
                        key={item.title}
                        className="flex flex-col rounded-xl border border-fourth bg-fourth p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-fifth hover:shadow-md"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <CardTitle item={item} className="text-base font-semibold text-primary" />
                          <span className="text-xs text-primary/60">
                            {item.year}
                          </span>
                        </div>
                        <p className="mt-2 flex-1 text-sm text-primary/80">
                          {item.description}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-fourth px-2 py-0.5 text-xs text-primary/80"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                {/* Reviews */}
                <section id="reviews" className="space-y-4">
                  <h2 className="text-2xl font-semibold text-ternary">Reviews</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {reviewContent.length === 0 && (
                      <p className="rounded-xl bg-fifth p-4 text-sm text-primary/60 md:col-span-2">No published reviews yet.</p>
                    )}
                    {reviewContent.map((item) => (
                      <article
                        key={item.title}
                        className="flex flex-col rounded-xl border border-fourth bg-fourth p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-fifth hover:shadow-md"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <CardTitle item={item} className="text-base font-semibold text-primary" />
                          <span className="text-xs text-primary/60">
                            {item.year}
                          </span>
                        </div>
                        <p className="mt-2 flex-1 text-sm text-primary/80">
                          {item.description}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-fourth px-2 py-0.5 text-xs text-primary/80"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                {/* Media */}
                <section id="media" className="space-y-4 pb-8">
                  <h2 className="text-2xl font-semibold text-ternary">Media</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {mediaContent.length === 0 && (
                      <p className="rounded-xl bg-fifth p-4 text-sm text-primary/60 md:col-span-2">No published media yet.</p>
                    )}
                    {mediaContent.map((item) => (
                      <article
                        key={item.title}
                        className="flex flex-col rounded-xl border border-fourth bg-fourth p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-fifth hover:shadow-md"
                      >
                        {item.imageUrl && (
                          <div className="relative mb-4 aspect-video overflow-hidden rounded-lg bg-fifth">
                            <Image src={item.imageUrl} alt="" fill className="object-cover" unoptimized />
                          </div>
                        )}
                        <div className="flex items-baseline justify-between gap-2">
                          <CardTitle item={item} className="text-base font-semibold text-primary" />
                          <span className="text-xs text-primary/60">
                            {item.year}
                          </span>
                        </div>
                        <p className="mt-2 flex-1 text-sm text-primary/80">
                          {item.description}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-fourth px-2 py-0.5 text-xs text-primary/80"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}
