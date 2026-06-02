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
    
    // SECURITY: Validate price from database to prevent Client-Side Price Manipulation
    let finalPrice = orderDetails.price;
    if (orderDetails.itemId && process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) {
      try {
        const supaUrl = process.env.VITE_SUPABASE_URL;
        const supaKey = process.env.VITE_SUPABASE_ANON_KEY;
        const dbRes = await fetch(`${supaUrl}/rest/v1/jstip_items?id=eq.${orderDetails.itemId}`, {
          headers: { 'apikey': supaKey, 'Authorization': `Bearer ${supaKey}` }
        });
        if (dbRes.ok) {
          const items = await dbRes.json();
          if (items.length > 0) {
            finalPrice = items[0].price; // Use trusted backend price
          }
        }
      } catch (e) {
        console.error('Failed to verify price against Supabase', e);
      }
    }

    // Stripe mewajibkan nominal dikali 100 untuk mata uang IDR
    const unitAmount = Math.round(finalPrice * 100);

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
