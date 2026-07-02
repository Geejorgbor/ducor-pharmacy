// ── PRODUCT DATA ──────────────────────────────────────────────────────────────

const PRODUCTS = {
  prescription: [
    {id:'rx001',name:'Acetazolamide 250mg',price:16.00},
    {id:'rx002',name:'Acyclovir 400mg',price:18.00},
    {id:'rx003',name:'Acyclovir Ointment 5%',price:12.00,adminOnly:true},
    {id:'rx004',name:'Albuterol HFA Inhaler 8.5gm',price:18.00},
    {id:'rx005',name:'Allopurinol 100mg',price:10.00,adminOnly:true},
    {id:'rx006',name:'Allopurinol 300mg',price:14.00,adminOnly:true},
    {id:'rx007',name:'Amitriptyline 25mg',price:7.00},
    {id:'rx008',name:'Amlodipine 5mg',price:4.00},
    {id:'rx009',name:'Amlodipine 10mg',price:6.00},
    {id:'rx010',name:'Amlodipine/Valsartan 10/160mg',price:24.00,adminOnly:true},
    {id:'rx011',name:'Amlodipine/Valsartan 5/160mg',price:20.00,adminOnly:true},
    {id:'rx012',name:'Amoxicillin/Clav 600/42.9mg per 5ml',price:12.00},
    {id:'rx013',name:'Amoxicillin 500mg',price:10.00},
    {id:'rx014',name:'Amoxicillin Susp 400mg/5ml',price:8.00},
    {id:'rx015',name:'Amoxicillin/Clav 500-125mg',price:10.00},
    {id:'rx016',name:'Amoxicillin/Clav 875-125mg',price:12.00},
    {id:'rx017',name:'Aripiprazole 2mg',price:6.00,adminOnly:true},
    {id:'rx018',name:'Aripiprazole 5mg',price:8.00,adminOnly:true},
    {id:'rx019',name:'Aripiprazole 10mg',price:10.00,adminOnly:true},
    {id:'rx020',name:'Atenolol 50mg',price:8.00},
    {id:'rx021',name:'Atomoxetine 10mg',price:12.00,adminOnly:true},
    {id:'rx022',name:'Atomoxetine 18mg',price:14.00,adminOnly:true},
    {id:'rx023',name:'Atomoxetine 25mg',price:17.00,adminOnly:true},
    {id:'rx024',name:'Atorvastatin 10mg',price:10.00},
    {id:'rx025',name:'Atorvastatin 20mg',price:12.00},
    {id:'rx026',name:'Azithromycin 200mg/5ml',price:8.00},
    {id:'rx027',name:'Azithromycin 250mg',price:10.00,adminOnly:true},
    {id:'rx028',name:'Azithromycin 500mg',price:12.00,adminOnly:true},
    {id:'rx029',name:'Bicalutamide 50mg',price:35.00,adminOnly:true},
    {id:'rx030',name:'Bupropion XL 150mg',price:10.00,adminOnly:true},
    {id:'rx031',name:'Bupropion XL 300mg',price:28.00,adminOnly:true},
    {id:'rx032',name:'Carbidopa/Levodopa 25-100mg',price:12.00,adminOnly:true},
    {id:'rx033',name:'Carbamazepine 200mg',price:18.00,adminOnly:true},
    {id:'rx034',name:'Carvedilol 3.125mg',price:8.00},
    {id:'rx035',name:'Carvedilol 6.25mg',price:8.00},
    {id:'rx036',name:'Carvedilol 12.5mg',price:12.00,adminOnly:true},
    {id:'rx037',name:'Carvedilol 25mg',price:12.00},
    {id:'rx038',name:'Cefuroxime 500mg',price:12.00,adminOnly:true},
    {id:'rx039',name:'Celecoxib 200mg',price:14.00,adminOnly:true},
    {id:'rx040',name:'Cephalexin 500mg',price:16.00},
    {id:'rx041',name:'Ciprofloxacin 500mg',price:18.00},
    {id:'rx042',name:'Clindamycin Hydrochloride 150mg',price:18.00},
    {id:'rx043',name:'Clindamycin Hydrochloride 300mg',price:20.00},
    {id:'rx044',name:'Clonidine 0.1mg',price:8.00,adminOnly:true},
    {id:'rx045',name:'Clonidine 0.2mg',price:9.00,adminOnly:true},
    {id:'rx046',name:'Clopidogrel 75mg',price:12.00,adminOnly:true},
    {id:'rx047',name:'Dibucaine 1% Ointment',price:12.00,adminOnly:true},
    {id:'rx048',name:'Diclofenac Sodium Delayed-Release 50mg',price:8.00,adminOnly:true},
    {id:'rx049',name:'Digoxin 250mcg',price:10.00,adminOnly:true},
    {id:'rx050',name:'Diltiazem Hydrochloride 120mg',price:20.00},
    {id:'rx051',name:'Donepezil Hydrochloride 5mg',price:8.00},
    {id:'rx052',name:'Dorzolamide/Timolol Eye Drops',price:38.00,adminOnly:true},
    {id:'rx053',name:'Doxycycline Hyclate 100mg',price:9.00},
    {id:'rx054',name:'Duloxetine 30mg',price:28.00,adminOnly:true},
    {id:'rx055',name:'Emtricitabine/Tenofovir 200/300mg',price:30.00,adminOnly:true},
    {id:'rx056',name:'Esomeprazole Magnesium 40mg',price:12.00},
    {id:'rx057',name:'Fenofibrate 160mg',price:14.00},
    {id:'rx058',name:'Finasteride 5mg',price:12.00},
    {id:'rx059',name:'Fluconazole 150mg',price:9.00,adminOnly:true},
    {id:'rx060',name:'Fluconazole Susp 10mg/ml',price:12.00},
    {id:'rx061',name:'Fluoxetine 20mg',price:12.00},
    {id:'rx062',name:'Folic Acid 1mg',price:8.00,adminOnly:true},
    {id:'rx063',name:'Furosemide 20mg',price:10.00,adminOnly:true},
    {id:'rx064',name:'Furosemide 40mg',price:12.00},
    {id:'rx065',name:'Gabapentin 100mg',price:10.00,adminOnly:true},
    {id:'rx066',name:'Gabapentin 300mg',price:14.00,adminOnly:true},
    {id:'rx067',name:'Glimepiride 2mg',price:10.00},
    {id:'rx068',name:'Glipizide 10mg',price:10.00},
    {id:'rx069',name:'Haloperidol 5mg',price:14.00,adminOnly:true},
    {id:'rx070',name:'Hydralazine 25mg',price:8.00},
    {id:'rx071',name:'Hydrochlorothiazide 12.5mg',price:10.00,adminOnly:true},
    {id:'rx072',name:'Hydrochlorothiazide 25mg',price:8.00,adminOnly:true},
    {id:'rx073',name:'Hydrocortisone 1% Cream (Rx)',price:6.00,adminOnly:true},
    {id:'rx074',name:'Hydrocortisone 10mg Tablets',price:18.00},
    {id:'rx075',name:'Hydroxychloroquine 200mg',price:24.00},
    {id:'rx076',name:'Hydroxyurea 500mg',price:32.00,adminOnly:true},
    {id:'rx077',name:'Ibuprofen 400mg (Rx)',price:10.00,adminOnly:true},
    {id:'rx078',name:'Ibuprofen 600mg',price:12.00},
    {id:'rx079',name:'Ketotifen 0.025% Eye Drops',price:14.00,adminOnly:true},
    {id:'rx080',name:'Lancets (Rx)',price:14.00,adminOnly:true},
    {id:'rx081',name:'Lansoprazole 15mg',price:8.00},
    {id:'rx082',name:'Letrozole 2.5mg',price:8.00,adminOnly:true},
    {id:'rx083',name:'Levetiracetam 250mg',price:12.00},
    {id:'rx084',name:'Levetiracetam 500mg',price:14.00},
    {id:'rx085',name:'Levofloxacin 500mg',price:10.00},
    {id:'rx086',name:'Levofloxacin 750mg',price:10.00},
    {id:'rx087',name:'Levothyroxine 25mcg',price:10.00},
    {id:'rx088',name:'Levothyroxine 50mcg',price:10.00,adminOnly:true},
    {id:'rx089',name:'Levothyroxine 75mcg',price:12.00,adminOnly:true},
    {id:'rx090',name:'Levothyroxine 88mcg',price:12.00},
    {id:'rx091',name:'Levothyroxine 100mcg',price:12.00},
    {id:'rx092',name:'Levothyroxine 125mcg',price:12.00},
    {id:'rx092b',name:'Lisinopril 5mg',price:6.00},
    {id:'rx093',name:'Lisinopril 10mg',price:8.00},
    {id:'rx094',name:'Lisinopril 20mg',price:10.00},
    {id:'rx095',name:'Lisinopril/HCTZ 20/12.5mg',price:12.00},
    {id:'rx096',name:'Lisinopril/HCTZ 20/25mg',price:14.00},
    {id:'rx097',name:'Losartan 50mg',price:10.00,adminOnly:true},
    {id:'rx098',name:'Losartan 100mg',price:12.00},
    {id:'rx099',name:'Losartan/HCTZ 50/12.5mg',price:14.00,adminOnly:true},
    {id:'rx100',name:'Losartan/HCTZ 100/12.5mg',price:16.00},
    {id:'rx101',name:'Meloxicam 7.5mg',price:10.00},
    {id:'rx102',name:'Meloxicam 15mg',price:12.00,adminOnly:true},
    {id:'rx103',name:'Metformin 500mg',price:8.00},
    {id:'rx104',name:'Methimazole 5mg',price:14.00,adminOnly:true},
    {id:'rx105',name:'Methimazole 10mg',price:18.00},
    {id:'rx106',name:'Metoclopramide 10mg',price:8.00,adminOnly:true},
    {id:'rx107',name:'Metoprolol Succinate XL 25mg',price:10.00,adminOnly:true},
    {id:'rx108',name:'Metoprolol Succinate XL 50mg',price:12.00,adminOnly:true},
    {id:'rx109',name:'Metoprolol Succinate XL 100mg',price:14.00,adminOnly:true},
    {id:'rx110',name:'Metoprolol Tartrate 50mg',price:8.00,adminOnly:true},
    {id:'rx111',name:'Metoprolol Tartrate 100mg',price:10.00,adminOnly:true},
    {id:'rx112',name:'Metronidazole 500mg',price:12.00,adminOnly:true},
    {id:'rx113',name:'Moxifloxacin 0.5% Ophthalmic',price:12.00,adminOnly:true},
    {id:'rx114',name:'Naproxen 500mg',price:10.00,adminOnly:true},
    {id:'rx115',name:'Nifedipine ER 30mg',price:18.00,adminOnly:true},
    {id:'rx116',name:'Nifedipine IR 10mg',price:24.00},
    {id:'rx117',name:'Nifedipine IR 20mg',price:48.00},
    {id:'rx118',name:'Nitrofurantoin 100mg',price:30.00},
    {id:'rx119',name:'Nystatin Ointment',price:12.00,adminOnly:true},
    {id:'rx120',name:'Olanzapine 5mg',price:7.00},
    {id:'rx121',name:'Olanzapine 10mg',price:9.00},
    {id:'rx122',name:'Olanzapine 15mg',price:12.00,adminOnly:true},
    {id:'rx123',name:'Olanzapine 20mg',price:14.00,adminOnly:true},
    {id:'rx124',name:'Ondansetron 4mg',price:6.00},
    {id:'rx125',name:'Ondansetron ODT 4mg',price:8.00},
    {id:'rx126',name:'Oxybutynin 5mg',price:10.00},
    {id:'rx127',name:'Pantoprazole 40mg',price:12.00},
    {id:'rx128',name:'Penicillin VK 500mg',price:10.00},
    {id:'rx129',name:'Prednisone 10mg',price:10.00},
    {id:'rx130',name:'Prednisone 20mg',price:14.00},
    {id:'rx131',name:'Progesterone 100mg',price:30.00},
    {id:'rx132',name:'Progesterone 200mg',price:48.00},
    {id:'rx133',name:'Promethazine 25mg',price:8.00,adminOnly:true},
    {id:'rx134',name:'Rifampin 150mg',price:24.00},
    {id:'rx135',name:'Rifampin 300mg',price:28.00},
    {id:'rx136',name:'Risperidone 2mg',price:8.00,adminOnly:true},
    {id:'rx137',name:'Rosuvastatin 10mg',price:10.00},
    {id:'rx138',name:'Rosuvastatin 20mg',price:12.00},
    {id:'rx139',name:'Spironolactone 25mg',price:10.00,adminOnly:true},
    {id:'rx140',name:'Sulfamethoxazole/Trimethoprim 800/160mg',price:10.00,adminOnly:true},
    {id:'rx141',name:'Tadalafil 5mg',price:8.00},
    {id:'rx142',name:'Tadalafil 20mg',price:12.00},
    {id:'rx143',name:'Tamsulosin 0.4mg',price:14.00,adminOnly:true},
    {id:'rx144',name:'Telmisartan 40mg',price:12.00,adminOnly:true},
    {id:'rx145',name:'Tenofovir 300mg',price:24.00},
    {id:'rx146',name:'Travoprost Eye Drops',price:42.00,adminOnly:true},
    {id:'rx147',name:'Valacyclovir 500mg',price:16.00,adminOnly:true},
    {id:'rx148',name:'Valproic Acid 250mg',price:26.00,adminOnly:true},
    {id:'rx149',name:'Vancomycin 250mg',price:35.00,adminOnly:true},
    {id:'rx150',name:'Venlafaxine IR 75mg',price:10.00,adminOnly:true},
    {id:'rx151',name:'Vitamin D3 50,000 IU (Rx)',price:24.00,adminOnly:true},
    {id:'rx152',name:'Tranexamic Acid 650mg',price:24.00},
  ],
  otc: [
    {id:'otc001',name:'A+D Ointment',price:10.00,adminOnly:true},
    {id:'otc002',name:'Acetaminophen 325mg',price:6.00},
    {id:'otc003',name:'Acetaminophen 500mg',price:8.00},
    {id:'otc004',name:'Acetaminophen Arthritis 650mg',price:12.00},
    {id:'otc005',name:'Acetaminophen PM',price:8.00},
    {id:'otc006',name:'Acne Medication 5%',price:14.00,adminOnly:true},
    {id:'otc007',name:'Acne Medication 10%',price:16.00,adminOnly:true},
    {id:'otc008',name:'Antacid 500mg Chewable Tabs',price:5.00,adminOnly:true},
    {id:'otc009',name:'Artificial Tears Eye Drops',price:4.00,adminOnly:true},
    {id:'otc010',name:'Aspirin 81mg Chewable Tablets',price:3.00},
    {id:'otc011',name:'Aspirin 81mg EC Tablets',price:4.00},
    {id:'otc012',name:'Bacitracin Ointment',price:4.00},
    {id:'otc013',name:'Diphenhydramine 25mg (Benadryl)',price:6.00,adminOnly:true},
    {id:'otc014',name:'Benzoyl Peroxide 5% Gel',price:14.00},
    {id:'otc015',name:'Blood Glucose Meter',price:15.00,adminOnly:true},
    {id:'otc016',name:'Blood Pressure Monitor',price:24.00,adminOnly:true},
    {id:'otc017',name:'Calamine Lotion',price:6.00,adminOnly:true},
    {id:'otc018',name:'Cetirizine 10mg',price:8.00,adminOnly:true},
    {id:'otc019',name:'Cetirizine 5mg/5ml Syrup',price:8.00},
    {id:'otc020',name:"Children's Acetaminophen 160mg/5mL",price:6.00},
    {id:'otc021',name:"Children's Ibuprofen 100mg/5mL",price:6.00},
    {id:'otc022',name:'Chlorpheniramine 4mg',price:8.00,adminOnly:true},
    {id:'otc023',name:'Clotrimazole 1% Cream',price:7.00},
    {id:'otc024',name:'Cold/Flu Capsules',price:4.00,adminOnly:true},
    {id:'otc025',name:'Daytime Cold/Flu Syrup',price:8.00},
    {id:'otc026',name:'Diphenhydramine Cream',price:6.00,adminOnly:true},
    {id:'otc027',name:'Fluticasone 50mcg Nasal Spray',price:18.00,adminOnly:true},
    {id:'otc028',name:'Glucose Tablets',price:6.00,adminOnly:true},
    {id:'otc029',name:'Guaifenesin DM Cough Liquid',price:8.00,adminOnly:true},
    {id:'otc030',name:'Hemorrhoidal Ointment',price:8.00,adminOnly:true},
    {id:'otc031',name:'Hydrocortisone 1% Cream',price:6.00},
    {id:'otc032',name:'Hydrocortisone 1% Ointment',price:6.00,adminOnly:true},
    {id:'otc033',name:'Ibuprofen 200mg',price:10.00,adminOnly:true},
    {id:'otc034',name:'Ferrous Sulfate 325mg (Iron Supplement)',price:10.00,adminOnly:true},
    {id:'otc035',name:'Ketoconazole 2% Cream',price:15.00,adminOnly:true},
    {id:'otc036',name:'Loperamide (Imodium) 2mg',price:4.00},
    {id:'otc037',name:'Loratadine 10mg',price:4.00,adminOnly:true},
    {id:'otc038',name:'Maalox Antacid',price:8.00,adminOnly:true},
    {id:'otc039',name:'Meclizine 25mg',price:8.00,adminOnly:true},
    {id:'otc040',name:'Melatonin 5mg',price:8.00},
    {id:'otc041',name:'Melatonin 10mg',price:10.00},
    {id:'otc042',name:'Menstrual Relief Tablets',price:4.00,adminOnly:true},
    {id:'otc043',name:'Miconazole 2% Cream',price:12.00,adminOnly:true},
    {id:'otc044',name:'Miconazole-7 Vaginal Cream',price:15.00,adminOnly:true},
    {id:'otc045',name:'Migraine Relief',price:8.00},
    {id:'otc046',name:'Milk of Magnesia',price:6.00},
    {id:'otc047',name:'Muscle Pain Rub',price:8.00,adminOnly:true},
    {id:'otc048',name:'Naproxen 220mg',price:6.00,adminOnly:true},
    {id:'otc049',name:'Oxymetazoline Nasal Spray (Afrin)',price:8.00,adminOnly:true},
    {id:'otc050',name:'Night Time Cold Relief Syrup',price:12.00,adminOnly:true},
    {id:'otc051',name:'Omeprazole 20mg',price:8.00},
    {id:'otc052',name:'Refresh Eye Drops',price:12.00,adminOnly:true},
    {id:'otc053',name:'Saline Nasal Drops',price:4.00,adminOnly:true},
    {id:'otc054',name:'Senna-Plus 8.6mg/50mg',price:6.00,adminOnly:true},
    {id:'otc055',name:'Sildenafil 50mg',price:8.00,adminOnly:true},
    {id:'otc056',name:'Simethicone 80mg (Gas Relief)',price:8.00},
    {id:'otc057',name:'Stomach Relief Liquid',price:7.00,adminOnly:true},
    {id:'otc058',name:'Test Strips (Blood Glucose)',price:12.00,adminOnly:true},
    {id:'otc059',name:'Triple Antibiotic Ointment',price:6.00,adminOnly:true},
  ],
  vitamins: [
    {id:'vit001',name:'Apple Cider Vinegar 300mg',price:12.00,adminOnly:true},
    {id:'vit002',name:'B-Complex with B-12',price:12.00,adminOnly:true},
    {id:'vit003',name:'B-Complex with Vitamin C',price:12.00},
    {id:'vit004',name:'Calcium with Vitamin D',price:14.00},
    {id:'vit005',name:'Certa-Vite Senior with Lutein',price:8.00,adminOnly:true},
    {id:'vit006',name:'CoQ10 30mg',price:10.00,adminOnly:true},
    {id:'vit007',name:'CoQ10 50mg',price:14.00,adminOnly:true},
    {id:'vit008',name:'CoQ10 100mg',price:16.00},
    {id:'vit009',name:'Cod Liver Oil',price:10.00},
    {id:'vit010',name:'Collagen Tablets',price:16.00,adminOnly:true},
    {id:'vit011',name:'Cranberry Tablets',price:8.00,adminOnly:true},
    {id:'vit012',name:'Cyproheptadine 4mg',price:14.00},
    {id:'vit013',name:'Daily-Vite Multivitamin',price:8.00},
    {id:'vit014',name:"Children's Multivitamins Chewable",price:8.00},
    {id:'vit015',name:'Fish Oil 1000mg',price:8.00},
    {id:'vit016',name:'Flaxseed Oil 1000mg (Omega 3, 6, 9)',price:18.00},
    {id:'vit017',name:'Glucosamine/Chondroitin',price:18.00},
    {id:'vit018',name:'Hair, Skin & Nails Formula',price:10.00},
    {id:'vit019',name:'Magnesium Glycinate',price:16.00},
    {id:'vit020',name:'Magnesium Oxide 400mg',price:20.00},
    {id:'vit021',name:"Men's Multivitamin Gummy",price:18.00},
    {id:'vit022',name:"Men's One A Day Multivitamin",price:18.00},
    {id:'vit023',name:"Poly-Vi-Sol Children's Vitamins",price:7.00,adminOnly:true},
    {id:'vit024',name:'Poly-Vi-Sol with Iron',price:7.00},
    {id:'vit025',name:'Prenatal Vitamins',price:12.00},
    {id:'vit026',name:'Probiotics Formula Capsules',price:24.00},
    {id:'vit027',name:'Saw Palmetto',price:12.00,adminOnly:true},
    {id:'vit028',name:'Vitamin B1 100mg',price:8.00,adminOnly:true},
    {id:'vit029',name:'Vitamin B12 1000mcg',price:8.00,adminOnly:true},
    {id:'vit030',name:'Vitamin B6 25mg',price:6.00,adminOnly:true},
    {id:'vit031',name:'Vitamin C 500mg',price:6.00},
    {id:'vit032',name:'Vitamin D3 1000 IU',price:6.00},
    {id:'vit033',name:"Vitamin D3 5,000 IU",price:12.00},
    {id:'vit034',name:'Vitamin E 400 IU (180mg)',price:12.00},
    {id:'vit035',name:"Women's Olly Multivitamin",price:18.00},
    {id:'vit036',name:"Women's One A Day Multivitamin",price:18.00},
    {id:'vit037',name:'Zinc Sulfate 50mg',price:8.00,adminOnly:true},
  ]
}

