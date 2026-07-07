import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

// Starter Terms of Service. Reviewed-for-plain-English, not legal advice —
// have a professional review before relying on it for a live business.
function TermsPage() {
  return (
    <LegalPage title="Terms of Service" lastUpdated="July 7, 2026">
      <p>
        Welcome to Etude. These Terms of Service ("Terms") govern your access to and use of the
        Etude website, apps, and services (the "Service"). By creating an account or using the
        Service, you agree to these Terms. If you do not agree, please do not use the Service.
      </p>

      <h2>1. Who can use Etude</h2>
      <p>
        You must be at least 13 years old to use Etude. If you are under the age of majority where
        you live, you may only use the Service with the involvement of a parent or guardian. By using
        the Service you confirm you can form a binding contract with us.
      </p>

      <h2>2. Your account</h2>
      <p>
        You are responsible for the activity on your account and for keeping your login credentials
        secure. Tell us right away if you believe your account has been accessed without your
        permission. You are responsible for the accuracy of the information you provide.
      </p>

      <h2>3. Your content</h2>
      <p>
        You keep ownership of the notes, topics, files, and other materials you upload or create
        ("Your Content"). You grant Etude a limited license to store, process, and display Your
        Content solely to operate and improve the Service for you — for example, sending it to our AI
        providers to generate flashcards, quizzes, and study guides. You are responsible for having
        the rights to any content you upload, and for not uploading anything unlawful, infringing, or
        harmful.
      </p>

      <h2>4. AI-generated content</h2>
      <p>
        Etude uses artificial intelligence to generate study materials. AI can make mistakes and may
        produce information that is inaccurate, incomplete, or out of date. You should independently
        verify anything important. Etude is a study aid and is not a substitute for professional,
        medical, legal, or academic advice.
      </p>

      <h2>5. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Break the law or infringe anyone's rights while using the Service.</li>
        <li>Reverse engineer, scrape, overload, or attempt to disrupt or gain unauthorized access to the Service.</li>
        <li>Abuse, automate, or resell AI generations, or otherwise attempt to circumvent usage limits or the paywall.</li>
        <li>Upload malware or content that is harassing, hateful, or sexually exploitative of minors.</li>
      </ul>

      <h2>6. Plans, billing, and free limits</h2>
      <p>
        Etude offers a free plan with usage limits and a paid Premium plan. Paid subscriptions are
        billed through our payment processor, Stripe, on a recurring basis until cancelled. Prices,
        limits, and features may change; we will give reasonable notice of material changes. Except
        where required by law, payments are non-refundable. You can cancel anytime from your billing
        settings; access continues until the end of the current billing period.
      </p>

      <h2>7. Cancellation and termination</h2>
      <p>
        You may stop using the Service and delete your account at any time. We may suspend or
        terminate access if you violate these Terms or use the Service in a way that could cause harm
        or legal exposure to us or others.
      </p>

      <h2>8. Disclaimers</h2>
      <p>
        The Service is provided "as is" and "as available," without warranties of any kind, whether
        express or implied, to the fullest extent permitted by law. We do not warrant that the
        Service will be uninterrupted, error-free, or that generated content will be accurate.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Etude and its operators will not be liable for any
        indirect, incidental, special, consequential, or punitive damages, or for any loss of data,
        profits, or goodwill arising from your use of the Service. Our total liability for any claim
        will not exceed the amount you paid us in the 12 months before the claim.
      </p>

      <h2>10. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. If we make material changes, we will update the
        "Last updated" date and, where appropriate, notify you. Continuing to use the Service after
        changes take effect means you accept the updated Terms.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about these Terms? Contact us at <a href="mailto:hello@lumo.study">hello@lumo.study</a>.
      </p>
    </LegalPage>
  );
}
