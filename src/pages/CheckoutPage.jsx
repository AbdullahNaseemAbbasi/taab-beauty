import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useSeo from "../hooks/useSeo.js";
import Button from "../components/ui/Button.jsx";
import { Field, Input, Select, Textarea, Radio } from "../components/ui/Form.jsx";
import { EmptyState } from "../components/ui/Feedback.jsx";
import { BagIcon, ShieldIcon, WhatsAppIcon, InfoIcon } from "../components/ui/Icons.jsx";
import { PageHeader } from "../components/sections/Sections.jsx";
import OrderSummary from "../components/commerce/OrderSummary.jsx";
import { whatsappLink } from "../components/layout/WhatsAppButton.jsx";
import { site } from "../config/site.js";
import { cities } from "../data/misc.js";
import { placeOrder, saveCheckout, cachedCreatorOffer } from "../api/orders.js";
import { isLive } from "../api/client.js";
import { hydrateOrder } from "../lib/cart.js";
import { estimateDelivery, formatDeliveryRange } from "../lib/shipping.js";
import { getAttribution, attributionForOrder } from "../analytics/attribution.js";
import DispatchCountdown from "../components/commerce/DispatchCountdown.jsx";
import { useCatalog } from "../catalog/CatalogProvider.jsx";
import { useStore } from "../store/StoreProvider.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";
import { ecommerce } from "../analytics/ecommerce.js";

const CUSTOMER_KEY = "taab:customer";
const phonePattern = /^(\+92|0)?3\d{9}$/;

function loadSavedCustomer() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOMER_KEY) || "null") || {};
  } catch {
    return {};
  }
}

function checkoutSnapshot(form, cart) {
  return {
    sessionId: getAttribution().session?.id || null,
    phone: form.phone,
    name: form.name,
    email: form.email,
    city: form.city,
    subtotal: cart.totals.subtotal,
    lines: cart.lines.map((line) => ({ sku: line.product.sku, name: line.product.name, variant: line.variant?.name || null, quantity: line.quantity, price: line.unitPrice })),
    attribution: attributionForOrder(),
  };
}