// ── SVG ICONS ──────────────────────────────────────────────────────────────────

const ICONS = {
  rx: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="8" width="24" height="48" rx="6" fill="#1d4ed8" opacity="0.15"/>
    <rect x="20" y="8" width="24" height="48" rx="6" stroke="#1d4ed8" stroke-width="2"/>
    <rect x="24" y="18" width="16" height="3" rx="1.5" fill="#1d4ed8"/>
    <rect x="24" y="26" width="16" height="3" rx="1.5" fill="#1d4ed8" opacity="0.7"/>
    <rect x="24" y="34" width="10" height="3" rx="1.5" fill="#1d4ed8" opacity="0.5"/>
    <circle cx="44" cy="44" r="12" fill="#1d4ed8"/>
    <text x="44" y="48" text-anchor="middle" font-size="11" font-weight="bold" fill="white" font-family="sans-serif">Rx</text>
  </svg>`,
  otc: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="32" cy="32" rx="14" ry="20" fill="#0891b2" opacity="0.15"/>
    <ellipse cx="32" cy="32" rx="14" ry="20" stroke="#0891b2" stroke-width="2"/>
    <rect x="18" y="29" width="28" height="6" rx="3" fill="#0891b2" opacity="0.25"/>
    <rect x="18" y="29" width="28" height="6" rx="3" stroke="#0891b2" stroke-width="2"/>
    <ellipse cx="24" cy="32" rx="6" ry="10" fill="#0891b2" opacity="0.2"/>
  </svg>`,
  vit: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="22" fill="#16a34a" opacity="0.1"/>
    <circle cx="32" cy="32" r="22" stroke="#16a34a" stroke-width="2"/>
    <path d="M32 14 L36 26 L48 26 L38 34 L42 46 L32 38 L22 46 L26 34 L16 26 L28 26 Z" fill="#16a34a" opacity="0.7"/>
  </svg>`
};

// ── CART ───────────────────────────────────────────────────────────────────────

const Cart = {
  key: 'ducor-cart',
  items: [],

  load() {
    try { this.items = JSON.parse(localStorage.getItem(this.key) || '[]'); }
    catch { this.items = []; }
  },

  save() {
    localStorage.setItem(this.key, JSON.stringify(this.items));
  },

  add(product, category) {
    this.load();
    const existing = this.items.find(i => i.id === product.id);
    if (existing) {
      existing.qty += 1;
    } else {
      this.items.push({ ...product, category, qty: 1 });
    }
    this.save();
    this.updateBadge();
    this.renderDrawer();
  },

  remove(id) {
    this.items = this.items.filter(i => i.id !== id);
    this.save();
    this.updateBadge();
    this.renderDrawer();
  },

  setQty(id, qty) {
    if (qty < 1) { this.remove(id); return; }
    const item = this.items.find(i => i.id === id);
    if (item) item.qty = qty;
    this.save();
    this.updateBadge();
    this.renderDrawer();
  },

  count() {
    return this.items.reduce((s, i) => s + i.qty, 0);
  },

  subtotal() {
    return this.items.reduce((s, i) => s + i.price * i.qty, 0);
  },

  updateBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const c = this.count();
    badge.textContent = c;
    badge.classList.toggle('hidden', c === 0);
  },

  renderDrawer() {
    const el = document.getElementById('cart-items-list');
    if (!el) return;
    if (this.items.length === 0) {
      el.innerHTML = `<div class="cart-empty">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        <p>Your cart is empty</p>
      </div>`;
      document.getElementById('cart-total-line').style.display = 'none';
      return;
    }
    document.getElementById('cart-total-line').style.display = '';
    const iconClass = { rx: 'rx-bg', otc: 'otc-bg', vitamins: 'vit-bg' };
    const iconSvg = { rx: ICONS.rx, otc: ICONS.otc, vitamins: ICONS.vit };
    el.innerHTML = this.items.map(item => `
      <div class="cart-item">
        <div class="cart-item-icon ${iconClass[item.category] || 'rx-bg'}">${iconSvg[item.category] || ICONS.rx}</div>
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <p>${item.category === 'rx' ? '<span style="color:#0891b2;font-size:11px;font-weight:600">Contact for pricing</span>' : '$' + (item.price * item.qty).toFixed(2)}</p>
        </div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="Cart.setQty('${item.id}', ${item.qty - 1})">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="Cart.setQty('${item.id}', ${item.qty + 1})">+</button>
        </div>
        <button class="cart-remove" onclick="Cart.remove('${item.id}')" title="Remove">×</button>
      </div>`).join('');
    const sub = this.subtotal();
    const shipping = sub >= 50 ? 0 : 5.99;
    document.getElementById('cart-subtotal-val').textContent = '$' + sub.toFixed(2);
    document.getElementById('cart-shipping-val').textContent = shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2);
    document.getElementById('cart-total-val').textContent = '$' + (sub + shipping).toFixed(2);
  },

  open() {
    this.renderDrawer();
    document.getElementById('cart-overlay').classList.add('open');
    document.getElementById('cart-drawer').classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  close() {
    document.getElementById('cart-overlay').classList.remove('open');
    document.getElementById('cart-drawer').classList.remove('open');
    document.body.style.overflow = '';
  }
};

// ── TOAST ──────────────────────────────────────────────────────────────────────

function showToast(msg) {
  const container = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>${msg}`;
  container.appendChild(t);
  requestAnimationFrame(() => { requestAnimationFrame(() => t.classList.add('show')); });
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 350); }, 2800);
}

