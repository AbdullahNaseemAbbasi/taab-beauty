import { images } from "./images.js";

/*
 * Verified-purchase reviews. In production these come from the orders
 * database after a moderation step; the shape below is what the review
 * components expect.
 */
export const reviews = [
  { id: "r-01", productId: "p-001", author: "Hira S.", city: "Karachi", rating: 5, date: "2026-08-14", verified: true, title: "Finally a matte that does not crack", body: "Wore Rooh to a mehndi, ate biryani, danced, and it was still there at 1am. Did not dry my lips out like my previous matte.", photo: "red-lipstick-being-applied-with-brush", helpful: 42 },
  { id: "r-02", productId: "p-001", author: "Mahnoor A.", city: "Lahore", rating: 5, date: "2026-07-30", verified: true, title: "Jamun is the perfect berry", body: "Deep enough for evening, not too dark for office with one blot. Transfer is minimal on cups.", helpful: 18 },
  { id: "r-03", productId: "p-001", author: "Sana R.", city: "Islamabad", rating: 4, date: "2026-07-02", verified: true, title: "Great colour, slight fading at centre", body: "Love the shades. After about six hours the centre fades a little, but it leaves a stain so it still looks fine.", helpful: 9 },
  { id: "r-04", productId: "p-004", author: "Zainab K.", city: "Karachi", rating: 5, date: "2026-09-01", verified: true, title: "Worth every rupee", body: "The foils are unreal. I used the coral and the sea blue for a wedding look and got asked about it all night. Almost no fallout.", photo: "applying-eyeshadow", helpful: 67 },
  { id: "r-05", productId: "p-004", author: "Amna F.", city: "Hyderabad", rating: 5, date: "2026-08-20", verified: true, title: "Pigmented on brown skin", body: "Most palettes look chalky on my skin. These shades show up exactly like the pan.", helpful: 31 },
  { id: "r-06", productId: "p-005", author: "Rabia M.", city: "Karachi", rating: 5, date: "2026-08-28", verified: true, title: "Survived a July wedding", body: "Outdoor baraat in July. The foundation did not slide, separate or go orange. Shade 06 Honey matched my neck too.", helpful: 54 },
  { id: "r-07", productId: "p-005", author: "Fatima N.", city: "Faisalabad", rating: 4, date: "2026-07-18", verified: true, title: "Natural finish, medium coverage", body: "If you want full coverage you will need concealer on top. For everyday it is the best base I have used.", helpful: 12 },
  { id: "r-08", productId: "p-010", author: "Ayesha T.", city: "Lahore", rating: 5, date: "2026-09-05", verified: true, title: "My acne marks faded", body: "Three weeks of morning use and the dark marks on my cheeks are noticeably lighter. No stinging, no smell.", photo: "face-treatment-with-a-smile", helpful: 88 },
  { id: "r-09", productId: "p-010", author: "Noor J.", city: "Karachi", rating: 5, date: "2026-08-11", verified: true, title: "Glow is real", body: "My skin looks awake even on days I am not. Absorbs fast and sunscreen goes over it fine.", helpful: 23 },
  { id: "r-10", productId: "p-010", author: "Hamza Q.", city: "Islamabad", rating: 4, date: "2026-06-25", verified: true, title: "Good, bottle could be bigger", body: "Works well. 30 ml lasts me about six weeks with daily use.", helpful: 5 },
  { id: "r-11", productId: "p-012", author: "Kiran B.", city: "Multan", rating: 5, date: "2026-08-02", verified: true, title: "No tightness at all", body: "I have very sensitive skin and most cleansers burn. This one is gentle but still removes sunscreen completely.", helpful: 27 },
  { id: "r-12", productId: "p-016", author: "Sadia H.", city: "Karachi", rating: 5, date: "2026-08-19", verified: true, title: "Fixed my AC-dry skin", body: "I sleep in AC all summer and wake up with tight skin. Two nights of this and it was gone.", helpful: 36 },
  { id: "r-13", productId: "p-018", author: "Maryam I.", city: "Peshawar", rating: 5, date: "2026-09-10", verified: true, title: "Perfect way to try the range", body: "Bought this before committing to full sizes. Ended up ordering the serum and night cream in full size a week later.", helpful: 19 },
  { id: "r-14", productId: "p-019", author: "Hina W.", city: "Lahore", rating: 5, date: "2026-07-27", verified: true, title: "Less hair in the drain", body: "Used every Sunday for two months. Hair fall is visibly less and my hair is shinier. The smell is light, not like traditional oils.", photo: "long-blond-hair", helpful: 61 },
  { id: "r-15", productId: "p-019", author: "Bushra Z.", city: "Quetta", rating: 4, date: "2026-06-30", verified: true, title: "Good oil, washes out easily", body: "One shampoo and it is gone, which is rare. Will buy again.", helpful: 8 },
  { id: "r-16", productId: "p-023", author: "Omar S.", city: "Karachi", rating: 5, date: "2026-08-25", verified: true, title: "Compliments every single time", body: "Wore it to a dinner and three people asked what it was. The oud is smooth, not harsh. Lasts the full evening.", helpful: 49 },
  { id: "r-17", productId: "p-023", author: "Laiba R.", city: "Lahore", rating: 5, date: "2026-07-12", verified: true, title: "Rose that is not old-fashioned", body: "I usually avoid rose scents but this one is dark and warm. Perfect for winter evenings.", helpful: 15 },
  { id: "r-18", productId: "p-026", author: "Aqsa M.", city: "Rawalpindi", rating: 5, date: "2026-08-08", verified: true, title: "Soft, dense, no shedding", body: "Washed them four times already, not a single bristle lost. The blending brush is my favourite.", photo: "makeup-brush-set", helpful: 33 },
  { id: "r-19", productId: "p-027", author: "Tooba A.", city: "Karachi", rating: 4, date: "2026-07-05", verified: true, title: "Nice morning ritual", body: "Keeps it in the fridge. Takes the puffiness down before work. The frame is sturdy and does not squeak.", helpful: 11 },
  { id: "r-20", productId: "p-003", author: "Eman K.", city: "Islamabad", rating: 5, date: "2026-09-12", verified: true, title: "Survives my mask all day", body: "I wear a mask at the hospital for 10 hours. This tint is still there when I take it off. Nothing else has managed that.", helpful: 44 },
  { id: "r-21", productId: "p-007", author: "Mehak S.", city: "Sialkot", rating: 5, date: "2026-08-15", verified: true, title: "Wing in one go", body: "The tip is so fine that a wing takes seconds. Did not budge in the heat.", helpful: 20 },
  { id: "r-22", productId: "p-014", author: "Alina D.", city: "Karachi", rating: 4, date: "2026-07-22", verified: true, title: "Blackheads reduced", body: "Used twice a week for a month. Nose blackheads are clearly fewer. Slight dryness the first time, so moisturise after.", helpful: 14 },
  { id: "r-23", productId: "p-002", author: "Sehrish N.", city: "Lahore", rating: 5, date: "2026-08-03", verified: true, title: "Not sticky, finally", body: "My hair does not stick to my lips in the wind. Shine lasts a couple of hours.", helpful: 10 },
  { id: "r-24", productId: "p-021", author: "Nida P.", city: "Karachi", rating: 5, date: "2026-09-02", verified: true, title: "Blowout at home", body: "Takes some practice but I can get a smooth, bouncy blow-dry now and I have stopped going to the salon every week.", helpful: 17 },
];

