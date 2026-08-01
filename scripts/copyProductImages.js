const fs = require("fs");
const path = require("path");

const sourceBase =
  "C:/Users/DELL/Downloads/Aryan/Nezal/Nezal Images";

const targetBase =
  "C:/Users/DELL/Downloads/Aryan/Nezal/Nezal/public/products";

if (!fs.existsSync(targetBase)) {
  fs.mkdirSync(targetBase, { recursive: true });
}

const mappings = [
  {
    source:
      "FACE WASH/ubtan face wash/Ubtan_D-tan_Face_Wash-removebg-preview.png",
    target: "ubtan-dtan-facewash.jpg",
  },

  {
    source:
      "FACE WASH/neem face wash/neem 1.jpeg",
    target: "neem-tulsi-facewash.jpg",
  },

  {
    source:
      "MOISTURISING CREAM/100ml/100gm.jpg",
    target: "almond-nourishing-cream.jpg",
  },

  {
    source:
      "CEDARWOOD OIL/CEDARWOOD OIL.jpg",
    target: "body-massage-oil-cedarwood.jpg",
  },

  {
    source:
      "BODY LOTION/FRANGIPANI.jpg",
    target: "aloevera-body-lotion.jpg",
  },

  {
    source:
      "APRICOT SCRUB/APRICOT 01.jpg",
    target: "turmeric-body-scrub.jpg",
  },

  {
    source:
      "BATH SALT/ROSE SALT/ROSE SALT SINGLE.jpg",
    target: "rose-bathing-salt.jpg",
  },

  {
    source:
      "SERUM/HAIR SERUM/BLACK HAIR SERUM.jpg",
    target: "bhringraj-hair-serum.jpg",
  },

  {
    source:
      "Shampoos pic front & back1/Neem shampoo 500 ml/Neem shampoo 500 ml.png",
    target: "aloe-shampoo.jpg",
  },

  {
    source:
      "INTIMATE/INTIMATE.jpg",
    target: "intimate-hygiene-foam-wash.jpg",
  },
];

for (const item of mappings) {
  const sourcePath = path.join(sourceBase, item.source);
  const targetPath = path.join(targetBase, item.target);

  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`✅ Copied: ${item.target}`);
  } else {
    console.log(`❌ Missing: ${item.source}`);
  }
}

console.log("\n🎉 Product image copy complete!");