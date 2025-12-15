// app/page.tsx
"use client";

import Image from "next/image";
import { useEffect, useState, useRef, useCallback } from "react";

const sections = [
  { id: "work", label: "Work" },
  { id: "projects", label: "Projects" },
  { id: "reviews", label: "Reviews" },
  { id: "media", label: "Media" },
];

const workItems = [
  {
    title: "AI R&D Intern · LargitData",
    period: "2025 – Present",
    location: "Taipei, Taiwan",
    description:
      "Building production AI systems: RAG chatbots with OCR/ASR, text-to-SQL BI assistants with auto charting, and MCP-integrated AI agents.",
    tags: ["RAG", "LLMs", "Django", "PostgreSQL", "MCP"],
  },
  {
    title: "Research Assistant · CGV & MIS Lab, NTHU",
    period: "2024 – Present",
    location: "Hsinchu, Taiwan",
    description:
      "Working on multimodal sports analytics: player search from audio + faces and transformer-based sports highlight detection.",
    tags: ["Computer Vision", "Whisper", "Transformers", "Sports Analytics"],
  },
  {
    title: "Research Assistant · AINS Lab, NTHU",
    period: "2025",
    location: "Hsinchu, Taiwan",
    description:
      "Delivered LLM fine-tuning workshops and co-authored work on temporal correlation in large vision-language models.",
    tags: ["LLMs", "Fine-tuning", "VLMs"],
  },
  {
    title: "Teaching Assistant · Intro to Programming, NTHU",
    period: "2025 – Present",
    location: "Hsinchu, Taiwan",
    description:
      "Designed projects, supported lectures, and helped students build solid programming fundamentals.",
    tags: ["Teaching", "Python", "CS Fundamentals"],
  },
];

const projectItems = [
  {
    title: "QubicX – Multimodal AI Assistant",
    year: "2025",
    description:
      "Desktop-like assistant that manages knowledge bases with RAG, plus OCR and ASR pipelines for documents, screenshots, and audio.",
    tags: ["RAG", "LlamaIndex", "Django", "PostgreSQL", "Whisper"],
  },
  {
    title: "Wisbi – ERP AI Assistant",
    year: "2025",
    description:
      "Text-to-SQL assistant for ERP systems, combining RAG feedback loops with automated chart generation for self-service BI.",
    tags: ["Text-to-SQL", "Django", "PostgreSQL", "LLMs"],
  },
  {
    title: "Detect AI-Generated Text",
    year: "2024",
    description:
      "Ensemble transformer classifier to detect AI-generated text, reaching 97.6% on a Kaggle benchmark.",
    tags: ["Transformers", "PyTorch", "PEFT"],
  },
  {
    title: "Virtual Try-On App",
    year: "2024",
    description:
      "Mobile virtual try-on experience using image stitching, built with Flutter and a cloud backend.",
    tags: ["Flutter", "Firestore", "Google Cloud"],
  },
];

const reviewItems = [
  {
    title: "Book — The Pragmatic Programmer",
    year: "2025",
    description:
      "Notes on craftsmanship, communication, and practical heuristics that aged surprisingly well.",
    tags: ["Book", "Craft"],
  },
  {
    title: "Film — Poor Things",
    year: "2024",
    description:
      "Wild, maximalist, and tender. Design language and score are a playground.",
    tags: ["Film", "Design"],
  },
  {
    title: "Album — boygenius: the record",
    year: "2023",
    description:
      "Rich harmonies with quietly devastating lyrics. On repeat while coding.",
    tags: ["Album", "Indie"],
  },
];

