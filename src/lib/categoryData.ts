/**
 * Comprehensive category and subcategory data for the marketplace.
 * Each category has a lucide-react icon and a rich list of subcategories.
 * This file serves as the fallback/static data when the database
 * categories table is empty or being seeded.
 */

import {
  Smartphone, Car, Home, Briefcase, Wrench, Shirt, Sofa, Dumbbell,
  BookOpen, Gamepad2, Music, Sprout, Factory, UtensilsCrossed,
  HeartPulse, PawPrint, Crown, Baby, Heart, Plane, Laptop, Camera,
  Tv, Headphones, Tablet, Watch, Bike, Truck, Ship,
  Building2, MapPin, GraduationCap, Scissors, Zap, ShoppingBag,
  Gem, Footprints, Backpack, Coffee, Pizza, Carrot, Fish, Beer,
  Pill, Stethoscope, Glasses, Dog, Cat, Bird, Bug, PaintBucket,
  Pencil, Palette, Newspaper, FileText, Calculator, Calendar,
  Gift, PartyPopper, Luggage, Hotel, Ticket, Compass, Mountain,
  Tent, Trophy, Volleyball,
  Guitar, Piano, Drum, Mic, Radio, Plug, Battery, Cpu, HardDrive,
  Monitor, Printer, Wifi, Phone, BatteryCharging,
  Accessibility, Bed, Box, Building, Bus, Circle, Cookie, Hammer,
  Layers, Lightbulb, Package, Puzzle, Shield, Sparkles, SprayCan,
  Square, ToyBrick, Train, TrendingUp, Waves, Wind, ShoppingBasket, CreditCard,
  type LucideIcon,
} from 'lucide-react';

export interface CategoryDef {
  id: string;
  name: string;
  slug: string;
  icon: LucideIcon;
  color: string;
  description: string;
  subcategories: SubcategoryDef[];
}

export interface SubcategoryDef {
  id: string;
  name: string;
  slug: string;
  icon?: LucideIcon;
}

