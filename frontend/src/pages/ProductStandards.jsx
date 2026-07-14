import { Link } from 'react-router-dom';

export default function ProductStandards() {
  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <h1 style={{ marginTop: '2rem' }}>Product Standards Policy</h1>
      <p className="muted">Applies to every seller and every listing on Prointeractive · Effective July 2026</p>

      <div className="panel">
        <p>
          Prointeractive exists so buyers can purchase with confidence from businesses they can
          actually talk to. That confidence depends on every listing meeting the same baseline:
          genuine, first-owner, premium-grade goods. The following standards apply to all products
          listed on the platform, across every category.
        </p>

        <h3>1. No pre-owned products</h3>
        <p>
          Every item listed must be new and must never have been previously owned or sold to
          another consumer. Products that have changed hands, even once, do not qualify for listing.
        </p>

        <h3>2. No second-hand items</h3>
        <p>
          Used, worn, refurbished, or resold goods are not permitted, regardless of their condition
          or how well they have been maintained. "Like new" is not the same as new, and is not eligible.
        </p>

        <h3>3. No second-tier products — premium only</h3>
        <p>
          Sellers may list only authentic, first-grade products. Counterfeit goods, imitation or
          replica items, and lower-tier or "grade B/C" alternatives are not permitted under any
          circumstances.
        </p>

        <h3>Enforcement</h3>
        <p>
          Listings that do not meet these standards may be removed without notice. Sellers with
          repeated violations may lose their verified-business badge, have their storefront closed,
          or have their account suspended. Buyers can report any listing that appears to break
          these standards using the "Report this listing" link on the product page. These standards
          exist to protect the trust every buyer places in the platform, and are applied
          consistently across all sellers.
        </p>

        <h3>Acceptance</h3>
        <p>
          By listing a product on Prointeractive, the seller confirms it meets the standards set
          out in this policy. This policy forms part of our{' '}
          <Link to="/terms">Terms &amp; Conditions</Link>.
        </p>
      </div>
    </div>
  );
}