// ── DRUG IMAGE SYSTEM ─────────────────────────────────────────────────────────

const _imgCache = {};
const _imgQueue = [];
let _imgActive = 0;
const _IMG_CONCURRENT = 4;

// sessionStorage cache across page navigations — keyed by drug name
const _SS_KEY = 'ducor_img_v3';
try { const _s = sessionStorage.getItem(_SS_KEY); if (_s) Object.assign(_imgCache, JSON.parse(_s)); } catch(e) {}
function _saveImgCache() { try { sessionStorage.setItem(_SS_KEY, JSON.stringify(_imgCache)); } catch(e) {} }

// Strip dosage / form info → generic name for NIH search
function _genericName(full) {
  return full
    .replace(/\s*\(.*?\)/g, '')
    .replace(/\s*\/.*/, '')
    .replace(/\s+[\d][\d\s.\-]*(mg|mcg|ml|gm|g|iu|%|units?|eq|meq)[^\s]*/gi, '')
    .replace(/\s+(XL|ER|IR|SR|ODT|HFA|EC|PM)\b.*/gi, '')
    .replace(/\s+(ophthalmic|ointment|cream|gel|tablet|capsule|syrup|drop|spray|injection|chewable|liquid|solution|suspension|lotion|topical|nasal|oral|susp|oint)\b.*/gi, '')
    .replace(/\s+\d+$/g, '')
    .replace(/\s+/g, ' ').trim();
}

// ── SOURCE 1: NIH RxImage API ────────────────────────────────────────────────
// Free public API from US National Library of Medicine — returns actual FDA
// product photos (pill bottles, blister packs, capsules as sold in pharmacies)
async function _fetchNIHImage(drugName) {
  const generic = _genericName(drugName);
  if (!generic || generic.length < 3) return null;
  const cacheKey = 'nih:' + generic.toLowerCase();
  if (cacheKey in _imgCache) return _imgCache[cacheKey];
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(
      'https://rximage.nlm.nih.gov/api/rximage/1/rxbase?name=' +
      encodeURIComponent(generic) + '&resolution=600&format=json',
      { signal: ctrl.signal }
    );
    clearTimeout(tid);
    if (r.ok) {
      const d = await r.json();
      const imgs = d?.nlmRxImages;
      if (imgs && imgs.length > 0) {
        // Pick first active image
        const found = imgs.find(i => i.status === 'ACTIVE') || imgs[0];
        const url = found.imageUrl;
        _imgCache[cacheKey] = url;
        _saveImgCache();
        return url;
      }
    }
  } catch(e) {}
  _imgCache[cacheKey] = null;
  return null;
}

