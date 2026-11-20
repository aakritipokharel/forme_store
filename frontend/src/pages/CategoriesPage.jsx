import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import ProductImage from '../components/ProductImage';

const categoryImages = {
  'T-shirts': '/images/categories/tshirts.jpg',
  'Shirts': '/images/categories/shirts.jpg',
  'Knitwear': '/images/categories/knitwear.jpg',
  'Denim': '/images/categories/denim.jpg',
  'Trousers': '/images/categories/trousers.jpg',
  'Outerwear': '/images/categories/outerwear.jpg',
  'Dresses': '/images/categories/dresses.jpg',
  'Hoodies': '/images/categories/hoodies.jpg',
};

function CategoriesPage() {
  const [categories, setCategories] = useState([]);
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

        const categoryProducts = new Map();
        data.data.products.forEach((product) => {
          if (typeof product.category !== 'string' || !product.category.trim()) {
            return;
          }

          const category = product.category.trim();
          const current = categoryProducts.get(category);
          if (current) {
            current.count += 1;
          } else {
            categoryProducts.set(category, {
              name: category,
              count: 1,
              image: categoryImages[category],
            });
          }
        });

        if (active) {
          setCategories([...categoryProducts.values()]
            .sort((left, right) => left.name.localeCompare(right.name)));
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.message || requestError.message || 'Categories could not be loaded.');
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

  return (
    <main className="categories-page">
      <header className="categories-intro">
        <p className="eyebrow">FIND YOUR FORM</p>
        <h1>Shop by Category</h1>
        <p>Explore the collection by the pieces you are looking for.</p>
      </header>

      {error ? (
        <div className="categories-state error-message" role="alert">
          <p>{error}</p>
          <button className="text-button" onClick={() => setRetry((value) => value + 1)} type="button">
            Try again
          </button>
        </div>
      ) : isLoading ? (
        <p className="categories-state" role="status">Loading categories...</p>
      ) : categories.length ? (
        <div className="category-card-grid">
          {categories.map((category, index) => (
            <Link
              className="category-card"
              key={category.name}
              to={`/shop?category=${encodeURIComponent(category.name)}`}
            >
              <div className={`category-card-image category-tone-${index % 4}`}>
                <ProductImage src={category.image} alt={`${category.name} collection`} />
              </div>
              <div className="category-card-info">
                <div>
                  <h2>{category.name}</h2>
                  <p>{category.count} {category.count === 1 ? 'piece' : 'pieces'}</p>
                </div>
                <span aria-hidden="true">↗</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="categories-state">Categories will appear as pieces are added to the collection.</p>
      )}
    </main>
  );
}

export default CategoriesPage;
