import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductImage from '../components/ProductImage';
import api from '../services/api';
import { formatNpr } from '../utils/currency';

const collectionLabels = {
  men: "Men's Collection",
  women: "Women's Collection",
  unisex: 'Unisex',
};

function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [gender, setGender] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedCategory, setAppliedCategory] = useState('');
  const [appliedGender, setAppliedGender] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    const productParams = { search: appliedSearch, category: appliedCategory };
    if (appliedGender) productParams.gender = appliedGender;
    Promise.all([
      api.get('/admin/products', { params: productParams }),
      api.get('/admin/categories'),
    ])
      .then(([productResponse, categoryResponse]) => {
        if (active) {
          setError('');
          setProducts(productResponse.data.data.products);
          setCategories(categoryResponse.data.data.categories);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Products could not be loaded.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [appliedCategory, appliedGender, appliedSearch, retry]);

  const toggleActive = async (product) => {
    setError('');
    setNotice('');
    try {
      const { data } = await api.put(`/admin/products/${product._id}`, { active: !product.active });
      setProducts((current) => current.map((item) => item._id === product._id ? data.data.product : item));
      setNotice(`${product.name} is now ${data.data.product.active ? 'active' : 'inactive'}.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Product status could not be changed.');
    }
  };

  const deleteProduct = async (product) => {
    if (!window.confirm(`Permanently delete "${product.name}"? Existing order snapshots will be retained.`)) {
      return;
    }
    setError('');
    setNotice('');
    try {
      await api.delete(`/admin/products/${product._id}`);
      setProducts((current) => current.filter((item) => item._id !== product._id));
      setNotice(`${product.name} was deleted.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Product could not be deleted.');
    }
  };

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div><p className="eyebrow">CATALOGUE</p><h1>Products</h1></div>
        <Link className="admin-primary-button" to="/admin/products/new">Add product</Link>
      </div>
      <form className="admin-filter-form" onSubmit={(event) => {
        event.preventDefault();
        const nextSearch = search.trim();
        if (nextSearch !== appliedSearch || category !== appliedCategory || gender !== appliedGender) setIsLoading(true);
        setError('');
        setAppliedSearch(nextSearch);
        setAppliedCategory(category);
        setAppliedGender(gender);
      }}>
        <label>Search products<input value={search} maxLength="100" onChange={(event) => setSearch(event.target.value)} placeholder="Name or description" /></label>
        <label>Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All categories</option>
            {categories.map((item) => <option key={item._id} value={item.name}>{item.name}</option>)}
          </select>
        </label>
        <label>Collection
          <select value={gender} onChange={(event) => setGender(event.target.value)}>
            <option value="">All collections</option>
            <option value="men">Men's Collection</option>
            <option value="women">Women's Collection</option>
            <option value="unisex">Unisex</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </label>
        <button className="admin-secondary-button" type="submit">Search</button>
      </form>
      {error && (
        <p className="admin-alert" role="alert">
          {error}
          <button type="button" onClick={() => { setIsLoading(true); setRetry((value) => value + 1); }}>Try again</button>
        </p>
      )}
      {notice && <p className="admin-success" role="status">{notice}</p>}
      {isLoading ? <p className="admin-state" role="status">Loading products...</p> : products.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table admin-product-table">
            <thead><tr><th>Product</th><th>Category</th><th>Collection</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id}>
                  <td><div className="admin-product-cell"><ProductImage src={product.image} alt="" /><span>{product.name}</span></div></td>
                  <td>{product.category}</td>
                  <td>{collectionLabels[product.gender] || 'Unassigned'}</td>
                  <td>{formatNpr(product.price)}</td>
                  <td>{product.stock}</td>
                  <td><span className={`admin-status ${product.active ? 'admin-status-active' : 'admin-status-inactive'}`}>{product.active ? 'Active' : 'Inactive'}</span></td>
                  <td><div className="admin-row-actions">
                    <Link to={`/admin/products/${product._id}/edit`}>Edit</Link>
                    <button type="button" onClick={() => toggleActive(product)}>{product.active ? 'Deactivate' : 'Activate'}</button>
                    <button className="admin-danger-link" type="button" onClick={() => deleteProduct(product)}>Delete</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="admin-empty">No products match these filters.</p>}
    </section>
  );
}

export default AdminProductsPage;