// ── NDC MAP: exact NDC numbers from actual inventory photos ──────────────────
const _PRODUCT_NDC = {
  // ── OTC (confirmed from bottle photos) ──
  'otc002': '57896-102-01',   // Geri Care Acetaminophen 325mg
  'otc003': '57896-219-01',   // Geri Care Acetaminophen 500mg
  'otc004': '70010-160-01',   // Acetaminophen 650mg ER 8-Hour
  'otc005': '57896-224-05',   // Health Star Acetaminophen PM Night Time
  'otc010': '57896-911-36',   // Geri Care Aspirin 81mg Chewable
  'otc011': '57896-981-12',   // Health Star Aspirin 81mg Enteric Coated
  'otc020': '45802-201-26',   // Padagis Children's Acetaminophen 160mg/5mL
  'otc023': '51672-1275-1',   // Taro Clotrimazole Cream 1%
  'otc025': '70677-1031-1',   // Foster & Thrive Daytime Cold & Flu Relief
  'otc031': '62559-430-01',   // Hydrocortisone Cream 1% USP
  'otc032': '62559-431-01',   // Hydrocortisone Ointment 1% USP
  'otc046': '57896-649-16',   // Geri-Care Milk of Magnesia 16oz
  'otc056': '69618-033-01',   // Reliable-1 Simethicone 80mg Chewable
  // ── OTC (Major Pharmaceuticals – common generic brand) ──
  'otc012': '0904-5143-75',   // Bacitracin Ointment
  'otc013': '0904-1992-24',   // Diphenhydramine (Banophen) 25mg
  'otc017': '0904-1800-09',   // Calamine Lotion
  'otc022': '0904-0012-24',   // Chlorpheniramine 4mg tablets
  'otc029': '0904-5197-20',   // Guaifenesin DM Cough Liquid
  'otc033': '0904-5555-40',   // Ibuprofen 200mg tablets
  'otc034': '0904-0168-60',   // Ferrous Sulfate (Iron) 325mg
  'otc036': '0904-5789-24',   // Loperamide (Imodium) 2mg
  'otc039': '64980-190-01',   // Meclizine HCl 25mg – Rising
  'otc048': '0904-5273-40',   // Naproxen 220mg tablets
  'otc051': '0904-6434-46',   // Omeprazole 20mg capsules
  'otc054': '0904-5140-60',   // Senna-Plus 8.6/50mg tablets
  'otc059': '0904-5145-31',   // Triple Antibiotic Ointment
  // ── OTC (Perrigo generics) ──
  'otc018': '0113-0468-65',   // Cetirizine 10mg tablets
  'otc027': '0113-0552-23',   // Fluticasone 50mcg Nasal Spray
  'otc037': '0113-0402-55',   // Loratadine 10mg tablets
  'otc043': '0113-0182-64',   // Miconazole 2% Cream
  // ── Vitamins (Rugby brand – NDC prefix 0536) ──
  'vit002': '0536-4006-01',   // Rugby B-Complex with B12
  'vit003': '0536-4010-01',   // Rugby B-Complex with Vitamin C
  'vit004': '0536-4691-01',   // Rugby Calcium 600mg + Vitamin D3
  'vit009': '0536-1840-46',   // Rugby Cod Liver Oil softgels
  'vit015': '0536-1030-01',   // Rugby Fish Oil 1000mg
  'vit020': '0536-4554-01',   // Rugby Magnesium Oxide 400mg
  'vit028': '0536-4018-01',   // Rugby Vitamin B1 (Thiamine) 100mg
  'vit029': '0536-4085-01',   // Rugby Vitamin B12 1000mcg
  'vit030': '0536-4030-01',   // Rugby Vitamin B6 25mg
  'vit031': '0536-4613-29',   // Rugby Vitamin C 500mg
  'vit032': '0536-4644-01',   // Rugby Vitamin D3 1000 IU
  'vit033': '0536-4645-01',   // Rugby Vitamin D3 5000 IU
  'vit034': '0536-4651-29',   // Rugby Vitamin E 400 IU
  'vit037': '0536-4658-01',   // Rugby Zinc Sulfate 50mg
  // ── Vitamins (Foster & Thrive – McKesson, NDC prefix 70677) ──
  'vit016': '70677-1027-1',   // Foster & Thrive Flaxseed Oil Omega 3,6,9
  'vit018': '70677-1018-1',   // Foster & Thrive Hair, Skin & Nails Formula
  // ── Vitamins (other brands confirmed from photos) ──
  'vit024': '71399-7420-5',   // OneVite Poly-Vi-Sol with Iron – Akron Pharma
  // ── Rx (confirmed from bottle photos) ──
  'rx002': '31722-777-01',    // Acyclovir 400mg – Camber
  'rx008': '67877-198-90',    // Amlodipine Besylate 5mg – Ascend
  'rx009': '69097-128-05',    // Amlodipine Besylate 10mg – Cipla
  'rx012': '16714-294-02',    // Amoxicillin/Clav Suspension 600/42.9mg – NorthStar
  'rx013': '16714-299-03',    // Amoxicillin 500mg Capsules – NorthStar
  'rx014': '65862-071-01',    // Amoxicillin Suspension 400mg/5mL – Aurobindo
  'rx015': '16714-296-01',    // Amoxicillin/Clav 500/125mg Tablets – NorthStar
  'rx016': '16714-297-01',    // Amoxicillin/Clav 875/125mg Tablets – NorthStar
  'rx020': '65862-169-01',    // Atenolol 50mg – Aurobindo
  'rx024': '72603-282-01',    // Atorvastatin Calcium 10mg – NorthStar
  'rx025': '72603-283-01',    // Atorvastatin Calcium 20mg – NorthStar
  'rx026': '42806-151-34',    // Azithromycin Suspension 200mg/5mL – Epic Pharma
  'rx034': '68462-162-01',    // Carvedilol 3.125mg – Glenmark
  'rx035': '68382-093-01',    // Carvedilol 6.25mg – Zydus
  'rx037': '68382-095-01',    // Carvedilol 25mg – Zydus
  'rx040': '65862-019-01',    // Cephalexin 500mg – Aurobindo
  'rx041': '69367-386-01',    // Ciprofloxacin HCl 500mg – Westminster
  'rx042': '42571-251-01',    // Clindamycin HCl 150mg – Micro Labs
  'rx043': '68462-144-01',    // Clindamycin HCl 300mg – Glenmark
  'rx053': '27808-233-01',    // Doxycycline Hyclate 100mg – Tris Pharma
  'rx056': '16714-980-02',    // Esomeprazole Magnesium 40mg – NorthStar
  'rx064': '64980-563-01',    // Furosemide 40mg – Rising
  'rx067': '72883-541-01',    // Glimepiride 2mg – FPP
  'rx068': '60505-0142-4',    // Glipizide 10mg – Apotex
  'rx069': '73786-064-01',    // Haloperidol 5mg – Lifestar/Rising
  'rx070': '31722-023-01',    // Hydralazine HCl 25mg – Camber
  // rx073 (Hydrocortisone 1% Cream Rx) shares NDC with otc031 – use NIH name search fallback
  'rx093': '43547-353-10',    // Lisinopril 10mg – Falco
  'rx094': '43547-354-10',    // Lisinopril 20mg – Falco
  'rx098': '31722-702-90',    // Losartan Potassium 100mg – Camber
  'rx099': '65382-056-01',    // Losartan/HCTZ 50/12.5mg – Aurobindo
  'rx103': '70010-063-01',    // Metformin HCl 500mg
  'rx105': '23155-071-01',    // Methimazole 10mg – Avet Pharma
  'rx127': '31722-713-90',    // Pantoprazole Sodium 40mg – Camber
  'rx138': '16714-990-01',    // Rosuvastatin 20mg – NorthStar
  'rx141': '31722-644-30',    // Tadalafil 5mg – Camber
  'rx142': '31722-646-30',    // Tadalafil 20mg – Camber
  'rx145': '16714-820-01',    // Tenofovir Disoproxil Fumarate 300mg – NorthStar
  'rx152': '72888-178-30',    // Tranexamic Acid 650mg – Advagen
};

// ── NIH SEARCH NAME OVERRIDES ─────────────────────────────────────────────────
// Better search terms for products whose auto-parsed name gives poor NIH results
const _NIH_SEARCH_OVERRIDE = {
  'otc001': 'vitamins a and d ointment',
  'otc005': 'acetaminophen diphenhydramine pm',
  'otc008': 'calcium carbonate antacid chewable',
  'otc011': 'aspirin enteric coated 81mg',
  'otc019': 'cetirizine syrup',
  'otc020': 'acetaminophen childrens suspension',
  'otc021': 'ibuprofen childrens suspension',
  'otc024': 'acetaminophen phenylephrine cold',
  'otc025': 'dextromethorphan phenylephrine daytime cold',
  'otc026': 'diphenhydramine topical cream',
  'otc030': 'hemorrhoidal ointment phenylephrine',
  'otc038': 'aluminum hydroxide magnesium hydroxide antacid',
  'otc040': 'melatonin 5mg',
  'otc041': 'melatonin 10mg',
  'otc042': 'pamabrom acetaminophen menstrual',
  'otc044': 'miconazole vaginal cream',
  'otc045': 'acetaminophen aspirin caffeine migraine',
  'otc047': 'trolamine salicylate muscle rub',
  'otc049': 'oxymetazoline nasal spray',
  'otc050': 'doxylamine acetaminophen night cold',
  'otc052': 'carboxymethylcellulose eye drops',
  'otc053': 'sodium chloride saline nasal',
  'otc057': 'bismuth subsalicylate stomach',
  'vit001': 'apple cider vinegar supplement',
  'vit005': 'multivitamin senior lutein',
  'vit006': 'coenzyme q10 30mg',
  'vit007': 'coenzyme q10 50mg',
  'vit008': 'coenzyme q10 100mg',
  'vit010': 'collagen supplement tablets',
  'vit011': 'cranberry extract supplement',
  'vit012': 'cyproheptadine appetite',
  'vit013': 'multivitamin daily adult',
  'vit014': 'childrens multivitamin chewable',
  'vit017': 'glucosamine chondroitin tablets',
  'vit019': 'magnesium glycinate 400mg capsules',
  'vit021': 'mens multivitamin gummy',
  'vit022': 'mens one daily multivitamin',
  'vit023': 'poly vi sol childrens vitamins drops',
  'vit024': 'poly vi sol iron drops',
  'vit025': 'prenatal vitamins folic acid',
  'vit026': 'probiotic lactobacillus acidophilus',
  'vit027': 'saw palmetto 320mg',
  'vit035': 'womens multivitamin gummy',
  'vit036': 'womens one daily multivitamin',
  'rx152': 'tranexamic acid tablets',
};

