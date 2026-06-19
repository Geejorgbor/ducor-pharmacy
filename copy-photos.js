const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'pharmacy-photos');
const DST = path.join(__dirname, 'assets', 'products');

// Best photo for each product ID — one photo per product
const MAP = {
  // ── Vitamins ──────────────────────────────────────────────────────────
  'vit003': 'photo_008', // Rugby B-Complex with Vitamin C
  'vit004': 'photo_001', // Rugby Calcium 600mg + Vitamin D3
  'vit008': 'photo_059', // Geri Care CoQ10 100mg
  'vit009': 'photo_002', // Nature's Truth Cod Liver Oil
  'vit012': 'photo_147', // Cyproheptadine 4mg
  'vit013': 'photo_148', // Daily-Vite Multivitamin
  'vit015': 'photo_139', // Fish Oil 1000mg
  'vit016': 'photo_004', // Foster & Thrive Flaxseed Oil 1000mg
  'vit017': 'photo_156', // Glucosamine/Chondroitin
  'vit018': 'photo_020', // Foster & Thrive Hair Skin & Nails
  'vit019': 'photo_003', // Nature's Truth Magnesium Glycinate
  'vit020': 'photo_051', // Rugby Magnesium Oxide 400mg
  'vit021': 'photo_083', // One A Day Men's Multi Gummy
  'vit024': 'photo_081', // OneVite Poly-Vi-Sol with Iron Drops
  'vit025': 'photo_177', // Health Star Prenatal Vitamins
  'vit026': 'photo_180', // Rugby Probiotic Formula
  'vit031': 'photo_075', // Geri Care Vitamin C 500mg
  'vit032': 'photo_068', // Geri Care Vitamin D3 1000 IU
  'vit033': 'photo_078', // Rugby Vitamin D3 5000 IU
  'vit034': 'photo_102', // Vitamin E 400 IU
  'vit035': 'photo_044', // OLLY Women's Multi Gummy
  'vit036': 'photo_054', // Foster & Thrive One Daily Women's

  // ── OTC ───────────────────────────────────────────────────────────────
  'otc002': 'photo_019', // Geri Care Acetaminophen 325mg
  'otc003': 'photo_015', // Geri Care Acetaminophen 500mg ES
  'otc004': 'photo_012', // Health Star Acetaminophen 650mg ER
  'otc005': 'photo_009', // Health Star Acetaminophen PM
  'otc010': 'photo_013', // Geri Care Chewable Aspirin 81mg
  'otc011': 'photo_084', // Health Star Aspirin 81mg EC
  'otc012': 'photo_030', // Bacitracin Ointment
  'otc014': 'photo_116', // Benzoyl Peroxide 5% Gel
  'otc019': 'photo_113', // Cetirizine 5mg/5ml Syrup
  'otc020': 'photo_074', // Padagis Children's Acetaminophen 160mg/5mL
  'otc021': 'photo_114', // Children's Ibuprofen 100mg/5mL
  'otc023': 'photo_064', // Taro Clotrimazole Cream 1%
  'otc025': 'photo_023', // Foster & Thrive Daytime Cold & Flu
  'otc031': 'photo_011', // Hydrocortisone Cream 1%
  'otc036': 'photo_181', // Major Loperamide 2mg
  'otc040': 'photo_118', // Melatonin 5mg
  'otc041': 'photo_119', // Melatonin 10mg
  'otc045': 'photo_168', // Rugby Pain Reliever Plus (Migraine Relief)
  'otc046': 'photo_050', // Geri Care Milk of Magnesia
  'otc051': 'photo_171', // NorthStar Omeprazole 20mg
  'otc056': 'photo_087', // Reliable-1 Simethicone 80mg

  // ── Prescription ──────────────────────────────────────────────────────
  'rx001': 'photo_157', // AcetaZOLAMIDE 250mg – Strides Pharma
  'rx002': 'photo_048', // Acyclovir 400mg – Camber
  'rx004': 'photo_111', // Albuterol HFA Inhaler 8.5gm
  'rx007': 'photo_159', // Amitriptyline HCl 25mg – Unichem
  'rx008': 'photo_037', // Amlodipine Besylate 5mg – Ascend
  'rx009': 'photo_039', // Amlodipine Besylate 10mg – Cipla
  'rx012': 'photo_072', // Amoxicillin/Clav Susp 600/42.9mg – NorthStar
  'rx013': 'photo_073', // Amoxicillin 500mg – NorthStar
  'rx014': 'photo_071', // Amoxicillin Susp 400mg/5mL – Aurobindo
  'rx015': 'photo_049', // Amoxicillin/Clav 500/125mg – NorthStar
  'rx016': 'photo_085', // Amoxicillin/Clav 875/125mg – NorthStar
  'rx020': 'photo_079', // Atenolol 50mg – Aurobindo
  'rx024': 'photo_038', // Atorvastatin 10mg – NorthStar
  'rx025': 'photo_034', // Atorvastatin 20mg – NorthStar
  'rx026': 'photo_082', // Azithromycin Susp 200mg/5mL – Epic Pharma
  'rx034': 'photo_032', // Carvedilol 3.125mg – Glenmark
  'rx035': 'photo_040', // Carvedilol 6.25mg – Zydus
  'rx037': 'photo_066', // Carvedilol 25mg – Zydus
  'rx040': 'photo_077', // Cephalexin 500mg – Aurobindo
  'rx041': 'photo_045', // Ciprofloxacin 500mg – Westminster
  'rx042': 'photo_067', // Clindamycin 150mg – Micro Labs
  'rx043': 'photo_080', // Clindamycin 300mg – Glenmark
  'rx050': 'photo_149', // Diltiazem HCl 120mg
  'rx051': 'photo_143', // Donepezil HCl 5mg
  'rx053': 'photo_063', // Doxycycline 100mg – Tris Pharma
  'rx056': 'photo_061', // Esomeprazole 40mg – NorthStar
  'rx057': 'photo_137', // Fenofibrate 160mg
  'rx058': 'photo_138', // Finasteride 5mg
  'rx060': 'photo_140', // Fluconazole Susp 10mg/ml
  'rx061': 'photo_146', // Fluoxetine 20mg
  'rx064': 'photo_070', // Furosemide 40mg – Rising
  'rx067': 'photo_150', // Glimepiride 2mg
  'rx068': 'photo_058', // GlipiZIDE 10mg – Apotex
  'rx070': 'photo_153', // HydrALAZINE HCl 25mg – Camber
  'rx074': 'photo_134', // Hydrocortisone 10mg Tablets
  'rx075': 'photo_129', // Hydroxychloroquine 200mg
  'rx078': 'photo_133', // Ibuprofen 600mg
  'rx081': 'photo_136', // Lansoprazole 15mg
  'rx083': 'photo_130', // Levetiracetam 250mg
  'rx084': 'photo_131', // Levetiracetam 500mg
  'rx085': 'photo_126', // Levofloxacin 500mg
  'rx086': 'photo_127', // Levofloxacin 750mg
  'rx087': 'photo_128', // Levothyroxine 25mcg
  'rx090': 'photo_095', // Levothyroxine 88mcg
  'rx091': 'photo_096', // Levothyroxine 100mcg
  'rx092': 'photo_122', // Levothyroxine 125mcg
  'rx092b': 'photo_103', // Lisinopril 5mg
  'rx093': 'photo_043', // Lisinopril 10mg – Falco
  'rx094': 'photo_047', // Lisinopril 20mg – Falco
  'rx095': 'photo_135', // Lisinopril/HCTZ 20/12.5mg
  'rx096': 'photo_094', // Lisinopril/HCTZ 20/25mg
  'rx098': 'photo_053', // Losartan 100mg – Camber
  'rx100': 'photo_123', // Losartan/HCTZ 100/12.5mg
  'rx101': 'photo_121', // Meloxicam 7.5mg
  'rx103': 'photo_036', // Metformin 500mg
  'rx105': 'photo_056', // Methimazole 10mg – Avet Pharma
  'rx116': 'photo_165', // NIFEdipine 10mg – Leading Pharma
  'rx117': 'photo_164', // NIFEdipine 20mg – Avet Pharma
  'rx118': 'photo_163', // Nitrofurantoin 100mg Macrocrystals – NorthStar
  'rx120': 'photo_169', // Olanzapine 5mg – Macleods
  'rx121': 'photo_170', // Olanzapine 10mg – Macleods
  'rx124': 'photo_172', // Ondansetron 4mg – NorthStar
  'rx125': 'photo_173', // Ondansetron ODT 4mg – NorthStar
  'rx126': 'photo_174', // Oxybutynin Chloride 5mg – Novitium
  'rx127': 'photo_033', // Pantoprazole 40mg – Camber
  'rx128': 'photo_166', // Penicillin VK 500mg – Aurobindo
  'rx129': 'photo_176', // PredniSONE 10mg – Strides Pharma
  'rx130': 'photo_175', // PredniSONE 20mg – Novitium Pharma
  'rx131': 'photo_178', // Progesterone 100mg – BionPharma
  'rx132': 'photo_179', // Progesterone 200mg – BionPharma
  'rx134': 'photo_099', // Rifampin 150mg
  'rx135': 'photo_098', // Rifampin 300mg
  'rx137': 'photo_097', // Rosuvastatin 10mg
  'rx138': 'photo_042', // Rosuvastatin 20mg – NorthStar
  'rx141': 'photo_031', // Tadalafil 5mg – Camber
  'rx142': 'photo_052', // Tadalafil 20mg – Camber
  'rx145': 'photo_046', // Tenofovir 300mg – NorthStar
  'rx152': 'photo_057', // Tranexamic Acid 650mg – Advagen
};

let copied = 0, errors = 0;

for (const [id, photoName] of Object.entries(MAP)) {
  const src = path.join(SRC, `${photoName}.jpg`);
  const dst = path.join(DST, `${id}.jpg`);

  if (!fs.existsSync(src)) {
    console.error(`  MISSING: ${src}`);
    errors++;
    continue;
  }

  fs.copyFileSync(src, dst);
  console.log(`  OK: ${photoName}.jpg → ${id}.jpg`);
  copied++;
}

console.log(`\nDone: ${copied} copied, ${errors} errors`);
