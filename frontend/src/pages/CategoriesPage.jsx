import { Link } from 'react-router-dom';

const collections = [
  {
    gender: 'men',
    title: "Men's Collection",
    description: 'Explore everyday essentials and considered styles for men.',
    image: '/images/categories/shirts.jpg',
    imageAlt: 'Model wearing a minimalist black T-shirt',
  },
  {
    gender: 'women',
    title: "Women's Collection",
    description: 'Discover timeless pieces and effortless styles for women.',
    image: '/images/forme-fashion-campaign.png',
    imageAlt: 'Models in neutral tailored outfits from the FORME fashion campaign',
  },
];

function CategoriesPage() {
  return (
    <main className="categories-page">
      <header className="categories-intro">
        <p className="eyebrow">FIND YOUR FORM</p>
        <h1>Shop by Collection</h1>
        <p>Explore the FORME collection, considered for every day.</p>
      </header>

      <section className="collection-card-grid" aria-label="Shop collections">
        {collections.map((collection) => (
          <Link
            className={`collection-card collection-card-${collection.gender}`}
            key={collection.gender}
            to={`/shop?gender=${collection.gender}`}
          >
            <div className="collection-card-image">
              <img src={collection.image} alt={collection.imageAlt} />
            </div>
            <div className="collection-card-info">
              <h2>{collection.title}</h2>
              <p>{collection.description}</p>
              <span className="collection-card-cta">
                Explore {collection.title} <span aria-hidden="true">→</span>
              </span>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}

export default CategoriesPage;
