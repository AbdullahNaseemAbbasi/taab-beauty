import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "./components/layout/Layout.jsx";
import HomePage from "./pages/HomePage.jsx";

/* Route-level code splitting: only the home page ships in the main bundle. */
const ShopPage = lazy(() => import("./pages/ShopPage.jsx"));
const SearchPage = lazy(() => import("./pages/SearchPage.jsx"));
const ProductPage = lazy(() => import("./pages/ProductPage.jsx"));
const CartPage = lazy(() => import("./pages/CartPage.jsx"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage.jsx"));
const OrderConfirmationPage = lazy(() => import("./pages/OrderConfirmationPage.jsx"));
const TrackOrderPage = lazy(() => import("./pages/TrackOrderPage.jsx"));
const WishlistPage = lazy(() => import("./pages/WishlistPage.jsx"));
const ComparePage = lazy(() => import("./pages/ComparePage.jsx"));
const AccountPage = lazy(() => import("./pages/AccountPage.jsx"));
const AboutPage = lazy(() => import("./pages/AboutPage.jsx"));
const ContactPage = lazy(() => import("./pages/ContactPage.jsx"));
const FaqPage = lazy(() => import("./pages/FaqPage.jsx"));
const PolicyPage = lazy(() => import("./pages/PolicyPage.jsx"));
const JournalPage = lazy(() => import("./pages/JournalPage.jsx"));
const ArticlePage = lazy(() => import("./pages/ArticlePage.jsx"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage.jsx"));

function PageFallback() {
  return (
    <div className="wrap py-16" aria-busy="true" aria-label="Loading page">
      <div className="skeleton h-10 w-1/3 rounded-xl" />
      <div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="skeleton aspect-[4/5] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route
          path="*"
          element={
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="shop" element={<ShopPage mode="all" />} />
                <Route path="shop/:category" element={<ShopPage mode="category" />} />
                <Route path="new-arrivals" element={<ShopPage mode="collection" collection="new-arrivals" />} />
                <Route path="best-sellers" element={<ShopPage mode="collection" collection="best-sellers" />} />
                <Route path="sale" element={<ShopPage mode="collection" collection="sale" />} />
                <Route path="search" element={<SearchPage />} />
                <Route path="product/:slug" element={<ProductPage />} />
                <Route path="cart" element={<CartPage />} />
                <Route path="checkout" element={<CheckoutPage />} />
                <Route path="order/:id" element={<OrderConfirmationPage />} />
                <Route path="track-order" element={<TrackOrderPage />} />
                <Route path="wishlist" element={<WishlistPage />} />
                <Route path="compare" element={<ComparePage />} />
                <Route path="account" element={<AccountPage />} />
                <Route path="about" element={<AboutPage />} />
                <Route path="contact" element={<ContactPage />} />
                <Route path="faq" element={<FaqPage />} />
                <Route path="shipping-policy" element={<PolicyPage policy="shipping" />} />
                <Route path="returns" element={<PolicyPage policy="returns" />} />
                <Route path="privacy-policy" element={<PolicyPage policy="privacy" />} />
                <Route path="terms" element={<PolicyPage policy="terms" />} />
                <Route path="journal" element={<JournalPage />} />
                <Route path="journal/:slug" element={<ArticlePage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}
