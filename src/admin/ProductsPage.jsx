import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Overlay from "../components/ui/Modal.jsx";
import Button from "../components/ui/Button.jsx";
import { Field, Input, Select, Textarea, Checkbox } from "../components/ui/Form.jsx";
import { Badge } from "../components/ui/Typography.jsx";
import { PlusIcon, SearchIcon, TrashIcon, UploadIcon } from "../components/ui/Icons.jsx";
import { fetchProductsAdmin, fetchCategoriesAdmin, fetchBrandsAdmin, saveProduct, uploadProductImage, removeUnusedImages } from "../api/admin.js";
import { img } from "../lib/images.js";
import { formatPrice, slugify } from "../lib/format.js";
import { useCatalog } from "../catalog/CatalogProvider.jsx";
import { useStore } from "../store/StoreProvider.jsx";
import { Async, Chips, DataTable, PageTitle, useAsync } from "./ui.jsx";
import { isLowStock } from "./helpers.js";

const lines = (text) => String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
const commas = (text) => String(text || "").split(",").map((part) => part.trim()).filter(Boolean);
/* "Label: value" per line <-> [{ label, value }] */
const specsToText = (specs) => (specs || []).map((spec) => `${spec.label}: ${spec.value}`).join("\n");
const parseSpec = (line) => {
  const at = line.indexOf(":");
  const spec = at > 0 ? { label: line.slice(0, at).trim(), value: line.slice(at + 1).trim() } : null;
  return spec?.label && spec.value ? spec : null;
};
const textToSpecs = (text) => lines(text).map(parseSpec).filter(Boolean);
const badSpecLine = (text) => lines(text).find((line) => !parseSpec(line));

let optionKeys = 0;
const optionKey = () => `option-${++optionKeys}`;

/*
 * Final option ids: existing ids are kept, new ones come from the name, and
 * clashes get -2, -3. Names in other scripts (no Latin letters) get opt-1, opt-2.
 * `keep` lists the options whose stock the admin did not edit.
 */
function buildOptions(form) {
  const used = new Set();
  const built = form.options
    .filter((option) => option.name.trim())
    .map((option, index) => {
      const base = option.id || slugify(option.name) || `opt-${index + 1}`;
      let id = base;
      for (let n = 2; used.has(id); n += 1) id = `${base}-${n}`;
      used.add(id);
      const saved = { id, name: option.name.trim(), ...(form.variantDisplay === "text" ? {} : { hex: option.hex || "#cccccc" }), stock: Math.max(0, Math.round(Number(option.stock) || 0)) };
      return { saved, keep: Boolean(option.id) && option.id === id && !option.stockTouched };
    });
  return { options: built.map((entry) => entry.saved), keep: built.filter((entry) => entry.keep).map((entry) => entry.saved.id) };
}

function toForm(row, defaults) {
  if (!row) {
    return { id: "", sku: "", name: "", slug: "", brandId: defaults.brandId, category: defaults.category, subcategory: "", price: "", compareAtPrice: "", cost: "", stock: 0, stockTouched: true, lowStockThreshold: 5, size: "", description: "", benefits: "", ingredients: "", howToUse: "", specs: "", warranty: "", tags: "", concerns: [], images: [], hasVariants: false, variantLabel: "Shade", variantDisplay: "swatch", options: [], featured: false, bestSeller: false, newArrival: true, active: true };
  }
  const cost = Array.isArray(row.product_costs) ? row.product_costs[0]?.cost : row.product_costs?.cost;
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    slug: row.slug,
    brandId: row.brand_id || "",
    category: row.category_id,
    subcategory: row.subcategory || "",
    price: row.price,
    compareAtPrice: row.compare_at_price ?? "",
    cost: cost ?? "",
    stock: row.stock,
    stockTouched: false,
    lowStockThreshold: row.low_stock_threshold,
    size: row.size || "",
    description: row.description || "",
    benefits: (row.benefits || []).join("\n"),
    ingredients: (row.ingredients || []).join(", "),
    howToUse: row.how_to_use || "",
    specs: specsToText(row.specs),
    warranty: row.warranty || "",
    tags: (row.tags || []).join(", "),
    concerns: row.concerns || [],
    images: row.images || [],
    hasVariants: Boolean(row.variants?.options?.length),
    variantLabel: row.variants?.label || "Shade",
    variantDisplay: row.variants?.display || ((row.variants?.options || []).some((option) => option.hex) || !row.variants ? "swatch" : "text"),
    options: (row.variants?.options || []).map((option) => ({ ...option, key: optionKey(), stockTouched: false })),
    featured: row.featured,
    bestSeller: row.best_seller,
    newArrival: row.new_arrival,
    active: row.active,
  };
}

