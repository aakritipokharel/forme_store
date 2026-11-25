import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/admin/users', { params: { search: appliedSearch } })
      .then(({ data }) => {
        if (active) {
          setError('');
          setCustomers(data.data.customers);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Customers could not be loaded.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [appliedSearch]);

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div><p className="eyebrow">CUSTOMER CARE</p><h1>Customers</h1></div>
      </div>
      <form className="admin-filter-form admin-customer-search" onSubmit={(event) => {
        event.preventDefault();
        if (search.trim() !== appliedSearch) setIsLoading(true);
        setError('');
        setAppliedSearch(search.trim());
      }}>
        <label>Search customers<input value={search} maxLength="100" onChange={(event) => setSearch(event.target.value)} placeholder="Name, email or phone" /></label>
        <button className="admin-secondary-button" type="submit">Search</button>
      </form>
      {error && <p className="admin-alert" role="alert">{error}</p>}
      {isLoading ? <p className="admin-state" role="status">Loading customers...</p> : customers.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th><th /></tr></thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer._id}>
                  <td>{customer.name}</td><td>{customer.email}</td><td>{customer.phone || '—'}</td>
                  <td>{new Date(customer.createdAt).toLocaleDateString()}</td>
                  <td><Link to={`/admin/customers/${customer._id}`}>View details</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="admin-empty">No customers match this search.</p>}
    </section>
  );
}

export default AdminCustomersPage;
