// Test if image URLs are accessible
const { PrismaClient } = require('@prisma/client');
const https = require('https');

const prisma = new PrismaClient();

async function testImageURLs() {
  console.log('\n🔍 Testing image URLs...\n');
  
  const blocks = await prisma.block.findMany({
    where: { status: 'live' },
    take: 5,
    orderBy: { createdAt: 'desc' }
  });

  if (blocks.length === 0) {
    console.log('No live blocks found.');
    return;
  }

  for (const block of blocks) {
    console.log(`\n--- Block ${block.id} ---`);
    console.log('Image URL:', block.imageUrl);
    
    if (!block.imageUrl) {
      console.log('❌ No image URL');
      continue;
    }

    // Test if URL is accessible
    try {
      const url = new URL(block.imageUrl);
      console.log('Protocol:', url.protocol);
      console.log('Host:', url.hostname);
      console.log('Path:', url.pathname);
      
      // Try to fetch the image
      await new Promise((resolve, reject) => {
        const req = https.get(block.imageUrl, (res) => {
          console.log('Status Code:', res.statusCode);
          console.log('Content-Type:', res.headers['content-type']);
          
          if (res.statusCode === 200) {
            console.log('✅ Image is accessible');
          } else if (res.statusCode === 404) {
            console.log('❌ Image not found (404)');
          } else if (res.statusCode === 403) {
            console.log('❌ Access denied (403) - Check Supabase bucket permissions');
          } else {
            console.log('⚠️ Unexpected status code');
          }
          resolve();
        });
        
        req.on('error', (err) => {
          console.log('❌ Error fetching image:', err.message);
          reject(err);
        });
        
        req.end();
      });
      
    } catch (err) {
      console.log('❌ Invalid URL:', err.message);
    }
  }
  
  console.log('\n');
}

testImageURLs()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
