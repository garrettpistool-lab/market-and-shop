import React from 'react';

export default function Agreements() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold tracking-tight mb-8">Terms of Service, Privacy Policy &amp; User Agreements</h1>

      <p className="text-sm text-gray-500 mb-6">These documents may be updated at any time. Continued use of Market and Shop means you accept the current versions. Please read carefully.</p>

      {/* TERMS OF SERVICE - Page 1 content */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">1. Terms of Service</h2>

        <h3 className="font-medium mt-4">1.1 Platform Description</h3>
        <p>Market and Shop is a neutral technology platform designed to connect independent buyers and sellers (individuals and small businesses) for direct, local exchange of food, produce, handmade goods, and related services. We provide tools for discovery, ordering, communication, and optional promotion. <strong>Market and Shop is not a marketplace operator that takes possession of goods, processes payments on its own behalf, or guarantees any transaction.</strong></p>

        <h3 className="font-medium mt-4">1.2 User Eligibility &amp; Accounts</h3>
        <p>You must be at least 18 years old and legally able to enter contracts in your jurisdiction. You are responsible for maintaining the confidentiality of your account and for all activity under it. One account per person/business. We may suspend or terminate accounts that violate these terms or appear fraudulent.</p>

        <h3 className="font-medium mt-4">1.3 User-Generated Content &amp; Conduct</h3>
        <p>You are solely responsible for all content you post (listings, reviews, messages). Do not post illegal, misleading, infringing, or harmful content. We may remove content at our discretion. You grant Market and Shop a non-exclusive license to display your content on the platform.</p>

        <h3 className="font-medium mt-4">1.4 Transactions Are Between Users</h3>
        <p>Every transaction (including payments via vendor-linked Stripe/PayPal accounts, delivery via third parties, or local pickup) is a direct agreement between the buyer and seller. Market and Shop is not the seller, buyer, or guarantor. We do not inspect goods, verify seller claims beyond basic admin review, or mediate disputes.</p>

        <h3 className="font-medium mt-4">1.5 Fees &amp; Payments</h3>
        <p>Basic use is free. Optional paid features (ads, promotions) have clear pricing. Any transaction fees are set by the payment processor you or the vendor chooses. You are responsible for any taxes on your activity.</p>

        <h3 className="font-medium mt-4">1.6 Termination &amp; Suspension</h3>
        <p>We may suspend or remove accounts, listings, or access at any time for violations, suspected fraud, legal reasons, or to protect the community. No refunds for paid features in cases of termination for cause.</p>
      </div>

      {/* PRIVACY POLICY - Page 1-2 content */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">2. Privacy Policy</h2>

        <h3 className="font-medium mt-4">2.1 Information We Collect</h3>
        <p>We collect information you provide (name, email, profile photo, location preferences, listings, reviews, messages) and technical data (IP address, device info, usage patterns) to operate the platform, prevent abuse, and improve the experience. We use Supabase for data storage and authentication.</p>

        <h3 className="font-medium mt-4">2.2 How We Use Information</h3>
        <p>We use information to:
          <br />• Provide and improve the service (matching buyers/sellers, processing orders, realtime updates).
          <br />• Communicate with you about your account, orders, and platform updates.
          <br />• Enforce our terms, prevent fraud, and ensure safety.
          <br />• Display public listings and reviews (as chosen by users).</p>

        <h3 className="font-medium mt-4">2.3 Sharing of Information</h3>
        <p>We share information with:
          <br />• Other users (as necessary for transactions – e.g., your contact info when you place or receive an order).
          <br />• Service providers (payment processors, delivery partners) only when you choose to use them.
          <br />• Legal authorities when required by law.
          <br />We do not sell personal data to third parties for advertising.</p>

        <h3 className="font-medium mt-4">2.4 Your Choices &amp; Rights</h3>
        <p>You can update your profile, delete listings, and request account deletion (subject to legal record-keeping). For data access or deletion requests, contact us through the platform. Note that public reviews and completed transaction records may remain visible for transparency.</p>

        <h3 className="font-medium mt-4">2.5 Data Security &amp; Retention</h3>
        <p>We use industry-standard security through Supabase and Vercel. We retain data as long as necessary for the service and legal compliance. You are responsible for the accuracy of information you provide.</p>

        <h3 className="font-medium mt-4">2.6 Cookies &amp; Tracking</h3>
        <p>We use essential cookies for login and functionality. We do not use invasive tracking for advertising.</p>
      </div>

      {/* ADDITIONAL LEGAL SECTIONS - Page 2 content */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">3. Community Guidelines &amp; Prohibited Conduct</h2>
        <p>Users agree not to:
          <br />• Sell or promote illegal, unsafe, or mislabeled products (especially food safety violations).
          <br />• Engage in fraud, scams, harassment, or discriminatory behavior.
          <br />• Impersonate others or post fake reviews.
          <br />• Circumvent platform fees or terms.
          <br />• Post content that infringes intellectual property or privacy rights.
        </p>
        <p>Violations may result in immediate removal of content and account suspension. We encourage users to report concerns through the platform.</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4 border-b pb-2">4. Limitation of Liability &amp; Indemnification</h2>
        <p>TO THE FULLEST EXTENT ALLOWED BY LAW, MARKET AND SHOP AND ITS AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM (A) YOUR USE OR INABILITY TO USE THE SERVICE; (B) ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE SERVICE; (C) ANY CONTENT OBTAINED FROM THE SERVICE; OR (D) UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT.</p>
        <p>You agree to indemnify and hold Market and Shop and its affiliates harmless from any claims, damages, obligations, losses, liabilities, costs, debt, and expenses (including reasonable attorneys' fees) arising from your use of the service, your content, your violation of these terms, or your violation of any third party's rights.</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4 border-b pb-2">5. Dispute Resolution &amp; Governing Law</h2>
        <p>Any dispute arising out of or relating to these terms or the service shall first be attempted to be resolved informally through the platform's support tools. If not resolved, disputes shall be governed by the laws of the state where Market and Shop is organized, without regard to its conflict of laws principles. You agree to resolve disputes individually and waive any right to participate in a class action or collective proceeding.</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4 border-b pb-2">6. General Provisions</h2>
        <p>These terms constitute the entire agreement between you and Market and Shop. If any provision is found unenforceable, the remaining provisions remain in effect. We may assign these terms. You may not assign them without our consent. No waiver of any term shall be deemed a continuing waiver.</p>

        <p className="mt-8 font-semibold">By using Market and Shop, creating an account, or making a purchase/sale, you confirm that you have read, understood, and agree to be bound by these Terms of Service, the Privacy Policy, the FAQ, and all other posted policies. You acknowledge this is a direct person-to-person or business-to-business exchange and that you are responsible for complying with every law applicable to you and your transactions in your location(s).</p>

        <div className="mt-10 text-sm border-t pt-4">
          <p>Last updated: June 2026. Subject to change.</p>
          <p>For questions: Use the in-app support system.</p>
          <p className="mt-2"><a href="/faq" className="underline">Read the full FAQ</a></p>
        </div>
      </div>
    </div>
  );
}