export const CATEGORY_DATA: CategoryDef[] = [
  {
    id: 'electronics',
    name: 'Electronics',
    slug: 'electronics',
    icon: Smartphone,
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
    description: 'Phones, laptops, gadgets, and accessories',
    subcategories: [
      { id: 'smartphones', name: 'Smartphones', slug: 'smartphones', icon: Smartphone },
      { id: 'laptops', name: 'Laptops & Notebooks', slug: 'laptops', icon: Laptop },
      { id: 'tablets', name: 'Tablets', slug: 'tablets', icon: Tablet },
      { id: 'cameras', name: 'Cameras & Photography', slug: 'cameras', icon: Camera },
      { id: 'tvs', name: 'TVs & Displays', slug: 'tvs', icon: Tv },
      { id: 'audio', name: 'Audio & Headphones', slug: 'audio', icon: Headphones },
      { id: 'gaming', name: 'Gaming Consoles', slug: 'gaming', icon: Gamepad2 },
      { id: 'computer-parts', name: 'Computer Components', slug: 'computer-parts', icon: Cpu },
      { id: 'storage', name: 'Hard Drives & Storage', slug: 'storage', icon: HardDrive },
      { id: 'monitors', name: 'Monitors', slug: 'monitors', icon: Monitor },
      { id: 'printers', name: 'Printers & Scanners', slug: 'printers', icon: Printer },
      { id: 'networking', name: 'Networking & WiFi', slug: 'networking', icon: Wifi },
      { id: 'accessories', name: 'Cables & Accessories', slug: 'accessories', icon: Plug },
      { id: 'wearables', name: 'Smart Watches', slug: 'wearables', icon: Watch },
      { id: 'chargers', name: 'Chargers & Power Banks', slug: 'chargers', icon: BatteryCharging },
    ],
  },
  {
    id: 'vehicles',
    name: 'Vehicles',
    slug: 'vehicles',
    icon: Car,
    color: 'text-red-600 bg-red-50 dark:bg-red-950/40',
    description: 'Cars, motorcycles, bicycles, and auto parts',
    subcategories: [
      { id: 'cars', name: 'Cars', slug: 'cars', icon: Car },
      { id: 'motorcycles', name: 'Motorcycles', slug: 'motorcycles', icon: Bike },
      { id: 'bicycles', name: 'Bicycles', slug: 'bicycles', icon: Bike },
      { id: 'trucks', name: 'Trucks & Vans', slug: 'trucks', icon: Truck },
      { id: 'auto-parts', name: 'Auto Parts & Accessories', slug: 'auto-parts', icon: Wrench },
      { id: 'boats', name: 'Boats & Watercraft', slug: 'boats', icon: Ship },
      { id: 'e-bikes', name: 'Electric Bikes', slug: 'e-bikes', icon: Bike },
      { id: 'rickshaws', name: 'Rickshaws & Vans', slug: 'rickshaws', icon: Bike },
      { id: 'tires', name: 'Tires & Wheels', slug: 'tires', icon: Circle },
      { id: 'car-audio', name: 'Car Audio & Electronics', slug: 'car-audio', icon: Radio },
      { id: 'car-care', name: 'Car Care & Detailing', slug: 'car-care', icon: SprayCan },
      { id: 'vehicle-insurance', name: 'Vehicle Insurance', slug: 'vehicle-insurance', icon: FileText },
    ],
  },
  {
    id: 'real-estate',
    name: 'Real Estate',
    slug: 'real-estate',
    icon: Home,
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
    description: 'Apartments, houses, land, and commercial property',
    subcategories: [
      { id: 'apartments', name: 'Apartments for Rent', slug: 'apartments', icon: Building2 },
      { id: 'apartments-sale', name: 'Apartments for Sale', slug: 'apartments-sale', icon: Building2 },
      { id: 'houses', name: 'Houses for Rent', slug: 'houses', icon: Home },
      { id: 'houses-sale', name: 'Houses for Sale', slug: 'houses-sale', icon: Home },
      { id: 'land', name: 'Land & Plots', slug: 'land', icon: MapPin },
      { id: 'commercial', name: 'Commercial Space', slug: 'commercial', icon: Building2 },
      { id: 'rooms', name: 'Rooms & Sublets', slug: 'rooms', icon: Bed },
      { id: 'hostels', name: 'Hostels & PG', slug: 'hostels', icon: Bed },
      { id: 'garages', name: 'Garages & Parking', slug: 'garages', icon: Car },
      { id: 'vacation', name: 'Vacation Rentals', slug: 'vacation', icon: Luggage },
    ],
  },
  {
    id: 'jobs',
    name: 'Jobs',
    slug: 'jobs',
    icon: Briefcase,
    color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40',
    description: 'Full-time, part-time, freelance, and remote work',
    subcategories: [
      { id: 'it-software', name: 'IT & Software', slug: 'it-software', icon: Laptop },
      { id: 'sales-marketing', name: 'Sales & Marketing', slug: 'sales-marketing', icon: TrendingUp },
      { id: 'accounting', name: 'Accounting & Finance', slug: 'accounting', icon: Calculator },
      { id: 'teaching', name: 'Teaching & Education', slug: 'teaching', icon: GraduationCap },
      { id: 'drivers', name: 'Driver & Transport', slug: 'drivers', icon: Car },
      { id: 'domestic', name: 'Domestic Help', slug: 'domestic', icon: Home },
      { id: 'government', name: 'Government Jobs', slug: 'government', icon: Building },
      { id: 'healthcare', name: 'Healthcare & Medical', slug: 'healthcare', icon: Stethoscope },
      { id: 'engineering', name: 'Engineering', slug: 'engineering', icon: Wrench },
      { id: 'design', name: 'Design & Creative', slug: 'design', icon: Palette },
      { id: 'customer-service', name: 'Customer Service', slug: 'customer-service', icon: Headphones },
      { id: 'part-time', name: 'Part-Time & Freelance', slug: 'part-time', icon: Briefcase },
      { id: 'remote', name: 'Remote Work', slug: 'remote', icon: Laptop },
      { id: 'restaurant-jobs', name: 'Restaurant & Hotel', slug: 'restaurant-jobs', icon: UtensilsCrossed },
      { id: 'security', name: 'Security & Guard', slug: 'security', icon: Shield },
    ],
  },
  {
    id: 'services',
    name: 'Services',
    slug: 'services',
    icon: Wrench,
    color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40',
    description: 'Repair, home services, events, and professional services',
    subcategories: [
      { id: 'repair', name: 'Repair & Maintenance', slug: 'repair', icon: Wrench },
      { id: 'home-services', name: 'Home Cleaning', slug: 'home-services', icon: SprayCan },
      { id: 'electrician', name: 'Electrician', slug: 'electrician', icon: Zap },
      { id: 'plumber', name: 'Plumber', slug: 'plumber', icon: Wrench },
      { id: 'carpenter', name: 'Carpenter', slug: 'carpenter', icon: Hammer },
      { id: 'painter', name: 'Painter', slug: 'painter', icon: PaintBucket },
      { id: 'event-planning', name: 'Event Planning', slug: 'event-planning', icon: PartyPopper },
      { id: 'catering', name: 'Catering Services', slug: 'catering', icon: UtensilsCrossed },
      { id: 'photography', name: 'Photography & Video', slug: 'photography', icon: Camera },
      { id: 'beauty', name: 'Beauty & Salon', slug: 'beauty', icon: Scissors },
      { id: 'tutoring', name: 'Tutoring & Coaching', slug: 'tutoring', icon: GraduationCap },
      { id: 'transport', name: 'Transport & Moving', slug: 'transport', icon: Truck },
      { id: 'legal', name: 'Legal Services', slug: 'legal', icon: FileText },
      { id: 'accounting-svc', name: 'Tax & Accounting', slug: 'accounting-svc', icon: Calculator },
      { id: 'health-svc', name: 'Health & Wellness', slug: 'health-svc', icon: HeartPulse },
    ],
  },
  {
    id: 'fashion',
    name: 'Fashion & Beauty',
    slug: 'fashion',
    icon: Shirt,
    color: 'text-pink-600 bg-pink-50 dark:bg-pink-950/40',
    description: 'Clothing, shoes, accessories, jewelry, and cosmetics',
    subcategories: [
      { id: 'mens-clothing', name: "Men's Clothing", slug: 'mens-clothing', icon: Shirt },
      { id: 'womens-clothing', name: "Women's Clothing", slug: 'womens-clothing', icon: Shirt },
      { id: 'kids-clothing', name: 'Kids Clothing', slug: 'kids-clothing', icon: Shirt },
      { id: 'shoes', name: 'Shoes & Sneakers', slug: 'shoes', icon: Footprints },
      { id: 'bags', name: 'Bags & Wallets', slug: 'bags', icon: Backpack },
      { id: 'watches', name: 'Watches', slug: 'watches', icon: Watch },
      { id: 'jewelry', name: 'Jewelry & Gold', slug: 'jewelry', icon: Gem },
      { id: 'cosmetics', name: 'Cosmetics & Makeup', slug: 'cosmetics', icon: Sparkles },
      { id: 'perfume', name: 'Perfumes & Fragrances', slug: 'perfume', icon: SprayCan },
      { id: 'sunglasses', name: 'Sunglasses', slug: 'sunglasses', icon: Glasses },
      { id: 'traditional', name: 'Traditional Wear', slug: 'traditional', icon: Shirt },
      { id: 'winter-wear', name: 'Winter Wear', slug: 'winter-wear', icon: Shirt },
      { id: 'underwear', name: 'Innerwear', slug: 'underwear', icon: Shirt },
      { id: 'accessories-fashion', name: 'Fashion Accessories', slug: 'accessories-fashion', icon: ShoppingBag },
    ],
  },
  {
    id: 'home-garden',
    name: 'Home & Garden',
    slug: 'home-garden',
    icon: Sofa,
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
    description: 'Furniture, kitchen, decor, appliances, and garden',
    subcategories: [
      { id: 'furniture', name: 'Furniture', slug: 'furniture', icon: Sofa },
      { id: 'kitchen', name: 'Kitchen & Dining', slug: 'kitchen', icon: UtensilsCrossed },
      { id: 'home-decor', name: 'Home Decor', slug: 'home-decor', icon: PaintBucket },
      { id: 'garden', name: 'Garden & Outdoor', slug: 'garden', icon: Sprout },
      { id: 'appliances', name: 'Home Appliances', slug: 'appliances', icon: Zap },
      { id: 'lighting', name: 'Lighting & Lamps', slug: 'lighting', icon: Lightbulb },
      { id: 'tools', name: 'Tools & DIY', slug: 'tools', icon: Hammer },
      { id: 'rugs', name: 'Rugs & Carpets', slug: 'rugs', icon: Square },
      { id: 'bedding', name: 'Bedding & Bath', slug: 'bedding', icon: Bed },
      { id: 'storage-home', name: 'Storage & Organization', slug: 'storage-home', icon: Box },
      { id: 'cleaning', name: 'Cleaning Supplies', slug: 'cleaning', icon: SprayCan },
      { id: 'cookware', name: 'Cookware & Bakeware', slug: 'cookware', icon: UtensilsCrossed },
    ],
  },
  {
    id: 'sports-fitness',
    name: 'Sports & Fitness',
    slug: 'sports-fitness',
    icon: Dumbbell,
    color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40',
    description: 'Exercise equipment, sports gear, and outdoor activities',
    subcategories: [
      { id: 'exercise', name: 'Exercise Equipment', slug: 'exercise', icon: Dumbbell },
      { id: 'football-sports', name: 'Football', slug: 'football-sports', icon: Trophy },
      { id: 'cricket', name: 'Cricket', slug: 'cricket', icon: Trophy },
      { id: 'basketball-sports', name: 'Basketball', slug: 'basketball-sports', icon: Trophy },
      { id: 'tennis-sports', name: 'Tennis & Badminton', slug: 'tennis-sports', icon: Trophy },
      { id: 'cycling', name: 'Cycling', slug: 'cycling', icon: Bike },
      { id: 'swimming', name: 'Swimming', slug: 'swimming', icon: Waves },
      { id: 'outdoor', name: 'Outdoor & Camping', slug: 'outdoor', icon: Tent },
      { id: 'hiking', name: 'Hiking & Trekking', slug: 'hiking', icon: Mountain },
      { id: 'fishing-sports', name: 'Fishing', slug: 'fishing-sports', icon: Fish },
      { id: 'martial-arts', name: 'Martial Arts', slug: 'martial-arts', icon: Trophy },
      { id: 'yoga', name: 'Yoga & Meditation', slug: 'yoga', icon: Heart },
      { id: 'sports-apparel', name: 'Sports Apparel', slug: 'sports-apparel', icon: Shirt },
      { id: 'supplements', name: 'Supplements & Nutrition', slug: 'supplements', icon: Pill },
    ],
  },
  {
    id: 'books-stationery',
    name: 'Books & Stationery',
    slug: 'books-stationery',
    icon: BookOpen,
    color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40',
    description: 'Books, textbooks, office supplies, and art materials',
    subcategories: [
      { id: 'books', name: 'Books & Novels', slug: 'books', icon: BookOpen },
      { id: 'textbooks', name: 'Textbooks & Academic', slug: 'textbooks', icon: GraduationCap },
      { id: 'office-supplies', name: 'Office Supplies', slug: 'office-supplies', icon: Briefcase },
      { id: 'art-supplies', name: 'Art & Drawing Supplies', slug: 'art-supplies', icon: Palette },
      { id: 'stationery', name: 'Stationery', slug: 'stationery', icon: Pencil },
      { id: 'magazines', name: 'Magazines & Newspapers', slug: 'magazines', icon: Newspaper },
      { id: 'calendars', name: 'Calendars & Planners', slug: 'calendars', icon: Calendar },
      { id: 'exam-prep', name: 'Exam Preparation', slug: 'exam-prep', icon: FileText },
      { id: 'religious-books', name: 'Religious Books', slug: 'religious-books', icon: BookOpen },
      { id: 'childrens-books', name: "Children's Books", slug: 'childrens-books', icon: BookOpen },
    ],
  },
  {
    id: 'toys-games',
    name: 'Toys & Games',
    slug: 'toys-games',
    icon: Gamepad2,
    color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40',
    description: 'Kids toys, board games, video games, and puzzles',
    subcategories: [
      { id: 'kids-toys', name: 'Kids Toys', slug: 'kids-toys', icon: ToyBrick },
      { id: 'board-games', name: 'Board Games', slug: 'board-games', icon: Gamepad2 },
      { id: 'video-games', name: 'Video Games', slug: 'video-games', icon: Gamepad2 },
      { id: 'puzzles', name: 'Puzzles', slug: 'puzzles', icon: Puzzle },
      { id: 'remote-control', name: 'Remote Control Toys', slug: 'remote-control', icon: Car },
      { id: 'educational-toys', name: 'Educational Toys', slug: 'educational-toys', icon: GraduationCap },
      { id: 'dolls', name: 'Dolls & Figures', slug: 'dolls', icon: Heart },
      { id: 'outdoor-toys', name: 'Outdoor Toys', slug: 'outdoor-toys', icon: Trophy },
      { id: 'card-games', name: 'Card Games', slug: 'card-games', icon: Layers },
      { id: 'collectibles-toys', name: 'Collectible Toys', slug: 'collectibles-toys', icon: Crown },
    ],
  },
  {
    id: 'music',
    name: 'Music & Instruments',
    slug: 'music',
    icon: Music,
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40',
    description: 'Musical instruments, audio equipment, and accessories',
    subcategories: [
      { id: 'guitars', name: 'Guitars', slug: 'guitars', icon: Guitar },
      { id: 'keyboards', name: 'Keyboards & Pianos', slug: 'keyboards', icon: Piano },
      { id: 'drums', name: 'Drums & Percussion', slug: 'drums', icon: Drum },
      { id: 'microphones', name: 'Microphones', slug: 'microphones', icon: Mic },
      { id: 'audio-equipment', name: 'Audio Equipment', slug: 'audio-equipment', icon: Radio },
      { id: 'violins', name: 'Violins & Strings', slug: 'violins', icon: Music },
      { id: 'flutes', name: 'Flutes & Wind', slug: 'flutes', icon: Music },
      { id: 'recording', name: 'Recording Gear', slug: 'recording', icon: Mic },
      { id: 'dj', name: 'DJ Equipment', slug: 'dj', icon: Music },
      { id: 'sheet-music', name: 'Sheet Music', slug: 'sheet-music', icon: FileText },
    ],
  },
  {
    id: 'agriculture',
    name: 'Agriculture',
    slug: 'agriculture',
    icon: Sprout,
    color: 'text-green-600 bg-green-50 dark:bg-green-950/40',
    description: 'Seeds, plants, equipment, livestock, and feed',
    subcategories: [
      { id: 'seeds', name: 'Seeds & Bulbs', slug: 'seeds', icon: Sprout },
      { id: 'plants', name: 'Plants & Trees', slug: 'plants', icon: Sprout },
      { id: 'fertilizer', name: 'Fertilizer & Soil', slug: 'fertilizer', icon: Package },
      { id: 'farm-equipment', name: 'Farm Equipment', slug: 'farm-equipment', icon: Wrench },
      { id: 'livestock', name: 'Livestock & Poultry', slug: 'livestock', icon: PawPrint },
      { id: 'animal-feed', name: 'Animal Feed', slug: 'animal-feed', icon: Package },
      { id: 'irrigation', name: 'Irrigation Supplies', slug: 'irrigation', icon: Waves },
      { id: 'pesticides', name: 'Pesticides & Chemicals', slug: 'pesticides', icon: SprayCan },
      { id: 'fisheries', name: 'Fisheries & Aquaculture', slug: 'fisheries', icon: Fish },
      { id: 'gardening-tools', name: 'Gardening Tools', slug: 'gardening-tools', icon: Wrench },
    ],
  },
  {
    id: 'industrial',
    name: 'Industrial & Construction',
    slug: 'industrial',
    icon: Factory,
    color: 'text-slate-600 bg-slate-100 dark:bg-slate-900/40',
    description: 'Machinery, tools, materials, and safety equipment',
    subcategories: [
      { id: 'machinery', name: 'Heavy Machinery', slug: 'machinery', icon: Factory },
      { id: 'power-tools', name: 'Power Tools', slug: 'power-tools', icon: Zap },
      { id: 'building-materials', name: 'Building Materials', slug: 'building-materials', icon: Box },
      { id: 'safety-equipment', name: 'Safety Equipment', slug: 'safety-equipment', icon: Shield },
      { id: 'welding', name: 'Welding Equipment', slug: 'welding', icon: Zap },
      { id: 'generators', name: 'Generators & Power', slug: 'generators', icon: Zap },
      { id: 'plumbing-supplies', name: 'Plumbing Supplies', slug: 'plumbing-supplies', icon: Wrench },
      { id: 'electrical-supplies', name: 'Electrical Supplies', slug: 'electrical-supplies', icon: Zap },
      { id: 'hardware', name: 'Hardware & Fasteners', slug: 'hardware', icon: Wrench },
      { id: 'construction-tools', name: 'Construction Tools', slug: 'construction-tools', icon: Hammer },
    ],
  },
  {
    id: 'food-beverages',
    name: 'Food & Beverages',
    slug: 'food-beverages',
    icon: UtensilsCrossed,
    color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/40',
    description: 'Groceries, restaurant equipment, catering, and beverages',
    subcategories: [
      { id: 'groceries', name: 'Groceries & Staples', slug: 'groceries', icon: ShoppingBag },
      { id: 'restaurant-equipment', name: 'Restaurant Equipment', slug: 'restaurant-equipment', icon: UtensilsCrossed },
      { id: 'catering-food', name: 'Catering Supplies', slug: 'catering-food', icon: UtensilsCrossed },
      { id: 'beverages', name: 'Beverages', slug: 'beverages', icon: Coffee },
      { id: 'fresh-food', name: 'Fresh Food & Produce', slug: 'fresh-food', icon: Carrot },
      { id: 'frozen-food', name: 'Frozen Foods', slug: 'frozen-food', icon: Package },
      { id: 'snacks', name: 'Snacks & Confectionery', slug: 'snacks', icon: Cookie },
      { id: 'bakery', name: 'Bakery Supplies', slug: 'bakery', icon: UtensilsCrossed },
      { id: 'spices', name: 'Spices & Condiments', slug: 'spices', icon: Package },
      { id: 'tea-coffee', name: 'Tea & Coffee', slug: 'tea-coffee', icon: Coffee },
    ],
  },
  {
    id: 'health-medical',
    name: 'Health & Medical',
    slug: 'health-medical',
    icon: HeartPulse,
    color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/40',
    description: 'Medical equipment, supplies, medicine, and personal care',
    subcategories: [
      { id: 'medical-equipment', name: 'Medical Equipment', slug: 'medical-equipment', icon: Stethoscope },
      { id: 'medical-supplies', name: 'Medical Supplies', slug: 'medical-supplies', icon: Package },
      { id: 'medicine', name: 'Medicine & Pharma', slug: 'medicine', icon: Pill },
      { id: 'personal-care', name: 'Personal Care', slug: 'personal-care', icon: HeartPulse },
      { id: 'first-aid', name: 'First Aid', slug: 'first-aid', icon: Shield },
      { id: 'mobility', name: 'Mobility Aids', slug: 'mobility', icon: Accessibility },
      { id: 'wellness', name: 'Wellness & Vitamins', slug: 'wellness', icon: Pill },
      { id: 'dental', name: 'Dental Supplies', slug: 'dental', icon: Stethoscope },
      { id: 'vision', name: 'Vision Care', slug: 'vision', icon: Glasses },
      { id: 'hearing', name: 'Hearing Aids', slug: 'hearing', icon: Headphones },
    ],
  },
  {
    id: 'pets-animals',
    name: 'Pets & Animals',
    slug: 'pets-animals',
    icon: PawPrint,
    color: 'text-lime-600 bg-lime-50 dark:bg-lime-950/40',
    description: 'Dogs, cats, birds, fish, and pet supplies',
    subcategories: [
      { id: 'dogs', name: 'Dogs', slug: 'dogs', icon: Dog },
      { id: 'cats', name: 'Cats', slug: 'cats', icon: Cat },
      { id: 'birds', name: 'Birds', slug: 'birds', icon: Bird },
      { id: 'fish', name: 'Fish & Aquariums', slug: 'fish', icon: Fish },
      { id: 'pet-food', name: 'Pet Food', slug: 'pet-food', icon: Package },
      { id: 'pet-accessories', name: 'Pet Accessories', slug: 'pet-accessories', icon: ShoppingBag },
      { id: 'pet-medicine', name: 'Pet Medicine', slug: 'pet-medicine', icon: Pill },
      { id: 'pet-toys', name: 'Pet Toys', slug: 'pet-toys', icon: ToyBrick },
      { id: 'farm-animals', name: 'Farm Animals', slug: 'farm-animals', icon: PawPrint },
      { id: 'pet-grooming', name: 'Pet Grooming', slug: 'pet-grooming', icon: Scissors },
    ],
  },
  {
    id: 'antiques-collectibles',
    name: 'Antiques & Collectibles',
    slug: 'antiques-collectibles',
    icon: Crown,
    color: 'text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-950/40',
    description: 'Coins, stamps, art, vintage items, and rarities',
    subcategories: [
      { id: 'coins', name: 'Coins & Currency', slug: 'coins', icon: Circle },
      { id: 'stamps', name: 'Stamps', slug: 'stamps', icon: Square },
      { id: 'art', name: 'Art & Paintings', slug: 'art', icon: Palette },
      { id: 'vintage', name: 'Vintage Items', slug: 'vintage', icon: Crown },
      { id: 'memorabilia', name: 'Memorabilia', slug: 'memorabilia', icon: Trophy },
      { id: 'antique-furniture', name: 'Antique Furniture', slug: 'antique-furniture', icon: Sofa },
      { id: 'watches-antique', name: 'Vintage Watches', slug: 'watches-antique', icon: Watch },
      { id: 'books-antique', name: 'Rare Books', slug: 'books-antique', icon: BookOpen },
      { id: 'records', name: 'Vinyl Records', slug: 'records', icon: Music },
      { id: 'collectibles-other', name: 'Other Collectibles', slug: 'collectibles-other', icon: Crown },
    ],
  },
  {
    id: 'baby-kids',
    name: 'Baby & Kids',
    slug: 'baby-kids',
    icon: Baby,
    color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40',
    description: 'Clothing, toys, strollers, furniture, and essentials',
    subcategories: [
      { id: 'baby-clothing', name: 'Baby Clothing', slug: 'baby-clothing', icon: Shirt },
      { id: 'strollers', name: 'Strollers & Prams', slug: 'strollers', icon: Baby },
      { id: 'baby-furniture', name: 'Baby Furniture', slug: 'baby-furniture', icon: Sofa },
      { id: 'diapers', name: 'Diapers & Wipes', slug: 'diapers', icon: Package },
      { id: 'baby-food', name: 'Baby Food & Formula', slug: 'baby-food', icon: UtensilsCrossed },
      { id: 'baby-toys', name: 'Baby Toys', slug: 'baby-toys', icon: ToyBrick },
      { id: 'baby-gear', name: 'Baby Gear', slug: 'baby-gear', icon: Baby },
      { id: 'nursery', name: 'Nursery Decor', slug: 'nursery', icon: PaintBucket },
      { id: 'safety-baby', name: 'Baby Safety', slug: 'safety-baby', icon: Shield },
      { id: 'bath-baby', name: 'Baby Bath & Care', slug: 'bath-baby', icon: HeartPulse },
    ],
  },
  {
    id: 'wedding',
    name: 'Wedding & Events',
    slug: 'wedding',
    icon: Heart,
    color: 'text-red-500 bg-red-50 dark:bg-red-950/40',
    description: 'Dresses, jewelry, photography, catering, and venues',
    subcategories: [
      { id: 'wedding-dresses', name: 'Wedding Dresses', slug: 'wedding-dresses', icon: Shirt },
      { id: 'wedding-jewelry', name: 'Wedding Jewelry', slug: 'wedding-jewelry', icon: Gem },
      { id: 'wedding-photography', name: 'Photography', slug: 'wedding-photography', icon: Camera },
      { id: 'wedding-catering', name: 'Catering', slug: 'wedding-catering', icon: UtensilsCrossed },
      { id: 'wedding-venues', name: 'Venues & Halls', slug: 'wedding-venues', icon: Building },
      { id: 'wedding-decor', name: 'Decoration', slug: 'wedding-decor', icon: PartyPopper },
      { id: 'wedding-cards', name: 'Invitation Cards', slug: 'wedding-cards', icon: Gift },
      { id: 'wedding-music', name: 'Music & DJ', slug: 'wedding-music', icon: Music },
      { id: 'wedding-makeup', name: 'Makeup & Beauty', slug: 'wedding-makeup', icon: Scissors },
      { id: 'event-planners', name: 'Event Planners', slug: 'event-planners', icon: Calendar },
    ],
  },
  {
    id: 'travel',
    name: 'Travel & Tourism',
    slug: 'travel',
    icon: Plane,
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40',
    description: 'Tours, hotels, tickets, packages, and travel services',
    subcategories: [
      { id: 'tours', name: 'Tour Packages', slug: 'tours', icon: Compass },
      { id: 'hotels', name: 'Hotels & Resorts', slug: 'hotels', icon: Hotel },
      { id: 'flight-tickets', name: 'Flight Tickets', slug: 'flight-tickets', icon: Plane },
      { id: 'bus-tickets', name: 'Bus Tickets', slug: 'bus-tickets', icon: Bus },
      { id: 'train-tickets', name: 'Train Tickets', slug: 'train-tickets', icon: Train },
      { id: 'travel-insurance', name: 'Travel Insurance', slug: 'travel-insurance', icon: Shield },
      { id: 'visa', name: 'Visa Services', slug: 'visa', icon: FileText },
      { id: 'car-rental', name: 'Car Rental', slug: 'car-rental', icon: Car },
      { id: 'tour-guides', name: 'Tour Guides', slug: 'tour-guides', icon: MapPin },
      { id: 'adventure', name: 'Adventure Tours', slug: 'adventure', icon: Mountain },
    ],
  },
  {
    id: 'office-equipment',
    name: 'Office & Business',
    slug: 'office-equipment',
    icon: Briefcase,
    color: 'text-gray-600 bg-gray-100 dark:bg-gray-900/40',
    description: 'Office furniture, equipment, supplies, and business services',
    subcategories: [
      { id: 'office-furniture', name: 'Office Furniture', slug: 'office-furniture', icon: Sofa },
      { id: 'office-equipment-eq', name: 'Office Equipment', slug: 'office-equipment-eq', icon: Printer },
      { id: 'pos-systems', name: 'POS Systems', slug: 'pos-systems', icon: Calculator },
      { id: 'security-systems', name: 'Security Systems', slug: 'security-systems', icon: Shield },
      { id: 'cctv', name: 'CCTV & Surveillance', slug: 'cctv', icon: Camera },
      { id: 'ac-machines', name: 'AC & Cooling', slug: 'ac-machines', icon: Wind },
      { id: 'business-for-sale', name: 'Business for Sale', slug: 'business-for-sale', icon: Building },
      { id: 'franchise', name: 'Franchise Opportunities', slug: 'franchise', icon: TrendingUp },
      { id: 'office-supplies-biz', name: 'Office Supplies', slug: 'office-supplies-biz', icon: Briefcase },
      { id: 'signage', name: 'Signage & Branding', slug: 'signage', icon: PaintBucket },
    ],
  },
];

