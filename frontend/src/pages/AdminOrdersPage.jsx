import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { formatNpr } from '../utils/currency';

function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/orders')
      .then(({ data }) => {
        if (active) {
          setOrders(data.data.orders);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.message || 'Orders could not be loaded.');
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

  const filteredOrders = orders.filter((order) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [
      order.orderNumber,
      order.delivery?.recipientName,
      order.delivery?.email,
      order.user?.name,
    ].some((value) => value?.toLowerCase().includes(query));
    return matchesSearch && (!statusFilter || order.status === statusFilter);
  });

  return (
    <main className="orders-page">
      <p className="eyebrow">ADMINISTRATION</p>
      <h1>Order management</h1>
      {isLoading && <p role="status">Loading orders...</p>}
      {error && <p className="cart-error" role="alert">{error}</p>}
      {!isLoading && !error && orders.length > 0 && (
        <div className="admin-filter-form">
          <label>Search orders<input value={search} maxLength="100" onChange={(event) => setSearch(event.target.value)} placeholder="Order number or customer" /></label>
          <label>Filter by status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option>
              {['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
        </div>
      )}
      {!isLoading && !error && !orders.length && <p>No orders have been placed yet.</p>}
      {!isLoading && !error && orders.length > 0 && !filteredOrders.length && <p className="admin-empty">No orders match these filters.</p>}
      <div className="orders-list">
        {filteredOrders.map((order) => (
          <article className="order-list-card" key={order._id}>
            <div className="order-list-heading">
              <div><span>Order number</span><strong>{order.orderNumber}</strong></div>
              <span className={`order-status order-status-${order.status.toLowerCase()}`}>{order.status}</span>
            </div>
            <div className="order-list-meta">
              <span>{order.user?.name || 'Customer'}</span>
              <span>{new Date(order.createdAt).toLocaleDateString()}</span>
              <strong>{formatNpr(order.total)}</strong>
            </div>
            <Link className="secondary-link" to={`/admin/orders/${order._id}`}>View order and delivery details</Link>
          </article>
        ))}
      </div>
    </main>
  );
}

export default AdminOrdersPage;
