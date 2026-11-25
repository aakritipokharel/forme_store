import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductImage from '../components/ProductImage';
import api from '../services/api';
import { formatNpr } from '../utils/currency';

const statisticLabels = [
  ['totalProducts', 'Products'],
  ['totalCustomers', 'Customers'],
  ['totalOrders', 'Orders'],
  ['totalRevenue', 'Delivered revenue'],
  ['pendingOrders', 'Pending orders'],
  ['lowStockProducts', 'Low stock'],
];

function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    api.get('/admin/dashboard')
      .then(({ data }) => {
        if (active) {
          setError('');
          setDashboard(data.data);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Dashboard data could not be loaded.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry]);

  const displayStatistic = (key, value) => (
    key === 'totalRevenue' ? formatNpr(value) : Number(value).toLocaleString()
  );

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div><p className="eyebrow">OVERVIEW</p><h1>Dashboard</h1></div>
        <p>Store activity and inventory at a glance.</p>
      </div>
      {error && <div className="admin-alert" role="alert">{error} <button type="button" onClick={() => { setIsLoading(true); setRetry((value) => value + 1); }}>Try again</button></div>}
      {isLoading && <p className="admin-state" role="status">Loading store statistics...</p>}
      {dashboard && (
        <>
          <div className="admin-stat-grid">
            {statisticLabels.map(([key, label]) => (
              <article className="admin-stat-card" key={key}>
                <span>{label}</span>
                <strong>{displayStatistic(key, dashboard.statistics[key])}</strong>
              </article>
            ))}
          </div>

          <div className="admin-dashboard-grid">
            <section className="admin-panel">
              <div className="admin-panel-heading"><h2>Recent orders</h2><Link to="/admin/orders">All orders</Link></div>
              {dashboard.recentOrders.length ? (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Status</th><th>Total</th></tr></thead>
                    <tbody>
                      {dashboard.recentOrders.map((order) => (
                        <tr key={order._id}>
                          <td><Link to={`/admin/orders/${order._id}`}>{order.orderNumber}</Link></td>
                          <td>{order.user?.name || 'Customer'}</td>
                          <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                          <td><span className={`admin-status admin-status-${order.status.toLowerCase()}`}>{order.status}</span></td>
                          <td>{formatNpr(order.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="admin-empty">No orders have been placed yet.</p>}
            </section>

            <section className="admin-panel">
              <div className="admin-panel-heading"><h2>Low stock</h2><Link to="/admin/products">Manage products</Link></div>
              {dashboard.lowStockProducts.length ? (
                <ul className="admin-low-stock-list">
                  {dashboard.lowStockProducts.map((product) => (
                    <li key={product._id}>
                      <ProductImage src={product.image} alt="" />
                      <span>{product.name}</span>
                      <strong>{product.stock} left</strong>
                    </li>
                  ))}
                </ul>
              ) : <p className="admin-empty">No active products are low on stock.</p>}
            </section>

            <section className="admin-panel admin-activity-panel">
              <div className="admin-panel-heading"><h2>Recent activity</h2><Link to="/admin/activity">Activity log</Link></div>
              {dashboard.recentActivity.length ? (
                <ul className="admin-activity-list">
                  {dashboard.recentActivity.map((entry) => (
                    <li key={entry._id}>
                      <span>{entry.description}</span>
                      <small>{new Date(entry.createdAt).toLocaleString()}</small>
                    </li>
                  ))}
                </ul>
              ) : <p className="admin-empty">No recent activity.</p>}
            </section>
          </div>
        </>
      )}
    </section>
  );
}

export default AdminDashboardPage;
