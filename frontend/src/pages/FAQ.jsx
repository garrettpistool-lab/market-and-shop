import React from 'react';

export default function FAQ() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold tracking-tight mb-8">Frequently Asked Questions</h1>

      <div className="space-y-8">
        <div>
          <h2 className="font-semibold text-xl mb-2">What is Market and Shop?</h2>
          <p>Market and Shop is a technology platform that connects buyers and sellers (individuals and businesses) for the exchange of goods, produce, and services. We facilitate discovery, ordering, and communication but do not take part in the actual transactions.</p>
        </div>

        <div>
          <h2 className="font-semibold text-xl mb-2">Is Market and Shop responsible for the goods or transactions?</h2>
          <p>No. All transactions on Market and Shop are person-to-person or business-to-business exchanges of goods and currency. Market and Shop is not a party to any transaction, does not handle payment processing (except as a facilitator via third-party links like Stripe/PayPal when connected by vendors), and is not responsible for the quality, safety, legality, or delivery of any items. Buyers and sellers are solely responsible for their agreements, payments, and compliance.</p>
        </div>

        <div>
          <h2 className="font-semibold text-xl mb-2">What laws do I need to follow?</h2>
          <p>Users must comply with all applicable laws, regulations, and ordinances governing their location, including but not limited to city, county, province, state, federal, and international laws. This includes laws regarding the sale of food, produce, alcohol, taxes, sales tax collection and remittance, business licenses, health and safety regulations, import/export rules, and consumer protection laws. Market and Shop does not provide legal advice.</p>
        </div>

        <div>
          <h2 className="font-semibold text-xl mb-2">What about payments and deliveries?</h2>
          <p>Payments are handled directly between parties or via vendors' connected accounts (Stripe, PayPal, etc.). Delivery options (pickup, DoorDash, Uber Eats) are third-party or direct. Market and Shop is not responsible for payment disputes, delivery issues, or fulfillment.</p>
        </div>

        <div>
          <h2 className="font-semibold text-xl mb-2">Can policies change?</h2>
          <p>Yes. All policies, agreements, terms, and features on Market and Shop are subject to change at any time without prior notice. Continued use of the platform constitutes acceptance of the current terms.</p>
        </div>

        <div>
          <h2 className="font-semibold text-xl mb-2">How do I report issues?</h2>
          <p>Use the Support or Issues section in your account. For legal or safety concerns, contact local authorities as appropriate. Market and Shop may assist with platform-related issues at its discretion but has no obligation to mediate disputes.</p>
        </div>

        <div>
          <h2 className="font-semibold text-xl mb-2">Is there a fee to use Market and Shop?</h2>
          <p>Browsing and basic use is free. Vendors may choose to promote listings or use paid features. Transaction fees may apply through connected payment processors (Stripe, PayPal). We are transparent about any platform fees.</p>
        </div>

        <div>
          <h2 className="font-semibold text-xl mb-2">How are vendors verified?</h2>
          <p>Admins review and approve vendor applications. We encourage community reviews and ratings. However, ultimate responsibility for due diligence lies with the buyer.</p>
        </div>

        <div>
          <h2 className="font-semibold text-xl mb-2">What if I receive damaged or incorrect goods?</h2>
          <p>Contact the seller directly through the platform first. Market and Shop provides tools for communication but is not responsible for resolving individual transaction disputes.</p>
        </div>

        <div>
          <h2 className="font-semibold text-xl mb-2">Can I sell homemade or homegrown items?</h2>
          <p>Only if it complies with all local cottage food laws, zoning, health regulations, and any required permits in your area. It is your responsibility to research and follow the law.</p>
        </div>

        <div>
          <h2 className="font-semibold text-xl mb-2">How does real-time data work?</h2>
          <p>Live vendor counts, recent orders, and activity use Supabase realtime subscriptions. Numbers update as the community interacts with the platform.</p>
        </div>

        <div>
          <h2 className="font-semibold text-xl mb-2">What happens if a vendor or buyer violates the rules?</h2>
          <p>Admins have tools to suspend accounts, hide content, and resolve issues. Serious violations may result in permanent removal. We encourage reporting through the platform.</p>
        </div>
      </div>

      <p className="mt-8 text-sm text-gray-500">This is not legal advice. Consult a qualified attorney in your jurisdiction for your specific situation. Last updated: June 2026.</p>
    </div>
  );
}
