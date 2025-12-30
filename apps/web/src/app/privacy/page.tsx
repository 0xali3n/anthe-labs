
import { Palanquin_Dark } from "next/font/google";

const palanquinDark = Palanquin_Dark({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 lg:pt-32 pb-8 sm:pb-12">
      {/* Header */}
      <h1 className={`${palanquinDark.className} text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4`}>
        Anthe Labs - Privacy Policy
      </h1>
      <p className="text-sm sm:text-base text-slate-400 mb-8 sm:mb-12">Last Updated: 28/12/2025</p>

      <div className="space-y-6 sm:space-y-8 lg:space-y-10 text-sm sm:text-base text-slate-300 leading-relaxed">
        {/* 1. Introduction */}
        <section>
          <h2 className={`${palanquinDark.className} text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4`}>1. Introduction</h2>
          <div className="space-y-4">
            <p>
              Welcome to Anthe Labs ("we", "us", "our"). This Privacy Policy ("Policy") explains how we collect, use, store, and protect your personal information when you use our website, mobile applications, platform, services, and related tools (collectively, the "Services").
            </p>
            <p>
              We are committed to protecting your privacy and ensuring transparency about our data practices. By using our Services, you agree to the collection and use of information in accordance with this Policy. If you do not agree with our policies and practices, please do not use our Services.
            </p>
          </div>
        </section>

        {/* 2. Information We Collect */}
        <section>
          <h2 className={`${palanquinDark.className} text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4`}>2. Information We Collect</h2>
          <div className="space-y-4">
            <p>We collect information that you provide directly to us and information that is automatically collected when you use our Services:</p>
            
            <div className="space-y-3">
              <h3 className={`${palanquinDark.className} text-base sm:text-lg font-semibold text-white mt-3 sm:mt-4 mb-2`}>2.1 Information You Provide</h3>
              <ul className="list-disc pl-6 space-y-2 text-slate-300">
                <li>Account registration information (username, display name, bio)</li>
                <li>Wallet addresses and blockchain transaction data</li>
                <li>Feedback and support communications</li>
                <li>Social media connections (Twitter username, if connected)</li>
              </ul>

              <h3 className={`${palanquinDark.className} text-base sm:text-lg font-semibold text-white mt-3 sm:mt-4 mb-2`}>2.2 Automatically Collected Information</h3>
              <ul className="list-disc pl-6 space-y-2 text-slate-300">
                <li>Usage data and analytics (pages visited, features used, session duration)</li>
                <li>Device information (browser type, operating system, IP address)</li>
                <li>Cookies and similar tracking technologies</li>
                <li>Trading activity and performance metrics</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 3. Data Accessed - Google User Data */}
        <section>
          <h2 className={`${palanquinDark.className} text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4`}>3. Data Accessed - Google User Data</h2>
          <div className="space-y-4">
            <p>
              When you choose to sign in with Google OAuth, we access the following types of Google user data through Google's OAuth 2.0 authentication service:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-300">
              <li>
                <span className="font-medium text-white">Email Address:</span> Your Google account email address, which we use for account identification and communication.
              </li>
              <li>
                <span className="font-medium text-white">Full Name:</span> Your Google account display name, which we use to populate your profile information.
              </li>
              <li>
                <span className="font-medium text-white">Profile Photo:</span> Your Google account profile picture (avatar URL), which we use to display your profile image on the platform.
              </li>
              <li>
                <span className="font-medium text-white">Google ID:</span> A unique identifier associated with your Google account, which we use to link your Google account to your Anthe Labs account for authentication purposes.
              </li>
            </ul>
            <p className="mt-4">
              We only access this Google user data with your explicit consent when you choose to sign in with Google. You can revoke this access at any time through your Google account settings or by disconnecting your Google account from our Services.
            </p>
          </div>
        </section>

        {/* 4. Data Usage - How We Use Your Information */}
        <section>
          <h2 className={`${palanquinDark.className} text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4`}>4. Data Usage - How We Use Your Information</h2>
          <div className="space-y-4">
            <p>We use the information we collect, including Google user data, for the following purposes:</p>
            
            <div className="space-y-3">
              <h3 className={`${palanquinDark.className} text-base sm:text-lg font-semibold text-white mt-3 sm:mt-4 mb-2`}>4.1 Google User Data Usage</h3>
              <ul className="list-disc pl-6 space-y-2 text-slate-300">
                <li>
                  <span className="font-medium text-white">Authentication and Account Management:</span> We use your Google email address and Google ID to create and manage your account, authenticate your identity, and enable secure sign-in to our Services.
                </li>
                <li>
                  <span className="font-medium text-white">Profile Display:</span> We use your Google full name and profile photo to populate and display your user profile on our platform, making it easier for you to identify your account and for other users to recognize you.
                </li>
                <li>
                  <span className="font-medium text-white">Service Functionality:</span> We use your Google account information to provide personalized features, maintain your account preferences, and ensure a seamless user experience across our Services.
                </li>
                <li>
                  <span className="font-medium text-white">Communication:</span> We use your email address to send you important account notifications, security alerts, and service updates related to your use of our platform.
                </li>
              </ul>

              <h3 className={`${palanquinDark.className} text-base sm:text-lg font-semibold text-white mt-3 sm:mt-4 mb-2`}>4.2 General Data Usage</h3>
              <ul className="list-disc pl-6 space-y-2 text-slate-300">
                <li>To provide, maintain, and improve our Services</li>
                <li>To process transactions and manage trading activities</li>
                <li>To enable copy trading features and social interactions</li>
                <li>To analyze usage patterns and optimize user experience</li>
                <li>To detect, prevent, and address technical issues and security threats</li>
                <li>To comply with legal obligations and enforce our Terms of Service</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 5. Data Storage and Security */}
        <section>
          <h2 className={`${palanquinDark.className} text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4`}>5. Data Storage and Security</h2>
          <div className="space-y-4">
            <p>
              We implement industry-standard security measures to protect your personal information, including Google user data:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-300">
              <li>Encrypted data transmission using SSL/TLS protocols</li>
              <li>Secure database storage with access controls</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Limited access to personal data on a need-to-know basis</li>
              <li>Secure authentication mechanisms</li>
            </ul>
            <p>
              Your Google user data (email, name, profile photo, Google ID) is stored securely in our database and is only accessible to authorized personnel who require it to provide our Services. We do not store your Google account password, as authentication is handled through Google's OAuth service.
            </p>
            <p>
              While we strive to protect your information, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security but are committed to maintaining the highest standards of data protection.
            </p>
          </div>
        </section>

        {/* 6. Data Sharing and Disclosure */}
        <section>
          <h2 className={`${palanquinDark.className} text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4`}>6. Data Sharing and Disclosure</h2>
          <div className="space-y-4">
            <p>We do not sell, trade, or rent your personal information, including Google user data, to third parties. We may share your information only in the following circumstances:</p>
            <ul className="list-disc pl-6 space-y-2 text-slate-300">
              <li>
                <span className="font-medium text-white">Service Providers:</span> We may share data with trusted third-party service providers who assist us in operating our Services (e.g., cloud hosting, analytics, payment processing), subject to strict confidentiality agreements.
              </li>
              <li>
                <span className="font-medium text-white">Legal Requirements:</span> We may disclose information if required by law, court order, or government regulation, or to protect our rights, property, or safety, or that of our users.
              </li>
              <li>
                <span className="font-medium text-white">Business Transfers:</span> In the event of a merger, acquisition, or sale of assets, user information may be transferred as part of the transaction, with notice to affected users.
              </li>
              <li>
                <span className="font-medium text-white">Public Profile Information:</span> Certain information (username, display name, profile photo, trading statistics) may be publicly visible on our platform as part of the social trading features.
              </li>
            </ul>
            <p>
              We do not share your Google user data with third parties except as necessary to provide our Services or as required by law. We never share your Google account credentials or use your Google data for advertising purposes without your explicit consent.
            </p>
          </div>
        </section>

        {/* 7. Cookies and Tracking Technologies */}
        <section>
          <h2 className={`${palanquinDark.className} text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4`}>7. Cookies and Tracking Technologies</h2>
          <div className="space-y-4">
            <p>
              We use cookies, web beacons, and similar tracking technologies to collect and store information about your use of our Services. These technologies help us:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-300">
              <li>Maintain your session and authentication state</li>
              <li>Remember your preferences and settings</li>
              <li>Analyze usage patterns and improve our Services</li>
              <li>Provide personalized content and features</li>
            </ul>
            <p>
              We use third-party analytics services (such as Google Analytics) that may use cookies to collect information about your use of our Services. You can control cookie preferences through your browser settings, though this may affect certain functionality of our Services.
            </p>
          </div>
        </section>

        {/* 8. Your Rights and Choices */}
        <section>
          <h2 className={`${palanquinDark.className} text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4`}>8. Your Rights and Choices</h2>
          <div className="space-y-4">
            <p>You have the following rights regarding your personal information, including Google user data:</p>
            <ul className="list-disc pl-6 space-y-2 text-slate-300">
              <li>
                <span className="font-medium text-white">Access:</span> You can request access to the personal information we hold about you.
              </li>
              <li>
                <span className="font-medium text-white">Correction:</span> You can update or correct your account information through your account settings.
              </li>
              <li>
                <span className="font-medium text-white">Deletion:</span> You can request deletion of your account and associated data, subject to legal and operational requirements.
              </li>
              <li>
                <span className="font-medium text-white">Revoke Google Access:</span> You can disconnect your Google account from our Services at any time through your account settings or Google account permissions.
              </li>
              <li>
                <span className="font-medium text-white">Opt-Out:</span> You can opt out of certain communications and data collection practices where applicable.
              </li>
            </ul>
            <p>
              To exercise these rights, please contact us at{" "}
              <a href="mailto:anthefinance@gmail.com" className="text-blue-400 hover:underline">
                anthefinance@gmail.com
              </a>
              .
            </p>
          </div>
        </section>

        {/* 9. Children's Privacy */}
        <section>
          <h2 className={`${palanquinDark.className} text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4`}>9. Children's Privacy</h2>
          <p>
            Our Services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected information from a child under 18, we will take steps to delete such information promptly.
          </p>
        </section>

        {/* 10. International Data Transfers */}
        <section>
          <h2 className={`${palanquinDark.className} text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4`}>10. International Data Transfers</h2>
          <p>
            Your information, including Google user data, may be transferred to and stored in servers located outside your country of residence. By using our Services, you consent to the transfer of your information to facilities that may be located in different jurisdictions. We ensure that appropriate safeguards are in place to protect your data in accordance with this Policy.
          </p>
        </section>

        {/* 11. Data Retention */}
        <section>
          <h2 className={`${palanquinDark.className} text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4`}>11. Data Retention</h2>
          <p>
            We retain your personal information, including Google user data, for as long as necessary to provide our Services, comply with legal obligations, resolve disputes, and enforce our agreements. When you delete your account, we will delete or anonymize your personal information, except where we are required to retain it for legal or operational purposes.
          </p>
        </section>

        {/* 12. Policy Updates */}
        <section>
          <h2 className={`${palanquinDark.className} text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4`}>12. Policy Updates</h2>
          <p>
            We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of any material changes by posting the updated Policy on this page and updating the "Last Updated" date. Your continued use of our Services after such changes constitutes acceptance of the updated Policy.
          </p>
        </section>

        {/* 13. Third-Party Services */}
        <section>
          <h2 className={`${palanquinDark.className} text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4`}>13. Third-Party Services</h2>
          <p>
            Our Services may contain links to or integrate with third-party services, including Google OAuth. This Privacy Policy does not apply to third-party services. We encourage you to review the privacy policies of any third-party services you access through our platform, including Google's Privacy Policy, to understand how they collect, use, and share your information.
          </p>
        </section>

        {/* 14. Contact Information */}
        <section>
          <h2 className={`${palanquinDark.className} text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4`}>14. Contact Information</h2>
          <div className="space-y-2">
            <p>If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
            <p className="font-medium text-white">Anthe Labs</p>
            <p>
              Email:{" "}
              <a href="mailto:anthefinance@gmail.com" className="text-blue-400 hover:underline">
                anthefinance@gmail.com
              </a>
            </p>
            <p className="mt-4">
              For questions specifically about Google user data access and usage, or to revoke Google account access, please contact us at the email above or manage your Google account permissions through your Google account settings.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

