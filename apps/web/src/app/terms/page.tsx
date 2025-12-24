
import { Palanquin_Dark } from "next/font/google";

const palanquinDark = Palanquin_Dark({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-12">
      {/* Header */}
      <h1 className={`${palanquinDark.className} text-3xl md:text-4xl font-bold text-white mb-4`}>
        Anthe Labs - Terms of Service
      </h1>
      <p className="text-slate-400 mb-12">Last Updated: 25/12/2025</p>

      <div className="space-y-10 text-slate-300 leading-relaxed">
        {/* 1. Introduction */}
        <section>
          <h2 className={`${palanquinDark.className} text-xl font-semibold text-white mb-4`}>1. Introduction</h2>
          <div className="space-y-4">
            <p>
              Welcome to Anthe Labs ("we", "us", "our"). These Terms of Service ("Terms") constitute a legally binding agreement between you, as a user ("you", "your", "User"), and Anthe Labs, governing your access to and use of our website, mobile applications, platform, services, and related tools (collectively, the "Services").
            </p>
            <p>
              By registering for an account, accessing our platform, or using our Services in any manner, you agree that you have read, understood, and accepted these Terms and our Privacy Policy. If you do not agree with any part of these Terms, do not access or use our Services.
            </p>
          </div>
        </section>

        {/* 2. Acceptance of Terms and Updates */}
        <section>
          <h2 className={`${palanquinDark.className} text-xl font-semibold text-white mb-4`}>2. Acceptance of Terms and Updates</h2>
          <p>
            You confirm that you are of legal age and have the authority to enter into this agreement. We may update or modify these Terms at any time without prior notice. Continued use of the Services after changes constitutes acceptance of the revised Terms. We recommend you review this page periodically for updates.
          </p>
        </section>

        {/* 3. Definitions */}
        <section>
          <h2 className={`${palanquinDark.className} text-xl font-semibold text-white mb-4`}>3. Definitions</h2>
          <div className="space-y-4">
            <p>
              <span className="font-medium text-white">"Platform"</span> refers to Anthe Labs' trading and automation infrastructure, including web and mobile applications.
            </p>
            <p>
              <span className="font-medium text-white">"AI Trading Features"</span> refers to strategy automation and algorithmic tools powered by artificial intelligence.
            </p>
            <p>
              <span className="font-medium text-white">"Copy Trading"</span> refers to the feature that allows Users to replicate the trading activities of other traders within the system.
            </p>
          </div>
        </section>

        {/* 4. Eligibility and Account Creation */}
        <section>
          <h2 className={`${palanquinDark.className} text-xl font-semibold text-white mb-4`}>4. Eligibility and Account Creation</h2>
          <div className="space-y-4">
            <p>To use the Services, you must:</p>
            <ul className="list-disc pl-6 space-y-2 text-slate-300">
              <li>Be at least 18 years old (or older as required in your jurisdiction).</li>
              <li>Provide accurate, current, and complete registration information.</li>
              <li>Maintain the security of your account credentials.</li>
            </ul>
            <p>
              You are responsible for all activities under your account and should notify us immediately of any unauthorized access or security breach.
            </p>
          </div>
        </section>

        {/* 5. Use of the Services */}
        <section>
          <h2 className={`${palanquinDark.className} text-xl font-semibold text-white mb-4`}>5. Use of the Services</h2>
          <div className="space-y-4">
            <p>
              Your use of Anthe Labs' Services must comply with all applicable laws, regulations, and guidelines. You agree not to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-300">
              <li>Use the platform for any unlawful, harmful, or abusive activities.</li>
              <li>Interfere with the functionality of the Services or attempt to compromise system integrity.</li>
              <li>Engage in practices that violate trading regulations or financial laws.</li>
            </ul>
            <p>
              We reserve the right to suspend or terminate access for violations of these rules.
            </p>
          </div>
        </section>

        {/* 6. AI & Copy Trading Risks */}
        <section>
          <h2 className={`${palanquinDark.className} text-xl font-semibold text-white mb-4`}>6. AI & Copy Trading Risks</h2>
          <div className="space-y-4">
            <p>
              Trading activities, including those driven by AI or copied from other traders, involve financial risk. You acknowledge that:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-300">
              <li>Historical performance is not indicative of future results.</li>
              <li>AI tools and strategies are provided for informational and execution purposes only and do not guarantee profits.</li>
              <li>You assume all responsibility for trading decisions and financial outcomes.</li>
            </ul>
            <p>
              Anthe Labs does not guarantee performance, success, or profitability of any trading strategy.
            </p>
          </div>
        </section>

        {/* 7. Fees and Charges */}
        <section>
          <h2 className={`${palanquinDark.className} text-xl font-semibold text-white mb-4`}>7. Fees and Charges</h2>
          <div className="space-y-4">
            <p>
              Certain Services on the Platform may require payment of fees, including subscription and transaction fees. All fees are:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-300">
              <li>Clearly communicated prior to purchase.</li>
              <li>Charged in the manner specified in your account settings.</li>
              <li>Non-refundable unless otherwise stated.</li>
            </ul>
            <p>
              We reserve the right to change pricing and billing methods at any time with notice.
            </p>
          </div>
        </section>

        {/* 8. Intellectual Property */}
        <section>
          <h2 className={`${palanquinDark.className} text-xl font-semibold text-white mb-4`}>8. Intellectual Property</h2>
          <p>
            All content, features, technology, and intellectual property on the Platform are owned by Anthe Labs or its licensors. You agree that you do not acquire any rights by accessing or using the Services, except for the limited license to use the Services pursuant to these Terms.
          </p>
        </section>

        {/* 9. Third Party Integrations */}
        <section>
          <h2 className={`${palanquinDark.className} text-xl font-semibold text-white mb-4`}>9. Third Party Integrations</h2>
          <p>
            We may incorporate third-party tools or link to external services. We are not responsible for the policies, practices, or content of these services, and your use of them is at your own risk.
          </p>
        </section>

        {/* 10. Limitation of Liability */}
        <section>
          <h2 className={`${palanquinDark.className} text-xl font-semibold text-white mb-4`}>10. Limitation of Liability</h2>
          <div className="space-y-4">
            <p>
              To the maximum extent permitted by law, Anthe Labs and its officers, directors, employees, affiliates, and partners shall not be liable for damages arising out of or relating to the use of the Services, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-300">
              <li>Loss of profits, investments, or data.</li>
              <li>System interruptions or errors.</li>
              <li>Any direct or indirect damages related to trading or financial outcomes.</li>
            </ul>
            <p>
              Your sole remedy for disputing Services shall be termination of your access.
            </p>
          </div>
        </section>

        {/* 11. Termination and Suspension */}
        <section>
          <h2 className={`${palanquinDark.className} text-xl font-semibold text-white mb-4`}>11. Termination and Suspension</h2>
          <p>
            We may suspend or terminate your access at any time for breach of these Terms or for any reason that we deem appropriate, without prior notice. Upon termination, your right to use the Services will cease immediately.
          </p>
        </section>

        {/* 12. Governing Law and Dispute Resolution */}
        <section>
          <h2 className={`${palanquinDark.className} text-xl font-semibold text-white mb-4`}>12. Governing Law and Dispute Resolution</h2>
          <p>
            These Terms and any disputes arising from them are governed by the laws applicable to Anthe Labs' domicile jurisdiction. Any disputes shall be resolved through binding arbitration or in courts of competent jurisdiction, as specified in our conflict resolution policy.
          </p>
        </section>

        {/* 13. Privacy Policy */}
        <section>
          <h2 className={`${palanquinDark.className} text-xl font-semibold text-white mb-4`}>13. Privacy Policy</h2>
          <p>
            Your use of the Services is also governed by our Privacy Policy which explains how we collect, use, and protect your personal information.
          </p>
        </section>

        {/* 14. Contact Information */}
        <section>
          <h2 className={`${palanquinDark.className} text-xl font-semibold text-white mb-4`}>14. Contact Information</h2>
          <div className="space-y-2">
            <p>For questions about these Terms or to obtain support:</p>
            <p className="font-medium text-white">Anthe Labs</p>
            <p>
              Email:{" "}
              <a href="mailto:anthefinance@gmail.com" className="text-blue-400 hover:underline">
                anthefinance@gmail.com
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
