import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import OrderDetails from '../components/OrderDetails';
import api from '../services/api';

function OrderConfirmationPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get(`/orders/my/${id}`)
      .then(({ data }) => {
        if (active) {
          setOrder(data.data.order);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.message || 'Your order confirmation could not be loaded.');
        }
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (!order) {
    return <main className="orders-page" role="status">{error || 'Loading your confirmation...'}</main>;
  }

  return (
    <main className="orders-page order-confirmation">
      <p className="eyebrow">ORDER PLACED</p>
      <h1>Thank you for your order.</h1>
      <p className="order-confirmation-number">Order number <strong>{order.orderNumber}</strong></p>
      <p className="home-copy">Your payment method is Cash on Delivery.</p>
      <OrderDetails order={order} />
      <Link className="primary-button" to="/my-orders">View My Orders</Link>
    </main>
  );
}

export default OrderConfirmationPage;
