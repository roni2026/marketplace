#!/usr/bin/env python3
"""
Generates the Bangladesh marketplace catalog data:
  - src/lib/brandData.ts          (brands + models, grouped by product group)
  - src/lib/marketplaceTaxonomy.ts (categories -> subcategories -> item types)
  - src/lib/categoryFields.ts      (dynamic listing fields per category/subcategory)
  - supabase/22_catalog_seed_bd.sql (DB seed: categories, subcategories,
                                     item_types, brands, product_models)

Run:  python3 scripts/gen_catalog.py
The lists focus on products commonly available in Bangladesh. Admins can extend
brands/models at runtime via the Brands & Models admin page (CSV import/export).
"""
import re
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def slugify(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return re.sub(r"^-|-$", "", s)

# =========================================================================
# 1) BRANDS + MODELS by product group (Bangladesh market)
# =========================================================================
# group_key -> { "Brand Name": ["Model 1", "Model 2", ...] }
BRANDS = {}

BRANDS["mobiles"] = {
    "Samsung": ["Galaxy S24 Ultra","Galaxy S24+","Galaxy S24","Galaxy S23","Galaxy S23 FE","Galaxy Z Fold 5","Galaxy Z Flip 5","Galaxy A55","Galaxy A35","Galaxy A25","Galaxy A15","Galaxy A05s","Galaxy A05","Galaxy M35","Galaxy M15","Galaxy M05","Galaxy F15"],
    "Apple": ["iPhone 15 Pro Max","iPhone 15 Pro","iPhone 15 Plus","iPhone 15","iPhone 14 Pro Max","iPhone 14 Pro","iPhone 14 Plus","iPhone 14","iPhone 13","iPhone 13 Pro Max","iPhone 12","iPhone 11","iPhone SE (2022)"],
    "Xiaomi": ["Redmi Note 13 Pro+","Redmi Note 13 Pro","Redmi Note 13","Redmi 13C","Redmi 12","Redmi A3","Xiaomi 14","Xiaomi 13T Pro","Poco X6 Pro","Poco X6","Poco M6 Pro","Poco C65"],
    "Realme": ["Realme 12 Pro+","Realme 12 Pro","Realme 12","Realme 11","Realme C67","Realme C65","Realme C53","Realme C55","Realme Narzo 70 Pro","Realme GT 6"],
    "Oppo": ["Oppo Reno 11 Pro","Oppo Reno 11","Oppo Reno 10","Oppo A79","Oppo A59","Oppo A38","Oppo A18","Oppo F25 Pro","Oppo F23","Oppo Find X7"],
    "Vivo": ["Vivo V30 Pro","Vivo V30","Vivo V29","Vivo Y100","Vivo Y28","Vivo Y18","Vivo Y03","Vivo T3","Vivo X100 Pro"],
    "Infinix": ["Infinix Note 40 Pro","Infinix Note 40","Infinix Hot 40 Pro","Infinix Hot 40","Infinix Smart 8","Infinix Zero 30","Infinix GT 20 Pro"],
    "Tecno": ["Tecno Camon 30 Pro","Tecno Camon 20","Tecno Spark 20 Pro","Tecno Spark 20","Tecno Pova 6 Pro","Tecno Pop 8"],
    "OnePlus": ["OnePlus 12","OnePlus 12R","OnePlus 11","OnePlus Nord 4","OnePlus Nord CE 4","OnePlus Nord N30"],
    "Motorola": ["Moto G84","Moto G54","Moto G34","Moto Edge 50 Pro","Moto E14"],
    "Nokia": ["Nokia G42","Nokia C32","Nokia C22","Nokia 105","Nokia 110"],
    "Honor": ["Honor X9b","Honor X7b","Honor 90","Honor Magic 6 Pro"],
    "Google": ["Pixel 8 Pro","Pixel 8","Pixel 7a","Pixel 7"],
    "Walton": ["Walton Primo GH11","Walton Primo NH5","Walton Primo R10","Walton Primo EF13","Walton Olvio L series"],
    "Symphony": ["Symphony Z70","Symphony Z60","Symphony Innova 30","Symphony Atom 3","Symphony i74"],
    "itel": ["itel A70","itel A60","itel P55","itel S24","itel Vision 3"],
}

BRANDS["cars"] = {
    "Toyota": ["Corolla","Corolla Cross","Axio","Premio","Allion","Aqua","Prius","C-HR","Harrier","Land Cruiser","Land Cruiser Prado","Hiace","Noah","Voxy","Fielder","Vitz","Yaris","Passo","Raize","Rush","Fortuner"],
    "Honda": ["Civic","Accord","City","Grace","Vezel","CR-V","HR-V","Fit","Freed","Insight","Shuttle"],
    "Nissan": ["X-Trail","Qashqai","Note","Sunny","Bluebird","Sylphy","Juke","March","Leaf","Patrol","Navara"],
    "Mitsubishi": ["Pajero","Pajero Sport","Outlander","ASX","Lancer","Attrage","Xpander","L200 Triton"],
    "Suzuki": ["Swift","Alto","Wagon R","Ciaz","Vitara","Grand Vitara","Ertiga","Baleno","Jimny","Dzire"],
    "Mazda": ["Mazda 3","Mazda 6","Mazda CX-3","Mazda CX-5","Demio","Axela","Atenza"],
    "Hyundai": ["Creta","Tucson","Elantra","Sonata","Accent","i10","i20","Santa Fe","Venue"],
    "Kia": ["Sportage","Seltos","Sorento","Rio","Cerato","Picanto","Carnival"],
    "BMW": ["3 Series","5 Series","7 Series","X1","X3","X5","X6"],
    "Mercedes-Benz": ["C-Class","E-Class","S-Class","A-Class","GLA","GLC","GLE"],
    "Audi": ["A3","A4","A6","Q3","Q5","Q7"],
    "Ford": ["Ranger","Everest","EcoSport","Focus"],
    "Lexus": ["RX","NX","ES","LX","IS"],
    "Tata": ["Nexon","Punch","Tiago","Harrier"],
    "Mahindra": ["Scorpio","XUV700","Bolero","Thar"],
    "Proton": ["Saga","X70","Persona"],
    "Changan": ["CS35 Plus","Alsvin","CS75"],
    "BYD": ["Atto 3","Seal","Dolphin"],
    "MG": ["MG ZS","MG 5","MG HS","MG RX5"],
}

BRANDS["motorcycles"] = {
    "Yamaha": ["FZS V3","FZ-X","MT-15","R15 V4","Saluto","Ray ZR","Fazer","YZF R15M"],
    "Honda": ["CB Hornet 2.0","CB Shine","CBR150R","Livo","Dio","CD80","X-Blade","SP125"],
    "Bajaj": ["Pulsar NS160","Pulsar 150","Pulsar N160","Pulsar 125","Discover 125","Platina 100","CT100","Avenger"],
    "TVS": ["Apache RTR 160 4V","Apache RTR 150","Apache RTR 165 RP","Raider 125","Metro Plus","Ntorq 125","Stryker"],
    "Suzuki": ["Gixxer","Gixxer SF","GSX-R150","Hayate","Access 125","Intruder 150"],
    "Hero": ["Hunk 150R","Glamour","Splendor Plus","Passion Pro","Xtreme 160R","Thriller 160R"],
    "Runner": ["Bullet 100","Knight Rider","Turbo 125","Kite Plus","Bike RT"],
    "KTM": ["Duke 125","Duke 200","Duke 250","RC 125","RC 200"],
    "Royal Enfield": ["Classic 350","Bullet 350","Hunter 350","Meteor 350","Himalayan"],
    "Lifan": ["KPR 165R","KP Mini","KPT 150","Glint 100"],
    "Keeway": ["RKS 100","RKV 150","V150"],
    "Walton": ["Fusion","Xplore","Leo","Takeoff"],
    "GPX": ["Demon GR200R","Legend 150","Razer"],
    "Benelli": ["TNT 150","Leoncino 250","302R","Imperiale 400"],
    "Aprilia": ["SR 150","GPR 150","RS 150"],
}

BRANDS["bicycles"] = {
    "Giant": ["ATX","Talon","Escape","Contend","Trance"],
    "Trek": ["Marlin 5","Marlin 7","FX 2","Domane","X-Caliber"],
    "Merida": ["Big Nine","Big Seven","Scultura","Crossway"],
    "Duranta": ["Steed","Allan","CB Roadster","Dynamic","Ranger"],
    "Phoenix": ["Roadmaster","City Rider","Mountain X"],
    "Hero": ["Sprint","Ranger","Octane"],
    "Veloce": ["Outrage 100","Elegant 300","Vast 500"],
    "Core": ["Blackhawk","Overdrive","Vortex"],
    "Foxter": ["FT-8","FT-3","FT-1"],
    "Fuji": ["Nevada","Absolute","Sportif"],
    "Cannondale": ["Trail","Quick","Topstone"],
    "Specialized": ["Rockhopper","Sirrus","Chisel"],
    "Giant Kids": ["XTC Jr","Animator"],
    "Total": ["TB series","Vintage"],
}

BRANDS["speakers"] = {
    "JBL": ["Flip 6","Charge 5","GO 3","Clip 4","Partybox 110","Partybox 310","Boombox 3","Xtreme 3","Tune"],
    "Sony": ["SRS-XB13","SRS-XB23","SRS-XB43","SRS-XG300","ULT Field 1","HT-S40R","MHC-V13"],
    "Bose": ["SoundLink Flex","SoundLink Mini II","SoundLink Revolve+","S1 Pro"],
    "Marshall": ["Emberton II","Willen","Stanmore III","Acton III","Kilburn II"],
    "Xiaomi": ["Mi Portable Speaker","Mi Outdoor Speaker","Sound Pocket"],
    "Anker Soundcore": ["Motion 100","Boom 2","Flare 2","Mini 3","Select 4 Go"],
    "F&D": ["A521X","F580X","F210X","T-60X","E200"],
    "Microlab": ["M-108","M-200","Solo 6C","FC-360","M-700U"],
    "Edifier": ["R1280T","R1855DB","M60","QD35","G2000"],
    "Ultimate Ears": ["Boom 3","Wonderboom 3","Megaboom 3"],
    "Walton": ["WMS-Series","RX-Series","Party Speaker"],
    "Tronsmart": ["Bang","T7","Force 2","Element T6 Plus"],
    "Havit": ["SK series","M9","SF100"],
}

BRANDS["televisions"] = {
    "Samsung": ["Neo QLED QN90C","QLED Q80C","Crystal UHD CU8000","Crystal UHD CU7000","The Frame","OLED S90C"],
    "LG": ["OLED C3","OLED B3","QNED80","NanoCell","UR7500","UR8050"],
    "Sony": ["Bravia XR A80L","Bravia X90L","Bravia X85L","Bravia X75L","W830K"],
    "Walton": ["Titan","Sonic","Riva","AGATA","W series Smart TV"],
    "Vision": ["Sky View","Crystal UHD","Genext","LED Smart"],
    "Singer": ["Pro Smart","Google TV","Basic LED"],
    "TCL": ["C745 QLED","C645 QLED","P745 UHD","S5400 FHD"],
    "Hisense": ["U8K","U7K","A6K","E7K QLED"],
    "Xiaomi": ["Mi TV A2","Redmi Smart TV X","Mi TV P1"],
    "Panasonic": ["MX950","LX800","JX600"],
    "Philips": ["Ambilight OLED","PUS8500","PUS7500"],
    "Konka": ["QLED Smart","UHD Google TV"],
    "Minister": ["Digital LED","Smart Google TV"],
}

BRANDS["computer_components"] = {
    "Intel": ["Core i9-14900K","Core i7-14700K","Core i5-14600K","Core i5-13400F","Core i3-13100","Core i5-12400","Pentium Gold G7400"],
    "AMD": ["Ryzen 9 7950X","Ryzen 7 7800X3D","Ryzen 5 7600","Ryzen 5 5600","Ryzen 5 5600G","Ryzen 7 5700X","Ryzen 3 4100"],
    "NVIDIA": ["GeForce RTX 4090","RTX 4080 Super","RTX 4070 Super","RTX 4070","RTX 4060 Ti","RTX 4060","RTX 3060","RTX 3050","GTX 1660 Super"],
    "ASUS": ["ROG Strix B650-E","TUF Gaming B550","PRIME B760M","ROG Maximus Z790","TUF RTX 4070","Dual RTX 4060"],
    "MSI": ["MAG B650 Tomahawk","MPG Z790 Edge","PRO B760M","B550M PRO-VDH","Gaming X RTX 4070","Ventus RTX 4060"],
    "Gigabyte": ["B650 AORUS Elite","Z790 AORUS","B760M DS3H","B550M DS3H","Gaming OC RTX 4070","Eagle RTX 4060"],
    "ASRock": ["B650M Pro RS","B760M Pro RS","B550M Steel Legend","Phantom Gaming RX 7600"],
    "Corsair": ["Vengeance DDR5 32GB","Vengeance DDR4 16GB","RM850x PSU","RM750e PSU","4000D Airflow","MP600 SSD"],
    "G.Skill": ["Trident Z5 DDR5 32GB","Ripjaws V DDR4 16GB","Flare X5 DDR5"],
    "Kingston": ["Fury Beast DDR5 16GB","Fury Beast DDR4 16GB","NV2 1TB SSD","A400 480GB SSD","KC3000 SSD"],
    "Samsung": ["980 Pro 1TB SSD","990 Pro 2TB SSD","870 EVO SSD","990 EVO"],
    "Western Digital": ["WD Blue 1TB HDD","WD Black SN770 SSD","WD Blue SN580 SSD","WD Purple 2TB"],
    "Seagate": ["Barracuda 1TB HDD","Barracuda 2TB HDD","FireCuda 530 SSD","SkyHawk 2TB"],
    "Crucial": ["P3 Plus 1TB SSD","MX500 SSD","Pro DDR5 32GB"],
    "Cooler Master": ["Hyper 212","MasterLiquid 240L","MWE 650 PSU","MasterBox NR200"],
    "Deepcool": ["AK400","LT520 AIO","PK650D PSU","CH510 Case"],
    "Thermaltake": ["Toughpower 750W","UX100","View 270"],
    "Antec": ["NX410","CX700 PSU","DF700"],
    "Zotac": ["RTX 4070 Twin Edge","RTX 4060 Solo","RTX 3050 Eco"],
    "Palit": ["RTX 4070 Dual","RTX 4060 StormX","GTX 1650"],
    "Gainward": ["RTX 4070 Ghost","RTX 4060 Pegasus"],
    "Colorful": ["iGame RTX 4070","Battle-Ax B760M","CVN B650M"],
}

BRANDS["laptops"] = {
    "ASUS": ["ROG Strix G16","TUF Gaming A15","Zenbook 14 OLED","Vivobook 15","ExpertBook B1"],
    "Dell": ["XPS 13","Inspiron 15","Latitude 5440","G15 Gaming","Vostro 3420"],
    "HP": ["Pavilion 15","Victus 16","Envy x360","ProBook 450","Omen 16","EliteBook 840"],
    "Lenovo": ["ThinkPad X1 Carbon","IdeaPad Slim 3","Legion 5 Pro","LOQ 15","Yoga Slim 7","ThinkBook 14"],
    "Acer": ["Aspire 5","Nitro 5","Predator Helios","Swift Go 14","Aspire 3"],
    "Apple": ["MacBook Air M3","MacBook Air M2","MacBook Pro 14 M3","MacBook Pro 16 M3"],
    "MSI": ["Katana 15","Cyborg 15","Modern 14","Stealth 16","Thin GF63"],
    "Walton": ["Tamarind","Prelude","Waxjambu"],
    "Gigabyte": ["G5","Aorus 15","Aero 16"],
}

BRANDS["tablets"] = {
    "Samsung": ["Galaxy Tab S9 Ultra","Galaxy Tab S9","Galaxy Tab S9 FE","Galaxy Tab A9+","Galaxy Tab A9"],
    "Apple": ["iPad Pro 12.9 M4","iPad Air 11 M2","iPad 10th Gen","iPad Mini 6"],
    "Xiaomi": ["Pad 6","Redmi Pad SE","Redmi Pad Pro"],
    "Lenovo": ["Tab P12","Tab M11","Tab M10 Plus"],
    "Huawei": ["MatePad 11.5","MatePad SE","MatePad Pro"],
    "Realme": ["Pad 2","Pad X"],
    "Walton": ["Walpad G series","Walpad 8B"],
}

# group_key -> subcategory slugs it applies to (for brand dropdown wiring)
GROUP_TO_SUBCATS = {
    "mobiles": ["smartphones", "feature-phones"],
    "cars": ["cars", "suvs", "sedans", "hatchbacks", "electric-cars"],
    "motorcycles": ["motorcycles", "scooters", "electric-bikes"],
    "bicycles": ["bicycles", "mountain-bikes", "road-bikes", "kids-bicycles"],
    "speakers": ["audio", "speakers", "bluetooth-speakers", "home-theater"],
    "televisions": ["tvs", "smart-tvs", "led-tvs"],
    "computer_components": ["computer-parts", "processors", "graphics-cards", "motherboards", "ram-memory", "storage-drives", "power-supplies", "pc-cases", "cpu-coolers"],
    "laptops": ["laptops"],
    "tablets": ["tablets"],
}

# =========================================================================
# 2) TAXONOMY: categories -> subcategories -> item types
# =========================================================================
# Each category: (slug, name, lucide_icon, color, description, [subcategories])
# Each subcategory: (slug, name, [item types])   item types = "type of item"
TAXONOMY = [
  ("electronics","Electronics","Smartphone","text-blue-600 bg-blue-50 dark:bg-blue-950/40","Phones, computers, gadgets and accessories",[
     ("smartphones","Smartphones",["Android Phone","iPhone","Foldable Phone","Gaming Phone","Refurbished Phone"]),
     ("feature-phones","Feature Phones",["Button Phone","Dual SIM","Senior Phone"]),
     ("tablets","Tablets",["Android Tablet","iPad","Drawing Tablet","Kids Tablet"]),
     ("laptops","Laptops & Notebooks",["Gaming Laptop","Ultrabook","Business Laptop","2-in-1 Convertible","MacBook","Chromebook"]),
     ("desktops","Desktop Computers",["Gaming PC","All-in-One","Workstation","Mini PC","Branded Desktop"]),
     ("computer-parts","Computer Components",["Processor (CPU)","Graphics Card (GPU)","Motherboard","RAM / Memory","Storage Drive","Power Supply","PC Case","CPU Cooler"]),
     ("processors","Processors (CPU)",["Intel","AMD"]),
     ("graphics-cards","Graphics Cards (GPU)",["NVIDIA","AMD Radeon"]),
     ("motherboards","Motherboards",["Intel Socket","AMD Socket","Micro-ATX","ATX","Mini-ITX"]),
     ("ram-memory","RAM / Memory",["DDR4","DDR5","Laptop RAM (SODIMM)"]),
     ("storage-drives","Storage Drives",["SSD (SATA)","SSD (NVMe)","HDD","External Drive"]),
     ("monitors","Monitors",["Gaming Monitor","4K Monitor","Curved Monitor","Office Monitor"]),
     ("printers","Printers & Scanners",["Inkjet","LaserJet","All-in-One","Photo Printer","Scanner"]),
     ("cameras","Cameras & Photography",["DSLR","Mirrorless","Point & Shoot","Action Camera","CCTV","Drone","Lens","Camera Accessories"]),
     ("tvs","TVs & Displays",["Smart TV","LED TV","QLED TV","OLED TV","Android TV","Projector"]),
     ("audio","Audio & Speakers",["Bluetooth Speaker","Home Theater","Soundbar","Party Speaker","Earbuds","Headphones","Microphone","Amplifier"]),
     ("gaming","Gaming Consoles",["PlayStation","Xbox","Nintendo","Handheld Console","Game Accessories","Video Games"]),
     ("networking","Networking & WiFi",["Router","WiFi Extender","Switch","ONU / Modem","Access Point"]),
     ("wearables","Smart Watches & Wearables",["Smartwatch","Fitness Band","Smart Ring"]),
     ("accessories","Accessories & Cables",["Charger","Power Bank","Cable","Mouse","Keyboard","Webcam","Cover / Case"]),
  ]),
  ("vehicles","Vehicles","Car","text-red-600 bg-red-50 dark:bg-red-950/40","Cars, bikes, and everything on wheels",[
     ("cars","Cars",["Sedan","SUV","Hatchback","Coupe","Convertible","Pickup","MPV / Minivan","Electric Car","Hybrid"]),
     ("motorcycles","Motorcycles",["Commuter","Sports Bike","Cruiser","Cafe Racer","Off-road / Dirt","Electric Motorcycle"]),
     ("scooters","Scooters",["Petrol Scooter","Electric Scooter","Moped"]),
     ("bicycles","Bicycles",["Mountain Bike","Road Bike","Hybrid Bike","BMX","Folding Bike","Kids Bicycle","Electric Bicycle"]),
     ("three-wheelers","Three Wheelers",["CNG Auto-rickshaw","Easy Bike","Battery Rickshaw","Loader"]),
     ("trucks","Trucks & Commercial",["Pickup Truck","Covered Van","Truck","Bus / Minibus","Tractor"]),
     ("auto-parts","Auto Parts & Accessories",["Tyres & Wheels","Batteries","Engine Parts","Body Parts","Car Audio","Lights","Interior","Oils & Fluids"]),
     ("boats","Boats & Watercraft",["Speed Boat","Fishing Boat","Engine Boat","Trawler"]),
     ("vehicle-services","Vehicle Services",["Rental","Insurance","Number Plate","Registration"]),
  ]),
  ("real-estate","Real Estate","Home","text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40","Property to rent, buy and sell",[
     ("apartments-rent","Apartments for Rent",["Family Apartment","Bachelor","Studio","Duplex","Furnished"]),
     ("apartments-sale","Apartments for Sale",["Ready Flat","Under Construction","Duplex","Penthouse"]),
     ("houses-rent","Houses for Rent",["Single House","Duplex House","Tin-shed"]),
     ("houses-sale","Houses for Sale",["Independent House","Duplex","Building"]),
     ("land","Land & Plots",["Residential Plot","Commercial Plot","Agricultural Land","Industrial Land"]),
     ("commercial","Commercial Property",["Office Space","Shop / Showroom","Warehouse","Factory","Restaurant Space"]),
     ("rooms","Rooms & Sublets",["Single Room","Shared Room","Sublet","Hostel Seat","Mess Seat"]),
     ("garages","Garages & Parking",["Car Parking","Garage"]),
     ("vacation","Vacation Rentals",["Resort","Cottage","Guest House"]),
  ]),
  ("mobiles-tablets","Mobiles & Tablets","Smartphone","text-sky-600 bg-sky-50 dark:bg-sky-950/40","Phones, tablets and mobile accessories",[
     ("smartphones","Smartphones",["Android Phone","iPhone","Foldable Phone","Gaming Phone","Refurbished Phone"]),
     ("feature-phones","Feature Phones",["Button Phone","Dual SIM","Senior Phone"]),
     ("tablets","Tablets",["Android Tablet","iPad","Kids Tablet"]),
     ("mobile-accessories","Mobile Accessories",["Charger","Power Bank","Cover / Case","Screen Protector","Cable","Holder","Selfie Stick"]),
     ("sim-cards","SIM Cards & Numbers",["VIP Number","Prepaid","Postpaid"]),
     ("wearables","Smart Watches",["Smartwatch","Fitness Band","Kids Watch"]),
  ]),
  ("jobs","Jobs","Briefcase","text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40","Find work and hire talent",[
     ("it-software","IT & Software",["Full-time","Part-time","Contract","Remote","Internship"]),
     ("sales-marketing","Sales & Marketing",["Full-time","Part-time","Commission","Remote"]),
     ("accounting","Accounting & Finance",["Full-time","Part-time","Contract"]),
     ("teaching","Teaching & Education",["School Teacher","Private Tutor","Coaching","Online Tutor"]),
     ("drivers","Driver & Transport",["Car Driver","Truck Driver","Delivery","Rider"]),
     ("garments","Garments & Factory",["Operator","Supervisor","Quality Control","Merchandiser"]),
     ("healthcare","Healthcare & Medical",["Doctor","Nurse","Pharmacist","Technician"]),
     ("hospitality","Hotel & Restaurant",["Chef","Waiter","Manager","Housekeeping"]),
     ("domestic","Domestic Help",["Maid","Cook","Caregiver","Security Guard"]),
     ("part-time","Part-Time & Freelance",["Freelance","Internship","Day Labour"]),
     ("govt","Government Jobs",["Govt Circular","Bank Job","Defence"]),
  ]),
  ("services","Services","Wrench","text-orange-600 bg-orange-50 dark:bg-orange-950/40","Hire local professionals and businesses",[
     ("electronics-repair","Electronics Repair",["Mobile Repair","Laptop Repair","TV Repair","AC / Fridge Repair"]),
     ("home-services","Home Services",["Cleaning","Pest Control","Shifting / Moving","Interior Design"]),
     ("electrician","Electrician",["Wiring","Installation","Repair"]),
     ("plumber","Plumber",["Repair","Installation","Fittings"]),
     ("construction","Construction & Renovation",["Civil Work","Painting","Tiles","Carpentry","Welding"]),
     ("events","Events & Catering",["Catering","Event Planning","Photography","Decoration","Sound & Lighting"]),
     ("beauty","Beauty & Wellness",["Salon","Spa","Bridal Makeup","Parlour at Home"]),
     ("education-services","Tutoring & Coaching",["Home Tutor","Coaching Center","Language","Music Lessons"]),
     ("professional","Professional Services",["Legal","Accounting","Consulting","Translation","Web / IT"]),
     ("travel-services","Travel & Transport",["Rent-a-car","Tour Package","Ticketing","Courier"]),
  ]),
  ("fashion","Fashion & Beauty","Shirt","text-pink-600 bg-pink-50 dark:bg-pink-950/40","Clothing, footwear, accessories and cosmetics",[
     ("mens-clothing","Men's Clothing",["Shirt","T-Shirt","Panjabi","Pant","Suit","Jacket","Traditional"]),
     ("womens-clothing","Women's Clothing",["Saree","Salwar Kameez","Kurti","Dress","Abaya / Borka","Lehenga"]),
     ("kids-clothing","Kids' Clothing",["Boys","Girls","Baby","Party Wear"]),
     ("footwear","Footwear",["Sneakers","Formal Shoes","Sandals","Heels","Boots","Sports Shoes"]),
     ("watches","Watches",["Analog","Digital","Smart","Luxury"]),
     ("bags","Bags & Luggage",["Handbag","Backpack","Travel Bag","Wallet","Ladies Purse"]),
     ("jewellery","Jewellery",["Gold","Silver","Imitation","Diamond","Wedding"]),
     ("cosmetics","Cosmetics & Makeup",["Skincare","Makeup","Fragrance","Haircare"]),
     ("eyewear","Eyewear",["Sunglasses","Prescription","Frames"]),
  ]),
  ("home-living","Home & Living","Sofa","text-amber-600 bg-amber-50 dark:bg-amber-950/40","Furniture, appliances and home essentials",[
     ("furniture","Furniture",["Sofa","Bed","Wardrobe","Dining Table","Chair","Study Table","Showcase","Office Furniture"]),
     ("home-appliances","Home Appliances",["Refrigerator","Washing Machine","Microwave Oven","Rice Cooker","Blender","Iron","Water Purifier"]),
     ("ac-cooling","AC & Cooling",["Split AC","Window AC","Portable AC","Air Cooler","Ceiling Fan","Table Fan"]),
     ("kitchen","Kitchenware",["Cookware","Dinnerware","Gas Stove","Pressure Cooker","Utensils"]),
     ("home-decor","Home Decor",["Wall Art","Curtains","Carpet","Lighting","Clock","Vase"]),
     ("bedding","Bedding & Bath",["Mattress","Bedsheet","Pillow","Blanket","Towel"]),
     ("tools","Tools & Hardware",["Power Tools","Hand Tools","Plumbing","Electrical","Paint"]),
     ("garden","Garden & Outdoor",["Plants","Seeds","Garden Tools","Outdoor Furniture"]),
  ]),
  ("sports-fitness","Sports & Fitness","Dumbbell","text-lime-600 bg-lime-50 dark:bg-lime-950/40","Gym, sports gear and outdoor equipment",[
     ("gym-equipment","Gym & Fitness",["Treadmill","Dumbbell","Exercise Bike","Home Gym","Yoga Mat","Bench"]),
     ("cricket","Cricket",["Bat","Ball","Pads","Gloves","Kit"]),
     ("football","Football",["Ball","Boots","Jersey","Gloves"]),
     ("cycling-sports","Cycling",["Bicycle","Helmet","Accessories"]),
     ("outdoor","Outdoor & Camping",["Tent","Sleeping Bag","Backpack","Trekking Gear"]),
     ("indoor-games","Indoor Games",["Carrom","Chess","Table Tennis","Board Games"]),
     ("water-sports","Water Sports",["Swimming","Fishing","Diving"]),
  ]),
  ("books-education","Books & Education","BookOpen","text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40","Books, courses and stationery",[
     ("academic","Academic Books",["School","College","University","Admission","Guide"]),
     ("fiction","Fiction & Literature",["Novel","Story","Poetry"]),
     ("religious","Religious Books",["Islamic","Hindu","Christian","Buddhist"]),
     ("stationery","Stationery",["Pen & Pencil","Notebook","Art Supplies","Office Supplies"]),
     ("courses","Courses & Training",["Online Course","Skill Training","Language Course"]),
     ("magazines","Magazines & Comics",["Magazine","Comics","Newspaper"]),
  ]),
  ("baby-kids","Baby & Kids","Baby","text-rose-600 bg-rose-50 dark:bg-rose-950/40","Everything for babies and children",[
     ("baby-gear","Baby Gear",["Stroller","Car Seat","Walker","High Chair","Carrier"]),
     ("toys","Toys & Games",["Educational","Remote Control","Soft Toys","Puzzles","Action Figures","Dolls"]),
     ("baby-clothing","Baby Clothing",["Newborn","Boys","Girls"]),
     ("feeding","Feeding & Nursing",["Bottle","Breast Pump","Sterilizer"]),
     ("diapers","Diapers & Care",["Diapers","Wipes","Skincare"]),
     ("kids-furniture","Kids Furniture",["Baby Bed","Study Table","Toy Storage"]),
  ]),
  ("pets-animals","Pets & Animals","PawPrint","text-teal-600 bg-teal-50 dark:bg-teal-950/40","Pets, livestock and pet supplies",[
     ("dogs","Dogs",["German Shepherd","Labrador","Pomeranian","Husky","Local Breed","Puppy"]),
     ("cats","Cats",["Persian","Traditional","Ragdoll","Local Breed","Kitten"]),
     ("birds","Birds",["Budgerigar","Cockatiel","Love Bird","Pigeon","Parrot","Finch","Java"]),
     ("fish","Fish & Aquarium",["Goldfish","Guppy","Koi","Aquarium","Aquarium Accessories"]),
     ("livestock","Livestock & Farm",["Cow","Goat","Sheep","Buffalo","Chicken","Duck"]),
     ("pet-food","Pet Food",["Dog Food","Cat Food","Bird Food","Fish Food"]),
     ("pet-accessories","Pet Accessories",["Cage","Leash","Bed","Toys","Grooming"]),
  ]),
  ("agriculture","Agriculture","Sprout","text-green-700 bg-green-50 dark:bg-green-950/40","Farming, crops and machinery",[
     ("crops-seeds","Crops & Seeds",["Rice","Vegetables","Fruits","Seeds","Saplings"]),
     ("farm-machinery","Farm Machinery",["Tractor","Power Tiller","Harvester","Pump","Thresher"]),
     ("fertilizer","Fertilizer & Pesticide",["Fertilizer","Pesticide","Organic"]),
     ("poultry","Poultry & Dairy",["Poultry Equipment","Dairy Equipment","Feed"]),
     ("agri-tools","Agri Tools",["Hand Tools","Irrigation","Sprayer"]),
  ]),
  ("food-catering","Food & Catering","UtensilsCrossed","text-orange-700 bg-orange-50 dark:bg-orange-950/40","Homemade food, groceries and catering",[
     ("homemade","Homemade Food",["Cakes","Snacks","Meals","Pickle","Sweets"]),
     ("groceries","Groceries",["Rice & Grains","Oil","Spices","Dry Food"]),
     ("beverages","Beverages",["Tea","Coffee","Juice","Soft Drinks"]),
     ("organic-food","Organic & Special",["Honey","Ghee","Dates","Organic"]),
     ("catering","Catering & Restaurant",["Catering Service","Cloud Kitchen"]),
  ]),
  ("health-medical","Health & Medical","HeartPulse","text-red-700 bg-red-50 dark:bg-red-950/40","Medical equipment, supplements and care",[
     ("medical-equipment","Medical Equipment",["Wheelchair","Oxygen Concentrator","BP Machine","Nebulizer","Thermometer","Hospital Bed"]),
     ("supplements","Supplements & Vitamins",["Protein","Vitamins","Herbal"]),
     ("personal-care","Personal Care",["Skincare","Hygiene","Massager"]),
     ("fitness-health","Fitness & Health",["Weighing Scale","Fitness Tracker"]),
  ]),
  ("business-industrial","Business & Industrial","Factory","text-slate-600 bg-slate-50 dark:bg-slate-900/40","Machinery, equipment and B2B supplies",[
     ("machinery","Industrial Machinery",["Generator","Compressor","Lathe","CNC","Packaging"]),
     ("office-equipment","Office Equipment",["Photocopier","POS Machine","Projector","Shredder"]),
     ("restaurant-equipment","Restaurant Equipment",["Oven","Fryer","Freezer","Display Counter"]),
     ("construction-material","Construction Materials",["Rod","Cement","Brick","Tiles","Sand"]),
     ("safety","Safety & Security",["CCTV","Fire Safety","Access Control","Safety Gear"]),
     ("wholesale","Wholesale & Bulk",["Bulk Stock","Liquidation"]),
  ]),
  ("hobbies-collectibles","Hobbies & Collectibles","Palette","text-purple-600 bg-purple-50 dark:bg-purple-950/40","Musical instruments, art and collectibles",[
     ("musical-instruments","Musical Instruments",["Guitar","Keyboard","Drums","Harmonium","Tabla","Violin","Flute"]),
     ("art-craft","Art & Craft",["Painting","Handicraft","Sculpture","Craft Supplies"]),
     ("antiques","Antiques & Collectibles",["Coins","Stamps","Vintage","Artifacts"]),
     ("cameras-hobby","Cameras & Drones",["Camera","Drone","Gimbal"]),
     ("gaming-hobby","Gaming & Cards",["Trading Cards","Board Games","Models"]),
  ]),
]

# =========================================================================
# 3) DYNAMIC FIELD DEFINITIONS per subcategory (brand/model + extra fields)
# =========================================================================
# field types: text | number | select | boolean
# "brand": true enables the brand + model dropdown (wired via GROUP_TO_SUBCATS)
YEARS = [str(y) for y in range(2025, 1994, -1)]
FIELDS = {
  # ---- Cars: brand, model + rich attributes -------------------------------
  "cars": {"brand": True, "fields": [
     ("year","Year of Manufacture","select",YEARS),
     ("registration_year","Registration Year","select",YEARS),
     ("mileage","Mileage (km)","number",None),
     ("fuel_type","Fuel Type","select",["Petrol","Octane","Diesel","CNG","Hybrid","Electric","LPG"]),
     ("transmission","Transmission","select",["Automatic","Manual","CVT","Tiptronic"]),
     ("engine_cc","Engine Capacity (cc)","number",None),
     ("body_type","Body Type","select",["Sedan","SUV","Hatchback","Coupe","Convertible","Pickup","MPV / Minivan","Wagon"]),
     ("color","Color","text",None),
     ("seats","Seating Capacity","select",["2","4","5","7","8+"]),
     ("registration_area","Registered City","text",None),
  ]},
  # ---- Mobiles: brand, model + rich attributes ----------------------------
  "smartphones": {"brand": True, "fields": [
     ("ram","RAM","select",["1 GB","2 GB","3 GB","4 GB","6 GB","8 GB","12 GB","16 GB"]),
     ("storage","Storage","select",["8 GB","16 GB","32 GB","64 GB","128 GB","256 GB","512 GB","1 TB"]),
     ("color","Color","text",None),
     ("network","Network","select",["4G","5G","3G"]),
     ("sim","SIM","select",["Dual SIM","Single SIM","eSIM"]),
     ("battery","Battery (mAh)","number",None),
     ("warranty","Warranty","select",["No Warranty","Official Warranty","Shop Warranty","1 Month","3 Months","6 Months","1 Year"]),
     ("edition","Region / Edition","select",["Official","Unofficial","Global","Refurbished"]),
  ]},
  "feature-phones": {"brand": True, "fields": [
     ("sim","SIM","select",["Dual SIM","Single SIM"]),
     ("color","Color","text",None),
  ]},
  "tablets": {"brand": True, "fields": [
     ("ram","RAM","select",["2 GB","3 GB","4 GB","6 GB","8 GB","12 GB"]),
     ("storage","Storage","select",["16 GB","32 GB","64 GB","128 GB","256 GB","512 GB","1 TB"]),
     ("screen_size","Screen Size (inch)","number",None),
     ("connectivity","Connectivity","select",["WiFi","WiFi + Cellular"]),
  ]},
  "laptops": {"brand": True, "fields": [
     ("processor","Processor","select",["Intel Core i3","Intel Core i5","Intel Core i7","Intel Core i9","AMD Ryzen 3","AMD Ryzen 5","AMD Ryzen 7","AMD Ryzen 9","Apple M1","Apple M2","Apple M3","Other"]),
     ("ram","RAM","select",["4 GB","8 GB","16 GB","32 GB","64 GB"]),
     ("storage","Storage","select",["128 GB SSD","256 GB SSD","512 GB SSD","1 TB SSD","1 TB HDD","2 TB HDD"]),
     ("gpu","Graphics","text",None),
     ("screen_size","Screen Size (inch)","number",None),
  ]},
  "desktops": {"brand": True, "fields": [
     ("processor","Processor","text",None),
     ("ram","RAM","select",["4 GB","8 GB","16 GB","32 GB","64 GB"]),
     ("storage","Storage","text",None),
     ("gpu","Graphics Card","text",None),
  ]},
  "motorcycles": {"brand": True, "fields": [
     ("year","Year","select",YEARS),
     ("engine_cc","Engine (cc)","select",["80","100","110","125","150","160","165","200","250","350","400+"]),
     ("mileage","Mileage (km)","number",None),
     ("color","Color","text",None),
     ("registration","Registration","select",["Registered","Unregistered","On Test"]),
     ("papers","Papers","select",["Up to date","Expired"]),
  ]},
  "scooters": {"brand": True, "fields": [
     ("year","Year","select",YEARS),
     ("engine_cc","Engine (cc)","number",None),
     ("mileage","Mileage (km)","number",None),
     ("color","Color","text",None),
  ]},
  "bicycles": {"brand": True, "fields": [
     ("frame_size","Frame Size","select",["Kids","XS","S","M","L","XL"]),
     ("gears","Gears","select",["Single Speed","7 Speed","21 Speed","24 Speed","27 Speed","30+ Speed"]),
     ("brake_type","Brake Type","select",["Rim Brake","Disc Brake","Hydraulic Disc"]),
     ("wheel_size","Wheel Size","select",["12\"","16\"","20\"","24\"","26\"","27.5\"","29\""]),
     ("color","Color","text",None),
  ]},
  "audio": {"brand": True, "fields": [
     ("audio_type","Type","select",["Bluetooth Speaker","Home Theater","Soundbar","Party Speaker","Earbuds","Headphones","Amplifier"]),
     ("power_output","Power Output (W)","number",None),
     ("connectivity","Connectivity","select",["Bluetooth","Wired","WiFi","Bluetooth + Wired"]),
     ("color","Color","text",None),
     ("warranty","Warranty","select",["No Warranty","6 Months","1 Year","2 Years"]),
  ]},
  "tvs": {"brand": True, "fields": [
     ("screen_size","Screen Size (inch)","select",["24","32","40","43","50","55","65","75","85"]),
     ("resolution","Resolution","select",["HD","Full HD","4K UHD","8K"]),
     ("panel","Panel","select",["LED","QLED","OLED","Neo QLED"]),
     ("smart","Smart TV","select",["Smart (Android/Google)","Smart (WebOS/Tizen)","Non-Smart"]),
     ("warranty","Warranty","select",["No Warranty","1 Year","2 Years","3 Years"]),
  ]},
  "computer-parts": {"brand": True, "fields": [
     ("part_type","Component Type","select",["Processor (CPU)","Graphics Card (GPU)","Motherboard","RAM / Memory","Storage Drive","Power Supply","PC Case","CPU Cooler","Monitor","Other"]),
     ("warranty","Warranty","select",["No Warranty","Shop Warranty","6 Months","1 Year","3 Years","5 Years"]),
  ]},
  "monitors": {"brand": True, "fields": [
     ("screen_size","Screen Size (inch)","select",["19","22","24","27","32","34","49"]),
     ("resolution","Resolution","select",["HD","Full HD","2K QHD","4K UHD"]),
     ("refresh_rate","Refresh Rate","select",["60Hz","75Hz","100Hz","144Hz","165Hz","240Hz"]),
     ("panel","Panel","select",["IPS","VA","TN","OLED"]),
  ]},
  # ---- Real estate --------------------------------------------------------
  "apartments-rent": {"brand": False, "fields": [
     ("bedrooms","Bedrooms","select",["1","2","3","4","5+"]),
     ("bathrooms","Bathrooms","select",["1","2","3","4+"]),
     ("size_sqft","Size (sqft)","number",None),
     ("floor","Floor","text",None),
     ("furnishing","Furnishing","select",["Furnished","Semi-Furnished","Unfurnished"]),
     ("facing","Facing","select",["South","North","East","West"]),
  ]},
  # ---- Pets ---------------------------------------------------------------
  "dogs": {"brand": False, "fields": [
     ("breed","Breed","text",None),
     ("age","Age","text",None),
     ("gender","Gender","select",["Male","Female"]),
     ("vaccinated","Vaccinated","select",["Yes","No","Partially"]),
  ]},
  "cats": {"brand": False, "fields": [
     ("breed","Breed","text",None),
     ("age","Age","text",None),
     ("gender","Gender","select",["Male","Female"]),
     ("vaccinated","Vaccinated","select",["Yes","No","Partially"]),
  ]},
}
# Real-estate sale/house variants reuse the apartment field set
for _sc in ["apartments-sale","houses-rent","houses-sale","commercial","rooms"]:
    FIELDS[_sc] = FIELDS["apartments-rent"]
for _sc in ["birds","fish","livestock"]:
    FIELDS[_sc] = FIELDS["dogs"]
FIELDS["electric-cars"] = FIELDS["cars"]

# =========================================================================
# EMITTERS
# =========================================================================
def ts_str(s):
    return "'" + s.replace("\\","\\\\").replace("'","\\'") + "'"

def emit_brand_data():
    lines = []
    lines.append("/**")
    lines.append(" * AUTO-GENERATED by scripts/gen_catalog.py — do not edit by hand.")
    lines.append(" * Bangladesh marketplace brands and models, grouped by product type.")
    lines.append(" * Admins can extend brands/models at runtime (Brands & Models admin page,")
    lines.append(" * CSV import/export). This static set powers instant brand/model dropdowns")
    lines.append(" * on the Post Ad form even before the DB catalog is seeded.")
    lines.append(" */")
    lines.append("")
    lines.append("export interface BrandGroup {")
    lines.append("  /** Product group key, e.g. 'mobiles', 'cars'. */")
    lines.append("  group: string;")
    lines.append("  brands: { name: string; models: string[] }[];")
    lines.append("}")
    lines.append("")
    lines.append("export const BRAND_DATA: Record<string, { name: string; models: string[] }[]> = {")
    for group, brands in BRANDS.items():
        lines.append(f"  {ts_str(group)}: [")
        for bname, models in brands.items():
            models_ts = ", ".join(ts_str(m) for m in models)
            lines.append(f"    {{ name: {ts_str(bname)}, models: [{models_ts}] }},")
        lines.append("  ],")
    lines.append("};")
    lines.append("")
    lines.append("/** Maps a subcategory slug to the brand group that should populate its brand dropdown. */")
    lines.append("export const SUBCATEGORY_BRAND_GROUP: Record<string, string> = {")
    for group, subs in GROUP_TO_SUBCATS.items():
        for sc in subs:
            lines.append(f"  {ts_str(sc)}: {ts_str(group)},")
    lines.append("};")
    lines.append("")
    lines.append("export function getBrandsForSubcategory(subcategorySlug?: string | null): { name: string; models: string[] }[] {")
    lines.append("  if (!subcategorySlug) return [];")
    lines.append("  const group = SUBCATEGORY_BRAND_GROUP[subcategorySlug];")
    lines.append("  return group ? (BRAND_DATA[group] || []) : [];")
    lines.append("}")
    lines.append("")
    lines.append("export function getModelsForBrand(subcategorySlug: string | null | undefined, brandName: string): string[] {")
    lines.append("  const brands = getBrandsForSubcategory(subcategorySlug);")
    lines.append("  return brands.find((b) => b.name === brandName)?.models || [];")
    lines.append("}")
    lines.append("")
    return "\n".join(lines)

def emit_taxonomy():
    lines = []
    lines.append("/**")
    lines.append(" * AUTO-GENERATED by scripts/gen_catalog.py — do not edit by hand.")
    lines.append(" * Full marketplace taxonomy: categories -> subcategories -> item types.")
    lines.append(" * 'itemTypes' answers \"what type of item is this?\" (e.g. Pets -> Dog/Cat/Bird).")
    lines.append(" */")
    lines.append("")
    lines.append("export interface TaxonomySubcategory {")
    lines.append("  slug: string;")
    lines.append("  name: string;")
    lines.append("  itemTypes: string[];")
    lines.append("}")
    lines.append("export interface TaxonomyCategory {")
    lines.append("  slug: string;")
    lines.append("  name: string;")
    lines.append("  icon: string;")
    lines.append("  color: string;")
    lines.append("  description: string;")
    lines.append("  subcategories: TaxonomySubcategory[];")
    lines.append("}")
    lines.append("")
    lines.append("export const TAXONOMY: TaxonomyCategory[] = [")
    for slug, name, icon, color, desc, subs in TAXONOMY:
        lines.append("  {")
        lines.append(f"    slug: {ts_str(slug)}, name: {ts_str(name)}, icon: {ts_str(icon)},")
        lines.append(f"    color: {ts_str(color)},")
        lines.append(f"    description: {ts_str(desc)},")
        lines.append("    subcategories: [")
        for scslug, scname, itemtypes in subs:
            it = ", ".join(ts_str(t) for t in itemtypes)
            lines.append(f"      {{ slug: {ts_str(scslug)}, name: {ts_str(scname)}, itemTypes: [{it}] }},")
        lines.append("    ],")
        lines.append("  },")
    lines.append("];")
    lines.append("")
    lines.append("export function getItemTypes(categorySlug?: string | null, subcategorySlug?: string | null): string[] {")
    lines.append("  const cat = TAXONOMY.find((c) => c.slug === categorySlug);")
    lines.append("  if (!cat) return [];")
    lines.append("  if (subcategorySlug) {")
    lines.append("    const sc = cat.subcategories.find((s) => s.slug === subcategorySlug);")
    lines.append("    if (sc) return sc.itemTypes;")
    lines.append("  }")
    lines.append("  return [];")
    lines.append("}")
    lines.append("")
    lines.append("export const TOTAL_CATEGORIES = TAXONOMY.length;")
    lines.append("export const TOTAL_SUBCATEGORIES = TAXONOMY.reduce((n, c) => n + c.subcategories.length, 0);")
    lines.append("")
    return "\n".join(lines)

def emit_fields():
    lines = []
    lines.append("/**")
    lines.append(" * AUTO-GENERATED by scripts/gen_catalog.py — do not edit by hand.")
    lines.append(" * Dynamic listing fields shown on the Post Ad form, keyed by subcategory slug.")
    lines.append(" * `hasBrand` enables the brand + model dropdowns (see brandData.ts).")
    lines.append(" * Extra fields are stored in ads.product_attributes (jsonb).")
    lines.append(" */")
    lines.append("")
    lines.append("export type FieldType = 'text' | 'number' | 'select' | 'boolean';")
    lines.append("export interface FieldDef {")
    lines.append("  key: string;")
    lines.append("  label: string;")
    lines.append("  type: FieldType;")
    lines.append("  options?: string[];")
    lines.append("}")
    lines.append("export interface CategoryFieldConfig {")
    lines.append("  hasBrand: boolean;")
    lines.append("  fields: FieldDef[];")
    lines.append("}")
    lines.append("")
    lines.append("export const CATEGORY_FIELDS: Record<string, CategoryFieldConfig> = {")
    for sc, cfg in FIELDS.items():
        lines.append(f"  {ts_str(sc)}: {{")
        lines.append(f"    hasBrand: {'true' if cfg['brand'] else 'false'},")
        lines.append("    fields: [")
        for f in cfg["fields"]:
            key,label,ftype,opts = f
            if opts:
                opts_ts = "[" + ", ".join(ts_str(o) for o in opts) + "]"
                lines.append(f"      {{ key: {ts_str(key)}, label: {ts_str(label)}, type: {ts_str(ftype)}, options: {opts_ts} }},")
            else:
                lines.append(f"      {{ key: {ts_str(key)}, label: {ts_str(label)}, type: {ts_str(ftype)} }},")
        lines.append("    ],")
        lines.append("  },")
    lines.append("};")
    lines.append("")
    lines.append("export function getCategoryFields(subcategorySlug?: string | null): CategoryFieldConfig | null {")
    lines.append("  if (!subcategorySlug) return null;")
    lines.append("  return CATEGORY_FIELDS[subcategorySlug] || null;")
    lines.append("}")
    lines.append("")
    return "\n".join(lines)

def sql_str(s):
    return "'" + s.replace("'","''") + "'"

def emit_seed_sql():
    L = []
    L.append("-- =========================================================================")
    L.append("-- BazarBD — Phase 22: Bangladesh catalog seed")
    L.append("-- AUTO-GENERATED by scripts/gen_catalog.py — do not edit by hand.")
    L.append("-- Seeds categories, subcategories, item types, brands and product models.")
    L.append("-- Idempotent: safe to run multiple times. Run AFTER 01..21.")
    L.append("-- =========================================================================")
    L.append("")
    L.append("-- Additive columns used by the listing form")
    L.append("alter table public.ads add column if not exists item_type text;")
    L.append("alter table public.subcategories add column if not exists slug text;")
    L.append("alter table public.subcategories add column if not exists sort_order int default 0;")
    L.append("alter table public.subcategories add column if not exists is_active boolean default true;")
    L.append("create unique index if not exists subcategories_cat_slug_uidx on public.subcategories (category_id, slug);")
    L.append("")
    L.append("-- Item types (\"type of item\" for each category / subcategory)")
    L.append("create table if not exists public.item_types (")
    L.append("  id uuid primary key default gen_random_uuid(),")
    L.append("  category_slug text not null,")
    L.append("  subcategory_slug text,")
    L.append("  name text not null,")
    L.append("  slug text not null,")
    L.append("  sort_order int not null default 0,")
    L.append("  created_at timestamptz not null default now(),")
    L.append("  unique (category_slug, subcategory_slug, slug)")
    L.append(");")
    L.append("alter table public.item_types enable row level security;")
    L.append("drop policy if exists \"Item types viewable by everyone\" on public.item_types;")
    L.append("create policy \"Item types viewable by everyone\" on public.item_types for select using (true);")
    L.append("drop policy if exists \"Admins manage item types\" on public.item_types;")
    L.append("do $$ begin")
    L.append("  if exists (select 1 from pg_proc where proname = 'is_admin') then")
    L.append("    execute 'create policy \"Admins manage item types\" on public.item_types for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()))';")
    L.append("  end if;")
    L.append("end $$;")
    L.append("grant select on public.item_types to anon, authenticated;")
    L.append("")
    L.append("-- ---- Categories ----")
    for i,(slug,name,icon,color,desc,subs) in enumerate(TAXONOMY, start=1):
        L.append(f"insert into public.categories (name, slug, icon, sort_order, is_active) values ({sql_str(name)}, {sql_str(slug)}, {sql_str(icon)}, {i}, true) on conflict (slug) do update set name = excluded.name, icon = excluded.icon, sort_order = excluded.sort_order, is_active = true;")
    L.append("")
    L.append("-- ---- Subcategories ----")
    for slug,name,icon,color,desc,subs in TAXONOMY:
        for j,(scslug,scname,itemtypes) in enumerate(subs, start=1):
            L.append(f"insert into public.subcategories (category_id, name, slug, sort_order, is_active) select id, {sql_str(scname)}, {sql_str(scslug)}, {j}, true from public.categories where slug = {sql_str(slug)} on conflict (category_id, slug) do update set name = excluded.name, sort_order = excluded.sort_order, is_active = true;")
    L.append("")
    L.append("-- ---- Item types ----")
    for slug,name,icon,color,desc,subs in TAXONOMY:
        for scslug,scname,itemtypes in subs:
            for k,it in enumerate(itemtypes, start=1):
                L.append(f"insert into public.item_types (category_slug, subcategory_slug, name, slug, sort_order) values ({sql_str(slug)}, {sql_str(scslug)}, {sql_str(it)}, {sql_str(slugify(it))}, {k}) on conflict (category_slug, subcategory_slug, slug) do nothing;")
    L.append("")
    L.append("-- ---- Brands & product models ----")
    # Map group -> a representative category slug for brand.category_id
    group_primary_cat = {
        "mobiles":"mobiles-tablets","cars":"vehicles","motorcycles":"vehicles",
        "bicycles":"vehicles","speakers":"electronics","televisions":"electronics",
        "computer_components":"electronics","laptops":"electronics","tablets":"mobiles-tablets",
    }
    for group, brands in BRANDS.items():
        cat = group_primary_cat.get(group, "electronics")
        for order,(bname,models) in enumerate(brands.items(), start=1):
            bslug = slugify(group + "-" + bname)
            L.append(f"insert into public.brands (name, slug, category_id, is_active, sort_order) select {sql_str(bname)}, {sql_str(bslug)}, (select id from public.categories where slug = {sql_str(cat)}), true, {order} on conflict (slug) do update set name = excluded.name, is_active = true;")
            for mo,mname in enumerate(models, start=1):
                mslug = slugify(mname)
                L.append(f"insert into public.product_models (brand_id, name, slug, is_active, sort_order) select id, {sql_str(mname)}, {sql_str(mslug)}, true, {mo} from public.brands where slug = {sql_str(bslug)} on conflict (brand_id, slug) do nothing;")
    L.append("")
    return "\n".join(L)


if __name__ == "__main__":
    with open(os.path.join(ROOT,"src/lib/brandData.ts"),"w") as f:
        f.write(emit_brand_data())
    with open(os.path.join(ROOT,"src/lib/marketplaceTaxonomy.ts"),"w") as f:
        f.write(emit_taxonomy())
    with open(os.path.join(ROOT,"src/lib/categoryFields.ts"),"w") as f:
        f.write(emit_fields())
    with open(os.path.join(ROOT,"supabase/22_catalog_seed_bd.sql"),"w") as f:
        f.write(emit_seed_sql())
    total_brands = sum(len(v) for v in BRANDS.values())
    total_models = sum(len(m) for v in BRANDS.values() for m in v.values())
    total_cats = len(TAXONOMY)
    total_subs = sum(len(c[5]) for c in TAXONOMY)
    total_items = sum(len(it) for c in TAXONOMY for (_,_,it) in c[5])
    print(f"Generated: categories={total_cats} subcategories={total_subs} item_types={total_items} brands={total_brands} models={total_models}")
