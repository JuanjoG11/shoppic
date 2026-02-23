const fs = require('fs');
const path = require('path');

const API_URL = "https://us-central1-mi-catalogo-1f031.cloudfunctions.net/api/variedadestvcali/product";
const OUTPUT_FILE = path.join(__dirname, 'js', 'products.js');

async function extractProducts() {
    console.log(`Fetching products from ${API_URL}...`);
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const apiProducts = await response.json();

        const categoryMap = {
            "ENERGÍA SOLAR": "Tecnología",
            "PARLANTES PK SOUND": "Tecnología",
            "TELEVISORES PK VISION": "Tecnología",
            "HOGAR": "Hogar",
            "VARIOS": "Hogar",
            "BELLEZA": "Aseo"
        };

        const transformedProducts = apiProducts.map((p, i) => {
            let description = "";
            try {
                const customData = JSON.parse(p.custom || "{}");
                description = (customData.description || "")
                    .replace(/\n/g, " ")
                    .replace(/\r/g, " ")
                    .trim();
            } catch (e) {
                // Ignore parsing errors
            }

            return {
                id: p.idref || (i + 1).toString(),
                title: p.desccli || "Producto sin nombre",
                price: p.pcia || 0,
                category: categoryMap[p.categorias] || "Hogar",
                image: p.url_imagen || "",
                description: description
            };
        });

        const jsContent = `const products = ${JSON.stringify(transformedProducts, null, 4)};\n`;

        const dir = path.dirname(OUTPUT_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(OUTPUT_FILE, jsContent, 'utf8');
        console.log(`Successfully updated ${OUTPUT_FILE} with ${transformedProducts.length} products.`);
    } catch (e) {
        console.error("Error extracting products:", e);
    }
}

extractProducts();
