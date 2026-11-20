import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import ProductCard from '../components/ProductCard';

function HomePage() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError('');

    api.get('/products')
      .then(({ data }) => {
        if (!Array.isArray(data?.data?.products)) {
          throw new Error('The product catalogue response was not valid.');
        }
        if (active) {
          setProducts(data.data.products);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.message || requestError.message || 'Products could not be loaded.');
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
  }, [retry]);

  const arrivals = [...products]
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(0, 4);
  const featured = products.filter((product) => product.featured).slice(0, 4);
  const categories = [...new Set(products.map((product) => product.category))].sort();

  return (
    <main>
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">THE FORME COLLECTION</p>
          <h1>Everyday pieces.<br /><em>Considered style.</em></h1>
          <p className="hero-description">
            A thoughtful edit of clothing designed to feel at home in your everyday.
          </p>
          <Link className="primary-button" to="/shop">Shop the collection <span aria-hidden="true">→</span></Link>
          <p className="hero-caption">FORME · CLOTHING FOR EVERY DAY</p>
        </div>
        <div className="hero-art">
          <img src="/images/forme-editorial.svg" alt="Editorial illustration of a figure in a tailored coat" />
          <span className="hero-art-label">A STUDY IN FORM — 01</span>
        </div>
      </section>

      <section className="store-section" aria-labelledby="arrivals-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">JUST IN</p>
            <h2 id="arrivals-title">New arrivals</h2>
          </div>
          <Link className="section-link" to="/shop">Explore all pieces <span aria-hidden="true">→</span></Link>
        </div>
        {error ? (
          <div className="store-message error-message" role="alert">
            <p>{error}</p>
            <button className="text-button" onClick={() => setRetry((value) => value + 1)} type="button">Try again</button>
          </div>
        ) : isLoading ? (
          <p className="store-message" role="status">Loading the latest pieces...</p>
        ) : arrivals.length ? (
          <div className="product-grid">
            {arrivals.map((product) => <ProductCard key={product._id} product={product} />)}
          </div>
        ) : (
          <p className="store-message">New pieces will appear here when available.</p>
        )}
      </section>

      <section className="category-section" id="categories" aria-labelledby="categories-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FIND YOUR FORM</p>
            <h2 id="categories-title">Shop by category</h2>
          </div>
          <Link className="section-link" to="/categories">View all categories <span aria-hidden="true">→</span></Link>
        </div>
        {isLoading ? (
          <p className="store-message" role="status">Loading categories...</p>
        ) : categories.length ? (
          <div className="category-grid">
            {categories.slice(0, 4).map((category, index) => (
              <Link
                className={`category-tile category-tone-${index % 4}`}
                key={category}
                to={`/shop?category=${encodeURIComponent(category)}`}
              >
                <span className="category-number">0{index + 1}</span>
                <span className="category-name">{category}</span>
                <span className="category-arrow" aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="store-message">Categories will appear as pieces are added to the collection.</p>
        )}
      </section>

      <section className="store-section featured-section" aria-labelledby="featured-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A CLOSER LOOK</p>
            <h2 id="featured-title">Featured pieces</h2>
          </div>
          <Link className="section-link" to="/shop">Discover the collection <span aria-hidden="true">→</span></Link>
        </div>
        {error ? (
          <p className="store-message">Featured pieces are unavailable right now.</p>
        ) : isLoading ? (
          <p className="store-message" role="status">Loading featured pieces...</p>
        ) : featured.length ? (
          <div className="product-grid">
            {featured.map((product) => <ProductCard key={product._id} product={product} />)}
          </div>
        ) : (
          <p className="store-message">There are no featured pieces at the moment.</p>
        )}
      </section>

      <section className="brand-promo">
        <div className="promo-mark" aria-hidden="true">F.</div>
        <div className="promo-copy">
          <p className="eyebrow">THE FORME EDIT</p>
          <h2>Less, but better considered.</h2>
          <p>Explore the pieces in our current collection and find a style that feels like you.</p>
          <Link className="promo-link" to="/shop">Find your next piece <span aria-hidden="true">→</span></Link>
        </div>
        <p className="promo-aside">FORME<br />EST. FOR EVERY DAY</p>
      </section>
    </main>
  );
}

export default HomePage;
