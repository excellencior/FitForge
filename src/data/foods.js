// Bangladeshi Food Database — calories and macros per serving
// Sources: BIRDEM nutrition tables, USDA, local estimates

export const foodCategories = [
  { id: 'rice_bread', name: 'Rice & Bread', namebn: 'ভাত ও রুটি', emoji: '🍚' },
  { id: 'fish', name: 'Fish', namebn: 'মাছ', emoji: '🐟' },
  { id: 'meat', name: 'Meat & Poultry', namebn: 'মাংস', emoji: '🍗' },
  { id: 'egg_dairy', name: 'Egg & Dairy', namebn: 'ডিম ও দুধ', emoji: '🥚' },
  { id: 'dal_legume', name: 'Dal & Legumes', namebn: 'ডাল ও শিম', emoji: '🫘' },
  { id: 'vegetable', name: 'Vegetables', namebn: 'সবজি', emoji: '🥬' },
  { id: 'fruit', name: 'Fruits', namebn: 'ফল', emoji: '🍌' },
  { id: 'snack', name: 'Snacks & Sweets', namebn: 'নাস্তা ও মিষ্টি', emoji: '🍿' },
  { id: 'drink', name: 'Drinks', namebn: 'পানীয়', emoji: '🥤' },
  { id: 'supplement', name: 'Supplements', namebn: 'সাপ্লিমেন্ট', emoji: '💊' },
];

