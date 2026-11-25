import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductImage from '../components/ProductImage';
import api from '../services/api';

function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [editingId, setEditingId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    api.get('/admin/categories')
      .then(({ data }) => {
        if (active) setCategories(data.data.categories);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Categories could not be loaded.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const resetForm = () => {
    setName('');
    setImage('');
    setImageFile(null);
    setPreviewUrl('');
    setEditingId('');
  };

  const editCategory = (category) => {
    setEditingId(category._id);
    setName(category.name);
    setImage(category.image || '');
    setImageFile(null);
    setPreviewUrl('');
    setError('');
    setNotice('');
  };

  const selectImage = (event) => {
    const file = event.target.files?.[0] || null;
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
    setError('');
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setNotice('');
    try {
      let imagePath = image.trim();
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        const uploaded = await api.post('/admin/uploads/image?kind=category', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        imagePath = uploaded.data.data.image;
      }
      const payload = { name: name.trim(), image: imagePath };
      const result = editingId
        ? await api.put(`/admin/categories/${editingId}`, payload)
        : await api.post('/admin/categories', payload);
      const saved = result.data.data.category;
      setCategories((current) => (
        editingId
          ? current.map((item) => item._id === editingId ? { ...item, ...saved } : item)
          : [...current, { ...saved, productCount: 0 }].sort((left, right) => left.name.localeCompare(right.name))
      ));
      setNotice(editingId ? 'Category updated.' : 'Category created.');
      resetForm();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Category could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCategory = async (category) => {
    if (!window.confirm(`Delete category "${category.name}"?`)) return;
    setError('');
    setNotice('');
    try {
      await api.delete(`/admin/categories/${category._id}`);
      setCategories((current) => current.filter((item) => item._id !== category._id));
      setNotice(`${category.name} was deleted.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Category could not be deleted.');
    }
  };

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div><p className="eyebrow">CATALOGUE</p><h1>Categories</h1></div>
        <Link className="admin-back-link" to="/admin/products">View products</Link>
      </div>
      {error && <p className="admin-alert" role="alert">{error}</p>}
      {notice && <p className="admin-success" role="status">{notice}</p>}
      <div className="admin-category-layout">
        <form className="admin-form admin-category-form" onSubmit={saveCategory}>
          <h2>{editingId ? 'Edit category' : 'Add category'}</h2>
          <label>Category name<input value={name} maxLength="100" required onChange={(event) => setName(event.target.value)} /></label>
          <label>Image URL or path<input value={image} maxLength="2000" onChange={(event) => setImage(event.target.value)} placeholder="Optional" /></label>
          <label>Upload a category image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectImage} /></label>
          <div className="admin-image-preview">
            <span>Image preview</span>
            <ProductImage src={previewUrl || image} alt={name || 'Category preview'} />
          </div>
          <button className="admin-primary-button" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : editingId ? 'Save category' : 'Add category'}
          </button>
          {editingId && <button className="admin-secondary-button" type="button" onClick={resetForm}>Cancel editing</button>}
        </form>

        <div className="admin-category-list">
          {isLoading ? <p className="admin-state" role="status">Loading categories...</p> : categories.length ? categories.map((category) => (
            <article className="admin-category-card" key={category._id}>
              <ProductImage src={category.image} alt="" />
              <div><h2>{category.name}</h2><p>{category.productCount} products</p></div>
              <div className="admin-row-actions">
                <button type="button" onClick={() => editCategory(category)}>Edit</button>
                <button className="admin-danger-link" type="button" disabled={category.productCount > 0} title={category.productCount ? 'Reassign or remove products first' : 'Delete category'} onClick={() => deleteCategory(category)}>Delete</button>
              </div>
            </article>
          )) : <p className="admin-empty">No categories yet. Add one to organize products.</p>}
          {error && categories.length === 0 && <button className="admin-secondary-button" type="button" onClick={() => { setIsLoading(true); setRetry((value) => value + 1); }}>Try again</button>}
        </div>
      </div>
    </section>
  );
}

export default AdminCategoriesPage;
