export default function Privacy() {
  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <h1 style={{ marginTop: '2rem' }}>Privacy Policy</h1>
      <p className="muted">Last updated: July 2026</p>

      <div className="panel">
        <h3>What we collect</h3>
        <p>
          Account details (name, email), business profile information for Sellers, order and delivery
          details, messages sent through the platform, and technical data needed to operate the service.
        </p>

        <h3>Payments</h3>
        <p>
          Online payments are processed by Flutterwave. We never see or store your card number or mobile
          money PIN; we receive only payment confirmations and references needed to fulfil your order.
        </p>

        <h3>How we use data</h3>
        <p>
          To operate the marketplace: processing orders, enabling Buyer–Seller communication, sending
          transactional emails (order confirmations, status updates, password resets), preventing fraud,
          and improving the service. We do not sell personal data.
        </p>

        <h3>Sharing</h3>
        <p>
          Order details are shared between the Buyer and Seller involved in a transaction. Service providers
          we rely on (payment processing, email delivery, image storage, hosting) process data on our behalf.
          We may disclose information where required by law.
        </p>

        <h3>Retention &amp; your rights</h3>
        <p>
          We keep transaction records as required for legal and accounting purposes. You can delete your
          account and personal data at any time on our <a href="/account-deletion">account deletion page</a>{' '}
          or from the mobile app (Account → Delete account); some records must be retained by law.
        </p>

        <h3>Contact</h3>
        <p>
          FugiPay Technology Limited, Lusaka, Zambia — <a href="mailto:hello@fugipay.com">hello@fugipay.com</a>
        </p>
      </div>
    </div>
  );
}
