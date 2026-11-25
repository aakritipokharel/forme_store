import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { formatNpr } from '../utils/currency';

function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/orders/my')
      .then(({ data }) => {
        if (active) {
          setOrders(data.data.orders);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.message || 'Your orders could not be loaded.');
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="orders-page">
      <div className="cart-heading">
        <div><p className="eyebrow">YOUR FORME EDIT</p><h1>My orders</h1></div>
      </div>
      {isLoading && <p role="status">Loading your orders...</p>}
      {error && <p className="cart-error" role="alert">{error}</p>}
      {!isLoading && !error && !orders.length && (
        <div className="orders-empty">
          <p>You have not placed an order yet.</p>
          <Link className="primary-button" to="/shop">Explore the collection</Link>
        </div>
      )}
      <div className="orders-list">
        {orders.map((order) => (
          <article className="order-list-card" key={order._id}>
            <div className="order-list-heading">
              <div><span>Order number</span><strong>{order.orderNumber}</strong></div>
              <span className={`order-status order-status-${order.status.toLowerCase()}`}>{order.status}</span>
            </div>
            <div className="order-list-meta">
              <span>{new Date(order.createdAt).toLocaleDateString()}</span>
              <span>Cash on Delivery</span>
              <strong>{formatNpr(order.total)}</strong>
            </div>
            <Link className="secondary-link" to={`/my-orders/${order._id}`}>View order details</Link>
          </article>
        ))}
      </div>
    </main>
  );
}

export default MyOrdersPage;