function toRow(form, isBeauty, options) {
  const price = Math.round(Number(form.price) || 0);
  const compare = Math.round(Number(form.compareAtPrice) || 0);
  return {
    id: form.id || `p-${Date.now().toString(36)}`,
    sku: form.sku.trim(),
    name: form.name.trim(),
    slug: slugify(String(form.slug || "").trim() || form.name),
    brand_id: form.brandId || null,
    category_id: form.category,
    subcategory: form.subcategory || null,
    price,
    compare_at_price: compare > price ? compare : null,
    images: form.images,
    description: form.description.trim(),
    benefits: lines(form.benefits),
    /* Ingredients and concerns only apply to beauty products; the fields are hidden for the rest. */
    ingredients: isBeauty ? commas(form.ingredients) : [],
    how_to_use: form.howToUse.trim(),
    specs: textToSpecs(form.specs),
    warranty: form.warranty.trim() || null,
    size: form.size.trim(),
    stock: options.length ? options.reduce((sum, option) => sum + option.stock, 0) : Math.max(0, Math.round(Number(form.stock) || 0)),
    low_stock_threshold: Math.max(0, Math.round(Number(form.lowStockThreshold) || 0)),
    tags: commas(form.tags),
    concerns: isBeauty ? form.concerns : [],
    variants: options.length ? { label: form.variantLabel || "Option", display: form.variantDisplay, options } : null,
    featured: form.featured,
    best_seller: form.bestSeller,
    new_arrival: form.newArrival,
    active: form.active,
  };
}

const optionLabel = (entry) => `${entry.name}${entry.active ? "" : " (hidden)"}`;

