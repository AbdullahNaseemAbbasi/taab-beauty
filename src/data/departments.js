import { images } from "./images.js";

/*
 * Departments group the categories. They live in the `departments` table and
 * are edited in Admin → Catalogue; this file is the seed and the mock data.
 * The order here is the order used across the site: menu, hero, home page.
 */
export const departments = [
  {
    id: "clothes",
    name: "Clothing",
    tagline: "Everyday style for the whole family.",
    description: "Easy, well-made clothing, bags and accessories for women, men and kids.",
    image: images.departments.clothes,
  },
  {
    id: "beauty",
    name: "Beauty",
    tagline: "Makeup, skincare, haircare and fragrance.",
    description: "Makeup, skincare, haircare, fragrance and tools chosen for Pakistani skin tones and Pakistani weather.",
    image: images.departments.beauty,
  },
  {
    id: "appliances",
    name: "Appliances",
    tagline: "Gadgets and home essentials that just work.",
    description: "Audio, wearables, chargers, gadgets and kitchen essentials, checked before dispatch.",
    image: images.departments.appliances,
  },
];

export const departmentById = Object.fromEntries(departments.map((department) => [department.id, department]));
