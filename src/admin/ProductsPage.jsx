import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Overlay from "../components/ui/Modal.jsx";
import Button from "../components/ui/Button.jsx";
import { Field, Input, Select, Textarea, Checkbox } from "../components/ui/Form.jsx";
import { Badge } from "../components/ui/Typography.jsx";
import { PlusIcon, SearchIcon, TrashIcon, UploadIcon } from "../components/ui/Icons.jsx";
import { fetchProductsAdmin, saveProduct, uploadProductImage } from "../api/admin.js";
import { img } from "../lib/images.js";
import { formatPrice, slugify } from "../lib/format.js";
import { useCatalog } from "../catalog/CatalogProvider.jsx";
import { useStore } from "../store/StoreProvider.jsx";
import { Async, Chips, DataTable, PageTitle, useAsync } from "./ui.jsx";

const lines = (text) => String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
const commas = (text) => String(text || "").split(",").map((part) => part.trim()).filter(Boolean);

function toForm(row, defaults) {
  if (!row) {
    return { id: "", sku: "", name: "", slug: "", brandId: defaults.brandId, category: defaults.category, subcategory: "", price: "", compareAtPrice: "", cost: "", stock: 0, lowStockThreshold: 5, size: "", description: "", benefits: "", ingredients: "", howToUse: "", tags: "", concerns: [], images: [], hasVariants: false, variantLabel: "Shade", options: [], featured: false, bestSeller: false, newArrival: true, active: true };
  }
  const cost = Array.isArray(row.product_costs) ? row.product_costs[0]?.cost : row.product_costs?.cost;
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    slug: row.slug,
    brandId: row.brand_id,
    category: row.category_id,
    subcategory: row.subcategory || "",
    price: row.price,
    compareAtPrice: row.compare_at_price ?? "",
    cost: cost ?? "",
    stock: row.stock,
    lowStockThreshold: row.low_stock_threshold,
    size: row.size || "",
    description: row.description || "",
    benefits: (row.benefits || []).join("\n"),
    ingredients: (row.ingredients || []).join(", "),
    howToUse: row.how_to_use || "",
    tags: (row.tags || []).join(", "),
    concerns: row.concerns || [],
    images: row.images || [],
    hasVariants: Boolean(row.variants?.options?.length),
    variantLabel: row.variants?.label || "Shade",
    options: (row.variants?.options || []).map((option) => ({ ...option })),
    featured: row.featured,
    bestSeller: row.best_seller,
    newArrival: row.new_arrival,
    active: row.active,
  };
}

function toRow(form) {
  const price = Math.round(Number(form.price) || 0);
  const compare = Math.round(Number(form.compareAtPrice) || 0);
  const options = form.hasVariants
    ? form.options
        .filter((option) => option.name.trim())
        .map((option) => ({ id: option.id || slugify(option.name), name: option.name.trim(), hex: option.hex || "#cccccc", stock: Math.max(0, Math.round(Number(option.stock) || 0)) }))
    : [];
  return {
    id: form.id || `p-${Date.now().toString(36)}`,
    sku: form.sku.trim(),
    name: form.name.trim(),
    slug: (form.slug || slugify(form.name)).trim(),
    brand_id: form.brandId,
    category_id: form.category,
    subcategory: form.subcategory || null,
    price,
    compare_at_price: compare > price ? compare : null,
    images: form.images,
    description: form.description.trim(),
    benefits: lines(form.benefits),
    ingredients: commas(form.ingredients),
    how_to_use: form.howToUse.trim(),
    size: form.size.trim(),
    stock: options.length ? options.reduce((sum, option) => sum + option.stock, 0) : Math.max(0, Math.round(Number(form.stock) || 0)),
    low_stock_threshold: Math.max(0, Math.round(Number(form.lowStockThreshold) || 0)),
    tags: commas(form.tags),
    concerns: form.concerns,
    variants: options.length ? { label: form.variantLabel || "Option", options } : null,
    featured: form.featured,
    best_seller: form.bestSeller,
    new_arrival: form.newArrival,
    active: form.active,
  };
}