// ============================================================================
// Fast lookup maps + icon resolution helpers
// ----------------------------------------------------------------------------
// These let any part of the app resolve a rich lucide-react icon from a plain
// category/subcategory slug or name (e.g. data coming from the database, which
// only stores a nullable string icon). This guarantees EVERY category and
// subcategory renders a proper icon, with sensible fallbacks.
// ============================================================================

const CATEGORY_BY_SLUG = new Map(CATEGORY_DATA.map((c) => [c.slug, c]));
const CATEGORY_BY_NAME = new Map(CATEGORY_DATA.map((c) => [c.name.toLowerCase(), c]));

/**
 * Cloudinary logo URLs for each category slug.
 * Logos uploaded to bazarbd/categories/ on Cloudinary.
 */
const CATEGORY_LOGO_BASE = 'https://res.cloudinary.com/iok4ild8/image/upload/c_fill,w_128,h_128,g_auto,f_auto/bazarbd/cat_';

const CATEGORY_LOGO_MAP: Record<string, string> = {
  'electronics': `${CATEGORY_LOGO_BASE}electronics`,
  'vehicles': `${CATEGORY_LOGO_BASE}vehicles`,
  'real-estate': `${CATEGORY_LOGO_BASE}real_estate`,
  'jobs': `${CATEGORY_LOGO_BASE}jobs`,
  'services': `${CATEGORY_LOGO_BASE}services`,
  'fashion': `${CATEGORY_LOGO_BASE}fashion`,
  'home-garden': `${CATEGORY_LOGO_BASE}home_garden`,
  'sports-fitness': `${CATEGORY_LOGO_BASE}sports_fitness`,
  'books-stationery': `${CATEGORY_LOGO_BASE}books_stationery`,
  'toys-games': `${CATEGORY_LOGO_BASE}toys_games`,
  'music': `${CATEGORY_LOGO_BASE}music`,
  'agriculture': `${CATEGORY_LOGO_BASE}agriculture`,
  'industrial': `${CATEGORY_LOGO_BASE}industrial`,
  'food-beverages': `${CATEGORY_LOGO_BASE}food_beverages`,
  'health-medical': `${CATEGORY_LOGO_BASE}health_medical`,
  'pets-animals': `${CATEGORY_LOGO_BASE}pets_animals`,
  'antiques-collectibles': `${CATEGORY_LOGO_BASE}antiques_collectibles`,
  'baby-kids': `${CATEGORY_LOGO_BASE}baby_kids`,
  'wedding': `${CATEGORY_LOGO_BASE}wedding`,
  'travel': `${CATEGORY_LOGO_BASE}travel`,
  'office-equipment': `${CATEGORY_LOGO_BASE}office_equipment`,
};