export function reviewsForProduct(productId) {
  return reviews.filter((review) => review.productId === productId).sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function ratingBreakdown(productId) {
  const list = reviewsForProduct(productId);
  const counts = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: list.filter((review) => review.rating === stars).length }));
  return { total: list.length, counts };
}

/* Homepage testimonials: short, with faces. */
export const testimonials = [
  { name: "Zainab K.", city: "Karachi", avatar: images.avatars[0], rating: 5, quote: "The eyeshadow palette shows up on brown skin exactly like the pan. I have never had that before.", product: "Karachi Sunset Palette" },
  { name: "Ayesha T.", city: "Lahore", avatar: images.avatars[1], rating: 5, quote: "Three weeks of the vitamin C serum and my acne marks are visibly lighter. No stinging, no smell.", product: "Glow Boost Serum" },
  { name: "Omar S.", city: "Karachi", avatar: images.avatars[4], rating: 5, quote: "Three people asked what I was wearing at dinner. Rose Noir is smooth, warm and lasts the whole evening.", product: "Rose Noir EDP" },
  { name: "Hina W.", city: "Lahore", avatar: images.avatars[2], rating: 5, quote: "Two months of Sunday oiling and there is visibly less hair in the drain. Delivery to Lahore took two days.", product: "Argan & Amla Hair Oil" },
];