const foods = [
  // === Rice & Bread ===
  { id: 1, name: 'White Rice (Cooked)', namebn: 'সাদা ভাত', category: 'rice_bread', serving: '1 cup (200g)', calories: 260, protein: 5, carbs: 56, fat: 0.5 },
  { id: 2, name: 'Brown Rice', namebn: 'লাল চাল', category: 'rice_bread', serving: '1 cup (200g)', calories: 248, protein: 6, carbs: 52, fat: 2 },
  { id: 3, name: 'Ruti (Wheat Flatbread)', namebn: 'রুটি', category: 'rice_bread', serving: '1 piece', calories: 105, protein: 3, carbs: 20, fat: 1.5 },
  { id: 4, name: 'Paratha', namebn: 'পরোটা', category: 'rice_bread', serving: '1 piece', calories: 230, protein: 5, carbs: 30, fat: 10 },
  { id: 5, name: 'Luchi', namebn: 'লুচি', category: 'rice_bread', serving: '1 piece', calories: 150, protein: 3, carbs: 18, fat: 7 },
  { id: 6, name: 'Naan', namebn: 'নান', category: 'rice_bread', serving: '1 piece', calories: 260, protein: 8, carbs: 45, fat: 5 },
  { id: 7, name: 'Polao (Pilaf Rice)', namebn: 'পোলাও', category: 'rice_bread', serving: '1 cup (200g)', calories: 340, protein: 7, carbs: 52, fat: 12 },
  { id: 8, name: 'Khichuri', namebn: 'খিচুড়ি', category: 'rice_bread', serving: '1 cup (250g)', calories: 310, protein: 10, carbs: 48, fat: 9 },
  { id: 9, name: 'Panta Bhat', namebn: 'পান্তা ভাত', category: 'rice_bread', serving: '1 cup (200g)', calories: 240, protein: 5, carbs: 54, fat: 0.5 },
  { id: 10, name: 'Fried Rice', namebn: 'ফ্রাইড রাইস', category: 'rice_bread', serving: '1 plate (250g)', calories: 380, protein: 8, carbs: 55, fat: 14 },

  // === Fish ===
  { id: 11, name: 'Ilish Bhapa (Steamed)', namebn: 'ইলিশ ভাপা', category: 'fish', serving: '1 piece (120g)', calories: 250, protein: 22, carbs: 2, fat: 17 },
  { id: 12, name: 'Ilish Bhaji (Fried)', namebn: 'ইলিশ ভাজি', category: 'fish', serving: '1 piece (120g)', calories: 300, protein: 22, carbs: 5, fat: 22 },
  { id: 13, name: 'Rui Mach Curry', namebn: 'রুই মাছের ঝোল', category: 'fish', serving: '1 piece + curry (150g)', calories: 200, protein: 24, carbs: 4, fat: 10 },
  { id: 14, name: 'Tilapia Curry', namebn: 'তেলাপিয়া ঝোল', category: 'fish', serving: '1 piece + curry (150g)', calories: 180, protein: 26, carbs: 4, fat: 7 },
  { id: 15, name: 'Pangash Curry', namebn: 'পাঙ্গাশ ঝোল', category: 'fish', serving: '1 piece (130g)', calories: 220, protein: 20, carbs: 3, fat: 14 },
  { id: 16, name: 'Shrimp/Chingri Curry', namebn: 'চিংড়ি ঝোল', category: 'fish', serving: '1 cup (150g)', calories: 190, protein: 22, carbs: 6, fat: 8 },
  { id: 17, name: 'Shutki (Dried Fish)', namebn: 'শুটকি ভর্তা', category: 'fish', serving: '50g', calories: 140, protein: 18, carbs: 2, fat: 7 },
  { id: 18, name: 'Koi Mach Bhaji', namebn: 'কই মাছ ভাজি', category: 'fish', serving: '1 piece (100g)', calories: 160, protein: 20, carbs: 3, fat: 8 },
  { id: 19, name: 'Mola/Small Fish Bhaji', namebn: 'মলা মাছ ভাজি', category: 'fish', serving: '1 cup (80g)', calories: 130, protein: 16, carbs: 3, fat: 6 },
  { id: 20, name: 'Canned Tuna', namebn: 'টুনা মাছ (ক্যান)', category: 'fish', serving: '1 can (100g)', calories: 120, protein: 26, carbs: 0, fat: 1 },

  // === Meat & Poultry ===
  { id: 21, name: 'Chicken Curry', namebn: 'মুরগির ঝোল', category: 'meat', serving: '1 piece + curry (150g)', calories: 220, protein: 25, carbs: 5, fat: 11 },
  { id: 22, name: 'Chicken Bhuna', namebn: 'মুরগি ভুনা', category: 'meat', serving: '1 piece + gravy (150g)', calories: 280, protein: 26, carbs: 6, fat: 17 },
  { id: 23, name: 'Chicken Breast (Grilled)', namebn: 'চিকেন ব্রেস্ট (গ্রিল)', category: 'meat', serving: '150g', calories: 230, protein: 43, carbs: 0, fat: 5 },
  { id: 24, name: 'Beef Curry', namebn: 'গরুর মাংসের ঝোল', category: 'meat', serving: '100g + curry', calories: 260, protein: 26, carbs: 5, fat: 15 },
  { id: 25, name: 'Beef Bhuna', namebn: 'গরু ভুনা', category: 'meat', serving: '100g + gravy', calories: 310, protein: 25, carbs: 6, fat: 21 },
  { id: 26, name: 'Kala Bhuna (Chittagong)', namebn: 'কালা ভুনা', category: 'meat', serving: '100g', calories: 330, protein: 24, carbs: 5, fat: 24 },
  { id: 27, name: 'Mutton Rezala', namebn: 'মাটন রেজালা', category: 'meat', serving: '100g + gravy', calories: 320, protein: 22, carbs: 6, fat: 24 },
  { id: 28, name: 'Chicken Roast', namebn: 'চিকেন রোস্ট', category: 'meat', serving: '1 piece (120g)', calories: 250, protein: 28, carbs: 8, fat: 12 },
  { id: 29, name: 'Chicken Tikka', namebn: 'চিকেন টিক্কা', category: 'meat', serving: '4 pieces (120g)', calories: 200, protein: 30, carbs: 4, fat: 7 },
  { id: 30, name: 'Chicken Liver Curry', namebn: 'মুরগির কলিজা', category: 'meat', serving: '100g', calories: 170, protein: 24, carbs: 3, fat: 6 },

  // === Egg & Dairy ===
  { id: 31, name: 'Boiled Egg', namebn: 'সিদ্ধ ডিম', category: 'egg_dairy', serving: '1 large', calories: 78, protein: 6, carbs: 0.5, fat: 5 },
  { id: 32, name: 'Egg Bhaji (Fried)', namebn: 'ডিম ভাজি', category: 'egg_dairy', serving: '1 egg', calories: 120, protein: 6, carbs: 1, fat: 9 },
  { id: 33, name: 'Egg Curry', namebn: 'ডিমের ঝোল', category: 'egg_dairy', serving: '1 egg + curry', calories: 150, protein: 7, carbs: 4, fat: 11 },
  { id: 34, name: 'Dim Bhurji (Scrambled)', namebn: 'ডিম ভুর্জি', category: 'egg_dairy', serving: '2 eggs', calories: 200, protein: 13, carbs: 3, fat: 15 },
  { id: 35, name: 'Omelette (2 eggs)', namebn: 'অমলেট', category: 'egg_dairy', serving: '2 eggs', calories: 190, protein: 13, carbs: 2, fat: 14 },
  { id: 36, name: 'Milk (Full Cream)', namebn: 'দুধ', category: 'egg_dairy', serving: '1 glass (250ml)', calories: 150, protein: 8, carbs: 12, fat: 8 },
  { id: 37, name: 'Curd/Doi', namebn: 'দই', category: 'egg_dairy', serving: '1 cup (200g)', calories: 120, protein: 6, carbs: 14, fat: 4 },
  { id: 38, name: 'Paneer', namebn: 'পনির', category: 'egg_dairy', serving: '100g', calories: 265, protein: 18, carbs: 4, fat: 20 },
  { id: 39, name: 'Misti Doi (Sweet Yogurt)', namebn: 'মিষ্টি দই', category: 'egg_dairy', serving: '1 cup (150g)', calories: 180, protein: 5, carbs: 28, fat: 5 },
  { id: 40, name: 'Cheese Slice', namebn: 'চীজ', category: 'egg_dairy', serving: '1 slice (20g)', calories: 65, protein: 4, carbs: 0.5, fat: 5 },

  // === Dal & Legumes ===
  { id: 41, name: 'Masoor Dal', namebn: 'মসুর ডাল', category: 'dal_legume', serving: '1 cup (200ml)', calories: 160, protein: 12, carbs: 28, fat: 1 },
  { id: 42, name: 'Mung Dal', namebn: 'মুগ ডাল', category: 'dal_legume', serving: '1 cup (200ml)', calories: 150, protein: 11, carbs: 26, fat: 1 },
  { id: 43, name: 'Cholar Dal', namebn: 'ছোলার ডাল', category: 'dal_legume', serving: '1 cup (200ml)', calories: 200, protein: 13, carbs: 32, fat: 4 },
  { id: 44, name: 'Khichuri Dal (thick)', namebn: 'খিচুড়ি ডাল', category: 'dal_legume', serving: '1 cup', calories: 280, protein: 12, carbs: 42, fat: 8 },
  { id: 45, name: 'Boot/Chickpea Bhuna', namebn: 'বুট ভুনা', category: 'dal_legume', serving: '1 cup (150g)', calories: 220, protein: 12, carbs: 34, fat: 5 },
  { id: 46, name: 'Soya Chunks Curry', namebn: 'সয়া বড়ি', category: 'dal_legume', serving: '1 cup (100g dry)', calories: 340, protein: 52, carbs: 30, fat: 1 },
  { id: 47, name: 'Peanuts', namebn: 'বাদাম (চীনা)', category: 'dal_legume', serving: '30g', calories: 170, protein: 7, carbs: 5, fat: 14 },
  { id: 48, name: 'Motor Dal (Yellow Peas)', namebn: 'মটর ডাল', category: 'dal_legume', serving: '1 cup (200ml)', calories: 170, protein: 12, carbs: 30, fat: 1 },

  // === Vegetables ===
  { id: 49, name: 'Aloo Bhaji (Potato)', namebn: 'আলু ভাজি', category: 'vegetable', serving: '1 cup (150g)', calories: 160, protein: 3, carbs: 28, fat: 5 },
  { id: 50, name: 'Mixed Vegetable Curry', namebn: 'মিক্স সবজি', category: 'vegetable', serving: '1 cup (200g)', calories: 120, protein: 4, carbs: 18, fat: 4 },
  { id: 51, name: 'Begun Bhaji (Eggplant)', namebn: 'বেগুন ভাজি', category: 'vegetable', serving: '1 cup (150g)', calories: 140, protein: 2, carbs: 12, fat: 10 },
  { id: 52, name: 'Sheem Bhaji (Flat Bean)', namebn: 'শিম ভাজি', category: 'vegetable', serving: '1 cup (150g)', calories: 80, protein: 4, carbs: 14, fat: 1 },
  { id: 53, name: 'Pui Shak', namebn: 'পুঁই শাক', category: 'vegetable', serving: '1 cup (100g)', calories: 45, protein: 3, carbs: 6, fat: 1 },
  { id: 54, name: 'Lau/Bottle Gourd', namebn: 'লাউ ভাজি', category: 'vegetable', serving: '1 cup (150g)', calories: 50, protein: 2, carbs: 10, fat: 1 },
  { id: 55, name: 'Korola/Bitter Gourd', namebn: 'করলা ভাজি', category: 'vegetable', serving: '1 cup (100g)', calories: 80, protein: 2, carbs: 8, fat: 5 },
  { id: 56, name: 'Potol Bhaji', namebn: 'পটল ভাজি', category: 'vegetable', serving: '1 cup (150g)', calories: 70, protein: 2, carbs: 10, fat: 3 },
  { id: 57, name: 'Dharosh/Okra Bhaji', namebn: 'ঢেঁড়স ভাজি', category: 'vegetable', serving: '1 cup (100g)', calories: 75, protein: 2, carbs: 10, fat: 3 },
  { id: 58, name: 'Vorta (Mashed)', namebn: 'ভর্তা (আলু/বেগুন)', category: 'vegetable', serving: '1 serving (80g)', calories: 110, protein: 3, carbs: 14, fat: 5 },

  // === Fruits ===
  { id: 59, name: 'Banana', namebn: 'কলা', category: 'fruit', serving: '1 medium', calories: 105, protein: 1, carbs: 27, fat: 0.4 },
  { id: 60, name: 'Mango', namebn: 'আম', category: 'fruit', serving: '1 cup sliced (170g)', calories: 100, protein: 1, carbs: 25, fat: 0.5 },
  { id: 61, name: 'Jackfruit', namebn: 'কাঁঠাল', category: 'fruit', serving: '1 cup (150g)', calories: 143, protein: 3, carbs: 35, fat: 1 },
  { id: 62, name: 'Papaya', namebn: 'পেঁপে', category: 'fruit', serving: '1 cup (150g)', calories: 60, protein: 1, carbs: 15, fat: 0.4 },
  { id: 63, name: 'Guava', namebn: 'পেয়ারা', category: 'fruit', serving: '1 medium', calories: 68, protein: 2, carbs: 14, fat: 1 },
  { id: 64, name: 'Watermelon', namebn: 'তরমুজ', category: 'fruit', serving: '1 cup (150g)', calories: 46, protein: 1, carbs: 12, fat: 0.2 },
  { id: 65, name: 'Litchi/Lychee', namebn: 'লিচু', category: 'fruit', serving: '5 pieces', calories: 50, protein: 1, carbs: 13, fat: 0.3 },
  { id: 66, name: 'Apple', namebn: 'আপেল', category: 'fruit', serving: '1 medium', calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  { id: 67, name: 'Dates (Khejur)', namebn: 'খেজুর', category: 'fruit', serving: '3 pieces', calories: 100, protein: 1, carbs: 27, fat: 0.2 },

  // === Snacks & Sweets ===
  { id: 68, name: 'Singara (Samosa)', namebn: 'সিঙ্গারা', category: 'snack', serving: '1 piece', calories: 150, protein: 3, carbs: 18, fat: 8 },
  { id: 69, name: 'Piyaju (Lentil Fritter)', namebn: 'পিয়াজু', category: 'snack', serving: '2 pieces', calories: 130, protein: 4, carbs: 14, fat: 7 },
  { id: 70, name: 'Beguni (Eggplant Fry)', namebn: 'বেগুনি', category: 'snack', serving: '2 pieces', calories: 120, protein: 2, carbs: 10, fat: 8 },
  { id: 71, name: 'Jilapi/Jalebi', namebn: 'জিলাপি', category: 'snack', serving: '2 pieces', calories: 200, protein: 2, carbs: 35, fat: 7 },
  { id: 72, name: 'Roshogolla', namebn: 'রসগোল্লা', category: 'snack', serving: '2 pieces', calories: 180, protein: 4, carbs: 36, fat: 2 },
  { id: 73, name: 'Mishti (Sandesh)', namebn: 'সন্দেশ', category: 'snack', serving: '1 piece', calories: 130, protein: 4, carbs: 22, fat: 3 },
  { id: 74, name: 'Chanachur', namebn: 'চানাচুর', category: 'snack', serving: '50g', calories: 250, protein: 5, carbs: 30, fat: 12 },
  { id: 75, name: 'Fuchka/Panipuri', namebn: 'ফুচকা', category: 'snack', serving: '6 pieces', calories: 180, protein: 3, carbs: 32, fat: 4 },
  { id: 76, name: 'Chotpoti', namebn: 'চটপটি', category: 'snack', serving: '1 bowl', calories: 250, protein: 8, carbs: 38, fat: 8 },
  { id: 77, name: 'Toast Biscuit', namebn: 'টোস্ট বিস্কুট', category: 'snack', serving: '4 pieces', calories: 140, protein: 3, carbs: 24, fat: 4 },
  { id: 78, name: 'Payesh (Rice Pudding)', namebn: 'পায়েশ', category: 'snack', serving: '1 cup (200ml)', calories: 250, protein: 6, carbs: 40, fat: 8 },

  // === Drinks ===
  { id: 79, name: 'Cha (Tea with Milk)', namebn: 'চা', category: 'drink', serving: '1 cup', calories: 50, protein: 1, carbs: 8, fat: 2 },
  { id: 80, name: 'Black Coffee', namebn: 'ব্ল্যাক কফি', category: 'drink', serving: '1 cup', calories: 5, protein: 0, carbs: 0, fat: 0 },
  { id: 81, name: 'Lassi (Sweet)', namebn: 'লাচ্ছি', category: 'drink', serving: '1 glass (300ml)', calories: 180, protein: 6, carbs: 28, fat: 5 },
  { id: 82, name: 'Borhani', namebn: 'বোরহানি', category: 'drink', serving: '1 glass (250ml)', calories: 70, protein: 3, carbs: 10, fat: 2 },
  { id: 83, name: 'Sugarcane Juice', namebn: 'আখের রস', category: 'drink', serving: '1 glass (250ml)', calories: 180, protein: 0, carbs: 45, fat: 0 },
  { id: 84, name: 'Dab/Coconut Water', namebn: 'ডাবের পানি', category: 'drink', serving: '1 cup (250ml)', calories: 46, protein: 2, carbs: 9, fat: 0.5 },
  { id: 85, name: 'Mango Juice', namebn: 'আমের জুস', category: 'drink', serving: '1 glass (250ml)', calories: 140, protein: 1, carbs: 34, fat: 0.5 },
  { id: 86, name: 'Horlicks/Milk Drink', namebn: 'হরলিক্স', category: 'drink', serving: '1 glass (250ml)', calories: 200, protein: 8, carbs: 32, fat: 4 },

  { id: 87, name: 'Whey Protein Shake', namebn: 'হুই প্রোটিন', category: 'supplement', serving: '1 scoop (30g)', calories: 120, protein: 24, carbs: 3, fat: 1.5 },
  { id: 88, name: 'Mass Gainer Shake', namebn: 'ম্যাস গেইনার', category: 'supplement', serving: '1 serving (100g)', calories: 400, protein: 20, carbs: 70, fat: 5 },
  { id: 89, name: 'Protein Bar', namebn: 'প্রোটিন বার', category: 'supplement', serving: '1 bar (60g)', calories: 210, protein: 20, carbs: 22, fat: 7 },
  { id: 90, name: 'Peanut Butter', namebn: 'পিনাট বাটার', category: 'supplement', serving: '2 tbsp (32g)', calories: 190, protein: 8, carbs: 6, fat: 16 },
  { id: 91, name: 'Banana Shake (Milk)', namebn: 'কলার শেক', category: 'supplement', serving: '1 glass (350ml)', calories: 280, protein: 10, carbs: 42, fat: 9 },
  { id: 92, name: 'Egg White (6)', namebn: 'ডিমের সাদা অংশ', category: 'supplement', serving: '6 whites', calories: 102, protein: 22, carbs: 1, fat: 0.3 },

  // === More Rice & Bread ===
  { id: 93, name: 'Biryani (Chicken)', namebn: 'চিকেন বিরিয়ানি', category: 'rice_bread', serving: '1 plate (300g)', calories: 490, protein: 22, carbs: 60, fat: 18 },
  { id: 94, name: 'Biryani (Mutton)', namebn: 'মাটন বিরিয়ানি', category: 'rice_bread', serving: '1 plate (300g)', calories: 530, protein: 24, carbs: 58, fat: 22 },
  { id: 95, name: 'Chira (Flattened Rice, Dry)', namebn: 'চিড়া', category: 'rice_bread', serving: '1 cup (50g)', calories: 180, protein: 3, carbs: 40, fat: 0.5 },
  { id: 96, name: 'Muri (Puffed Rice)', namebn: 'মুড়ি', category: 'rice_bread', serving: '1 cup (30g)', calories: 110, protein: 2, carbs: 25, fat: 0.3 },
  { id: 97, name: 'Chira Bhaja (Fried)', namebn: 'চিড়া ভাজা', category: 'rice_bread', serving: '1 cup (60g)', calories: 240, protein: 4, carbs: 38, fat: 8 },
  { id: 98, name: 'Tehari (Beef Rice)', namebn: 'তেহারি', category: 'rice_bread', serving: '1 plate (300g)', calories: 480, protein: 20, carbs: 58, fat: 19 },
  { id: 99, name: 'Bhuna Khichuri', namebn: 'ভুনা খিচুড়ি', category: 'rice_bread', serving: '1 cup (250g)', calories: 360, protein: 12, carbs: 50, fat: 13 },
  { id: 100, name: 'Mughlai Paratha', namebn: 'মোগলাই পরোটা', category: 'rice_bread', serving: '1 piece', calories: 350, protein: 10, carbs: 35, fat: 19 },
  { id: 101, name: 'Basmati Rice', namebn: 'বাসমতি চাল', category: 'rice_bread', serving: '1 cup (200g)', calories: 250, protein: 5, carbs: 53, fat: 0.5 },

  // === More Fish ===
  { id: 102, name: 'Catla Curry', namebn: 'কাতলা মাছের ঝোল', category: 'fish', serving: '1 piece + curry (150g)', calories: 210, protein: 25, carbs: 4, fat: 11 },
  { id: 103, name: 'Magur Mach (Catfish)', namebn: 'মাগুর মাছ', category: 'fish', serving: '100g', calories: 140, protein: 20, carbs: 2, fat: 6 },
  { id: 104, name: 'Shing Mach Curry', namebn: 'শিং মাছ', category: 'fish', serving: '100g', calories: 130, protein: 18, carbs: 3, fat: 5 },
  { id: 105, name: 'Prawn Malaikari', namebn: 'চিংড়ি মালাইকারি', category: 'fish', serving: '1 cup (180g)', calories: 320, protein: 22, carbs: 6, fat: 24 },
  { id: 106, name: 'Fish Fry (Battered)', namebn: 'মাছ ভাজা (বেসন)', category: 'fish', serving: '1 piece (100g)', calories: 220, protein: 18, carbs: 10, fat: 12 },

  // === More Meat ===
  { id: 107, name: 'Duck Curry', namebn: 'হাঁসের মাংসের ঝোল', category: 'meat', serving: '100g + curry', calories: 280, protein: 22, carbs: 5, fat: 19 },
  { id: 108, name: 'Chicken Tandoori', namebn: 'তন্দুরি চিকেন', category: 'meat', serving: '1 leg piece (150g)', calories: 260, protein: 30, carbs: 6, fat: 13 },
  { id: 109, name: 'Beef Kebab', namebn: 'বিফ কাবাব', category: 'meat', serving: '4 pieces (100g)', calories: 240, protein: 22, carbs: 8, fat: 13 },
  { id: 110, name: 'Chicken Shashlik', namebn: 'চিকেন শাশলিক', category: 'meat', serving: '4 pieces (120g)', calories: 210, protein: 28, carbs: 8, fat: 8 },
  { id: 111, name: 'Egg Devil (Dimer Devil)', namebn: 'ডিমের ডেভিল', category: 'meat', serving: '1 piece', calories: 280, protein: 10, carbs: 20, fat: 18 },

  // === More Egg & Dairy ===
  { id: 112, name: 'Mishti Doi (Sweet Curd)', namebn: 'মিষ্টি দই', category: 'egg_dairy', serving: '1 cup (150g)', calories: 180, protein: 5, carbs: 30, fat: 5 },
  { id: 113, name: 'Doi (Plain Curd)', namebn: 'দই', category: 'egg_dairy', serving: '1 cup (200g)', calories: 120, protein: 8, carbs: 10, fat: 5 },
  { id: 114, name: 'Ghee', namebn: 'ঘি', category: 'egg_dairy', serving: '1 tbsp (14g)', calories: 120, protein: 0, carbs: 0, fat: 14 },
  { id: 115, name: 'Paneer', namebn: 'পনির', category: 'egg_dairy', serving: '100g', calories: 265, protein: 18, carbs: 3, fat: 20 },
  { id: 116, name: 'Cheese Slice', namebn: 'চিজ', category: 'egg_dairy', serving: '1 slice (20g)', calories: 70, protein: 4, carbs: 0.5, fat: 5.5 },

  // === More Dal & Legumes ===
  { id: 117, name: 'Masoor Dal', namebn: 'মসুর ডাল', category: 'dal_legume', serving: '1 cup cooked (200g)', calories: 200, protein: 14, carbs: 34, fat: 1 },
  { id: 118, name: 'Mug Dal', namebn: 'মুগ ডাল', category: 'dal_legume', serving: '1 cup cooked (200g)', calories: 180, protein: 12, carbs: 30, fat: 1 },
  { id: 119, name: 'Chhola (Chickpea Curry)', namebn: 'ছোলা', category: 'dal_legume', serving: '1 cup (200g)', calories: 280, protein: 14, carbs: 42, fat: 6 },
  { id: 120, name: 'Motor Dal', namebn: 'মটর ডাল', category: 'dal_legume', serving: '1 cup cooked (200g)', calories: 220, protein: 16, carbs: 36, fat: 1 },
  { id: 121, name: 'Soyabean Chunks Curry', namebn: 'সয়াবিন ভুনা', category: 'dal_legume', serving: '1 cup (150g)', calories: 200, protein: 26, carbs: 12, fat: 6 },

  // === More Vegetables ===
  { id: 122, name: 'Aloo Bhaji', namebn: 'আলু ভাজি', category: 'vegetable', serving: '1 cup (150g)', calories: 160, protein: 3, carbs: 28, fat: 5 },
  { id: 123, name: 'Aloo Bhorta', namebn: 'আলু ভর্তা', category: 'vegetable', serving: '1 serving (100g)', calories: 140, protein: 2, carbs: 22, fat: 5 },
  { id: 124, name: 'Begun Bhaji (Eggplant)', namebn: 'বেগুন ভাজি', category: 'vegetable', serving: '1 cup (120g)', calories: 130, protein: 2, carbs: 10, fat: 9 },
  { id: 125, name: 'Begun Bhorta', namebn: 'বেগুন ভর্তা', category: 'vegetable', serving: '1 serving (80g)', calories: 100, protein: 2, carbs: 8, fat: 7 },
  { id: 126, name: 'Potol Bhaji', namebn: 'পটল ভাজি', category: 'vegetable', serving: '1 cup (120g)', calories: 80, protein: 2, carbs: 10, fat: 4 },
  { id: 127, name: 'Dharosh Bhaji (Okra)', namebn: 'ঢেঁড়স ভাজি', category: 'vegetable', serving: '1 cup (120g)', calories: 90, protein: 3, carbs: 10, fat: 5 },
  { id: 128, name: 'Sheem Bhaji (Flat Bean)', namebn: 'শিম ভাজি', category: 'vegetable', serving: '1 cup (120g)', calories: 85, protein: 4, carbs: 12, fat: 3 },
  { id: 129, name: 'Lau Ghonto (Bottle Gourd)', namebn: 'লাউ ঘণ্ট', category: 'vegetable', serving: '1 cup (150g)', calories: 70, protein: 2, carbs: 12, fat: 2 },
  { id: 130, name: 'Shak Bhaji (Mixed Greens)', namebn: 'শাক ভাজি', category: 'vegetable', serving: '1 cup (100g)', calories: 60, protein: 3, carbs: 6, fat: 3 },
  { id: 131, name: 'Korola Bhaji (Bitter Gourd)', namebn: 'করলা ভাজি', category: 'vegetable', serving: '1 cup (100g)', calories: 70, protein: 2, carbs: 8, fat: 4 },
  { id: 132, name: 'Mixed Vegetable Curry', namebn: 'মিক্সড সবজি', category: 'vegetable', serving: '1 cup (200g)', calories: 120, protein: 4, carbs: 16, fat: 5 },
  { id: 133, name: 'Aloo Gobi', namebn: 'আলু গোবি', category: 'vegetable', serving: '1 cup (180g)', calories: 150, protein: 4, carbs: 22, fat: 6 },
  { id: 134, name: 'Shutki Bhorta', namebn: 'শুটকি ভর্তা', category: 'vegetable', serving: '1 serving (50g)', calories: 80, protein: 12, carbs: 2, fat: 3 },

  // === More Fruits ===
  { id: 135, name: 'Jackfruit (Ripe)', namebn: 'পাকা কাঁঠাল', category: 'fruit', serving: '1 cup (150g)', calories: 145, protein: 2, carbs: 35, fat: 1 },
  { id: 136, name: 'Jackfruit Curry (Raw)', namebn: 'এঁচোড় তরকারি', category: 'fruit', serving: '1 cup (150g)', calories: 100, protein: 3, carbs: 18, fat: 3 },
  { id: 137, name: 'Litchi', namebn: 'লিচু', category: 'fruit', serving: '10 pieces (100g)', calories: 66, protein: 1, carbs: 16, fat: 0.5 },
  { id: 138, name: 'Guava', namebn: 'পেয়ারা', category: 'fruit', serving: '1 medium (150g)', calories: 68, protein: 3, carbs: 14, fat: 1 },
  { id: 139, name: 'Papaya', namebn: 'পেঁপে', category: 'fruit', serving: '1 cup (150g)', calories: 60, protein: 1, carbs: 15, fat: 0.4 },
  { id: 140, name: 'Watermelon', namebn: 'তরমুজ', category: 'fruit', serving: '2 cups (300g)', calories: 90, protein: 2, carbs: 22, fat: 0.5 },
  { id: 141, name: 'Mango', namebn: 'আম', category: 'fruit', serving: '1 medium (200g)', calories: 130, protein: 1, carbs: 30, fat: 0.5 },
  { id: 142, name: 'Banana', namebn: 'কলা', category: 'fruit', serving: '1 medium (120g)', calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  { id: 143, name: 'Apple', namebn: 'আপেল', category: 'fruit', serving: '1 medium (180g)', calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },

  // === More Snacks & Sweets ===
  { id: 144, name: 'Jhalmuri', namebn: 'ঝালমুড়ি', category: 'snack', serving: '1 cup (80g)', calories: 200, protein: 4, carbs: 30, fat: 8 },
  { id: 145, name: 'Singara (Samosa)', namebn: 'সিঙ্গারা', category: 'snack', serving: '2 pieces', calories: 260, protein: 5, carbs: 28, fat: 14 },
  { id: 146, name: 'Piyaju (Lentil Fritter)', namebn: 'পিয়াজু', category: 'snack', serving: '3 pieces', calories: 180, protein: 5, carbs: 18, fat: 10 },
  { id: 147, name: 'Alur Chop', namebn: 'আলুর চপ', category: 'snack', serving: '2 pieces', calories: 220, protein: 4, carbs: 26, fat: 11 },
  { id: 148, name: 'Doi Bora', namebn: 'দই বড়া', category: 'snack', serving: '3 pieces', calories: 200, protein: 6, carbs: 28, fat: 8 },
  { id: 149, name: 'Haleem', namebn: 'হালিম', category: 'snack', serving: '1 bowl (250g)', calories: 350, protein: 18, carbs: 35, fat: 15 },
  { id: 150, name: 'Pantua', namebn: 'পান্তুয়া', category: 'snack', serving: '2 pieces', calories: 240, protein: 4, carbs: 38, fat: 9 },
  { id: 151, name: 'Chomchom', namebn: 'চমচম', category: 'snack', serving: '2 pieces', calories: 200, protein: 5, carbs: 32, fat: 6 },
  { id: 152, name: 'Shemai (Vermicelli)', namebn: 'সেমাই', category: 'snack', serving: '1 cup (200g)', calories: 280, protein: 6, carbs: 42, fat: 10 },

  // === More Drinks ===
  { id: 153, name: 'Lemon Water', namebn: 'লেবু পানি', category: 'drink', serving: '1 glass (250ml)', calories: 15, protein: 0, carbs: 4, fat: 0 },
  { id: 154, name: 'Green Tea', namebn: 'গ্রিন টি', category: 'drink', serving: '1 cup', calories: 3, protein: 0, carbs: 0, fat: 0 },
  { id: 155, name: 'Saline Water', namebn: 'স্যালাইন', category: 'drink', serving: '1 packet (500ml)', calories: 45, protein: 0, carbs: 11, fat: 0 },
  { id: 156, name: 'Tokh Doi Shake', namebn: 'টক দই শেক', category: 'drink', serving: '1 glass (300ml)', calories: 160, protein: 8, carbs: 22, fat: 5 },
];

export default foods;