/** Get the Cloudinary logo URL for a category by slug or name. */
export function getCategoryLogoUrl(slugOrName?: string | null): string | null {
  if (!slugOrName) return null;
  const cat = getCategoryBySlug(slugOrName);
  if (cat && CATEGORY_LOGO_MAP[cat.slug]) return CATEGORY_LOGO_MAP[cat.slug];
  // Try direct slug lookup
  if (CATEGORY_LOGO_MAP[slugOrName]) return CATEGORY_LOGO_MAP[slugOrName];
  return null;
}

/** Resolve a full category definition by slug or (case-insensitive) name. */
export function getCategoryBySlug(slugOrName?: string | null): CategoryDef | undefined {
  if (!slugOrName) return undefined;
  return (
    CATEGORY_BY_SLUG.get(slugOrName) ?? CATEGORY_BY_NAME.get(slugOrName.toLowerCase())
  );
}

/** Resolve a lucide icon for a category. Falls back to a generic Package icon. */
export function getCategoryIcon(slugOrName?: string | null): LucideIcon {
  return getCategoryBySlug(slugOrName)?.icon ?? Package;
}

/** Get the subcategory list for a category (empty array if unknown). */
export function getSubcategoriesFor(categorySlugOrName?: string | null): SubcategoryDef[] {
  return getCategoryBySlug(categorySlugOrName)?.subcategories ?? [];
}

