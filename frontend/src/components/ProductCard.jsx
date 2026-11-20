import { Link } from 'react-router-dom';
import ProductImage from './ProductImage';

function formatPrice(price) {
  return `NPR ${Number(price).toLocaleString('en-IN')}`;
}

function ProductCard({ product }) {
  return (
    <article className="product-card">
      <Link className="product-card-image" to={`/products/${product._id}`}>
        <ProductImage src={product.image} alt={product.name} />
      </Link>
      <div className="product-card-info">
        <p className="product-category">{product.category}</p>
        <h3><Link to={`/products/${product._id}`}>{product.name}</Link></h3>
        <p className="product-price">{formatPrice(product.price)}</p>
        <p className="product-sizes">
          {product.sizes?.length ? `Sizes ${product.sizes.join(' · ')}` : 'Sizes not listed'}
        </p>
        <Link className="product-detail-link" to={`/products/${product._id}`}>
          View details <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </article>
  );
}

export default ProductCard;
