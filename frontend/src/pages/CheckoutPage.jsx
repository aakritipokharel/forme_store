import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProductImage from '../components/ProductImage';
import { useAuth } from '../context/useAuth';
import { useCart } from '../context/useCart';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { formatNpr } from '../utils/currency';

const initialDelivery = {
  recipientName: '',
  phone: '',
  province: '',
  district: '',
  municipality: '',
  wardNumber: '',
  streetAddress: '',
  instructions: '',
};

function getIdempotencyKey() {
  const storageKey = 'formeCheckoutRequestKey';
  let key = window.sessionStorage.getItem(storageKey);
  if (!key) {
    key = window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(storageKey, key);
  }
  return key;
}

function CheckoutPage() {
  const { user } = useAuth();
  const notify = useToast();
  const { items, subtotal, isLoading: isCartLoading, clearAfterCheckout } = useCart();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState({
    ...initialDelivery,
    recipientName: user?.name || '',
    phone: user?.phone || '',
  });
  const [deliveryFee, setDeliveryFee] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    api.get('/orders/checkout-info')
      .then(({ data }) => {
        if (active) {
          setError('');
          setDeliveryFee(data.data.deliveryFee);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.message || 'Checkout information could not be loaded.');
        }
      });
    return () => {
      active = false;
    };
  }, [retry]);

  const updateDelivery = (event) => {
    const { name, value } = event.target;
    setDelivery((current) => ({ ...current, [name]: value }));
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const { data } = await api.post(
        '/orders',
        { delivery: { ...delivery, wardNumber: Number(delivery.wardNumber) } },
        { headers: { 'Idempotency-Key': getIdempotencyKey() } },
      );
      window.sessionStorage.removeItem('formeCheckoutRequestKey');
      clearAfterCheckout();
      notify('success', 'Your order has been placed successfully!');
      navigate(`/order-confirmation/${data.data.order._id}`, {
        replace: true,
        state: { order: data.data.order },
      });
    } catch (requestError) {
      const message = requestError.response?.data?.message || requestError.message || 'Your order could not be placed.';
      setError(message);
      notify('error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCartLoading) {
    return <main className="checkout-page" role="status">Loading your checkout...</main>;
  }

  if (!items.length) {
    return (
      <main className="checkout-page checkout-empty">
        <p className="eyebrow">CHECKOUT</p>
        <h1>Your bag is empty.</h1>
        <Link className="primary-button" to="/shop">Continue shopping</Link>
      </main>
    );
  }

  const estimatedTotal = deliveryFee === null ? null : subtotal + deliveryFee;

  return (
    <main className="checkout-page">
      <div className="cart-heading">
        <div>
          <p className="eyebrow">FORME CHECKOUT</p>
          <h1>Delivery details</h1>
        </div>
        <Link className="cart-continue-link" to="/cart">Return to bag</Link>
      </div>

      {error && (
        <div className="cart-error" role="alert">
          <p>{error}</p>
          {deliveryFee === null && (
            <button className="text-button" type="button" onClick={() => setRetry((value) => value + 1)}>
              Try again
            </button>
          )}
        </div>
      )}

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={submitOrder}>
          <section className="checkout-section">
            <h2>Where should we deliver?</h2>
            <div className="checkout-fields">
              <label>
                Full name
                <input name="recipientName" autoComplete="name" maxLength="100" required value={delivery.recipientName} onChange={updateDelivery} />
              </label>
              <label>
                Phone number
                <input name="phone" type="tel" autoComplete="tel" maxLength="30" required value={delivery.phone} onChange={updateDelivery} />
              </label>
              <label>
                Email address
                <input type="email" autoComplete="email" value={user?.email || ''} readOnly aria-describedby="checkout-email-note" />
                <span id="checkout-email-note">From your FORME account</span>
              </label>
              <label>
                Province
                <input name="province" autoComplete="address-level1" maxLength="100" required value={delivery.province} onChange={updateDelivery} />
              </label>
              <label>
                District
                <input name="district" autoComplete="address-level2" maxLength="100" required value={delivery.district} onChange={updateDelivery} />
              </label>
              <label>
                Municipality or city
                <input name="municipality" autoComplete="address-level3" maxLength="100" required value={delivery.municipality} onChange={updateDelivery} />
              </label>
              <label>
                Ward number
                <input name="wardNumber" type="number" min="1" step="1" required value={delivery.wardNumber} onChange={updateDelivery} />
              </label>
              <label className="checkout-field-wide">
                Street address
                <input name="streetAddress" autoComplete="street-address" maxLength="300" required value={delivery.streetAddress} onChange={updateDelivery} />
              </label>
              <label className="checkout-field-wide">
                Additional delivery instructions <span>(optional)</span>
                <textarea name="instructions" rows="3" maxLength="500" value={delivery.instructions} onChange={updateDelivery} />
              </label>
            </div>
          </section>

          <section className="checkout-section">
            <h2>Payment method</h2>
            <div className="cod-choice">
              <span className="cod-radio" aria-hidden="true" />
              <div><strong>Cash on Delivery</strong><p>Pay when your order arrives.</p></div>
            </div>
          </section>

          <button className="primary-button checkout-submit" type="submit" disabled={isSubmitting || deliveryFee === null}>
            {isSubmitting ? 'Placing your order...' : 'Place order'}
          </button>
        </form>

        <aside className="checkout-summary" aria-labelledby="checkout-summary-title">
          <h2 id="checkout-summary-title">Your order</h2>
          <div className="checkout-product-list">
            {items.map((item) => (
              <article className="checkout-product" key={JSON.stringify([item.product?._id, item.size, item.color])}>
                <div className="checkout-product-image">
                  <ProductImage src={item.product?.image} alt={item.product?.name || 'Product'} />
                  <span>{item.quantity}</span>
                </div>
                <div>
                  <h3>{item.product?.name || 'Unavailable product'}</h3>
                  <p>{item.size || 'One size'} · {item.color || 'Default'}</p>
                </div>
                <strong>{formatNpr((item.product?.price || 0) * item.quantity)}</strong>
              </article>
            ))}
          </div>
          <div className="checkout-price-row"><span>Subtotal</span><strong>{formatNpr(subtotal)}</strong></div>
          <div className="checkout-price-row"><span>Delivery</span><strong>{deliveryFee === null ? 'Loading...' : formatNpr(deliveryFee)}</strong></div>
          <div className="checkout-price-row checkout-final-total"><span>Total</span><strong>{estimatedTotal === null ? '—' : formatNpr(estimatedTotal)}</strong></div>
          <p className="checkout-summary-note">Final prices and stock are verified when you place your order.</p>
        </aside>
      </div>
    </main>
  );
}

export default CheckoutPage;