async function _fetchNIHImageByNDC(ndc) {
  const cacheKey = 'ndc:' + ndc;
  if (cacheKey in _imgCache) return _imgCache[cacheKey];
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(
      'https://rximage.nlm.nih.gov/api/rximage/1/rxbase?ndc=' +
      encodeURIComponent(ndc) + '&resolution=600&format=json',
      { signal: ctrl.signal }
    );
    clearTimeout(tid);
    if (r.ok) {
      const d = await r.json();
      const imgs = d?.nlmRxImages;
      if (imgs && imgs.length > 0) {
        const found = imgs.find(i => i.status === 'ACTIVE') || imgs[0];
        const url = found.imageUrl;
        _imgCache[cacheKey] = url;
        _saveImgCache();
        return url;
      }
    }
  } catch(e) {}
  _imgCache[cacheKey] = null;
  return null;
}

// ── SOURCE 2: Open Library of Medicine (DailyMed thumbnail fallback) ─────────
async function _fetchDailyMedImage(drugName) {
  const generic = _genericName(drugName);
  if (!generic || generic.length < 3) return null;
  const cacheKey = 'dm:' + generic.toLowerCase();
  if (cacheKey in _imgCache) return _imgCache[cacheKey];
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 7000);
    // DailyMed fulltext search → get first SPL set id → fetch image
    const r = await fetch(
      'https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?drug_name=' +
      encodeURIComponent(generic) + '&pagesize=1',
      { signal: ctrl.signal }
    );
    clearTimeout(tid);
    if (r.ok) {
      const d = await r.json();
      const setId = d?.data?.[0]?.setid;
      if (setId) {
        const url = `https://dailymed.nlm.nih.gov/dailymed/image.cfm?setid=${setId}&type=img`;
        _imgCache[cacheKey] = url;
        _saveImgCache();
        return url;
      }
    }
  } catch(e) {}
  _imgCache[cacheKey] = null;
  return null;
}