function ProductEditor({ row, brands, categories, onClose, onSaved }) {
  const { concerns, reload } = useCatalog();
  const { toast } = useStore();
  const firstLive = (list) => (list.find((entry) => entry.active) || list[0])?.id || "";
  const [form, setForm] = useState(() => toForm(row, { brandId: firstLive(brands), category: firstLive(categories) }));
  const [imageInput, setImageInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  /* Photos uploaded while this editor is open, so the ones that end up unused can be deleted. */
  const uploaded = useRef([]);
  const set = (field) => (event) => setForm({ ...form, [field]: event.target.type === "checkbox" ? event.target.checked : event.target.value });
  const category = categories.find((entry) => entry.id === form.category);
  const isBeauty = (category?.department || "beauty") === "beauty";

  async function upload(event) {
    const files = [...event.target.files];
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      for (const file of files) {
        const url = await uploadProductImage(file);
        uploaded.current.push(url);
        setForm((current) => ({ ...current, images: [...current.images, url] }));
      }
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  const close = () => {
    removeUnusedImages(uploaded.current);
    onClose();
  };

  const setOption = (index, patch) => setForm({ ...form, options: form.options.map((option, position) => (position === index ? { ...option, ...patch } : option)) });
  const moveToFront = (index) => setForm({ ...form, images: [form.images[index], ...form.images.filter((_, position) => position !== index)] });

  async function save(event) {
    event.preventDefault();
    setError("");
    if (!form.name.trim() || !form.sku.trim()) return setError("Name and SKU are required.");
    if (!slugify(String(form.slug || "").trim() || form.name)) return setError("Add a URL slug using English letters or numbers, e.g. lawn-suit-blue.");
    if (!(Number(form.price) > 0)) return setError("Enter a price greater than zero.");
    if (!form.images.length) return setError("Add at least one image.");
    if (!form.category) return setError("Choose a category. Add one in Catalogue first if the list is empty.");
    if (form.hasVariants && !form.options.some((option) => option.name.trim())) return setError("Add at least one option, or turn options off.");
    const badSpec = badSpecLine(form.specs);
    if (badSpec) return setError(`Each specification line needs a label and a value separated by a colon, e.g. Battery: 10,000 mAh. Check: “${badSpec}”.`);
    const { options, keep } = form.hasVariants ? buildOptions(form) : { options: [], keep: [] };
    const productRow = toRow(form, isBeauty, options);
    setBusy(true);
    try {
      await saveProduct(productRow, form.cost, { isNew: !row, keep: { product: !form.stockTouched, options: keep } });
      toast(`${form.name} saved.`);
      removeUnusedImages([...(row?.images || []), ...uploaded.current].filter((url) => !productRow.images.includes(url)));
      reload();
      onSaved();
    } catch (saveError) {
      if (saveError.productSaved) {
        toast(saveError.message, { type: "error", duration: 7000 });
        reload();
        onSaved();
        return;
      }
      setError(/duplicate key|unique/i.test(saveError.message) ? "Another product already uses that SKU or URL slug." : saveError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Overlay open onClose={close} side="right" title={row ? "Edit product" : "Add product"} panelClass="!max-w-2xl">
      <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <section className="grid gap-4 sm:grid-cols-2">
            <Field label="Product name" required className="sm:col-span-2"><Input value={form.name} onChange={set("name")} required /></Field>
            <Field label="SKU" required hint="Your stock code, e.g. NZ-LP-001"><Input value={form.sku} onChange={set("sku")} required /></Field>
            <Field label="URL slug" hint="Leave empty to create it from the name"><Input value={form.slug} onChange={set("slug")} placeholder={slugify(form.name)} /></Field>
            <Field label="Brand">
              <Select value={form.brandId || ""} onChange={set("brandId")}>
                <option value="">No brand</option>
                {brands.map((brand) => <option key={brand.id} value={brand.id}>{optionLabel(brand)}</option>)}
              </Select>
            </Field>
            <Field label="Category" hint={category && !category.active ? "This category is hidden, so the product doesn’t show in the store." : undefined}>
              <Select value={form.category || ""} onChange={(event) => setForm({ ...form, category: event.target.value, subcategory: "" })}>
                {!form.category && <option value="">Choose a category</option>}
                {categories.map((entry) => <option key={entry.id} value={entry.id}>{optionLabel(entry)}</option>)}
              </Select>
            </Field>
            <Field label="Type">
              <Select value={form.subcategory} onChange={set("subcategory")}>
                <option value="">None</option>
                {(category?.subcategories || []).map((sub) => <option key={sub}>{sub}</option>)}
              </Select>
            </Field>
            <Field label={isBeauty ? "Size" : "In the box"} hint={isBeauty ? "e.g. 30 ml" : "e.g. Earbuds, case, USB-C cable"}><Input value={form.size} onChange={set("size")} /></Field>
          </section>

          <section className="grid gap-4 rounded-2xl bg-tint p-4 sm:grid-cols-3">
            <Field label="Price (Rs.)" required><Input type="number" min="0" value={form.price} onChange={set("price")} required /></Field>
            <Field label="Original price" hint="Shows a sale badge when higher"><Input type="number" min="0" value={form.compareAtPrice} onChange={set("compareAtPrice")} /></Field>
            <Field label="Your cost" hint="Private, used for profit"><Input type="number" min="0" value={form.cost} onChange={set("cost")} /></Field>
            {!form.hasVariants && <Field label="Stock"><Input type="number" min="0" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value, stockTouched: true })} /></Field>}
            <Field label="Low stock alert at"><Input type="number" min="0" value={form.lowStockThreshold} onChange={set("lowStockThreshold")} /></Field>
          </section>

          <section>
            <p className="text-[13px] font-semibold text-ink-mid">Images <span className="text-coral">*</span></p>
            <div className="mt-2 flex flex-wrap gap-3">
              {form.images.map((image, index) => (
                <div key={image + index} className="relative">
                  <img src={img(image, 240)} alt="" className="size-20 rounded-xl border border-line object-cover" />
                  <button type="button" aria-label="Remove image" title="Remove image" onClick={() => setForm({ ...form, images: form.images.filter((_, position) => position !== index) })} className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-white text-danger shadow-card">
                    <TrashIcon className="size-4" />
                  </button>
                  {index === 0 ? (
                    <span className="absolute bottom-1 left-1 rounded bg-navy px-1.5 text-[10px] font-bold text-white">Main</span>
                  ) : (
                    <button type="button" title="Make this the main photo" onClick={() => moveToFront(index)} className="absolute bottom-1 left-1 rounded bg-white/90 px-1.5 text-[10px] font-bold text-navy hover:bg-white">
                      Set main
                    </button>
                  )}
                </div>
              ))}
              <label className="grid size-20 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line text-center text-[11px] font-semibold text-teal hover:border-teal">
                <span>
                  <UploadIcon className="mx-auto size-5" />
                  {uploading ? "Uploading…" : "Upload"}
                </span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={upload} disabled={uploading} />
              </label>
            </div>
            <div className="mt-3 flex gap-2">
              <Input value={imageInput} onChange={(event) => setImageInput(event.target.value)} placeholder="Or paste an image URL" aria-label="Image URL" />
              <button type="button" onClick={() => { if (imageInput.trim()) { setForm({ ...form, images: [...form.images, imageInput.trim()] }); setImageInput(""); } }} className="h-[50px] shrink-0 rounded-xl border border-line px-4 text-[14px] font-semibold text-navy hover:border-navy">
                Add
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-line p-4">
            <Checkbox label="This product has options (shades, colours, sizes)" checked={form.hasVariants} onChange={set("hasVariants")} />
            {form.hasVariants && (
              <div className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="What is the option called?"><Input value={form.variantLabel} onChange={set("variantLabel")} placeholder="Shade, Colour or Size" /></Field>
                  <Field label="Show options as">
                    <Select value={form.variantDisplay} onChange={set("variantDisplay")}>
                      <option value="swatch">Colour circles (shades, colours)</option>
                      <option value="text">Text buttons (sizes: S, M, L)</option>
                    </Select>
                  </Field>
                </div>
                {form.options.map((option, index) => (
                  <div key={option.key} className={`grid items-end gap-2 ${form.variantDisplay === "text" ? "grid-cols-[1fr_90px_36px]" : "grid-cols-[44px_1fr_90px_36px]"}`}>
                    {form.variantDisplay !== "text" && <input type="color" aria-label="Colour" value={option.hex || "#cccccc"} onChange={(event) => setOption(index, { hex: event.target.value })} className="h-[50px] w-11 cursor-pointer rounded-xl border border-line bg-white p-1" />}
                    <Input aria-label="Option name" value={option.name} onChange={(event) => setOption(index, { name: event.target.value })} placeholder={form.variantDisplay === "text" ? "e.g. M" : "e.g. Rooh (true red)"} />
                    <Input aria-label="Stock" type="number" min="0" value={option.stock} onChange={(event) => setOption(index, { stock: event.target.value, stockTouched: true })} />
                    <button type="button" aria-label="Remove option" title="Remove option" onClick={() => setForm({ ...form, options: form.options.filter((_, position) => position !== index) })} className="grid h-[50px] place-items-center rounded-xl text-ink-light hover:text-danger">
                      <TrashIcon className="size-4" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => setForm({ ...form, options: [...form.options, { id: "", key: optionKey(), name: "", hex: "#d9627e", stock: 0, stockTouched: true }] })} className="inline-flex items-center gap-2 text-[14px] font-semibold text-teal hover:underline">
                  <PlusIcon className="size-4" /> Add option
                </button>
              </div>
            )}
          </section>

          <section className="grid gap-4">
            <Field label="Description"><Textarea rows={4} value={form.description} onChange={set("description")} /></Field>
            <Field label={isBeauty ? "Benefits" : "Highlights"} hint="One per line"><Textarea rows={4} value={form.benefits} onChange={set("benefits")} /></Field>
            {isBeauty && <Field label="Ingredients" hint="Separated by commas"><Textarea rows={2} value={form.ingredients} onChange={set("ingredients")} /></Field>}
            <Field label={isBeauty ? "How to use" : "Use and care"}><Textarea rows={2} value={form.howToUse} onChange={set("howToUse")} /></Field>
            <Field label="Specifications" hint="One per line as Label: value, e.g. Battery: 10,000 mAh"><Textarea rows={4} value={form.specs} onChange={set("specs")} /></Field>
            <Field label="Warranty" hint="Shown on the product page. Leave empty if there is none."><Input value={form.warranty} onChange={set("warranty")} placeholder="e.g. 6 months replacement warranty" /></Field>
            <Field label="Search tags" hint="Separated by commas"><Input value={form.tags} onChange={set("tags")} /></Field>
          </section>

          <section className={isBeauty ? "" : "hidden"}>
            <p className="text-[13px] font-semibold text-ink-mid">Concerns this product helps with</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {concerns.map((concern) => (
                <Checkbox key={concern.id} label={concern.name} checked={form.concerns.includes(concern.id)} onChange={() => setForm({ ...form, concerns: form.concerns.includes(concern.id) ? form.concerns.filter((id) => id !== concern.id) : [...form.concerns, concern.id] })} />
              ))}
            </div>
          </section>

          <section className="grid gap-2 rounded-2xl bg-tint p-4 sm:grid-cols-2">
            <Checkbox label="Visible in the store" checked={form.active} onChange={set("active")} />
            <Checkbox label="Featured (editor’s picks)" checked={form.featured} onChange={set("featured")} />
            <Checkbox label="Best seller" checked={form.bestSeller} onChange={set("bestSeller")} />
            <Checkbox label="New arrival" checked={form.newArrival} onChange={set("newArrival")} />
          </section>
        </div>

        <div className="border-t border-line p-4">
          {error && <p role="alert" className="mb-3 rounded-xl bg-coral-50 px-4 py-3 text-[14px] text-navy">{error}</p>}
          <div className="flex gap-3">
            <Button type="submit" variant="navy" className="flex-1" disabled={busy || uploading}>
              {busy ? "Saving…" : "Save product"}
            </Button>
            <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
          </div>
        </div>
      </form>
    </Overlay>
  );
}

const FIXED_CHIPS = ["all", "low", "hidden"];

export default function ProductsPage() {
  const products = useAsync(fetchProductsAdmin, []);
  /* Every category and brand, hidden ones included, so products in them can still be edited. */
  const lists = useAsync(async () => {
    const [categories, brands] = await Promise.all([fetchCategoriesAdmin(), fetchBrandsAdmin()]);
    return { categories, brands };
  }, []);
  const categories = lists.data?.categories || [];
  const brands = lists.data?.brands || [];
  const [params, setParams] = useSearchParams();
  /* ?filter=low (from the dashboard) opens the low-stock list. */
  const [category, setCategory] = useState(() => (FIXED_CHIPS.includes(params.get("filter")) ? params.get("filter") : "all"));
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new

  /* /admin/products?edit=<id> or ?new=1 opens the editor directly. */
  const editId = params.get("edit");
  const wantsNew = params.get("new");
  useEffect(() => {
    if (wantsNew) setEditing(null);
    else if (editId && products.data) {
      const row = products.data.find((entry) => entry.id === editId || entry.slug === editId);
      if (row) setEditing(row);
    }
  }, [editId, wantsNew, products.data]);

  const closeEditor = () => {
    setEditing(undefined);
    if (editId || wantsNew) setParams({}, { replace: true });
  };

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (products.data || []).filter((row) => {
      if (category === "low" && !isLowStock(row)) return false;
      if (category === "hidden" && row.active) return false;
      if (!FIXED_CHIPS.includes(category) && row.category_id !== category) return false;
      return !term || `${row.name} ${row.sku}`.toLowerCase().includes(term);
    });
  }, [products.data, category, search]);

  const categoryName = (id) => categories.find((entry) => entry.id === id)?.name || id;
  const chips = [{ id: "all", label: "All" }, ...categories.map((entry) => ({ id: entry.id, label: optionLabel(entry) })), { id: "low", label: "Low stock" }, { id: "hidden", label: "Hidden" }];
  const stockTone = (row) => (row.stock === 0 ? "text-danger" : isLowStock(row) ? "text-coral" : "text-navy");

  return (
    <div className="space-y-5">
      <PageTitle title="Products" subtitle="Prices, stock, photos and what shows in the store.">
        <Button variant="coral" size="sm" disabled={!lists.data} onClick={() => setEditing(null)}>
          <PlusIcon className="size-4" /> Add product
        </Button>
      </PageTitle>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Chips options={chips} value={category} onChange={setCategory} className="max-w-full" />
        <div className="relative w-full sm:w-72">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-light" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or SKU" aria-label="Search products" className="h-11 py-0 pl-10" />
        </div>
      </div>

      <Async state={products} rows={6}>
        {() => (
          <DataTable
            rows={visible}
            onRowClick={setEditing}
            empty="No products match."
            minWidth="min-w-[820px]"
            card={(row) => (
              <span className="flex items-center gap-3">
                <img src={img(row.images?.[0], 120)} alt="" className="size-14 shrink-0 rounded-lg bg-tint object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{row.name}</span>
                  <span className="block truncate text-[12px] text-ink-light">{row.sku} · {row.brands?.name}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <strong>{formatPrice(row.price)}</strong>
                    <span className={`text-[13px] font-bold ${stockTone(row)}`}>{row.stock} in stock</span>
                    {!row.active && <Badge tone="muted">Hidden</Badge>}
                  </span>
                </span>
              </span>
            )}
            columns={[
              {
                key: "name",
                label: "Product",
                render: (row) => (
                  <span className="flex items-center gap-3">
                    <img src={img(row.images?.[0], 120)} alt="" className="size-12 shrink-0 rounded-lg bg-tint object-cover" />
                    <span>
                      <span className="block font-semibold">{row.name}</span>
                      <span className="block text-[12px] text-ink-light">{row.sku} · {row.brands?.name}</span>
                    </span>
                  </span>
                ),
              },
              { key: "category_id", label: "Category", render: (row) => categoryName(row.category_id) },
              { key: "price", label: "Price", render: (row) => (<span>{formatPrice(row.price)}{row.compare_at_price && <span className="ml-2 text-[12px] text-ink-light line-through">{formatPrice(row.compare_at_price)}</span>}</span>) },
              { key: "stock", label: "Stock", render: (row) => <span className={`font-bold ${stockTone(row)}`}>{row.stock}{row.variants?.options?.length ? <span className="ml-1 text-[12px] font-normal text-ink-light">({row.variants.options.length} options{row.variants.options.some((option) => Number(option.stock) <= 0) ? ", some sold out" : ""})</span> : null}</span> },
              {
                key: "flags",
                label: "Status",
                render: (row) => (
                  <span className="flex flex-wrap gap-1">
                    <Badge tone={row.active ? "success" : "muted"}>{row.active ? "Live" : "Hidden"}</Badge>
                    {row.best_seller && <Badge tone="navy">Best seller</Badge>}
                    {row.new_arrival && <Badge tone="teal">New</Badge>}
                  </span>
                ),
              },
            ]}
          />
        )}
      </Async>

      {editing !== undefined && lists.data && <ProductEditor key={editing?.id || "new"} row={editing} brands={brands} categories={categories} onClose={closeEditor} onSaved={() => { closeEditor(); products.reload(); }} />}
      {lists.error && <p role="alert" className="text-[14px] text-danger">{lists.error.message}</p>}
    </div>
  );
}
