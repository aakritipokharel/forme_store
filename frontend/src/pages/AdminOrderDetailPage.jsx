import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import OrderDetails from '../components/OrderDetails';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const orderStatuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

function AdminOrderDetailPage() {
  const { id } = useParams();
  const notify = useToast();
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get(`/orders/${id}`)
      .then(({ data }) => {
        if (active) {
          setOrder(data.data.order);
          setStatus(data.data.order.status);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.message || 'Order details could not be loaded.');
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

  const updateStatus = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setMessage('');
    try {
      const { data } = await api.patch(`/orders/${id}/status`, { status });
      setOrder(data.data.order);
      setStatus(data.data.order.status);
      setMessage('Order status updated.');
      notify('success', 'Order status updated.');
    } catch (requestError) {
      const message = requestError.response?.data?.message || 'Order status could not be updated.';
      setError(message);
      notify('error', message);
      setStatus(order.status);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <main className="orders-page" role="status">Loading order...</main>;
  }
  if (!order) {
    return <main className="orders-page"><p className="cart-error" role="alert">{error}</p><Link to="/admin/orders">Back to orders</Link></main>;
  }

  return (
    <main className="orders-page">
      <Link className="cart-continue-link" to="/admin/orders">Back to all orders</Link>
      <p className="eyebrow">ADMIN ORDER DETAILS</p>
      <div className="order-detail-heading">
        <div><h1>{order.orderNumber}</h1><p>Placed {new Date(order.createdAt).toLocaleDateString()}</p></div>
        <span className={`order-status order-status-${order.status.toLowerCase()}`}>{order.status}</span>
      </div>
      {error && <p className="cart-error" role="alert">{error}</p>}
      {message && <p className="form-message success-message" role="status">{message}</p>}
      <section className="admin-customer-card">
        <h2>Customer</h2>
        <p>{order.user?.name || order.delivery.recipientName}</p>
        <p>{order.user?.email || order.delivery.email}</p>
        <p>{order.user?.phone || order.delivery.phone}</p>
      </section>
      <OrderDetails order={order} />
      <form className="admin-status-form" onSubmit={updateStatus}>
        <label htmlFor="order-status">Update order status</label>
        <select id="order-status" value={status} onChange={(event) => setStatus(event.target.value)}>
          {orderStatuses.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <button className="primary-button" type="submit" disabled={isSaving || status === order.status}>
          {isSaving ? 'Saving...' : 'Save status'}
        </button>
      </form>
    </main>
  );
}

export default AdminOrderDetailPage;