/**
 * Resolve a lucide icon for a subcategory. Tries the subcategory within its
 * parent category first, then any matching subcategory across all categories,
 * and finally a generic Layers fallback.
 */
export function getSubcategoryIcon(
  categorySlugOrName?: string | null,
  subSlugOrName?: string | null,
): LucideIcon {
  if (!subSlugOrName) return Layers;
  const target = subSlugOrName.toLowerCase();

  const parent = getCategoryBySlug(categorySlugOrName);
  if (parent) {
    const sub = parent.subcategories.find(
      (s) => s.slug === subSlugOrName || s.name.toLowerCase() === target,
    );
    if (sub?.icon) return sub.icon;
  }

  for (const cat of CATEGORY_DATA) {
    const sub = cat.subcategories.find(
      (s) => s.slug === subSlugOrName || s.name.toLowerCase() === target,
    );
    if (sub?.icon) return sub.icon;
  }

  return Layers;
}

/**
 * Get all categories as a flat list with subcategory counts.
 */
export function getCategoryStats() {
  return CATEGORY_DATA.map(cat => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    subcategoryCount: cat.subcategories.length,
  }));
}

/**
 * Total number of categories and subcategories.
 */
export const TOTAL_CATEGORIES = CATEGORY_DATA.length;
export const TOTAL_SUBCATEGORIES = CATEGORY_DATA.reduce(
  (sum, cat) => sum + cat.subcategories.length,
  0
);

/**
 * Search categories and subcategories by name.
 */
export function searchCategories(query: string): CategoryDef[] {
  if (!query.trim()) return CATEGORY_DATA;
  const lower = query.toLowerCase();
  return CATEGORY_DATA.filter(cat => {
    if (cat.name.toLowerCase().includes(lower)) return true;
    if (cat.description.toLowerCase().includes(lower)) return true;
    return cat.subcategories.some(sub => sub.name.toLowerCase().includes(lower));
  }).map(cat => ({
    ...cat,
    subcategories: cat.name.toLowerCase().includes(lower) || cat.description.toLowerCase().includes(lower)
      ? cat.subcategories
      : cat.subcategories.filter(sub => sub.name.toLowerCase().includes(lower)),
  }));
}