// Comprehensive map: drug name keyword → exact Wikipedia article title
const _DRUG_WIKI_NAMES = {
  // Rx — Cardiovascular
  'lisinopril':'Lisinopril','atorvastatin':'Atorvastatin','metoprolol':'Metoprolol',
  'amlodipine':'Amlodipine','losartan':'Losartan','hydrochlorothiazide':'Hydrochlorothiazide',
  'furosemide':'Furosemide','spironolactone':'Spironolactone','carvedilol':'Carvedilol',
  'bisoprolol':'Bisoprolol','valsartan':'Valsartan','ramipril':'Ramipril',
  'enalapril':'Enalapril','diltiazem':'Diltiazem','nifedipine':'Nifedipine',
  'warfarin':'Warfarin','clopidogrel':'Clopidogrel','digoxin':'Digoxin',
  'pravastatin':'Pravastatin','simvastatin':'Simvastatin','rosuvastatin':'Rosuvastatin',
  'olmesartan':'Olmesartan','irbesartan':'Irbesartan','telmisartan':'Telmisartan',
  'hydralazine':'Hydralazine','isosorbide':'Isosorbide mononitrate','nitroglycerin':'Nitroglycerin',
  'ezetimibe':'Ezetimibe','fenofibrate':'Fenofibrate','gemfibrozil':'Gemfibrozil',
  'apixaban':'Apixaban','rivaroxaban':'Rivaroxaban','dabigatran':'Dabigatran',
  // Rx — Diabetes
  'metformin':'Metformin','glipizide':'Glipizide','glyburide':'Glyburide',
  'glimepiride':'Glimepiride','sitagliptin':'Sitagliptin','empagliflozin':'Empagliflozin',
  'canagliflozin':'Canagliflozin','dapagliflozin':'Dapagliflozin','liraglutide':'Liraglutide',
  'semaglutide':'Semaglutide','pioglitazone':'Pioglitazone','insulin':'Insulin',
  'dulaglutide':'Dulaglutide','exenatide':'Exenatide',
  // Rx — Thyroid / Hormones
  'levothyroxine':'Levothyroxine','liothyronine':'Liothyronine','methimazole':'Methimazole',
  'prednisone':'Prednisone','prednisolone':'Prednisolone','dexamethasone':'Dexamethasone',
  'methylprednisolone':'Methylprednisolone','hydrocortisone':'Hydrocortisone',
  'estradiol':'Estradiol','progesterone':'Progesterone','testosterone':'Testosterone',
  'medroxyprogesterone':'Medroxyprogesterone','norethindrone':'Norethindrone',
  'levonorgestrel':'Levonorgestrel','ethinyl estradiol':'Ethinylestradiol',
  // Rx — Antibiotics / Antivirals / Antifungals
  'amoxicillin':'Amoxicillin','azithromycin':'Azithromycin','doxycycline':'Doxycycline',
  'ciprofloxacin':'Ciprofloxacin','levofloxacin':'Levofloxacin','cephalexin':'Cefalexin',
  'trimethoprim':'Trimethoprim','sulfamethoxazole':'Sulfamethoxazole',
  'clindamycin':'Clindamycin','metronidazole':'Metronidazole','nitrofurantoin':'Nitrofurantoin',
  'ampicillin':'Ampicillin','penicillin':'Penicillin','tetracycline':'Tetracycline',
  'clarithromycin':'Clarithromycin','erythromycin':'Erythromycin',
  'amox clav':'Amoxicillin/clavulanic acid','amoxicillin clav':'Amoxicillin/clavulanic acid',
  'augmentin':'Amoxicillin/clavulanic acid',
  'acyclovir':'Aciclovir','valacyclovir':'Valaciclovir','oseltamivir':'Oseltamivir',
  'fluconazole':'Fluconazole','itraconazole':'Itraconazole','ketoconazole':'Ketoconazole',
  'terbinafine':'Terbinafine','nystatin':'Nystatin','clotrimazole':'Clotrimazole',
  'vancomycin':'Vancomycin','linezolid':'Linezolid','meropenem':'Meropenem',
  // Rx — Respiratory
  'albuterol':'Salbutamol','salbutamol':'Salbutamol','ipratropium':'Ipratropium',
  'tiotropium':'Tiotropium','budesonide':'Budesonide','fluticasone':'Fluticasone',
  'salmeterol':'Salmeterol','formoterol':'Formoterol','montelukast':'Montelukast',
  'theophylline':'Theophylline','beclomethasone':'Beclometasone',
  // Rx — Neurological / Psychiatric
  'sertraline':'Sertraline','fluoxetine':'Fluoxetine','escitalopram':'Escitalopram',
  'citalopram':'Citalopram','paroxetine':'Paroxetine','venlafaxine':'Venlafaxine',
  'duloxetine':'Duloxetine','bupropion':'Bupropion','mirtazapine':'Mirtazapine',
  'amitriptyline':'Amitriptyline','nortriptyline':'Nortriptyline',
  'clonazepam':'Clonazepam','diazepam':'Diazepam','lorazepam':'Lorazepam',
  'alprazolam':'Alprazolam','zolpidem':'Zolpidem','quetiapine':'Quetiapine',
  'olanzapine':'Olanzapine','risperidone':'Risperidone','aripiprazole':'Aripiprazole',
  'lithium':'Lithium (medication)','valproate':'Valproate','lamotrigine':'Lamotrigine',
  'levetiracetam':'Levetiracetam','phenytoin':'Phenytoin','carbamazepine':'Carbamazepine',
  'gabapentin':'Gabapentin','pregabalin':'Pregabalin','topiramate':'Topiramate',
  'donepezil':'Donepezil','memantine':'Memantine','methylphenidate':'Methylphenidate',
  'amphetamine':'Amphetamine','lisdexamfetamine':'Lisdexamfetamine',
  'levodopa':'Levodopa','carbidopa':'Carbidopa/levodopa',
  'carbidopa levodopa':'Carbidopa/levodopa','ropinirole':'Ropinirole',
  'pramipexole':'Pramipexole','rasagiline':'Rasagiline',
  'sumatriptan':'Sumatriptan','rizatriptan':'Rizatriptan','topiramate':'Topiramate',
  // Rx — Gastrointestinal
  'omeprazole':'Omeprazole','pantoprazole':'Pantoprazole','esomeprazole':'Esomeprazole',
  'lansoprazole':'Lansoprazole','rabeprazole':'Rabeprazole','ranitidine':'Ranitidine',
  'famotidine':'Famotidine','cimetidine':'Cimetidine','sucralfate':'Sucralfate',
  'metoclopramide':'Metoclopramide','ondansetron':'Ondansetron','promethazine':'Promethazine',
  'mesalamine':'Mesalazine','sulfasalazine':'Sulfasalazine','infliximab':'Infliximab',
  // Rx — Pain / Musculoskeletal
  'tramadol':'Tramadol','oxycodone':'Oxycodone','hydrocodone':'Hydrocodone',
  'morphine':'Morphine','codeine':'Codeine','fentanyl':'Fentanyl',
  'buprenorphine':'Buprenorphine','naltrexone':'Naltrexone','naloxone':'Naloxone',
  'cyclobenzaprine':'Cyclobenzaprine','baclofen':'Baclofen','tizanidine':'Tizanidine',
  'methocarbamol':'Methocarbamol','carisoprodol':'Carisoprodol',
  'celecoxib':'Celecoxib','diclofenac':'Diclofenac','meloxicam':'Meloxicam',
  'indomethacin':'Indometacin','naproxen':'Naproxen','allopurinol':'Allopurinol',
  'colchicine':'Colchicine','probenecid':'Probenecid',
  // Rx — Ophthalmology
  'latanoprost':'Latanoprost','timolol':'Timolol','brimonidine':'Brimonidine',
  'dorzolamide':'Dorzolamide','bimatoprost':'Bimatoprost','travoprost':'Travoprost',
  'ciprofloxacin eye':'Ciprofloxacin','tobramycin':'Tobramycin',
  'prednisolone eye':'Prednisolone','ofloxacin':'Ofloxacin',
  // Rx — Dermatology
  'tretinoin':'Tretinoin','adapalene':'Adapalene','isotretinoin':'Isotretinoin',
  'benzoyl peroxide':'Benzoyl peroxide','tazarotene':'Tazarotene',
  'mupirocin':'Mupirocin','betamethasone':'Betamethasone','triamcinolone':'Triamcinolone',
  'clobetasol':'Clobetasol','tacrolimus':'Tacrolimus','pimecrolimus':'Pimecrolimus',
  // Rx — Other
  'acetazolamide':'Acetazolamide','emtricitabine':'Emtricitabine',
  'tenofovir':'Tenofovir','lamivudine':'Lamivudine','efavirenz':'Efavirenz',
  'hydroxychloroquine':'Hydroxychloroquine','chloroquine':'Chloroquine',
  'azathioprine':'Azathioprine','mycophenolate':'Mycophenolic acid',
  'tacrolimus':'Tacrolimus','cyclosporine':'Ciclosporin',
  'sildenafil':'Sildenafil','tadalafil':'Tadalafil','finasteride':'Finasteride',
  'tamsulosin':'Tamsulosin','oxybutynin':'Oxybutynin','tolterodine':'Tolterodine',
  'desmopressin':'Desmopressin','alfuzosin':'Alfuzosin',
  'bisacodyl':'Bisacodyl','lactulose':'Lactulose','polyethylene glycol':'Polyethylene glycol',
  'cholestyramine':'Cholestyramine','colesevelam':'Colesevelam',
  // OTC — Pain / Fever
  'acetaminophen':'Paracetamol','paracetamol':'Paracetamol','ibuprofen':'Ibuprofen',
  'aspirin':'Aspirin','naproxen sodium':'Naproxen','ketoprofen':'Ketoprofen',
  'migraine relief':'Ibuprofen','menstrual relief':'Naproxen',
  'muscle pain':'Methyl salicylate','pain relief':'Ibuprofen',
  // OTC — Cold / Allergy / Cough
  'cetirizine':'Cetirizine','loratadine':'Loratadine','fexofenadine':'Fexofenadine',
  'diphenhydramine':'Diphenhydramine','chlorphenamine':'Chlorphenamine',
  'pseudoephedrine':'Pseudoephedrine','phenylephrine':'Phenylephrine',
  'oxymetazoline':'Oxymetazoline','guaifenesin':'Guaifenesin',
  'dextromethorphan':'Dextromethorphan','benzonatate':'Benzonatate',
  'cold flu':'Dextromethorphan','daytime cold':'Pseudoephedrine',
  'night time cold':'Diphenhydramine','sinus':'Pseudoephedrine',
  // OTC — GI / Digestive
  'antacid':'Antacid','calcium carbonate':'Calcium carbonate','magnesium':'Magnesium',
  'simethicone':'Simethicone','loperamide':'Loperamide',
  'bismuth subsalicylate':'Bismuth subsalicylate','stomach relief':'Bismuth subsalicylate',
  'maalox':'Antacid','mylanta':'Antacid','tums':'Calcium carbonate',
  'miralax':'Polyethylene glycol','dulcolax':'Bisacodyl','senna':'Senna glycoside',
  'psyllium':'Psyllium','fiber':'Dietary fiber','probiotic':'Probiotic',
  // OTC — Skin / Eye / Ear
  'hydrocortisone cream':'Hydrocortisone','calamine':'Calamine',
  'bacitracin':'Bacitracin','neosporin':'Neomycin/polymyxin b/bacitracin',
  'triple antibiotic':'Neomycin/polymyxin b/bacitracin',
  'artificial tears':'Eye drops','visine':'Tetrahydrozoline',
  'ear drops':'Ear drop','hydrogen peroxide':'Hydrogen peroxide',
  'rubbing alcohol':'Isopropyl alcohol','povidone iodine':'Povidone-iodine',
  'zinc oxide':'Zinc oxide','a d ointment':'Petrolatum',
  // OTC — Monitoring Devices
  'blood glucose meter':'Blood glucose meter','glucometer':'Blood glucose meter',
  'blood pressure machine':'Sphygmomanometer','pulse oximeter':'Pulse oximetry',
  'thermometer':'Medical thermometer','test strips':'Blood glucose monitoring',
  // Vitamins & Supplements
  'vitamin c':'Vitamin C','ascorbic acid':'Vitamin C',
  'vitamin d':'Vitamin D','vitamin d3':'Cholecalciferol','cholecalciferol':'Cholecalciferol',
  'vitamin b12':'Vitamin B12','cyanocobalamin':'Cyanocobalamin','methylcobalamin':'Methylcobalamin',
  'vitamin b6':'Vitamin B6','pyridoxine':'Pyridoxine',
  'vitamin a':'Vitamin A','retinol':'Retinol',
  'vitamin e':'Vitamin E','tocopherol':'Tocopherol',
  'vitamin k':'Vitamin K','phytonadione':'Phytomenadione',
  'folic acid':'Folic acid','folate':'Folic acid',
  'iron':'Iron supplement','ferrous sulfate':'Iron(II) sulfate',
  'ferrous gluconate':'Iron(II) gluconate','ferrous fumarate':'Ferrous fumarate',
  'calcium':'Calcium supplement','calcium citrate':'Calcium citrate',
  'magnesium citrate':'Magnesium citrate','magnesium oxide':'Magnesium oxide',
  'zinc':'Zinc (medication)','zinc gluconate':'Zinc gluconate',
  'selenium':'Selenium','chromium':'Chromium (dietary)','iodine':'Iodine',
  'biotin':'Biotin','niacin':'Niacin','riboflavin':'Riboflavin',
  'thiamine':'Thiamine','pantothenic':'Pantothenic acid',
  'multivitamin':'Multivitamin','prenatal':'Prenatal vitamins',
  'poly vi sol':'Multivitamin','certa vite':'Multivitamin',
  'b complex':'B vitamins','b vitamins':'B vitamins',
  'fish oil':'Fish oil','omega 3':'Omega-3 fatty acid','omega-3':'Omega-3 fatty acid',
  'flaxseed oil':'Flaxseed oil','flaxseed':'Flaxseed',
  'cod liver':'Cod liver oil','evening primrose':'Evening primrose oil',
  'glucosamine':'Glucosamine','chondroitin':'Chondroitin sulfate',
  'glucosamine chondroitin':'Glucosamine/chondroitin',
  'coq10':'Coenzyme Q10','coenzyme q':'Coenzyme Q10','co q':'Coenzyme Q10',
  'ubiquinol':'Ubiquinol',
  'melatonin':'Melatonin','valerian':'Valerian (herb)',
  'echinacea':'Echinacea','elderberry':'Elderberry',
  'turmeric':'Turmeric','curcumin':'Curcumin',
  'probiotics':'Probiotic','lactobacillus':'Lactobacillus',
  'collagen':'Collagen','hyaluronic acid':'Hyaluronic acid',
  'hair skin':'Biotin','nail':'Biotin',
  'protein powder':'Protein (nutrient)','whey':'Whey protein',
  'cranberry':'Cranberry','saw palmetto':'Serenoa repens',
  'milk thistle':'Silybum marianum','st john':'Hypericum perforatum',
  'ginkgo':'Ginkgo biloba','ginseng':'Ginseng',
  'grape seed':'Grape seed extract','lutein':'Lutein',
  'lycopene':'Lycopene','astaxanthin':'Astaxanthin',
  'ashwagandha':'Withania somnifera','maca':'Lepidium meyenii',
  'spirulina':'Spirulina (dietary supplement)',
  'glucose tablets':'Glucose','dextrose':'Dextrose',
  'electrolytes':'Electrolyte','saline nasal':'Saline (medicine)'
};