const mediaItems = [
  {
    title: "Talk — Building Practical RAG Systems",
    year: "2025",
    description:
      "An opinionated overview of retrieval, chunking strategies, and evaluation with LLM-as-judge.",
    tags: ["Talk", "RAG"],
  },
  {
    title: "Post — Text-to-SQL with Feedback Loops",
    year: "2025",
    description:
      "From schema linking to guardrails: turning one-off queries into reliable assistants.",
    tags: ["Post", "Text-to-SQL"],
  },
  {
    title: "Demo — Multimodal Notes Inbox",
    year: "2024",
    description:
      "OCR + ASR pipeline to turn screenshots and voice memos into searchable notes.",
    tags: ["Demo", "Multimodal"],
  },
];

export default function HomePage() {
  const [fadeProgress, setFadeProgress] = useState(0);
  const [heroOpacity, setHeroOpacity] = useState(1);
  const [extraProgress, setExtraProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<string>("work");
  const [sidebarOffset, setSidebarOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const viewport = window.innerHeight;
      const progress = Math.min(scrollY / (viewport * 0.4), 1);
      
      setFadeProgress(progress);
      setHeroOpacity(1 - progress);
      
      const extra = Math.max(
        0,
        Math.min((scrollY - viewport * 0.4) / (viewport * 0.4), 1)
      );
      setExtraProgress(extra);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scrollspy for active section and sidebar sync
  const calculateSidebarPosition = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const containerHeight = container.offsetHeight;
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

    // Map sections to sidebar positions: work (top), projects (middle), reviews, media (bottom)
    const sectionPositions = [0, 0.5, 0.75, 1];
    let sidebarProgress = sectionPositions[closestIndex];

    // Interpolate between sections for smooth transition
    if (closestIndex < sectionCenters.length - 1) {
      const currentCenter = sectionCenters[closestIndex].center;
      const nextCenter = sectionCenters[closestIndex + 1].center;
      const range = nextCenter - currentCenter;

      if (range > 0) {
        const progress = Math.max(0, Math.min(1, (centerY - currentCenter) / range));
        const currentPos = sectionPositions[closestIndex];
        const nextPos = sectionPositions[closestIndex + 1];
        sidebarProgress = currentPos + (nextPos - currentPos) * progress;
      }
    }

    // Calculate sidebar offset (4% of container height for subtle, smooth movement)
    const sidebarRange = containerHeight * 0.04;
    setSidebarOffset(sidebarProgress * sidebarRange);
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
    <main className="mx-auto max-w-4xl space-y-12 px-4 py-12">
      {/* Hero / Intro */}
      <section
        className="flex min-h-screen items-center transition-opacity duration-300"
        style={{ opacity: heroOpacity }}
      >
        <div className="w-full">
          <p className="text-sm uppercase tracking-[0.2em] text-ternary/60">
            Personal Website
          </p>

          <div className="md:flex md:items-center md:gap-8">
            <div className="flex-1 space-y-4">
              <h1 className="text-4xl font-bold sm:text-5xl">
                <span className="text-ternary">K</span>
                <span className="text-fourth">enneth</span>{" "}
                <span className="text-ternary">Z</span>
                <span className="text-fourth">hang</span>
              </h1>

              <p className="max-w-2xl text-fourth/70">
                Software engineer and ML practitioner working on RAG systems,
                text-to-SQL, and multimodal pipelines. I like building things
                that sit between research and production — tools that people
                actually use — and I occasionally ramble about movies, books,
                and music.
              </p>

              <h2 className="text-xl font-semibold text-fourth">
                Hsinchu / Taipei, Taiwan
              </h2>

              <div className="flex flex-wrap gap-3 pt-2 text-sm text-fourth/60">
                <a
                  href="mailto:kennethzhang31@gmail.com"
                  className="text-ternary underline underline-offset-4 hover:text-secondary"
                >
                  kennethzhang31@gmail.com
                </a>
                <span>·</span>
                <a
                  href="https://github.com/kennethzhang31"
                  target="_blank"
                  rel="noreferrer"
                  className="text-ternary underline underline-offset-4 hover:text-secondary"
                >
                  github.com/kennethzhang31
                </a>
                <span>·</span>
                <a
                  href="https://www.linkedin.com/in/kenneth-chandra-553a06238/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-ternary underline underline-offset-4 hover:text-secondary"
                >
                  linkedin.com/kennethzhang
                </a>
              </div>
            </div>
            <div className="mt-6 md:mt-0">
              <Image
                src="/globe.svg"
                alt="Profile picture"
                width={180}
                height={180}
                className="bg-white rounded-xl p-4 ring-1 ring-fourth/60"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {(() => {
        const containerProgress = Math.max(
          0,
          Math.min(1, (fadeProgress - 0.2) / 0.6),
        );
        const containerTranslate = 48 * (1 - containerProgress);
        const extraRaiseVh = 20 * extraProgress;

        return (
          <div
            ref={containerRef}
            className="mx-[calc(50%-50vw)] -mb-12 min-h-[80vh] w-screen max-w-none space-y-10 rounded-none bg-fourth px-[15%] py-12 sm:rounded-2xl sm:py-16 md:px-[20%] md:py-20 lg:px-[25%] xl:px-[30%]"
            style={{
              transform: `translateY(${containerTranslate}px)`,
              marginTop: `-${extraRaiseVh}vh`,
            }}
          >
            <div className="md:grid md:grid-cols-12 md:gap-8">
              {/* Sidebar nav (desktop) */}
              <nav
                aria-label="Sections"
                className="hidden md:col-span-3 md:block"
              >
                <div className="sticky top-24">
                  <div 
                    className="flex transition-transform duration-300 ease-out" 
                    style={{ transform: `translateY(${sidebarOffset}px)` }}
                  >
                    {/* Rail + circles */}
                    <div className="relative mr-4 flex h-[60vh] flex-col items-center justify-between py-4">
                      <span
                        aria-hidden
                        className="absolute top-6 bottom-6 w-[2px] bg-secondary/60"
                      />
                      {sections.map((section) => {
                        const isActive = activeSection === section.id;
                        return (
                          <button
                            key={section.id}
                            onClick={() => scrollToSection(section.id)}
                            className="relative z-10 flex h-5 w-5 items-center justify-center"
                            aria-label={section.label}
                          >
                            <span
                              className={`h-3 w-3 rounded-full transition-transform duration-200 ${
                                isActive
                                  ? "scale-110 bg-ternary"
                                  : "bg-secondary"
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>

                    {/* Labels */}
                    <ul className="flex h-[60vh] flex-col justify-between py-4 text-sm">
                      {sections.map((section) => {
                        const isActive = activeSection === section.id;
                        return (
                          <li key={section.id}>
                            <button
                              onClick={() => scrollToSection(section.id)}
                              className={`flex items-center text-left transition-colors ${
                                isActive
                                  ? "text-ternary"
                                  : "text-primary hover:text-ternary"
                              }`}
                            >
                              {section.label}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
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
                    {workItems.map((item) => (
                      <article
                        key={item.title}
                        className="rounded-xl border border-fourth bg-fourth p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-fifth hover:shadow-md"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h3 className="text-lg font-semibold text-primary">
                            {item.title}
                          </h3>
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
                    {projectItems.map((item) => (
                      <article
                        key={item.title}
                        className="flex flex-col rounded-xl border border-fourth bg-fourth p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-fifth hover:shadow-md"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="text-base font-semibold text-primary">
                            {item.title}
                          </h3>
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
                    {reviewItems.map((item) => (
                      <article
                        key={item.title}
                        className="flex flex-col rounded-xl border border-fourth bg-fourth p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-fifth hover:shadow-md"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="text-base font-semibold text-primary">
                            {item.title}
                          </h3>
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
                    {mediaItems.map((item) => (
                      <article
                        key={item.title}
                        className="flex flex-col rounded-xl border border-fourth bg-fourth p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-fifth hover:shadow-md"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="text-base font-semibold text-primary">
                            {item.title}
                          </h3>
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