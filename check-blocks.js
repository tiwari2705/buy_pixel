// Check recent blocks and payments
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkData() {
  console.log('\n🔍 Checking database...\n');
  
  // Check recent blocks
  const blocks = await prisma.block.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Found ${blocks.length} recent blocks:\n`);
  
  blocks.forEach((block, index) => {
    console.log(`--- Block ${index + 1} ---`);
    console.log('ID:', block.id);
    console.log('Status:', block.status);
    console.log('Order ID:', block.orderId || 'NO ORDER');
    console.log('Position:', `(${block.x}, ${block.y})`);
    console.log('Size:', `${block.width}x${block.height}`);
    console.log('Buyer:', block.buyerName || 'NOT SET YET (webhook pending)');
    console.log('Image:', block.imageUrl || 'NOT SET');
    console.log('Reserved Until:', block.reservedUntil?.toLocaleString() || 'N/A');
    console.log('Created:', block.createdAt.toLocaleString());
    console.log('');
  });

  // Check recent payments
  const payments = await prisma.payment.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\nFound ${payments.length} recent payments:\n`);
  
  payments.forEach((payment, index) => {
    console.log(`--- Payment ${index + 1} ---`);
    console.log('Block ID:', payment.blockId);
    console.log('Razorpay Order ID:', payment.razorpayOrderId);
    console.log('Razorpay Payment ID:', payment.razorpayPaymentId || 'NOT CAPTURED YET');
    console.log('Status:', payment.status);
    console.log('Amount:', payment.amount / 100, payment.currency);
    console.log('Created:', payment.createdAt.toLocaleString());
    console.log('Updated:', payment.updatedAt.toLocaleString());
    console.log('');
  });

  // Check webhook events
  const webhookEvents = await prisma.webhookEvent.findMany({
    take: 10,
    orderBy: { processedAt: 'desc' },
  });

  console.log(`\nFound ${webhookEvents.length} recent webhook events:\n`);
  
  webhookEvents.forEach((event, index) => {
    console.log(`--- Webhook ${index + 1} ---`);
    console.log('Event Type:', event.eventType);
    console.log('Event ID:', event.eventId);
    console.log('Processed At:', event.processedAt.toLocaleString());
    console.log('');
  });

  console.log('\n✅ Done!\n');
}

checkData()
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