function _getWikiTitle(fullName) {
  const clean = fullName
    .replace(/\s*\(.*?\)/g, '')
    .replace(/\s*\/.*/, '')
    .replace(/\s+[\d][\d\s.\-/]*(mg|mcg|ml|gm|g|iu|%|units?)[^\s]*/gi, '')
    .replace(/\s+(XL|ER|IR|SR|ODT|HFA|EC|PM|opth\w*|susp\w*|oint\w*|cream|gel|tab\w*|cap\w*|syrup|drops?|spray|inj|chewable|liquid|solution|formula|senior|children\w*|mens?|womens?|adult\w*)\b.*/gi, '')
    .replace(/\s+/g, ' ').trim();
  const lower = clean.toLowerCase();
  // Longest match wins
  let bestKey = '', bestVal = '';
  for (const [k, v] of Object.entries(_DRUG_WIKI_NAMES)) {
    if (lower.includes(k) && k.length > bestKey.length) { bestKey = k; bestVal = v; }
  }
  if (bestVal) return bestVal;
  // Title-case fallback
  return clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function _makeSVGLabel(name, category) {
  const cfg = {
    rx:      { cap:'#1d4ed8', ring:'#bfdbfe', cross:'#1d4ed8', label:'#1e3a8a' },
    otc:     { cap:'#0891b2', ring:'#a5f3fc', cross:'#0891b2', label:'#155e75' },
    vitamins:{ cap:'#16a34a', ring:'#bbf7d0', cross:'#16a34a', label:'#14532d' }
  }[category] || { cap:'#1d4ed8', ring:'#bfdbfe', cross:'#1d4ed8', label:'#1e3a8a' };

  // Wrap name into 3 lines max, 18 chars each
  const words = name.replace(/\s+/g,' ').trim().split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > 18) { if (cur) lines.push(cur); cur = w; }
    else cur = (cur ? cur + ' ' : '') + w;
  }
  if (cur) lines.push(cur);
  const textLines = lines.slice(0,3).map((l,i) =>
    `<text x="100" y="${97 + i*13}" text-anchor="middle" font-size="9.5" font-weight="700"
      fill="${cfg.label}" font-family="Arial,Helvetica,sans-serif">${l}</text>`).join('');

  return `<svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg">
    <!-- Bottle body -->
    <rect x="58" y="52" width="84" height="108" rx="18" fill="#f8fafc" stroke="${cfg.cap}" stroke-width="2"/>
    <!-- Bottle cap -->
    <rect x="70" y="32" width="60" height="28" rx="10" fill="${cfg.cap}"/>
    <rect x="70" y="48" width="60" height="12" rx="0" fill="${cfg.cap}" opacity=".6"/>
    <!-- Label area on bottle -->
    <rect x="64" y="72" width="72" height="68" rx="8" fill="white" stroke="${cfg.ring}" stroke-width="1.5"/>
    <!-- Cross/plus icon (positioned above drug name text) -->
    <rect x="93" y="75" width="14" height="4" rx="2" fill="${cfg.cross}" opacity=".7"/>
    <rect x="98" y="70" width="4" height="14" rx="2" fill="${cfg.cross}" opacity=".7"/>
    <!-- Drug name text (starts below icon) -->
    ${textLines}
    <!-- Bottom brand strip -->
    <rect x="64" y="146" width="72" height="14" rx="0" fill="${cfg.cap}" opacity=".12"/>
    <text x="100" y="156" text-anchor="middle" font-size="6" fill="${cfg.cap}"
      font-family="Arial,sans-serif" font-weight="800" letter-spacing="1">DUCOR PHARMACY</text>
  </svg>`;
}

async function _fetchWikiImage(wikiTitle) {
  const key = wikiTitle.toLowerCase();
  if (key in _imgCache) return _imgCache[key];
  // Primary: MediaWiki pageimages API (most reliable for drug photos)
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(
      'https://en.wikipedia.org/w/api.php?action=query&titles=' +
      encodeURIComponent(wikiTitle) +
      '&prop=pageimages&piprop=thumbnail&pithumbsize=400&format=json&origin=*',
      { signal: ctrl.signal }
    );
    clearTimeout(t);
    if (r.ok) {
      const d = await r.json();
      const page = Object.values(d?.query?.pages || {})[0];
      if (page && !page.missing && page.thumbnail?.source) {
        _imgCache[key] = page.thumbnail.source;
        _saveImgCache();
        return page.thumbnail.source;
      }
    }
  } catch(e) {}
  // Fallback: REST summary API
  try {
    const ctrl2 = new AbortController();
    const t2 = setTimeout(() => ctrl2.abort(), 6000);
    const r2 = await fetch(
      'https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(wikiTitle),
      { headers: { Accept: 'application/json' }, signal: ctrl2.signal }
    );
    clearTimeout(t2);
    if (r2.ok) {
      const d2 = await r2.json();
      const url = d2?.thumbnail?.source || d2?.originalimage?.source || null;
      _imgCache[key] = url;
      if (url) _saveImgCache();
      return url;
    }
  } catch(e) {}
  _imgCache[key] = null;
  return null;
}

function _applyImage(productId, imageUrl, svgFallback) {
  const el = document.getElementById('pimg-' + productId);
  if (!el) return;
  const img = new Image();
  img.onload = () => {
    el.innerHTML = '';
    el.style.cssText = 'background:#ffffff;padding:12px;';
    img.style.cssText = 'max-width:100%;max-height:258px;object-fit:contain;display:block;margin:auto;';
    el.appendChild(img);
  };
  img.onerror = () => { el.innerHTML = svgFallback; };
  img.src = imageUrl;
}

async function _loadProductImage(productId, productName, category, svgFallback) {
  // 1a. PNG with transparent background (preferred — no white box)
  const pngOk = await new Promise(res => {
    const img = new Image();
    img.onload = () => res(true);
    img.onerror = () => res(false);
    img.src = '/assets/products/' + productId + '.png';
  });
  if (pngOk) { _applyImage(productId, '/assets/products/' + productId + '.png', svgFallback); return; }

  // 1b. Local photo — /assets/products/{id}.jpg
  const localOk = await new Promise(res => {
    const img = new Image();
    img.onload = () => res(true);
    img.onerror = () => res(false);
    img.src = '/assets/products/' + productId + '.jpg';
  });
  if (localOk) { _applyImage(productId, '/assets/products/' + productId + '.jpg', svgFallback); return; }

  // 2. NDC-specific NIH photo (exact bottle match)
  const ndc = _PRODUCT_NDC[productId];
  if (ndc) {
    const url = await _fetchNIHImageByNDC(ndc);
    if (url) { _applyImage(productId, url, svgFallback); return; }
  }

  // 3. NIH name search
  const nihName = _NIH_SEARCH_OVERRIDE[productId] || productName;
  const nihUrl = await _fetchNIHImage(nihName);
  if (nihUrl) { _applyImage(productId, nihUrl, svgFallback); return; }

  // 4. DailyMed thumbnail
  const dmUrl = await _fetchDailyMedImage(productName);
  if (dmUrl) { _applyImage(productId, dmUrl, svgFallback); return; }

  // 5. Wikipedia image
  const wikiTitle = _getWikiTitle(productName);
  if (wikiTitle) {
    const wikiUrl = await _fetchWikiImage(wikiTitle);
    if (wikiUrl) { _applyImage(productId, wikiUrl, svgFallback); return; }
  }
  // SVG fallback already shown as placeholder
}

function _processImgQueue() {
  while (_imgActive < _IMG_CONCURRENT && _imgQueue.length > 0) {
    const item = _imgQueue.shift();
    _imgActive++;
    _loadProductImage(item.productId, item.productName, item.category, item.svgFallback)
      .finally(() => { _imgActive--; _processImgQueue(); });
  }
}

// Load admin-set custom photo overrides from localStorage
let _customPhotos = {};
try { _customPhotos = JSON.parse(localStorage.getItem('ducor-photos') || '{}'); } catch(e) {}

function _startImageLoading(list, category) {
  list.forEach(p => {
    const svgFallback = _makeSVGLabel(p.name, category);
    const el = document.getElementById('pimg-' + p.id);
    if (!el) return;
    // Admin-set custom photo takes highest priority
    if (_customPhotos[p.id]) {
      _applyImage(p.id, _customPhotos[p.id], svgFallback);
      return;
    }
    // Show placeholder SVG while real photo loads
    el.innerHTML = svgFallback;
    _imgQueue.push({ productId: p.id, productName: p.name, category, svgFallback });
  });
  _processImgQueue();
}

// ── PRODUCT DETAIL MODAL ───────────────────────────────────────────────────────

