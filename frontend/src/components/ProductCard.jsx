import { useState } from 'react';
import { Link } from 'react-router-dom';
import ProductImage from './ProductImage';
import { useCart } from '../context/useCart';

function ProductCard({ product }) {
  const { addItem, isSaving } = useCart();
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const hasOptions = Boolean(product.sizes?.length || product.colors?.length);

  const handleAdd = async () => {
    try {
      await addItem(product, size, color);
    } catch {
      return;
    }
  };

  return (
    <article className="product-card">
      <Link className="product-card-image" to={`/products/${product._id}`}>
        <ProductImage src={product.image} alt={product.name} />
      </Link>
      <div className="product-card-info">
        <p className="product-category">{product.category}</p>
        <h3><Link to={`/products/${product._id}`}>{product.name}</Link></h3>
        <p className="product-price">NPR {Number(product.price).toLocaleString('en-NP')}</p>
        <p className="product-sizes">
          {product.sizes?.length ? `Sizes ${product.sizes.join(' · ')}` : 'Sizes not listed'}
        </p>
        {hasOptions && (
          <div className="product-card-options">
            {product.sizes?.length > 0 && (
              <label>
                <span>Size</span>
                <select value={size} onChange={(event) => setSize(event.target.value)}>
                  <option value="">Choose size</option>
                  {product.sizes.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
            )}
            {product.colors?.length > 0 && (
              <label>
                <span>Color</span>
                <select value={color} onChange={(event) => setColor(event.target.value)}>
                  <option value="">Choose color</option>
                  {product.colors.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
            )}
          </div>
        )}
        <button
          className="product-add-button"
          type="button"
          onClick={handleAdd}
          disabled={isSaving}
        >
          {product.stock < 1 ? 'Out of stock' : 'Add to bag'}
        </button>
        <Link className="product-detail-link" to={`/products/${product._id}`}>
          View details <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </article>
  );
}

export default ProductCard;
