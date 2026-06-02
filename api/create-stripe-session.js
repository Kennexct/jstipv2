import Stripe from 'stripe';

// Gunakan environment variable untuk keamanan (set di Vercel Dashboard)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16' // Use latest supported API version
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { orderDetails, successUrl, cancelUrl } = req.body;

    if (!orderDetails || !orderDetails.name || !orderDetails.price) {
      return res.status(400).json({ error: 'Missing order details' });
    }
    
    // IDR adalah zero-decimal currency di Stripe, jadi 55000 IDR ditulis langsung 55000
    const unitAmount = Math.round(orderDetails.price);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'idr',
            product_data: {
              name: orderDetails.name,
              description: orderDetails.notes ? `Notes: ${orderDetails.notes}` : undefined,
              images: orderDetails.image ? [orderDetails.image] : undefined,
            },
            unit_amount: unitAmount, 
          },
          quantity: orderDetails.quantity || 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: orderDetails.customerEmail,
      metadata: {
        customerId: orderDetails.customerId || 'guest',
        merchantId: orderDetails.merchantId || 'unknown'
      }
    });

    res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
}
