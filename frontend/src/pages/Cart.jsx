import { Link } from 'react-router-dom';
import { money } from '../api.js';
import { useCart } from '../context/CartContext.jsx';

export default function Cart() {
  const { items, setQty, remove, total, groups } = useCart();
  const groupList = Object.values(groups);

  if (items.length === 0) {
    return (
      <div className="container">
        <div className="empty" style={{ marginTop: '3rem' }}>
          <h3>Your cart is empty</h3>
          <p><Link to="/">Browse the shop</Link> to add something.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 style={{ marginTop: '2rem' }}>Cart</h1>
      {groupList.length > 1 && (
        <p className="muted">
          Your cart has items from {groupList.length} businesses — checkout will place one order per business.
        </p>
      )}
      {groupList.map((g) => (
        <div className="panel" key={g.businessId}>
          <h3>{g.businessName}</h3>
          {g.items.map(({ product, quantity }) => (
            <div className="row spread" key={product._id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--line)' }}>
              <Link to={`/products/${product._id}`}>{product.name}</Link>
              <div className="row">
                <input
                  type="number" min={0} value={quantity} style={{ width: 70 }}
                  aria-label={`Quantity of ${product.name}`}
                  onChange={(e) => setQty(product._id, Number(e.target.value))}
                />
                <span className="price">{money(product.price * quantity, product.currency)}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => remove(product._id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      ))}
      <div className="panel row spread">
        <h2 style={{ margin: 0 }}>Total: <span className="price">{money(total)}</span></h2>
        <Link to="/checkout" className="btn btn-red">Continue to checkout</Link>
      </div>
    </div>
  );
}