const ProductModal = {
  _ready: false,

  _ensureDOM() {
    if (this._ready) return;
    this._ready = true;
    const el = document.createElement('div');
    el.id = 'pm-overlay';
    el.className = 'pm-overlay';
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = `
      <div class="pm-panel">
        <button class="pm-close" onclick="ProductModal.close()" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <div class="pm-img-side rx-bg" id="pm-img-side">
          <div class="pm-img-frame" id="pm-img-frame"></div>
        </div>
        <div class="pm-info-side">
          <span class="pm-tag product-tag" id="pm-tag"></span>
          <h2 class="pm-name" id="pm-name"></h2>
          <div class="pm-price-row">
            <span class="pm-price" id="pm-price"></span>
            <span class="pm-unit" id="pm-unit">/ Dose</span>
          </div>
          <p class="pm-note" id="pm-note"></p>
          <hr class="pm-divider">
          <div class="pm-actions">
            <button class="pm-btn-cart" id="pm-btn-cart">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              Add to Cart
            </button>
            <button class="pm-btn-buynow" id="pm-btn-buynow">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              Buy Now — Card / Mobile Money
            </button>
            <p class="pm-pay-icons">
              <svg width="32" height="20" viewBox="0 0 48 30" fill="none"><rect width="48" height="30" rx="4" fill="#1A1F71"/><text x="24" y="20" text-anchor="middle" font-size="10" font-weight="bold" fill="white" font-family="sans-serif">VISA</text></svg>
              <svg width="32" height="20" viewBox="0 0 48 30" fill="none"><rect width="48" height="30" rx="4" fill="#eb001b"/><circle cx="19" cy="15" r="10" fill="#eb001b"/><circle cx="29" cy="15" r="10" fill="#f79e1b"/><path d="M24 8.5a10 10 0 0 1 0 13A10 10 0 0 1 24 8.5z" fill="#ff5f00"/></svg>
              <svg width="32" height="20" viewBox="0 0 48 30" fill="none"><rect width="48" height="30" rx="4" fill="#FFD700"/><text x="24" y="20" text-anchor="middle" font-size="9" font-weight="bold" fill="#333" font-family="sans-serif">MTN</text></svg>
              <svg width="32" height="20" viewBox="0 0 48 30" fill="none"><rect width="48" height="30" rx="4" fill="#FF7900"/><text x="24" y="20" text-anchor="middle" font-size="9" font-weight="bold" fill="white" font-family="sans-serif">Orange</text></svg>
            </p>
          </div>
        </div>
      </div>`;
    el.addEventListener('click', e => { if (e.target === el) this.close(); });
    document.body.appendChild(el);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
  },

  open(productId, category) {
    this._ensureDOM();
    const product = (PRODUCTS[category] || []).find(p => p.id === productId);
    if (!product) return;

    const dispCat = category === 'prescription' ? 'rx' : category;
    const tagLabels  = { rx: 'RX', otc: 'OTC', vitamins: 'Supplement' };
    const tagClasses = { rx: 'tag-rx', otc: 'tag-otc', vitamins: 'tag-vit' };
    const bgClasses  = { rx: 'rx-bg', otc: 'otc-bg', vitamins: 'vit-bg' };
    const notes = {
      rx: 'A valid prescription is required at checkout.',
      otc: 'Available over the counter — no prescription needed.',
      vitamins: 'Dietary supplement — no prescription required.'
    };

    const tagEl = document.getElementById('pm-tag');
    tagEl.textContent = tagLabels[dispCat] || 'RX';
    tagEl.className   = 'pm-tag product-tag ' + (tagClasses[dispCat] || 'tag-rx');

    document.getElementById('pm-name').textContent  = product.name;
    document.getElementById('pm-price').textContent = '$' + product.price.toFixed(2);
    document.getElementById('pm-note').textContent  = notes[dispCat] || '';
    const priceRow = document.querySelector('.pm-price-row');
    if (priceRow) priceRow.style.display = dispCat === 'rx' ? 'none' : '';

    const imgSide = document.getElementById('pm-img-side');
    imgSide.className = 'pm-img-side ' + (bgClasses[dispCat] || 'rx-bg');

    const frame = document.getElementById('pm-img-frame');
    const icons = { rx: ICONS.rx, otc: ICONS.otc, vitamins: ICONS.vit };
    frame.innerHTML = icons[dispCat] || ICONS.rx;

    const tryLoad = (src) => new Promise(res => {
      const i = new Image(); i.onload = () => res(src); i.onerror = () => res(null); i.src = src;
    });
    (async () => {
      const src = await tryLoad('/assets/products/' + productId + '.png')
               || await tryLoad('/assets/products/' + productId + '.jpg');
      if (src) {
        const img = document.createElement('img');
        img.src = src; img.alt = product.name;
        if (dispCat === 'vitamins') {
          imgSide.style.background = '#ffffff';
          img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;display:block;margin:auto;';
        }
        frame.innerHTML = '';
        frame.appendChild(img);
      }
    })();

    if (dispCat === 'rx') {
      document.getElementById('pm-btn-cart').onclick = () => {
        this.close();
        showRxPricingNotice(productId, category, product.name);
      };
      document.getElementById('pm-btn-buynow').onclick = () => {
        this.close();
        showRxPricingNotice(productId, category, product.name);
      };
    } else {
      document.getElementById('pm-btn-cart').onclick = () => {
        addToCart(productId, category);
        this.close();
      };
      document.getElementById('pm-btn-buynow').onclick = () => {
        addToCart(productId, category);
        window.location.href = '/checkout.html';
      };
    }

    document.getElementById('pm-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  close() {
    const o = document.getElementById('pm-overlay');
    if (o) { o.classList.remove('open'); document.body.style.overflow = ''; }
  }
};

// ── RX PRICING NOTICE ─────────────────────────────────────────────────────────
// Shows before a prescription item can be added to cart

function showRxPricingNotice(productId, category, productName) {
  let overlay = document.getElementById('rx-price-notice');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'rx-price-notice';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:20px;max-width:430px;width:100%;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,.4)">
        <div style="background:linear-gradient(135deg,#0d1b2a,#162540);padding:26px 28px;text-align:center">
          <div style="width:60px;height:60px;background:rgba(201,160,85,.15);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 14px">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#c9a055" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.07 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
          </div>
          <h3 style="color:#fff;font-size:19px;font-weight:700;margin:0 0 6px">Please Call for Pricing</h3>
          <p style="color:#c9a055;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0">Ducor International Pharmacy</p>
        </div>
        <div style="padding:24px 28px">
          <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:12px;padding:14px 16px;margin-bottom:18px;font-size:13px;color:#78350f;line-height:1.7">
            <strong>⚠️ Prescription Pricing Notice</strong><br>
            The price for <strong id="rx-notice-name" style="color:#0d1b2a"></strong> is <strong>not fixed</strong>. Prescription medication prices change regularly based on current stock levels, dosage availability, and international supply costs.<br><br>
            <strong>Please contact us first</strong> to get the exact current price before placing your order.
          </div>
          <p style="font-size:12px;font-weight:700;color:#64748b;letter-spacing:.5px;text-transform:uppercase;margin:0 0 10px">Contact us now</p>
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px">
            <a href="tel:+16309366050" style="display:flex;align-items:center;gap:12px;background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:11px 14px;text-decoration:none;color:#166534;font-size:13px">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.07 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
              <div><strong>Call (USA)</strong> &nbsp;+1 (630) 936-6050</div>
            </a>
            <a href="tel:+231880187490" style="display:flex;align-items:center;gap:12px;background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:11px 14px;text-decoration:none;color:#166534;font-size:13px">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.07 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
              <div><strong>Call (Liberia)</strong> &nbsp;+231 880 187 490</div>
            </a>
            <a href="https://wa.me/16309366050" target="_blank" style="display:flex;align-items:center;gap:12px;background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:11px 14px;text-decoration:none;color:#166534;font-size:13px">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#16a34a"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              <div><strong>WhatsApp</strong> &nbsp;+1 (630) 936-6050</div>
            </a>
          </div>
          <div style="display:flex;gap:10px">
            <button onclick="document.getElementById('rx-price-notice').style.display='none'" style="flex:1;padding:13px;border:1.5px solid #e5e7eb;border-radius:10px;background:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;color:#64748b">Cancel</button>
            <button id="rx-notice-add-btn" style="flex:2;padding:13px;border:none;border-radius:10px;background:linear-gradient(135deg,#0d1b2a,#162540);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Add to Cart & Order</button>
          </div>
          <p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:10px;line-height:1.6">Adding to cart lets us know you are interested. Our pharmacist will confirm the price with you before your order is dispatched.</p>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.style.display = 'none'; });
  }
  overlay.style.display = 'flex';
  document.getElementById('rx-notice-name').textContent = productName || 'this medication';
  document.getElementById('rx-notice-add-btn').onclick = () => {
    overlay.style.display = 'none';
    addToCart(productId, category);
  };
}

// ── PRODUCT RENDERER ───────────────────────────────────────────────────────────

function renderProducts(category, containerId, filterVal = '', sortVal = 'name') {
  let list = (PRODUCTS[category] || []).filter(p => !p.adminOnly);

  if (filterVal.trim()) {
    const q = filterVal.toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(q));
  }

  if (sortVal === 'price-asc') list = [...list].sort((a,b) => a.price - b.price);
  else if (sortVal === 'price-desc') list = [...list].sort((a,b) => b.price - a.price);
  else list = [...list].sort((a,b) => a.name.localeCompare(b.name));

  const tagClass = { rx: 'tag-rx', otc: 'tag-otc', vitamins: 'tag-vit' };
  const tagLabel = { rx: 'RX', otc: 'OTC', vitamins: 'Supplement' };
  const imgBg = { rx: 'rx-bg', otc: 'otc-bg', vitamins: 'vit-bg' };
  const icon = { rx: ICONS.rx, otc: ICONS.otc, vitamins: ICONS.vit };

  const container = document.getElementById(containerId);
  const count = document.getElementById('results-count');

  if (list.length === 0) {
    container.innerHTML = `<div class="no-results">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <p>No medications found for "<strong>${filterVal}</strong>"</p>
    </div>`;
    if (count) count.textContent = '0 results';
    return;
  }

  if (count) count.textContent = `${list.length} medication${list.length !== 1 ? 's' : ''}`;

  container.innerHTML = list.map(p => `
    <div class="product-card">
      <div class="product-img ${imgBg[category]}" id="pimg-${p.id}" onclick="window.location='/product.html?id=${p.id}&cat=${category}'">${icon[category]}</div>
      <div class="product-body">
        <span class="product-tag ${tagClass[category]}">${tagLabel[category]}</span>
        <p class="product-name">${p.name}</p>
        ${(category === 'rx' || category === 'prescription') ? `<p class="product-price" style="color:#0891b2;font-size:12px;font-weight:600">📞 Call for pricing</p>` : `<p class="product-price">$${p.price.toFixed(2)} <span>/ Dose</span></p>`}
        ${(category === 'rx' || category === 'prescription')
          ? `<button class="btn-add" id="btn-${p.id}" onclick="showRxPricingNotice('${p.id}','${category}','${p.name.replace(/'/g, '&apos;').replace(/"/g, '&quot;')}')" style="background:linear-gradient(135deg,#0d1b2a,#162540)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.07 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
              Inquire &amp; Order
            </button>`
          : `<button class="btn-add" id="btn-${p.id}" onclick="addToCart('${p.id}','${category}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add to Cart
            </button>`
        }
      </div>
    </div>`).join('');

  // Show SVG labels immediately, then load Wikipedia photos
  setTimeout(() => _startImageLoading(list, category), 30);
}

function addToCart(productId, category) {
  Cart.load();
  const product = PRODUCTS[category].find(p => p.id === productId);
  if (!product) return;
  Cart.add(product, category);
  showToast(`${product.name} added to cart`);
  const btn = document.getElementById('btn-' + productId);
  if (btn) {
    btn.classList.add('added');
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Added!`;
    setTimeout(() => {
      btn.classList.remove('added');
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add to Cart`;
    }, 2000);
  }
}

// ── INIT ───────────────────────────────────────────────────────────────────────

function initShop(category) {
  Cart.load();
  Cart.updateBadge();
  renderProducts(category, 'products-grid');

  const searchInput = document.getElementById('search-input');
  const sortSelect = document.getElementById('sort-select');

  function update() {
    renderProducts(category, 'products-grid', searchInput.value, sortSelect.value);
  }

  if (searchInput) searchInput.addEventListener('input', update);
  if (sortSelect) sortSelect.addEventListener('change', update);

  document.getElementById('cart-overlay').addEventListener('click', () => Cart.close());
}