export default function CheckoutPage() {
  const { cart, clearCart, applyCoupon } = useStore();
  const { settings, productById, productBySlug, reload } = useCatalog();
  const navigate = useNavigate();
  useSeo({ title: "Checkout", path: "/checkout", noindex: true });

  /* Card needs both the admin switch and a configured gateway, so it can never be offered by accident. */
  const enabledMethods = site.payments.methods.filter(
    (method) => (method.id === "cod" && settings.store.codEnabled) || (method.id === "bank" && settings.store.bankTransferEnabled) || (method.id === "card" && settings.store.cardEnabled && method.enabled)
  );
  const auth = useAuth();
  const [form, setForm] = useState(() => ({ name: "", phone: "", email: "", address: "", city: "Karachi", province: "Sindh", postalCode: "", instructions: "", notes: "", payment: enabledMethods[0]?.id || "cod", ...loadSavedCustomer() }));
  const [errors, setErrors] = useState({});

  /* Signed-in customers get their saved details filled in (without overwriting what they already typed). */
  useEffect(() => {
    if (!auth.session) return;
    const profile = auth.profile || {};
    setForm((current) => ({
      ...current,
      name: current.name || profile.name || "",
      phone: current.phone || profile.phone || "",
      email: current.email || auth.user?.email || "",
      address: current.address || profile.address || "",
      city: current.address ? current.city : profile.city || current.city,
      province: current.address ? current.province : profile.province || current.province,
    }));
  }, [auth.session, auth.profile]);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (cart.lines.length) ecommerce.beginCheckout(cart.lines, cart.coupon);
    const offer = cachedCreatorOffer();
    if (offer && !cart.coupon && cart.lines.length) applyCoupon(offer.code);
  }, []);

  /* Save the checkout (phone + bag) once the number is valid, so abandoned carts can be followed up. */
  useEffect(() => {
    if (!cart.lines.length || !phonePattern.test(form.phone.replace(/[\s-]/g, ""))) return undefined;
    const timer = setTimeout(() => saveCheckout(checkoutSnapshot(form, cart)), 1200);
    return () => clearTimeout(timer);
  }, [form.phone, form.name, form.city, cart.totals.subtotal]);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  const delivery = estimateDelivery(form.city);

  function validate() {
    const next = {};
    if (form.name.trim().length < 3) next.name = "Please enter your full name.";
    if (!phonePattern.test(form.phone.replace(/[\s-]/g, ""))) next.phone = "Enter a valid Pakistani mobile number, e.g. 0300 1234567.";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) next.email = "That email does not look right.";
    if (form.address.trim().length < 10) next.address = "Please enter your complete street address.";
    if (!form.city) next.city = "Select your city.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    setSubmitError("");
    if (!validate()) {
      document.querySelector("[aria-invalid='true']")?.focus();
      return;
    }
    setSubmitting(true);
    ecommerce.addPaymentInfo(cart.lines, form.payment);
    const customer = {
      name: form.name.trim(),
      phone: form.phone.replace(/[\s-]/g, ""),
      email: form.email.trim(),
      address: form.address.trim(),
      city: form.city,
      province: form.province,
      postalCode: form.postalCode.trim(),
      instructions: form.instructions.trim(),
    };
    try {
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ ...customer, payment: form.payment }));
    } catch {
      /* ignore */
    }
    try {
      const placed = await placeOrder({ customer, lines: cart.lines, coupon: cart.coupon, payment: form.payment, notes: form.notes, totals: cart.totals });
      const order = hydrateOrder(placed, { productById, productBySlug });
      ecommerce.purchase(order);
      saveCheckout({ ...checkoutSnapshot(form, cart), converted: true, orderId: order.id });
      if (auth.session && !auth.profile?.address) {
        auth.updateProfile({ name: customer.name, phone: customer.phone, address: customer.address, city: customer.city, province: customer.province }).catch(() => {});
      }
      clearCart();
      if (isLive) reload(); // refresh stock counts in the background
      navigate(`/order/${order.id}`, { state: { justPlaced: true, order } });
    } catch (error) {
      setSubmitError(error.message || "We could not place your order. Please try again.");
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  if (cart.lines.length === 0) {
    return (
      <>
        <PageHeader title="Checkout" />
        <section className="wrap py-10">
          <EmptyState icon={BagIcon} title="Nothing to check out yet" text="Your bag is empty. Add a product and come back." action={{ label: "Shop now", to: "/shop" }} />
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Checkout" description={auth.session ? "Your saved details are filled in. Check them and place your order." : "Guest checkout, no account needed. We only ask for what the courier requires."}>
        {!auth.session && auth.available && (
          <p className="mb-3 text-[14px] text-ink">
            Have an account? <Link to="/account" className="font-semibold text-teal hover:underline">Sign in</Link> to fill this in automatically.
          </p>
        )}
      </PageHeader>
      <form onSubmit={submit} noValidate className="wrap grid gap-8 py-8 sm:py-10 lg:grid-cols-[1fr_400px] lg:items-start">
        <div className="space-y-6 sm:space-y-8">
          {submitError && (
            <p role="alert" className="flex items-start gap-3 rounded-2xl border border-coral/40 bg-coral-50 p-4 text-[14px] text-navy">
              <InfoIcon className="mt-0.5 size-5 shrink-0 text-coral" /> {submitError}
            </p>
          )}

          <fieldset className="rounded-2xl border border-line bg-white p-4 sm:p-6">
            <legend className="px-1 font-display text-[20px] font-extrabold text-navy">1. Contact</legend>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Full name" required error={errors.name}>
                <Input value={form.name} onChange={update("name")} autoComplete="name" aria-invalid={Boolean(errors.name)} />
              </Field>
              <Field label="Mobile number" required error={errors.phone} hint="We send order updates by SMS and WhatsApp.">
                <Input type="tel" value={form.phone} onChange={update("phone")} autoComplete="tel" inputMode="tel" placeholder="0300 1234567" aria-invalid={Boolean(errors.phone)} />
              </Field>
              <Field label="Email (optional)" error={errors.email} className="sm:col-span-2">
                <Input type="email" value={form.email} onChange={update("email")} autoComplete="email" inputMode="email" aria-invalid={Boolean(errors.email)} />
              </Field>
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-line bg-white p-4 sm:p-6">
            <legend className="px-1 font-display text-[20px] font-extrabold text-navy">2. Delivery address</legend>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Street address" required error={errors.address} className="sm:col-span-2">
                <Input value={form.address} onChange={update("address")} autoComplete="street-address" placeholder="House, street, area" aria-invalid={Boolean(errors.address)} />
              </Field>
              <Field label="City" required error={errors.city}>
                <Select value={form.city} onChange={(event) => { update("city")(event); ecommerce.addShippingInfo(cart.lines, event.target.value); }} autoComplete="address-level2">
                  {cities.map((city) => (
                    <option key={city}>{city}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Province" required>
                <Select value={form.province} onChange={update("province")} autoComplete="address-level1">
                  {site.shipping.provinces.map((province) => (
                    <option key={province}>{province}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Postal code (optional)">
                <Input value={form.postalCode} onChange={update("postalCode")} autoComplete="postal-code" inputMode="numeric" />
              </Field>
              <Field label="Delivery instructions (optional)" hint="Gate number, landmark, best time to call.">
                <Input value={form.instructions} onChange={update("instructions")} />
              </Field>
            </div>
            <div className="mt-4 space-y-2 rounded-xl bg-tint px-4 py-3 text-[13px] text-navy">
              <p>
                {form.city === "Karachi" ? `Karachi: ${site.shipping.expressDays.toLowerCase()} delivery.` : `${form.city}: ${settings.shipping.estimatedDays}.`} Expected <strong>{formatDeliveryRange(delivery)}</strong>.
              </p>
              <DispatchCountdown />
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-line bg-white p-4 sm:p-6">
            <legend className="px-1 font-display text-[20px] font-extrabold text-navy">3. Payment</legend>
            <div className="mt-4 grid gap-3">
              {enabledMethods.map((method) => (
                <Radio key={method.id} name="payment" value={method.id} label={method.label} description={method.description} checked={form.payment === method.id} onChange={() => { setForm({ ...form, payment: method.id }); ecommerce.addPaymentInfo(cart.lines, method.id); }} />
              ))}
            </div>
            {form.payment === "bank" && (
              <div className="mt-4 rounded-xl bg-tint p-4 text-[14px] text-navy">
                <p className="font-semibold">Bank transfer details</p>
                <p className="mt-1">{site.payments.bankDetails.bank} · {site.payments.bankDetails.title}</p>
                <p className="font-mono text-[13px]">{site.payments.bankDetails.iban}</p>
                <p className="mt-2 text-ink">Share the transfer receipt on WhatsApp with your order number. We dispatch as soon as it is confirmed.</p>
              </div>
            )}
            <Field label="Order notes (optional)" className="mt-4">
              <Textarea rows={3} value={form.notes} onChange={update("notes")} placeholder="Gift message, shade questions, anything we should know." />
            </Field>
          </fieldset>
        </div>

        <div className="lg:sticky lg:top-24">
          <OrderSummary lines={cart.lines} totals={cart.totals} coupon={cart.coupon} />
          <Button type="submit" variant="navy" arrow className="mt-4 w-full" disabled={submitting}>
            {submitting ? "Placing order…" : `Place order · ${site.currency.symbol} ${cart.totals.total.toLocaleString()}`}
          </Button>
          <p className="mt-3 flex items-start gap-2 text-[12px] text-ink-light">
            <ShieldIcon className="mt-0.5 size-4 shrink-0 text-teal" />
            <span>
              Your details are used only to deliver this order. By placing it you agree to our <Link to="/terms" className="underline">terms</Link>.
            </span>
          </p>
          <a href={whatsappLink("Hi TAAB, I need help with my checkout.")} target="_blank" rel="noreferrer" onClick={() => ecommerce.whatsapp("checkout_help")} className="mt-4 flex items-center justify-center gap-2 rounded-full border border-line py-3 text-[14px] font-semibold text-navy hover:border-navy">
            <WhatsAppIcon className="size-4 text-[#25D366]" /> Need help? Chat with us
          </a>
        </div>
      </form>
    </>
  );
}
