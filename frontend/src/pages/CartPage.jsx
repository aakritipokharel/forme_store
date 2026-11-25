import { useState } from 'react';
import { Link } from 'react-router-dom';
import ProductImage from '../components/ProductImage';
import { useCart } from '../context/useCart';
import { formatNpr } from '../utils/currency';

function CartPage() {
  const {
    items,
    subtotal,
    shippingFee,
    total,
    isLoading,
    isSaving,
    error,
    retryLoading,
    getItemKey,
    setQuantity,
    removeItem,
  } = useCart();
  const [actionError, setActionError] = useState('');

  const runAction = async (action) => {
    setActionError('');
    try {
      await action();
    } catch (requestError) {
      setActionError(requestError.message);
    }
  };

  if (isLoading) {
    return <main className="cart-page" role="status">Loading your cart...</main>;
  }

  if (!items.length && !error) {
    return (
      <main className="cart-page cart-empty">
        <div className="empty-cart-icon" aria-hidden="true">
          <svg viewBox="0 0 64 64" fill="none">
            <path d="M12 22h40l-4 34H16l-4-34Z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M23 25v-7a9 9 0 0 1 18 0v7" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
        <p className="eyebrow">YOUR FORME EDIT</p>
        <h1>Your bag is taking a moment.</h1>
        <p>Discover considered pieces for every day.</p>
        <Link className="primary-button" to="/shop">Continue shopping</Link>
      </main>
    );
  }

  return (
    <main className="cart-page">
      <div className="cart-heading">
        <div>
          <p className="eyebrow">YOUR FORME EDIT</p>
          <h1>Your bag</h1>
        </div>
        <p>{items.reduce((count, item) => count + item.quantity, 0)} items</p>
      </div>

      {error && (
        <div className="cart-error" role="alert">
          <p>{error}</p>
          <button className="text-button" type="button" onClick={retryLoading}>Try again</button>
        </div>
      )}
      {actionError && <p className="cart-error" role="alert">{actionError}</p>}

      <div className="cart-layout">
        <section className="cart-items" aria-label="Items in your bag">
          {items.map((item) => {
            const product = item.product;
            const key = getItemKey(item);
            const productId = product?._id;
            const stock = product?.stock ?? 0;
            const unavailable = !product || !product.active || stock < 1;
            const overStock = item.quantity > stock;

            return (
              <article className="cart-item" key={key}>
                <Link
                  className="cart-item-image"
                  to={productId ? `/products/${productId}` : '/shop'}
                  aria-label={product ? `View ${product.name}` : 'Browse products'}
                >
                  <ProductImage src={product?.image} alt={product?.name || 'Unavailable product'} />
                </Link>
                <div className="cart-item-details">
                  <div className="cart-item-title">
                    <div>
                      <p className="product-category">{product?.category || 'FORME COLLECTION'}</p>
                      <h2>{product?.name || 'Unavailable piece'}</h2>
                    </div>
                    <button
                      className="remove-item"
                      type="button"
                      onClick={() => runAction(() => removeItem(key))}
                      disabled={isSaving}
                      aria-label={`Remove ${product?.name || 'unavailable piece'} from your cart`}
                    >
                      Remove
                    </button>
                  </div>
                  <p className="cart-item-options">
                    {item.size && <span>Size: {item.size}</span>}
                    {item.color && <span>Color: {item.color}</span>}
                    {!item.size && !item.color && <span>One size</span>}
                  </p>
                  {unavailable || overStock ? (
                    <p className="cart-stock-warning" role="status">
                      {!product
                        ? 'This product is no longer available. Remove it to continue.'
                        : unavailable
                          ? 'This product is currently unavailable. Remove it to continue.'
                          : `Only ${stock} currently available. Reduce the quantity to continue.`}
                    </p>
                  ) : null}
                  <div className="cart-item-bottom">
                    <div className="quantity-control" aria-label={`Quantity for ${product?.name || 'unavailable piece'}`}>
                      <button
                        type="button"
                        onClick={() => runAction(() => setQuantity(key, item.quantity - 1))}
                        disabled={isSaving || item.quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span aria-live="polite">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => runAction(() => setQuantity(key, item.quantity + 1))}
                        disabled={isSaving || unavailable || item.quantity >= stock}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <div className="cart-item-price">
                      <span>{product ? formatNpr(product.price) : 'Price unavailable'} each</span>
                      <strong>{product ? formatNpr(product.price * item.quantity) : '—'}</strong>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <aside className="cart-summary" aria-labelledby="summary-title">
          <h2 id="summary-title">Order summary</h2>
          <div><span>Subtotal</span><strong>{formatNpr(subtotal)}</strong></div>
          <div><span>Shipping</span><strong>{formatNpr(shippingFee)}</strong></div>
          <p className="cart-summary-note">Total is calculated as subtotal + shipping. Taxes and discounts are not included.</p>
          <div className="cart-total"><span>Total</span><strong>{formatNpr(total)}</strong></div>
          <Link className="primary-button cart-checkout-button" to="/checkout">
            Continue to checkout
          </Link>
          <Link className="cart-continue-link" to="/shop">Continue shopping</Link>
        </aside>
      </div>
    </main>
  );
}

export default CartPage;