function ProductEditor({ row, onClose, onSaved }) {
  const { brands, categories, concerns, reload } = useCatalog();
  const { toast } = useStore();
  const [form, setForm] = useState(() => toForm(row, { brandId: brands[0]?.id, category: categories[0]?.slug }));
  const [imageInput, setImageInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const set = (field) => (event) => setForm({ ...form, [field]: event.target.type === "checkbox" ? event.target.checked : event.target.value });
  const category = categories.find((entry) => entry.slug === form.category);

  async function upload(event) {
    const files = [...event.target.files];
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      const urls = [];
      for (const file of files) urls.push(await uploadProductImage(file));
      setForm((current) => ({ ...current, images: [...current.images, ...urls] }));
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  const setOption = (index, patch) => setForm({ ...form, options: form.options.map((option, position) => (position === index ? { ...option, ...patch } : option)) });

  async function save(event) {
    event.preventDefault();
    setError("");
    if (!form.name.trim() || !form.sku.trim()) return setError("Name and SKU are required.");
    if (!(Number(form.price) > 0)) return setError("Enter a price greater than zero.");
    if (!form.images.length) return setError("Add at least one image.");
    if (form.hasVariants && !form.options.some((option) => option.name.trim())) return setError("Add at least one option, or turn options off.");
    setBusy(true);
    try {
      await saveProduct(toRow(form), form.cost);
      toast(`${form.name} saved.`);
      reload();
      onSaved();
    } catch (saveError) {
      setError(/duplicate key|unique/i.test(saveError.message) ? "Another product already uses that SKU or URL slug." : saveError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Overlay open onClose={onClose} side="right" title={row ? "Edit product" : "Add product"} panelClass="!max-w-2xl">
      <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <section className="grid gap-4 sm:grid-cols-2">
            <Field label="Product name" required className="sm:col-span-2"><Input value={form.name} onChange={set("name")} required /></Field>
            <Field label="SKU" required hint="Your stock code, e.g. TB-LP-001"><Input value={form.sku} onChange={set("sku")} required /></Field>
            <Field label="URL slug" hint="Leave empty to create it from the name"><Input value={form.slug} onChange={set("slug")} placeholder={slugify(form.name)} /></Field>
            <Field label="Brand">
              <Select value={form.brandId || ""} onChange={set("brandId")}>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</Select>
            </Field>
            <Field label="Category">
              <Select value={form.category || ""} onChange={(event) => setForm({ ...form, category: event.target.value, subcategory: "" })}>{categories.map((entry) => <option key={entry.slug} value={entry.slug}>{entry.name}</option>)}</Select>
            </Field>
            <Field label="Type">
              <Select value={form.subcategory} onChange={set("subcategory")}>
                <option value="">None</option>
                {(category?.subcategories || []).map((sub) => <option key={sub}>{sub}</option>)}
              </Select>
            </Field>
            <Field label="Size" hint="e.g. 30 ml"><Input value={form.size} onChange={set("size")} /></Field>
          </section>

          <section className="grid gap-4 rounded-2xl bg-tint p-4 sm:grid-cols-3">
            <Field label="Price (Rs.)" required><Input type="number" min="0" value={form.price} onChange={set("price")} required /></Field>
            <Field label="Original price" hint="Shows a sale badge when higher"><Input type="number" min="0" value={form.compareAtPrice} onChange={set("compareAtPrice")} /></Field>
            <Field label="Your cost" hint="Private, used for profit"><Input type="number" min="0" value={form.cost} onChange={set("cost")} /></Field>
            {!form.hasVariants && <Field label="Stock"><Input type="number" min="0" value={form.stock} onChange={set("stock")} /></Field>}
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
                  {index === 0 && <span className="absolute bottom-1 left-1 rounded bg-navy px-1.5 text-[10px] font-bold text-white">Main</span>}
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
            <Checkbox label="This product has options (shades, sizes)" checked={form.hasVariants} onChange={set("hasVariants")} />
            {form.hasVariants && (
              <div className="mt-4 space-y-3">
                <Field label="Option name"><Input value={form.variantLabel} onChange={set("variantLabel")} placeholder="Shade" /></Field>
                {form.options.map((option, index) => (
                  <div key={index} className="grid grid-cols-[44px_1fr_90px_36px] items-end gap-2">
                    <input type="color" aria-label="Colour" value={option.hex || "#cccccc"} onChange={(event) => setOption(index, { hex: event.target.value })} className="h-[50px] w-11 cursor-pointer rounded-xl border border-line bg-white p-1" />
                    <Input aria-label="Option name" value={option.name} onChange={(event) => setOption(index, { name: event.target.value })} placeholder="e.g. Rooh (true red)" />
                    <Input aria-label="Stock" type="number" min="0" value={option.stock} onChange={(event) => setOption(index, { stock: event.target.value })} />
                    <button type="button" aria-label="Remove option" title="Remove option" onClick={() => setForm({ ...form, options: form.options.filter((_, position) => position !== index) })} className="grid h-[50px] place-items-center rounded-xl text-ink-light hover:text-danger">
                      <TrashIcon className="size-4" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => setForm({ ...form, options: [...form.options, { id: "", name: "", hex: "#d9627e", stock: 0 }] })} className="inline-flex items-center gap-2 text-[14px] font-semibold text-teal hover:underline">
                  <PlusIcon className="size-4" /> Add option
                </button>
              </div>
            )}
          </section>

          <section className="grid gap-4">
            <Field label="Description"><Textarea rows={4} value={form.description} onChange={set("description")} /></Field>
            <Field label="Benefits" hint="One per line"><Textarea rows={4} value={form.benefits} onChange={set("benefits")} /></Field>
            <Field label="Ingredients" hint="Separated by commas"><Textarea rows={2} value={form.ingredients} onChange={set("ingredients")} /></Field>
            <Field label="How to use"><Textarea rows={2} value={form.howToUse} onChange={set("howToUse")} /></Field>
            <Field label="Search tags" hint="Separated by commas"><Input value={form.tags} onChange={set("tags")} /></Field>
          </section>

          <section>
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
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </form>
    </Overlay>
  );
}

export default function ProductsPage() {
  const { categories } = useCatalog();
  const products = useAsync(fetchProductsAdmin, []);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new
  const [params, setParams] = useSearchParams();

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
      if (category === "low" && row.stock > row.low_stock_threshold) return false;
      if (category === "hidden" && row.active) return false;
      if (!["all", "low", "hidden"].includes(category) && row.category_id !== category) return false;
      return !term || `${row.name} ${row.sku}`.toLowerCase().includes(term);
    });
  }, [products.data, category, search]);

  const chips = [{ id: "all", label: "All" }, ...categories.map((entry) => ({ id: entry.slug, label: entry.name })), { id: "low", label: "Low stock" }, { id: "hidden", label: "Hidden" }];

  return (
    <div className="space-y-5">
      <PageTitle title="Products" subtitle="Prices, stock, photos and what shows in the store.">
        <Button variant="coral" size="sm" onClick={() => setEditing(null)}>
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
                    <span className={`text-[13px] font-bold ${row.stock === 0 ? "text-danger" : row.stock <= row.low_stock_threshold ? "text-coral" : "text-ink"}`}>{row.stock} in stock</span>
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
              { key: "category_id", label: "Category", render: (row) => <span className="capitalize">{row.category_id}</span> },
              { key: "price", label: "Price", render: (row) => (<span>{formatPrice(row.price)}{row.compare_at_price && <span className="ml-2 text-[12px] text-ink-light line-through">{formatPrice(row.compare_at_price)}</span>}</span>) },
              { key: "stock", label: "Stock", render: (row) => <span className={`font-bold ${row.stock === 0 ? "text-danger" : row.stock <= row.low_stock_threshold ? "text-coral" : "text-navy"}`}>{row.stock}{row.variants?.options?.length ? <span className="ml-1 text-[12px] font-normal text-ink-light">({row.variants.options.length} options)</span> : null}</span> },
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

      {editing !== undefined && <ProductEditor key={editing?.id || "new"} row={editing} onClose={closeEditor} onSaved={() => { closeEditor(); products.reload(); }} />}
    </div>
  );
}
