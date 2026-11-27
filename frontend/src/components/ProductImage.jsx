import { useEffect, useState } from 'react';

const fallbackImage = '/images/product-placeholder.svg';
const apiOrigin = new URL(
  import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api'),
  window.location.origin,
).origin;

function ProductImage({ src, alt, className = '' }) {
  const [hasFailed, setHasFailed] = useState(false);
  const imageSource = src?.startsWith('/uploads/') ? `${apiOrigin}${src}` : src;

  useEffect(() => {
    setHasFailed(false);
  }, [imageSource]);

  return (
    <img
      className={className}
      src={!hasFailed && imageSource ? imageSource : fallbackImage}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => {
        setHasFailed(true);
      }}
    />
  );
}

export default ProductImage;
