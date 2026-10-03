import { useState } from "react";
import Overlay from "../components/ui/Modal.jsx";
import Button from "../components/ui/Button.jsx";
import { Field, Input, Select, Textarea, Checkbox } from "../components/ui/Form.jsx";
import { Badge } from "../components/ui/Typography.jsx";
import { PlusIcon, UploadIcon } from "../components/ui/Icons.jsx";
import {
  fetchDepartmentsAdmin, saveDepartment, deleteDepartment,
  fetchCategoriesAdmin, saveCategory, deleteCategory,
  fetchBrandsAdmin, saveBrand, deleteBrand,
  fetchProductsAdmin, uploadProductImage,
} from "../api/admin.js";
import { img } from "../lib/images.js";
import { useCatalog } from "../catalog/CatalogProvider.jsx";
import { useStore } from "../store/StoreProvider.jsx";
import { Async, Chips, PageTitle, useAsync } from "./ui.jsx";
import { toSlug } from "./helpers.js";

const tabs = [
  { id: "departments", label: "Departments" },
  { id: "categories", label: "Categories" },
  { id: "brands", label: "Brands" },
];

const lines = (text) => String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

/* Photo field: upload a file or paste a link. */
function ImageField({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  async function upload(event) {
    const file = event.target.files[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      onChange(await uploadProductImage(file));
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }
  return (
    <Field label="Photo" hint="Shown on the home page and at the top of its page." error={error}>
      <div className="flex items-center gap-3">
        {value ? <img src={img(value, 240)} alt="" className="size-16 shrink-0 rounded-xl border border-line object-cover" /> : <span className="grid size-16 shrink-0 place-items-center rounded-xl border border-dashed border-line text-[11px] text-ink-light">No photo</span>}
        <Input value={value || ""} onChange={(event) => onChange(event.target.value.trim())} placeholder="Paste an image link" aria-label="Image link" className="min-w-0 flex-1" />
        <label className="inline-flex h-[50px] shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-line px-4 text-[14px] font-semibold text-teal hover:border-teal">
          <UploadIcon className="size-4" /> {uploading ? "Uploading…" : "Upload"}
          <input type="file" accept="image/*" className="hidden" onChange={upload} disabled={uploading} />
        </label>
      </div>
    </Field>
  );
}

/* One editor for all three kinds of record; `fields` decides what is shown. */
function Editor({ kind, row, departments, onClose, onSaved }) {
  const { toast } = useStore();
  const isNew = !row;
  const [form, setForm] = useState(() => ({
    id: row?.id || "",
    name: row?.name || "",
    tagline: row?.tagline || "",
    description: row?.description || "",
    image: row?.image || "",
    department: row?.department || departments[0]?.id || "",
    subcategories: (row?.subcategories || []).join("\n"),
    sort_order: row?.sort_order ?? 0,
    featured: row?.featured ?? true,
    active: row?.active ?? true,
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (field) => (event) => setForm({ ...form, [field]: event.target.type === "checkbox" ? event.target.checked : event.target.value });
  const label = { departments: "department", categories: "category", brands: "brand" }[kind];

  async function save(event) {
    event.preventDefault();
    setError("");
    const id = isNew ? toSlug(form.id || form.name) : form.id;
    if (!form.name.trim() || !id) return setError("Enter a name.");
    setBusy(true);
    try {
      const base = { id, name: form.name.trim(), tagline: form.tagline.trim(), description: form.description.trim(), active: form.active };
      if (kind === "departments") await saveDepartment({ ...base, image: form.image, sort_order: Math.round(Number(form.sort_order) || 0) });
      if (kind === "categories") {
        if (!form.department) throw new Error("Choose a department. Add one first if the list is empty.");
        await saveCategory({ ...base, image: form.image, department: form.department, subcategories: lines(form.subcategories), sort_order: Math.round(Number(form.sort_order) || 0) });
      }
      if (kind === "brands") await saveBrand({ ...base, featured: form.featured });
      toast(`${form.name.trim()} saved.`);
      onSaved();
    } catch (saveError) {
      setError(/duplicate key|unique/i.test(saveError.message) ? `Another ${label} already uses that name or link.` : saveError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Overlay open onClose={onClose} side="right" title={`${isNew ? "Add" : "Edit"} ${label}`} panelClass="!max-w-xl">
      <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <Field label="Name" required><Input value={form.name} onChange={set("name")} required placeholder={kind === "departments" ? "e.g. Home & Living" : kind === "categories" ? "e.g. Bedding" : "e.g. Your brand"} /></Field>
          {isNew ? (
            <Field label="Link name" hint={`Used in the page address. Leave empty to create it from the name: ${toSlug(form.name) || "…"}`}>
              <Input value={form.id} onChange={set("id")} placeholder={toSlug(form.name)} />
            </Field>
          ) : (
            <p className="text-[12px] text-ink-light">Page address: {kind === "departments" ? `/department/${form.id}` : kind === "categories" ? `/shop/${form.id}` : `brand “${form.id}”`} (cannot be changed once created).</p>
          )}
          {kind === "categories" && (
            <Field label="Department" required>
              <Select value={form.department} onChange={set("department")}>
                {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Short line" hint={kind === "brands" ? "Shown under the brand name." : "The headline on its page and its slide on the home page."}><Input value={form.tagline} onChange={set("tagline")} /></Field>
          <Field label="Description"><Textarea rows={3} value={form.description} onChange={set("description")} /></Field>
          {kind !== "brands" && <ImageField value={form.image} onChange={(image) => setForm({ ...form, image })} />}
          {kind === "categories" && (
            <Field label="Product types" hint="One per line, e.g. Dresses. They become the Type filter and the options in the product form.">
              <Textarea rows={4} value={form.subcategories} onChange={set("subcategories")} />
            </Field>
          )}
          {kind !== "brands" && <Field label="Position" hint="Lower numbers come first in the menu and on the home page."><Input type="number" value={form.sort_order} onChange={set("sort_order")} className="max-w-32" /></Field>}
          <div className="grid gap-2 rounded-2xl bg-tint p-4">
            <Checkbox label="Visible in the store" checked={form.active} onChange={set("active")} />
            {kind === "brands" && <Checkbox label="Show on the home page" checked={form.featured} onChange={set("featured")} />}
          </div>
        </div>
        <div className="border-t border-line p-4">
          {error && <p role="alert" className="mb-3 rounded-xl bg-coral-50 px-4 py-3 text-[14px] text-navy">{error}</p>}
          <div className="flex gap-3">
            <Button type="submit" variant="navy" className="flex-1" disabled={busy}>{busy ? "Saving…" : `Save ${label}`}</Button>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </form>
    </Overlay>
  );
}

function Row({ title, subtitle, image, showImage, badges, onEdit, onDelete }) {
  return (
    <li className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-white p-4">
      {showImage && (image ? <img src={img(image, 240)} alt="" className="size-16 shrink-0 rounded-xl bg-tint object-cover" /> : <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-tint text-[11px] text-ink-light">No photo</span>)}
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-display text-[17px] font-extrabold text-navy">{title} {badges}</p>
        <p className="mt-0.5 text-[13px] text-ink">{subtitle}</p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onEdit} className="h-10 rounded-full border border-line px-4 text-[14px] font-semibold text-navy hover:border-navy">Edit</button>
        <button type="button" onClick={onDelete} className="h-10 rounded-full px-3 text-[14px] font-semibold text-danger hover:bg-coral-50">Delete</button>
      </div>
    </li>
  );
}

export default function CataloguePage() {
  const [tab, setTab] = useState("departments");
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new, row = edit
  const { reload } = useCatalog();
  const { toast } = useStore();
  const data = useAsync(async () => {
    const [departments, categories, brands, products] = await Promise.all([fetchDepartmentsAdmin(), fetchCategoriesAdmin(), fetchBrandsAdmin(), fetchProductsAdmin()]);
    return { departments, categories, brands, products };
  }, []);

  const refresh = () => {
    setEditing(undefined);
    data.reload();
    reload();
  };

  async function remove(kind, row) {
    if (!window.confirm(`Delete “${row.name}”? This cannot be undone.`)) return;
    try {
      if (kind === "departments") await deleteDepartment(row.id);
      if (kind === "categories") await deleteCategory(row.id);
      if (kind === "brands") await deleteBrand(row.id);
      toast(`${row.name} deleted.`);
      refresh();
    } catch (error) {
      toast(error.message, { type: "error", duration: 7000 });
    }
  }

  const hidden = (row) => !row.active && <Badge tone="muted">Hidden</Badge>;
  const count = (number, word, plural = `${word}s`) => `${number} ${number === 1 ? word : plural}`;

  return (
    <div className="space-y-5">
      <PageTitle title="Catalogue" subtitle="Departments, categories and brands. Whatever you change here appears in the menu, on the home page and in the filters straight away.">
        <Button variant="coral" size="sm" onClick={() => setEditing(null)}>
          <PlusIcon className="size-4" /> Add {tab === "departments" ? "department" : tab === "categories" ? "category" : "brand"}
        </Button>
      </PageTitle>
      <Chips options={tabs} value={tab} onChange={setTab} />

      <Async state={data} rows={4}>
        {({ departments, categories, brands, products }) => {
          const productsIn = (categoryId) => products.filter((product) => product.category_id === categoryId).length;
          return (
            <>
              {tab === "departments" && (
                <ul className="space-y-3">
                  {departments.map((row) => {
                    const own = categories.filter((category) => category.department === row.id);
                    return <Row key={row.id} showImage image={row.image} title={row.name} badges={hidden(row)} subtitle={`${count(own.length, "category", "categories")} · ${count(own.reduce((sum, category) => sum + productsIn(category.id), 0), "product")}${row.tagline ? ` · ${row.tagline}` : ""}`} onEdit={() => setEditing(row)} onDelete={() => remove("departments", row)} />;
                  })}
                  {!departments.length && <p className="rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center text-[15px] text-ink">No departments yet. Add the first one.</p>}
                </ul>
              )}

              {tab === "categories" && (
                <div className="space-y-6">
                  {departments.map((department) => {
                    const own = categories.filter((category) => category.department === department.id);
                    if (!own.length) return null;
                    return (
                      <section key={department.id}>
                        <h2 className="mb-3 text-[12px] font-bold uppercase tracking-[0.2em] text-teal">{department.name}</h2>
                        <ul className="space-y-3">
                          {own.map((row) => (
                            <Row key={row.id} showImage image={row.image} title={row.name} badges={hidden(row)} subtitle={`${count(productsIn(row.id), "product")}${row.subcategories?.length ? ` · ${row.subcategories.join(", ")}` : ""}`} onEdit={() => setEditing(row)} onDelete={() => remove("categories", row)} />
                          ))}
                        </ul>
                      </section>
                    );
                  })}
                  {!categories.length && <p className="rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center text-[15px] text-ink">No categories yet. Add a department first, then its categories.</p>}
                </div>
              )}

              {tab === "brands" && (
                <ul className="space-y-3">
                  {brands.map((row) => (
                    <Row key={row.id} title={row.name} badges={<>{hidden(row)}{row.featured && <Badge tone="teal">On home page</Badge>}</>} subtitle={`${count(products.filter((product) => product.brand_id === row.id).length, "product")}${row.tagline ? ` · ${row.tagline}` : ""}`} onEdit={() => setEditing(row)} onDelete={() => remove("brands", row)} />
                  ))}
                </ul>
              )}

              {editing !== undefined && <Editor key={`${tab}-${editing?.id || "new"}`} kind={tab} row={editing} departments={departments} onClose={() => setEditing(undefined)} onSaved={refresh} />}
            </>
          );
        }}
      </Async>
    </div>
  );
}
