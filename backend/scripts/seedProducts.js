const path = require('node:path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDatabase = require('../src/config/db');
const Product = require('../src/models/Product');

const products = [
  {
    name: 'Oversized T-shirt',
    description: 'A relaxed-fit cotton T-shirt with a soft feel and an easy everyday silhouette.',
    price: 1800,
    category: 'T-shirts',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['White', 'Black', 'Olive'],
    stock: 32,
  },
  {
    name: 'Classic white shirt',
    description: 'A crisp button-down shirt in breathable cotton, made for workdays and weekends.',
    price: 3200,
    category: 'Shirts',
    image: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=900&q=80',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['White'],
    stock: 18,
  },
  {
    name: 'Knit sweater',
    description: 'A cozy mid-weight knit sweater with a timeless crew neckline.',
    price: 4500,
    category: 'Knitwear',
    image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=900&q=80',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Cream', 'Charcoal', 'Rust'],
    stock: 14,
  },
  {
    name: 'Straight-leg jeans',
    description: 'Classic straight-leg denim with a comfortable mid-rise fit.',
    price: 3900,
    category: 'Denim',
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80',
    sizes: ['28', '30', '32', '34'],
    colors: ['Indigo', 'Washed blue'],
    stock: 21,
  },
  {
    name: 'Wide-leg trousers',
    description: 'Fluid wide-leg trousers with a clean drape and an adjustable waist.',
    price: 3600,
    category: 'Trousers',
    image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=80',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Black', 'Sand'],
    stock: 16,
  },
  {
    name: 'Casual jacket',
    description: 'A versatile lightweight jacket with practical pockets for everyday layering.',
    price: 6200,
    category: 'Outerwear',
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Khaki', 'Navy'],
    stock: 11,
  },
  {
    name: 'Summer dress',
    description: 'An airy warm-weather dress with a flattering, easy-to-wear shape.',
    price: 4200,
    category: 'Dresses',
    image: 'https://images.unsplash.com/photo-1789110853872-f416085557fa?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['Floral', 'Sky blue'],
    stock: 13,
  },
  {
    name: 'Basic hoodie',
    description: 'A soft fleece-lined hoodie with a roomy hood and a front kangaroo pocket.',
    price: 3400,
    category: 'Hoodies',
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Heather grey', 'Black', 'Navy'],
    stock: 25,
  },
];

const seedProducts = async () => {
  await connectDatabase();

  const operations = products.map((product) => ({
    updateOne: {
      filter: { name: product.name },
      update: { $set: product },
      upsert: true,
    },
  }));
  const result = await Product.bulkWrite(operations);

  console.log(
    `Seeded ${result.upsertedCount} new products and updated ${result.modifiedCount} existing products`,
  );
};

if (require.main === module) {
  seedProducts()
    .catch((error) => {
      console.error(`Unable to seed products: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}

module.exports = { products, seedProducts };
