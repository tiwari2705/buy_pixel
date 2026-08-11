// Clear Next.js cache by calling revalidate API
const https = require('https');

const SITE_URL = 'https://yourdomain.com'; // Replace with your actual domain
const CRON_SECRET = process.env.CRON_SECRET || 'akhfjkhJHSGWHG734gw2@Y#&EGHDVSvuyghfba';

console.log('\n🔄 Requesting cache revalidation...\n');

// You'll need to create this API route or use your existing one
fetch(`${SITE_URL}/api/revalidate?secret=${CRON_SECRET}`)
  .then(res => res.json())
  .then(data => {
    console.log('✅ Cache cleared!', data);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    console.log('\n💡 Manual solution:');
    console.log('1. Go to your Vercel dashboard');
    console.log('2. Go to your deployment');
    console.log('3. Click "Redeploy" or force refresh your site with Ctrl+Shift+R');
  });
