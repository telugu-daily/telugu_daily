const { supabase } = require('./supabaseClient');
const fs = require('fs');
const path = require('path');

function parseCSV(content) {
  const lines = content.split('\n');
  const sentences = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle CSV with possible quoted fields containing commas
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());

    if (fields.length >= 3) {
      const id = parseInt(fields[0], 10);
      const english = fields[1];
      const telugu = fields[2];

      if (!isNaN(id) && english && telugu) {
        sentences.push({ id, english, telugu });
      }
    }
  }

  return sentences;
}

async function seed() {
  console.log('Reading sentences from spoken_english_10k.csv...');

  const filePath = path.join(__dirname, '..', '..', 'spoken_english_10k.csv');

  if (!fs.existsSync(filePath)) {
    console.error(`CSV file not found at: ${filePath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const sentences = parseCSV(fileContent);

  console.log(`Parsed ${sentences.length} sentences from CSV`);

  if (sentences.length === 0) {
    console.error('No sentences parsed. Check CSV format.');
    process.exit(1);
  }

  // Drop and recreate the table
  console.log('Dropping existing sentences table...');
  const { error: dropError } = await supabase.rpc('exec_sql', {
    sql: 'DROP TABLE IF EXISTS sentences CASCADE'
  }).maybeSingle();

  // If RPC doesn't exist, try direct delete
  if (dropError) {
    console.log('RPC not available, truncating table instead...');
    const { error: deleteError } = await supabase
      .from('sentences')
      .delete()
      .gte('id', 0);

    if (deleteError) {
      console.log('Delete warning (table may not exist):', deleteError.message);
    }
  }

  // Insert in batches of 100
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < sentences.length; i += batchSize) {
    const batch = sentences.slice(i, i + batchSize);

    const { error } = await supabase
      .from('sentences')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`Error inserting batch starting at ${i}:`, error);
      process.exit(1);
    }

    inserted += batch.length;
    console.log(`Inserted ${inserted}/${sentences.length} sentences`);
  }

  console.log(`\nSeed complete! Inserted ${inserted} sentences total.`);
  console.log(`That's ${Math.ceil(inserted / 50)} days of content.`);
}

seed().catch(console.error);
