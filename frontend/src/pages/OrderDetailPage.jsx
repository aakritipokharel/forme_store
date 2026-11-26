import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import OrderDetails from '../components/OrderDetails';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

function OrderDetailPage() {
  const { id } = useParams();
  const notify = useToast();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState('');

  const loadOrder = () => api.get(`/orders/my/${id}`).then(({ data }) => setOrder(data.data.order));

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
          setError(requestError.response?.data?.message || 'This order could not be loaded.');
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
  }, [id]);

  const cancelOrder = async () => {
    setIsCancelling(true);
    setError('');
    try {
      const { data } = await api.post(`/orders/my/${id}/cancel`);
      setOrder(data.data.order);
      setConfirmCancel(false);
      notify('success', 'Order cancelled successfully.');
    } catch (requestError) {
      let message = requestError.response?.data?.message || 'The order could not be cancelled.';
      try {
        await loadOrder();
      } catch (loadError) {
        message = `${message} ${loadError.response?.data?.message || 'Order details could not be refreshed.'}`;
      }
      setError(message);
      notify('error', message);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return <main className="orders-page" role="status">Loading order...</main>;
  }
  if (!order) {
    return <main className="orders-page"><p className="cart-error" role="alert">{error}</p><Link to="/my-orders">Back to My Orders</Link></main>;
  }

  return (
    <main className="orders-page">
      <p className="eyebrow">ORDER DETAILS</p>
      <div className="order-detail-heading">
        <div><h1>{order.orderNumber}</h1><p>Placed {new Date(order.createdAt).toLocaleDateString()}</p></div>
        <span className={`order-status order-status-${order.status.toLowerCase()}`}>{order.status}</span>
      </div>
      {error && <p className="cart-error" role="alert">{error}</p>}
      <OrderDetails order={order} />
      {order.status === 'Pending' && (
        <div className="order-cancel">
          {confirmCancel ? (
            <div role="group" aria-label="Confirm order cancellation">
              <p>Cancel this pending order? The reserved stock will be restored.</p>
              <button className="primary-button" type="button" onClick={cancelOrder} disabled={isCancelling}>
                {isCancelling ? 'Cancelling...' : 'Confirm cancellation'}
              </button>
              <button className="text-button" type="button" onClick={() => setConfirmCancel(false)} disabled={isCancelling}>Keep order</button>
            </div>
          ) : (
            <button className="text-button" type="button" onClick={() => setConfirmCancel(true)}>Cancel pending order</button>
          )}
        </div>
      )}
      <Link className="secondary-link" to="/my-orders">Back to My Orders</Link>
    </main>
  );
}

export default OrderDetailPage;
