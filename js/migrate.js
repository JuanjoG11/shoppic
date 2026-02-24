// Script to migrate products from products.js to Supabase
// This should be run once in the browser console

async function migrateProducts() {
    if (typeof products === 'undefined') {
        console.error('❌ products.js not loaded. Make sure to include it before this script.');
        return;
    }

    if (typeof supabaseClient === 'undefined') {
        console.error('❌ Supabase client not initialized. Make sure to include supabase-config.js.');
        return;
    }

    console.log(`🚀 Starting migration of ${products.length} products...`);

    // Keywords for "Niños" category
    const kidsKeywords = ['juguete', 'niño', 'niña', 'infantil', 'bebe', 'baby', 'kit de pintura', 'carro', 'muñeca', 'peluche', 'slime', 'plastilina', 'didactico', 'colegio', 'escolar'];

    // Supabase has limits on batch size, so we'll do it in chunks of 50 for safety
    const chunkSize = 50;
    for (let i = 0; i < products.length; i += chunkSize) {
        const chunk = products.slice(i, i + chunkSize);

        // Ensure all fields match the DB schema and apply category mapping
        const formattedChunk = chunk.map(p => {
            let category = p.category;
            const textToSearch = (p.title + ' ' + (p.description || '')).toLowerCase();

            // If it's a toy or kids product, force "Niños" category
            if (kidsKeywords.some(keyword => textToSearch.includes(keyword))) {
                category = 'Niños';
            }

            return {
                id: String(p.id),
                title: p.title,
                price: p.price,
                category: category,
                image: p.image,
                description: p.description
            };
        });

        const { data, error } = await supabaseClient
            .from('products')
            .upsert(formattedChunk);

        if (error) {
            console.error(`❌ Error migrating chunk ${i / chunkSize + 1}:`, error);
        } else {
            console.log(`✅ Chunk ${i / chunkSize + 1} (${chunk.length} items) migrated successfully.`);
        }
    }

    console.log('✨ Migration complete! Re-categorization applied.');
}

// Automatically expose to window for easy access
window.migrateProducts = migrateProducts;
