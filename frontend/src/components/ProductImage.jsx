import { useEffect, useState } from 'react';

const fallbackImage = '/images/product-placeholder.svg';

function ProductImage({ src, alt, className = '' }) {
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setHasFailed(false);
  }, [src]);

  return (
    <img
      className={className}
      src={!hasFailed && src ? src : fallbackImage}
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
