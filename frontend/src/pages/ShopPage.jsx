import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import api from '../services/api';
import ProductCard from '../components/ProductCard';

function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const category = searchParams.get('category') || '';
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    api.get('/products/categories')
      .then(({ data }) => {
        if (!Array.isArray(data?.data?.categories)) {
          throw new Error('The category response was not valid.');
        }
        if (active) {
          setCategories(data.data.categories);
        }
      })
      .catch((requestError) => {
        if (active) {
          setCategoryError(requestError.response?.data?.message || 'Categories could not be loaded.');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      setError('');
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (category) params.category = category;

      api.get('/products', { params, signal: controller.signal })
        .then(({ data }) => {
          if (!Array.isArray(data?.data?.products)) {
            throw new Error('The product catalogue response was not valid.');
          }
          if (active) {
            setProducts(data.data.products);
          }
        })
        .catch((requestError) => {
          if (active && !axios.isCancel(requestError)) {
            setError(requestError.response?.data?.message || 'Products could not be loaded.');
          }
        })
        .finally(() => {
          if (active && !controller.signal.aborted) {
            setIsLoading(false);
          }
        });
    }, 180);

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [category, retry, search]);

  return (
    <main className="shop-page">
      <div className="shop-intro">
        <p className="eyebrow">THE FORME COLLECTION</p>
        <h1>Shop all</h1>
        <p>Explore the current collection, selected for everyday wear.</p>
      </div>

      <section className="shop-tools" aria-label="Product filters">
        <label className="search-field">
          <span>Search pieces</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search the collection"
          />
        </label>
        <label className="category-field">
          <span>Category</span>
          <select
            value={category}
            onChange={(event) => {
              const nextParams = new URLSearchParams(searchParams);
              if (event.target.value) {
                nextParams.set('category', event.target.value);
              } else {
                nextParams.delete('category');
              }
              setSearchParams(nextParams);
            }}
          >
            <option value="">All categories</option>
            {categories.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      </section>
      {categoryError && <p className="filter-note" role="status">{categoryError}</p>}

      {error ? (
        <div className="shop-state error-message" role="alert">
          <p>{error}</p>
          <button className="text-button" onClick={() => setRetry((value) => value + 1)} type="button">Try again</button>
        </div>
      ) : isLoading ? (
        <p className="shop-state" role="status">Loading pieces...</p>
      ) : products.length ? (
        <>
          <p className="results-count">{products.length} {products.length === 1 ? 'piece' : 'pieces'}</p>
          <div className="product-grid">
            {products.map((product) => <ProductCard key={product._id} product={product} />)}
          </div>
        </>
      ) : (
        <div className="shop-empty">
          <p className="eyebrow">NOTHING HERE JUST YET</p>
          <h2>No pieces found</h2>
          <p>Try a different search or browse the full collection.</p>
          <button className="primary-button" onClick={() => {
            setSearch('');
            setSearchParams((currentParams) => {
              const nextParams = new URLSearchParams(currentParams);
              nextParams.delete('category');
              return nextParams;
            });
          }} type="button">Clear filters</button>
        </div>
      )}
      <p className="shop-back-link"><Link to="/">Back to FORME home</Link></p>
    </main>
  );
}

export default ShopPage;
