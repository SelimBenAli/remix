/* =========================================================
   REMIX — local example data
   No API calls: this stands in for what would normally come
   from the Flask backend / database. Swap this out for real
   data passed from your Flask routes (e.g. render_template
   with a `products` variable) whenever you're ready.
   ========================================================= */

// Colour cycle used to fake product "photos" with plain CSS.
const SWATCH_COLORS = ["#780000", "#C1121F", "#003049", "#669BBC", "#5c3d2e"];

const BASES = [
  { id: "b1", name: "Raven Denim Jacket", type: "Jacket", price: 128, badge: "Best Seller", soldOut: false, icon: "🧥" },
  { id: "b2", name: "Onyx Hoodie", type: "Hoodie", price: 94, badge: "Limited Run", soldOut: false, icon: "🖤" },
  { id: "b3", name: "Oceanside Denim Jacket", type: "Jacket", price: 128, badge: null, soldOut: false, icon: "🌊" },
  { id: "b4", name: "Nightfall Workwear Jacket", type: "Jacket", price: 138, badge: "Trending", soldOut: false, icon: "🌙" },
  { id: "b5", name: "Slate Hoodie", type: "Hoodie", price: 94, badge: "Limited Run", soldOut: true, icon: "🪨" },
  { id: "b6", name: "Cobalt Denim Jacket", type: "Jacket", price: 128, badge: "Limited Run", soldOut: true, icon: "🔷" },
  { id: "b7", name: "Indigo Denim Jacket", type: "Jacket", price: 128, badge: "Limited Run", soldOut: false, icon: "🟦" },
  { id: "b8", name: "Sage Hoodie", type: "Hoodie", price: 94, badge: "Limited Run", soldOut: true, icon: "🌿" },
  { id: "b9", name: "Tan Workwear Jacket", type: "Jacket", price: 138, badge: null, soldOut: false, icon: "🏜️" },
  { id: "b10", name: "Blu Stone Denim Jacket", type: "Jacket", price: 128, badge: null, soldOut: false, icon: "🔵" },
  { id: "b11", name: "Ash Hoodie", type: "Hoodie", price: 94, badge: "Trending", soldOut: false, icon: "🌫️" },
  { id: "b12", name: "Rust Workwear Jacket", type: "Jacket", price: 138, badge: null, soldOut: false, icon: "🍂" }
];

const ARTISTS = ["Alex Almeida", "Tonton Art", "Julie Amlin", "Marcos Abdallah", "Reika Sato", "Devon Cole"];

const SWAPS = [
  { id: "s1", name: "Eternal Fungi Patch", artist: "Alex Almeida", price: 0, free: true, created: 12, popularity: 98, icon: "🍄" },
  { id: "s2", name: "Sugar Rush Patch", artist: "Tonton Art", price: 0, free: true, created: 11, popularity: 91, icon: "🍬" },
  { id: "s3", name: "Garden Florals Patch", artist: "Julie Amlin", price: 14, free: false, created: 10, popularity: 87, icon: "🌸" },
  { id: "s4", name: "Soul of the Retro Wave Patch", artist: "Marcos Abdallah", price: 16, free: false, created: 9, popularity: 95, icon: "🌆" },
  { id: "s5", name: "What a Time to Be Alive Patch", artist: "Reika Sato", price: 14, free: false, created: 8, popularity: 80, icon: "⏳" },
  { id: "s6", name: "Ryujin Patch", artist: "Devon Cole", price: 18, free: false, created: 7, popularity: 99, icon: "🐉" },
  { id: "s7", name: "Sword of Damocles Patch", artist: "Alex Almeida", price: 16, free: false, created: 6, popularity: 76, icon: "⚔️" },
  { id: "s8", name: "Yamato Patch", artist: "Tonton Art", price: 18, free: false, created: 5, popularity: 88, icon: "🚢" },
  { id: "s9", name: "Toxic Patch", artist: "Julie Amlin", price: 12, free: false, created: 4, popularity: 70, icon: "☣️" },
  { id: "s10", name: "Imaginary Friends Patch", artist: "Marcos Abdallah", price: 14, free: false, created: 3, popularity: 83, icon: "🧸" },
  { id: "s11", name: "Coffee Dark Liquid Patch", artist: "Reika Sato", price: 12, free: false, created: 2, popularity: 65, icon: "☕" },
  { id: "s12", name: "Morning Ritual Patch", artist: "Devon Cole", price: 12, free: false, created: 1, popularity: 60, icon: "🌤️" },
  { id: "s13", name: "Matcha Patch", artist: "Alex Almeida", price: 14, free: false, created: 13, popularity: 90, icon: "🍵" },
  { id: "s14", name: "Dim Sum Patch", artist: "Tonton Art", price: 14, free: false, created: 14, popularity: 77, icon: "🥟" },
  { id: "s15", name: "Wild Fire Patch", artist: "Julie Amlin", price: 16, free: false, created: 15, popularity: 93, icon: "🔥" },
  { id: "s16", name: "Lunar Eclipse Patch", artist: "Marcos Abdallah", price: 18, free: false, created: 16, popularity: 96, icon: "🌑" }
];

const TESTIMONIALS = [
  { quote: "Beautifully crafted, perfectly weighted, and made to hold its shape. This became the center of my outfits.", name: "Valerie L." },
  { quote: "The quality, materials, and design feel premium without the premium markup. Easily a tremendous value.", name: "Maurice C." },
  { quote: "Absolutely love my jacket and panels. The workmanship is top notch, and I'll definitely be buying again.", name: "Sandra B." }
];

const FEATURED_ARTISTS = [
  { name: "Alex Almeida", patches: ["🍄", "🍵", "⚔️"] },
  { name: "Tonton Art", patches: ["🍬", "🥟", "🚢"] },
  { name: "Julie Amlin", patches: ["🌸", "🔥", "☣️"] },
  { name: "Marcos Abdallah", patches: ["🌆", "🧸", "🌑"] }
];

const FAQS = [
  { q: "Can I buy more panels later?", a: "Yes. Every REMIX base and art panel is designed to stay compatible with every addition to the lineup." },
  { q: "Is it comfortable?", a: "Our hardware is engineered to feel invisible. After dozens of prototypes we refined every detail so the system stays secure and unnoticeable in wear." },
  { q: "How durable is the hardware?", a: "REMIX pieces are built for everyday wear with premium zippers and low-profile hook-and-loop that stays secure without losing its shape." },
  { q: "Can it be washed?", a: "Yes — swap the art panel back to the base's original panel before washing, then wash the base cold. Spot-clean panels as needed." },
  { q: "How do you support artists?", a: "We're built with real creators around the world. Every panel features original, human-made artwork, with a portion of each sale paid directly to the artist." }
];
