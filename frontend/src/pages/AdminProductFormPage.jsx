import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ProductImage from '../components/ProductImage';
import api from '../services/api';

const blankProduct = {
  name: '',
  description: '',
  price: '',
  category: '',
  gender: '',
  image: '',
  sizes: '',
  colors: '',
  stock: '0',
  featured: false,
  active: true,
};

const splitOptions = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);

function AdminProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const [product, setProduct] = useState(blankProduct);
  const [categories, setCategories] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const requests = [api.get('/admin/categories')];
    if (isEditing) requests.push(api.get(`/admin/products/${id}`));
    Promise.all(requests)
      .then(([categoryResponse, productResponse]) => {
        if (!active) return;
        setCategories(categoryResponse.data.data.categories);
        if (productResponse) {
          const current = productResponse.data.data.product;
          setProduct({
            name: current.name,
            description: current.description,
            price: String(current.price),
            category: current.category,
            gender: current.gender || '',
            image: current.image,
            sizes: current.sizes.join(', '),
            colors: current.colors.join(', '),
            stock: String(current.stock),
            featured: current.featured,
            active: current.active,
          });
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Product form data could not be loaded.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, isEditing]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const updateProduct = (event) => {
    const { name, value, checked, type } = event.target;
    setProduct((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const selectImage = (event) => {
    const file = event.target.files?.[0] || null;
    setError('');
    if (!file) {
      setImageFile(null);
      setPreviewUrl('');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Choose a JPG, PNG, or WebP image no larger than 5 MB.');
      event.target.value = '';
      return;
    }
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const submitProduct = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      let image = product.image.trim();
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        const uploaded = await api.post('/admin/uploads/image?kind=product', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        image = uploaded.data.data.image;
      }
      const payload = {
        ...product,
        price: Number(product.price),
        stock: Number(product.stock),
        image,
        sizes: splitOptions(product.sizes),
        colors: splitOptions(product.colors),
      };
      if (isEditing) await api.put(`/admin/products/${id}`, payload);
      else await api.post('/admin/products', payload);
      navigate('/admin/products', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Product could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <p className="admin-state" role="status">Loading product...</p>;

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div><p className="eyebrow">CATALOGUE</p><h1>{isEditing ? 'Edit product' : 'Add product'}</h1></div>
        <Link className="admin-back-link" to="/admin/products">Back to products</Link>
      </div>
      {error && <p className="admin-alert" role="alert">{error}</p>}
      <form className="admin-form" onSubmit={submitProduct}>
        <label>Product name<input name="name" value={product.name} maxLength="150" required onChange={updateProduct} /></label>
        <label>Description<textarea name="description" rows="5" maxLength="5000" value={product.description} required onChange={updateProduct} /></label>
        <div className="admin-form-grid">
          <label>Price (NPR)<input name="price" type="number" min="0" step="0.01" value={product.price} required onChange={updateProduct} /></label>
          <label>Stock quantity<input name="stock" type="number" min="0" step="1" value={product.stock} required onChange={updateProduct} /></label>
          <label>Category
            <select name="category" value={product.category} required onChange={updateProduct}>
              <option value="">Select category</option>
              {product.category && !categories.some((item) => item.name === product.category) && <option value={product.category}>{product.category}</option>}
              {categories.map((item) => <option key={item._id} value={item.name}>{item.name}</option>)}
            </select>
          </label>
          <label>Collection
            <select name="gender" value={product.gender} required onChange={updateProduct}>
              <option value="">Select collection</option>
              <option value="men">Men's Collection</option>
              <option value="women">Women's Collection</option>
              <option value="unisex">Unisex</option>
            </select>
          </label>
          <label>Sizes <span>Comma-separated, e.g. S, M, L</span><input name="sizes" value={product.sizes} onChange={updateProduct} /></label>
          <label>Colours <span>Comma-separated</span><input name="colors" value={product.colors} onChange={updateProduct} /></label>
        </div>
        <label>Image URL or path<input name="image" type="text" value={product.image} maxLength="2000" required={!imageFile} onChange={updateProduct} placeholder="https://... or /uploads/products/..." /></label>
        <label>Upload a new image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectImage} /></label>
        <div className="admin-image-preview">
          <span>Image preview</span>
          <ProductImage src={previewUrl || product.image} alt={product.name || 'Product preview'} />
        </div>
        <div className="admin-checkbox-row">
          <label><input name="featured" type="checkbox" checked={product.featured} onChange={updateProduct} /> Featured</label>
          <label><input name="active" type="checkbox" checked={product.active} onChange={updateProduct} /> Active</label>
        </div>
        <button className="admin-primary-button" type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : isEditing ? 'Save changes' : 'Create product'}
        </button>
      </form>
    </section>
  );
}

export default AdminProductFormPage;
