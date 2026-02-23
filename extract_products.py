import requests
import json
import os

API_URL = "https://us-central1-mi-catalogo-1f031.cloudfunctions.net/api/variedadestvcali/product"
OUTPUT_FILE = "js/products.js"

def extract_products():
    print(f"Fetching products from {API_URL}...")
    try:
        response = requests.get(API_URL)
        response.raise_for_status()
        api_products = response.json()
    except Exception as e:
        print(f"Error fetching data: {e}")
        return

    transformed_products = []
    
    # Mapping Categories to match frontend or defaults
    # Shoppic categories: Hogar, Tecnología, Niños, Aseo
    category_map = {
        "ENERGÍA SOLAR": "Tecnología",
        "PARLANTES PK SOUND": "Tecnología",
        "TELEVISORES PK VISION": "Tecnología",
        "HOGAR": "Hogar",
        "VARIOS": "Hogar",
        "BELLEZA": "Aseo"
    }

    for i, p in enumerate(api_products):
        # Extract description from the nested 'custom' JSON string
        description = ""
        try:
            custom_data = json.loads(p.get("custom", "{}"))
            description = custom_data.get("description", "")
            # Clean up newlines for JS string safely
            description = description.replace("\n", " ").replace("\r", " ").strip()
        except:
            pass

        p_id = p.get("idref", str(i + 1))
        title = p.get("desccli", "Producto sin nombre")
        price = p.get("pcia", 0)
        
        # Determine category
        api_cat = p.get("categorias", "Otros")
        category = category_map.get(api_cat, "Hogar") # Default to Hogar if not mapped

        image = p.get("url_imagen", "")
        
        transformed_products.append({
            "id": p_id,
            "title": title,
            "price": price,
            "category": category,
            "image": image,
            "description": description
        })

    # Generate the JS file content
    js_content = "const products = " + json.dumps(transformed_products, indent=4, ensure_ascii=False) + ";\n"
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(js_content)
    
    print(f"Successfully updated {OUTPUT_FILE} with {len(transformed_products)} products.")

if __name__ == "__main__":
    extract_products()
