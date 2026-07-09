import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { SUPPORT_EMAIL } from "@/lib/support";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

// Starter Privacy Policy. Plain-English, not legal advice — have a professional
// review it before relying on it for a live business, and adjust to match how
// you actually handle data.
function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="July 7, 2026">
      <p>
        This Privacy Policy explains what information Etude collects, how we use it, and the choices
        you have. By using Etude, you agree to the practices described here.
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li>
          <strong>Account information</strong> — such as your email address and display name, provided
          when you sign up (including via Google sign-in).
        </li>
        <li>
          <strong>Content you create</strong> — the topics, notes, files, flashcards, quizzes, and
          study progress you add to the Service.
        </li>
        <li>
          <strong>Billing information</strong> — handled by our payment processor, Stripe. We do not
          store your full card number; Stripe provides us limited details such as your plan status and
          a customer identifier.
        </li>
        <li>
          <strong>Usage and device data</strong> — basic technical information (such as log data and
          error reports) needed to operate, secure, and improve the Service.
        </li>
      </ul>

      <h2>2. How we use your information</h2>
      <ul>
        <li>To provide and personalize the Service, including generating study materials.</li>
        <li>To process payments and manage your subscription.</li>
        <li>To secure the Service, prevent abuse, and enforce usage limits.</li>
        <li>To respond to your requests and send important account or service messages.</li>
        <li>To understand and improve how the Service performs.</li>
      </ul>

      <h2>3. AI processing</h2>
      <p>
        When you generate study materials, the relevant content you submit is sent to third-party AI
        providers to produce the output. We share only what is needed to fulfill your request. We do
        not sell your personal information.
      </p>

      <h2>4. Service providers we share with</h2>
      <p>
        We share information with vendors who help us run Etude, under agreements that limit their use
        of it, including:
      </p>
      <ul>
        <li><strong>Supabase</strong> — authentication, database, and file storage.</li>
        <li><strong>Stripe</strong> — subscription billing and payments.</li>
        <li><strong>AI providers</strong> (such as Groq, Google, OpenAI, or Anthropic) — to generate content.</li>
        <li><strong>Hosting and infrastructure</strong> — to serve the application.</li>
      </ul>

      <h2>5. Data retention</h2>
      <p>
        We keep your information for as long as your account is active or as needed to provide the
        Service. You can delete your content at any time, and you can ask us to delete your account.
        We may retain limited records where required for legal, security, or accounting reasons.
      </p>

      <h2>6. Your choices and rights</h2>
      <p>
        You can access and update much of your information directly in the app. Depending on where you
        live, you may have rights to access, correct, export, or delete your personal data, or to
        object to certain processing. To make a request, contact us using the details below.
      </p>

      <h2>7. Security</h2>
      <p>
        We use reasonable technical and organizational measures to protect your information, including
        encryption in transit and access controls. No system is perfectly secure, but we work to keep
        your data safe and to respond promptly to issues.
      </p>

      <h2>8. Children's privacy</h2>
      <p>
        Etude is not directed to children under 13, and we do not knowingly collect personal
        information from them. If you believe a child has provided us information, contact us and we
        will delete it.
      </p>

      <h2>9. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will update the "Last updated" date
        above and, for material changes, provide additional notice where appropriate.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions or requests about your privacy? Contact us at{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
