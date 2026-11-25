import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import { formatNpr } from '../utils/currency';

function AdminCustomerDetailPage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([api.get(`/admin/users/${id}`), api.get(`/admin/users/${id}/orders`)])
      .then(([customerResponse, orderResponse]) => {
        if (active) {
          setCustomer(customerResponse.data.data.customer);
          setOrders(orderResponse.data.data.orders);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Customer details could not be loaded.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (isLoading) return <p className="admin-state" role="status">Loading customer...</p>;
  if (!customer) return <p className="admin-alert" role="alert">{error || 'Customer not found.'}</p>;

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div><p className="eyebrow">CUSTOMER CARE</p><h1>{customer.name}</h1></div>
        <Link className="admin-back-link" to="/admin/customers">Back to customers</Link>
      </div>
      {error && <p className="admin-alert" role="alert">{error}</p>}
      <section className="admin-customer-profile">
        <div><span>Email</span><strong>{customer.email}</strong></div>
        <div><span>Phone</span><strong>{customer.phone || 'Not provided'}</strong></div>
        <div><span>Joined</span><strong>{new Date(customer.createdAt).toLocaleDateString()}</strong></div>
      </section>
      <h2 className="admin-section-title">Order history</h2>
      {orders.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Order</th><th>Date</th><th>Status</th><th>Total</th><th /></tr></thead>
            <tbody>{orders.map((order) => (
              <tr key={order._id}>
                <td>{order.orderNumber}</td>
                <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                <td>{order.status}</td>
                <td>{formatNpr(order.total)}</td>
                <td><Link to={`/admin/orders/${order._id}`}>View order</Link></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <p className="admin-empty">This customer has not placed any orders.</p>}
    </section>
  );
}

export default AdminCustomerDetailPage;
