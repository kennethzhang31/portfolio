"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  portfolioCategories,
  type PortfolioCategory,
  type PortfolioItem,
} from "@/lib/portfolio";
import { createClient } from "@/lib/supabase/client";

type EditorState = {
  id: string | null;
  category: PortfolioCategory;
  title: string;
  date_label: string;
  start_date: string;
  end_date: string;
  is_ongoing: boolean;
  published_date: string;
  location: string;
  description: string;
  tag_ids: string[];
  external_url: string;
  image_url: string;
  sort_order: number;
  published: boolean;
};

const emptyEditor = (category: PortfolioCategory): EditorState => ({
  id: null,
  category,
  title: "",
  date_label: "",
  start_date: "",
  end_date: "",
  is_ongoing: false,
  published_date: "",
  location: "",
  description: "",
  tag_ids: [],
  external_url: "",
  image_url: "",
  sort_order: 0,
  published: true,
});

const categoryLabels: Record<PortfolioCategory, string> = {
  work: "Work",
  projects: "Projects",
  reviews: "Reviews",
  media: "Media",
};

type Tag = {
  id: string;
  group_id: string;
  name: string;
  slug: string;
  sort_order: number;
};

type TagGroup = {
  id: string;
  name: string;
  slug: string;
  applies_to: PortfolioCategory[];
  sort_order: number;
  tags: Tag[];
};

