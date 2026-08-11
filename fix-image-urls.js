// Fix image URLs in database - change from S3 format to public format
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixImageURLs() {
  console.log('\n🔧 Fixing image URLs in database...\n');
  
  // Find all blocks with old S3 URLs
  const blocks = await prisma.block.findMany({
    where: {
      imageUrl: {
        contains: '/storage/v1/s3/'
      }
    }
  });

  console.log(`Found ${blocks.length} blocks with old URLs\n`);

  let fixed = 0;
  for (const block of blocks) {
    const oldUrl = block.imageUrl;
    
    // Convert from S3 format to public format
    // From: https://trqihvgrbsaodxwjeawt.storage.supabase.co/storage/v1/s3/blocks/...
    // To:   https://trqihvgrbsaodxwjeawt.supabase.co/storage/v1/object/public/pixel-uploads/blocks/...
    
    const newUrl = oldUrl
      .replace('trqihvgrbsaodxwjeawt.storage.supabase.co/storage/v1/s3/', 
               'trqihvgrbsaodxwjeawt.supabase.co/storage/v1/object/public/pixel-uploads/');
    
    console.log(`Block ${block.id}:`);
    console.log(`  Old: ${oldUrl}`);
    console.log(`  New: ${newUrl}`);
    
    await prisma.block.update({
      where: { id: block.id },
      data: { imageUrl: newUrl }
    });
    
    fixed++;
    console.log(`  ✅ Updated\n`);
  }

  console.log(`\n🎉 Fixed ${fixed} image URLs!\n`);
}

fixImageURLs()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
