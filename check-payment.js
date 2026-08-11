// Check recent payment status
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPayments() {
  console.log('\n🔍 Checking recent payments...\n');
  
  const payments = await prisma.payment.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      block: true
    }
  });

  if (payments.length === 0) {
    console.log('No payments found.');
    return;
  }

  payments.forEach((payment, index) => {
    console.log(`\n--- Payment ${index + 1} ---`);
    console.log('Order ID:', payment.razorpayOrderId);
    console.log('Payment ID:', payment.razorpayPaymentId || 'NOT CAPTURED');
    console.log('Payment Status:', payment.status);
    console.log('Amount:', payment.amount / 100, payment.currency);
    console.log('Created:', payment.createdAt.toLocaleString());
    
    if (payment.block) {
      console.log('\nBlock Details:');
      console.log('  Status:', payment.block.status);
      console.log('  Position:', `(${payment.block.x}, ${payment.block.y})`);
      console.log('  Size:', `${payment.block.width}x${payment.block.height}`);
      console.log('  Buyer:', payment.block.buyerName || 'NOT SET (webhook not processed)');
      console.log('  Image:', payment.block.imageUrl || 'NOT SET');
    }
  });

  console.log('\n');
}

checkPayments()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