export default function AdminPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<PortfolioCategory>("work");
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [itemTagIds, setItemTagIds] = useState<Record<string, string[]>>({});
  const [editor, setEditor] = useState<EditorState>(() => emptyEditor("work"));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const loadItems = useCallback(async () => {
    const supabase = createClient();
    const [itemsResult, groupsResult, linksResult] = await Promise.all([
      supabase.from("portfolio_items").select("*").order("sort_order").order("created_at", { ascending: false }),
      supabase.from("tag_groups").select("*, tags(*)").order("sort_order").order("sort_order", { referencedTable: "tags" }),
      supabase.from("portfolio_item_tags").select("portfolio_item_id, tag_id"),
    ]);

    const error = itemsResult.error ?? groupsResult.error ?? linksResult.error;
    if (error) setMessage(error.message);
    else {
      setItems((itemsResult.data ?? []) as PortfolioItem[]);
      setTagGroups((groupsResult.data ?? []) as TagGroup[]);
      const links = (linksResult.data ?? []).reduce<Record<string, string[]>>((result, link) => {
        result[link.portfolio_item_id] ??= [];
        result[link.portfolio_item_id].push(link.tag_id);
        return result;
      }, {});
      setItemTagIds(links);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadItems(), 0);
    return () => window.clearTimeout(timer);
  }, [loadItems]);

  function changeCategory(category: PortfolioCategory) {
    setActiveCategory(category);
    setEditor(emptyEditor(category));
    setMessage("");
  }

  function editItem(item: PortfolioItem) {
    const linkedIds = itemTagIds[item.id] ?? [];
    const legacyIds = linkedIds.length ? linkedIds : tagGroups
      .flatMap((group) => group.tags)
      .filter((tag) => item.tags.some((name) => name.toLowerCase() === tag.name.toLowerCase()))
      .map((tag) => tag.id);
    setEditor({
      id: item.id,
      category: item.category,
      title: item.title,
      date_label: item.date_label ?? "",
      start_date: item.start_date ?? "",
      end_date: item.end_date ?? "",
      is_ongoing: item.is_ongoing,
      published_date: item.published_date ?? "",
      location: item.location ?? "",
      description: item.description,
      tag_ids: legacyIds,
      external_url: item.external_url ?? "",
      image_url: item.image_url ?? "",
      sort_order: item.sort_order,
      published: item.published,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const supabase = createClient();
    const allTags = tagGroups.flatMap((group) => group.tags);
    const selectedTagNames = editor.tag_ids
      .map((id) => allTags.find((tag) => tag.id === id)?.name)
      .filter((name): name is string => Boolean(name));
    const payload = {
      category: editor.category,
      title: editor.title.trim(),
      date_label: editor.date_label.trim() || null,
      start_date: editor.start_date || null,
      end_date: editor.is_ongoing ? null : editor.end_date || null,
      is_ongoing: editor.is_ongoing,
      published_date: editor.published_date || null,
      location: editor.location.trim() || null,
      description: editor.description.trim(),
      tags: selectedTagNames,
      external_url: editor.external_url.trim() || null,
      image_url: editor.image_url.trim() || null,
      sort_order: editor.sort_order,
      published: editor.published,
    };

    let itemId = editor.id;
    const itemResult = editor.id
      ? await supabase.from("portfolio_items").update(payload).eq("id", editor.id)
      : await supabase.from("portfolio_items").insert(payload).select("id").single();
    if (!itemId && itemResult.data && "id" in itemResult.data) itemId = itemResult.data.id;

    if (itemResult.error || !itemId) {
      setMessage(itemResult.error?.message ?? "Could not save the item.");
    } else {
      const { error: unlinkError } = await supabase
        .from("portfolio_item_tags")
        .delete()
        .eq("portfolio_item_id", itemId);
      const { error: linkError } = editor.tag_ids.length && !unlinkError
        ? await supabase.from("portfolio_item_tags").insert(
            editor.tag_ids.map((tagId) => ({ portfolio_item_id: itemId, tag_id: tagId })),
          )
        : { error: null };

      if (unlinkError || linkError) {
        setMessage((unlinkError ?? linkError)?.message ?? "Could not save tags.");
        setSaving(false);
        return;
      }
      setMessage(editor.id ? "Changes saved." : "Item created.");
      setEditor(emptyEditor(activeCategory));
      await loadItems();
    }
    setSaving(false);
  }

  function toggleTag(tagId: string) {
    setEditor((current) => ({
      ...current,
      tag_ids: current.tag_ids.includes(tagId)
        ? current.tag_ids.filter((id) => id !== tagId)
        : [...current.tag_ids, tagId],
    }));
  }

  async function addTag(group: TagGroup) {
    const name = window.prompt(`New ${group.name} tag`);
    if (!name?.trim()) return;
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tags")
      .insert({ group_id: group.id, name: name.trim(), slug })
      .select("id")
      .single();
    if (error) setMessage(error.message);
    else {
      setEditor((current) => ({ ...current, tag_ids: [...current.tag_ids, data.id] }));
      await loadItems();
    }
  }

  async function editTag(tag: Tag) {
    const name = window.prompt("Rename tag", tag.name);
    if (!name?.trim() || name.trim() === tag.name) return;
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await createClient()
      .from("tags")
      .update({ name: name.trim(), slug })
      .eq("id", tag.id);
    if (error) setMessage(error.message);
    else await loadItems();
  }

  async function deleteTag(tag: Tag) {
    if (!window.confirm(`Delete the tag “${tag.name}”? It will be removed from every portfolio item.`)) return;
    const { error } = await createClient().from("tags").delete().eq("id", tag.id);
    if (error) setMessage(error.message);
    else {
      setEditor((current) => ({
        ...current,
        tag_ids: current.tag_ids.filter((id) => id !== tag.id),
      }));
      await loadItems();
    }
  }

  async function addTagGroup() {
    const name = window.prompt("New tag group name");
    if (!name?.trim()) return;
    const categoryInput = window.prompt(
      "Where should it appear? Enter comma-separated categories: work, projects, reviews, media",
      "work, projects, reviews, media",
    );
    if (categoryInput === null) return;
    const appliesTo = categoryInput
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter((value): value is PortfolioCategory =>
        portfolioCategories.includes(value as PortfolioCategory),
      );
    if (!appliesTo.length) {
      setMessage("Choose at least one valid category.");
      return;
    }
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await createClient().from("tag_groups").insert({
      name: name.trim(),
      slug,
      applies_to: appliesTo,
      sort_order: tagGroups.length * 10 + 10,
    });
    if (error) setMessage(error.message);
    else await loadItems();
  }

  async function editTagGroup(group: TagGroup) {
    const name = window.prompt("Tag group name", group.name);
    if (!name?.trim()) return;
    const categoryInput = window.prompt(
      "Comma-separated categories: work, projects, reviews, media",
      group.applies_to.join(", "),
    );
    if (categoryInput === null) return;
    const appliesTo = categoryInput
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter((value): value is PortfolioCategory =>
        portfolioCategories.includes(value as PortfolioCategory),
      );
    if (!appliesTo.length) {
      setMessage("Choose at least one valid category.");
      return;
    }
    const { error } = await createClient()
      .from("tag_groups")
      .update({ name: name.trim(), applies_to: appliesTo })
      .eq("id", group.id);
    if (error) setMessage(error.message);
    else await loadItems();
  }

  async function deleteTagGroup(group: TagGroup) {
    if (!window.confirm(`Delete “${group.name}” and all ${group.tags.length} tags inside it?`)) return;
    const { error } = await createClient().from("tag_groups").delete().eq("id", group.id);
    if (error) setMessage(error.message);
    else {
      const removedIds = new Set(group.tags.map((tag) => tag.id));
      setEditor((current) => ({
        ...current,
        tag_ids: current.tag_ids.filter((id) => !removedIds.has(id)),
      }));
      await loadItems();
    }
  }

  async function deleteItem(item: PortfolioItem) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("portfolio_items").delete().eq("id", item.id);
    if (error) setMessage(error.message);
    else {
      if (editor.id === item.id) setEditor(emptyEditor(activeCategory));
      await loadItems();
    }
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    const supabase = createClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from("portfolio-media").upload(path, file);
    if (error) setMessage(error.message);
    else {
      const { data } = supabase.storage.from("portfolio-media").getPublicUrl(path);
      setEditor((current) => ({ ...current, image_url: data.publicUrl }));
    }
    setUploading(false);
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const visibleItems = items.filter((item) => item.category === activeCategory);
  const visibleTagGroups = tagGroups.filter((group) => group.applies_to.includes(activeCategory));

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-primary">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ternary">Portfolio Admin</p>
            <h1 className="text-3xl font-semibold">Content manager</h1>
          </div>
          <div className="flex gap-3">
            <Link href="/" className="rounded-lg border border-primary/20 px-4 py-2 text-sm hover:border-ternary">View website</Link>
            <button onClick={signOut} className="rounded-lg bg-primary px-4 py-2 text-sm text-fourth">Sign out</button>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2" aria-label="Content sections">
          {portfolioCategories.map((category) => (
            <button
              key={category}
              onClick={() => changeCategory(category)}
              className={`rounded-full px-4 py-2 text-sm transition ${activeCategory === category ? "bg-ternary text-white" : "bg-fourth hover:bg-fifth"}`}
            >
              {categoryLabels[category]}
            </button>
          ))}
        </nav>

        <details className="rounded-2xl bg-fourth p-5 shadow-sm">
          <summary className="cursor-pointer font-semibold">Manage tag taxonomy</summary>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-primary/60">Create, rename, categorize, or remove tag groups and tags.</p>
              <button type="button" onClick={addTagGroup} className="rounded-lg bg-ternary px-3 py-2 text-sm font-medium text-white hover:bg-secondary">+ Tag group</button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {tagGroups.map((group) => (
                <section key={group.id} className="rounded-xl border border-primary/15 bg-background/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">{group.name}</h2>
                      <p className="text-xs text-primary/50">{group.applies_to.map((category) => categoryLabels[category]).join(" · ")}</p>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <button type="button" onClick={() => editTagGroup(group)} className="hover:text-ternary">Edit</button>
                      <button type="button" onClick={() => deleteTagGroup(group)} className="text-ternary hover:underline">Delete</button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.tags.map((tag) => (
                      <span key={tag.id} className="inline-flex items-center gap-1 rounded-full border border-primary/20 px-2.5 py-1 text-xs">
                        <button type="button" onClick={() => editTag(tag)} className="hover:text-ternary">{tag.name}</button>
                        <button type="button" onClick={() => deleteTag(tag)} aria-label={`Delete ${tag.name}`} className="text-primary/40 hover:text-ternary">×</button>
                      </span>
                    ))}
                    <button type="button" onClick={() => addTag(group)} className="rounded-full border border-dashed border-ternary/60 px-2.5 py-1 text-xs text-ternary">+ Add</button>
                  </div>
                </section>
              ))}
            </div>
          </div>
        </details>

        {message && <p className="rounded-lg border border-ternary/30 bg-ternary/10 px-4 py-3 text-sm">{message}</p>}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
          <section className="rounded-2xl bg-fourth p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold">{editor.id ? "Edit item" : `Add ${categoryLabels[activeCategory]}`}</h2>
            <form onSubmit={saveItem} className="space-y-4">
              <label className="block text-sm font-medium">Title
                <input required value={editor.title} onChange={(e) => setEditor({ ...editor, title: e.target.value })} className="mt-1 w-full rounded-lg border border-primary/20 bg-background px-3 py-2 outline-none focus:border-ternary" />
              </label>
              {(activeCategory === "work" || activeCategory === "projects") ? (
                <div className="space-y-3 rounded-xl border border-primary/15 bg-background/40 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium">Start date
                      <input type="date" value={editor.start_date} onChange={(e) => setEditor({ ...editor, start_date: e.target.value })} className="mt-1 w-full rounded-lg border border-primary/20 bg-background px-3 py-2 outline-none focus:border-ternary" />
                    </label>
                    <label className="block text-sm font-medium">End date
                      <input type="date" value={editor.end_date} disabled={editor.is_ongoing} onChange={(e) => setEditor({ ...editor, end_date: e.target.value })} className="mt-1 w-full rounded-lg border border-primary/20 bg-background px-3 py-2 outline-none focus:border-ternary disabled:cursor-not-allowed disabled:opacity-40" />
                    </label>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={editor.is_ongoing} onChange={(e) => setEditor({ ...editor, is_ongoing: e.target.checked, end_date: e.target.checked ? "" : editor.end_date })} />
                    {activeCategory === "work" ? "I currently work here" : "This project is ongoing"}
                  </label>
                </div>
              ) : (
                <label className="block text-sm font-medium">Published date
                  <input type="date" value={editor.published_date} onChange={(e) => setEditor({ ...editor, published_date: e.target.value })} className="mt-1 w-full rounded-lg border border-primary/20 bg-background px-3 py-2 outline-none focus:border-ternary" />
                </label>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">Display date <span className="font-normal text-primary/50">(optional override)</span>
                  <input value={editor.date_label} onChange={(e) => setEditor({ ...editor, date_label: e.target.value })} placeholder="Generated automatically when blank" className="mt-1 w-full rounded-lg border border-primary/20 bg-background px-3 py-2 outline-none focus:border-ternary" />
                </label>
                <label className="block text-sm font-medium">Location
                  <input value={editor.location} onChange={(e) => setEditor({ ...editor, location: e.target.value })} placeholder="Taipei, Taiwan" className="mt-1 w-full rounded-lg border border-primary/20 bg-background px-3 py-2 outline-none focus:border-ternary" />
                </label>
              </div>
              <label className="block text-sm font-medium">Description
                <textarea required rows={5} value={editor.description} onChange={(e) => setEditor({ ...editor, description: e.target.value })} className="mt-1 w-full rounded-lg border border-primary/20 bg-background px-3 py-2 outline-none focus:border-ternary" />
              </label>
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium">Tags</legend>
                {visibleTagGroups.map((group) => (
                  <div key={group.id} className="rounded-xl border border-primary/15 bg-background/50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">{group.name}</p>
                      <button type="button" onClick={() => addTag(group)} className="text-xs text-ternary hover:underline">+ New tag</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {group.tags.map((tag) => {
                        const selected = editor.tag_ids.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => toggleTag(tag.id)}
                            className={`rounded-full border px-3 py-1 text-xs transition ${selected ? "border-ternary bg-ternary text-white" : "border-primary/20 hover:border-ternary"}`}
                          >
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </fieldset>
              <label className="block text-sm font-medium">External URL
                <input type="url" value={editor.external_url} onChange={(e) => setEditor({ ...editor, external_url: e.target.value })} placeholder="https://…" className="mt-1 w-full rounded-lg border border-primary/20 bg-background px-3 py-2 outline-none focus:border-ternary" />
              </label>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Image
                  <input type="file" accept="image/*" onChange={uploadImage} className="mt-1 block w-full text-sm" />
                </label>
                {uploading && <p className="text-sm text-primary/60">Uploading…</p>}
                {editor.image_url && (
                  <div className="relative h-36 overflow-hidden rounded-lg bg-fifth">
                    <Image src={editor.image_url} alt="Upload preview" fill className="object-cover" unoptimized />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-5">
                <label className="text-sm font-medium">Order
                  <input type="number" value={editor.sort_order} onChange={(e) => setEditor({ ...editor, sort_order: Number(e.target.value) })} className="ml-2 w-20 rounded-lg border border-primary/20 bg-background px-2 py-1.5" />
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={editor.published} onChange={(e) => setEditor({ ...editor, published: e.target.checked })} /> Published
                </label>
              </div>
              <div className="flex gap-3">
                <button disabled={saving || uploading} type="submit" className="rounded-lg bg-ternary px-5 py-2.5 font-medium text-white hover:bg-secondary disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
                {editor.id && <button type="button" onClick={() => setEditor(emptyEditor(activeCategory))} className="rounded-lg border border-primary/20 px-5 py-2.5">Cancel</button>}
              </div>
            </form>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{categoryLabels[activeCategory]} entries</h2>
            {loading && <p className="text-primary/60">Loading…</p>}
            {!loading && visibleItems.length === 0 && <p className="rounded-xl bg-fourth p-5 text-primary/60">No entries yet.</p>}
            {visibleItems.map((item) => (
              <article key={item.id} className="rounded-xl bg-fourth p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-xs text-primary/50">{item.date_label || "No date"} · Order {item.sort_order}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs ${item.published ? "bg-green-600/15 text-green-700" : "bg-primary/10 text-primary/60"}`}>{item.published ? "Published" : "Draft"}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-primary/70">{item.description}</p>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => editItem(item)} className="rounded-md border border-primary/20 px-3 py-1.5 text-sm hover:border-ternary">Edit</button>
                  <button onClick={() => deleteItem(item)} className="rounded-md px-3 py-1.5 text-sm text-ternary hover:bg-ternary/10">Delete</button>
                </div>
              </article>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
