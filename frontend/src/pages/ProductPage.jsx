import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import ProductImage from '../components/ProductImage';

function formatPrice(price) {
  return `NPR ${Number(price).toLocaleString('en-IN')}`;
}

function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setProduct(null);
    setError('');

    api.get(`/products/${id}`)
      .then(({ data }) => {
        if (!data?.data?.product) {
          throw new Error('The product response was not valid.');
        }
        if (active) {
          setProduct(data.data.product);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.status === 404
              ? 'This piece is no longer available.'
              : requestError.response?.data?.message || 'This piece could not be loaded.',
          );
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

  if (isLoading) {
    return <main className="product-page-state" role="status">Loading product...</main>;
  }

  if (error || !product) {
    return (
      <main className="product-page-state">
        <p className="eyebrow">FORME COLLECTION</p>
        <h1>Piece unavailable</h1>
        <p role="status">{error || 'This piece is no longer available.'}</p>
        <Link className="primary-button" to="/shop">Continue browsing</Link>
      </main>
    );
  }

  const inStock = product.stock > 0;

  return (
    <main className="product-detail-page">
      <p className="breadcrumb"><Link to="/shop">Shop</Link><span aria-hidden="true">/</span>{product.category}</p>
      <div className="product-detail-layout">
        <div className="product-detail-image">
          <ProductImage src={product.image} alt={product.name} />
        </div>
        <section className="product-detail-info" aria-labelledby="product-title">
          <p className="eyebrow">{product.category}</p>
          <h1 id="product-title">{product.name}</h1>
          <p className="detail-price">{formatPrice(product.price)}</p>
          <p className="detail-description">{product.description}</p>

          <div className="detail-option">
            <h2>Available sizes</h2>
            {product.sizes?.length ? (
              <ul className="option-list">
                {product.sizes.map((size) => <li key={size}>{size}</li>)}
              </ul>
            ) : <p className="option-empty">Sizes are not listed for this piece.</p>}
          </div>

          <div className="detail-option">
            <h2>Available colors</h2>
            {product.colors?.length ? (
              <ul className="option-list">
                {product.colors.map((color) => <li key={color}>{color}</li>)}
              </ul>
            ) : <p className="option-empty">Colors are not listed for this piece.</p>}
          </div>

          <p className={`stock-status ${inStock ? 'is-available' : 'is-unavailable'}`} role="status">
            <span aria-hidden="true">{inStock ? '●' : '○'}</span>
            {inStock ? 'Available' : 'Currently out of stock'}
          </p>
          <Link className="primary-button detail-browse-button" to="/shop">Continue browsing</Link>
        </section>
      </div>
    </main>
  );
}

export default ProductPage;
