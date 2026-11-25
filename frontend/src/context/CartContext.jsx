import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { useAuth } from './useAuth';
import CartContext from './cartContext';

const storageKey = 'formeGuestCart';
const defaultShippingFee = 150;
const configuredShippingFee = Number(import.meta.env.VITE_SHIPPING_FEE_NPR ?? defaultShippingFee);
const shippingFee = Number.isFinite(configuredShippingFee) && configuredShippingFee >= 0
  ? configuredShippingFee
  : defaultShippingFee;

function getProductId(product) {
  return String(product?._id || product || '');
}

function getItemKey(item) {
  return JSON.stringify([
    getProductId(item.product),
    item.size || '',
    item.color || '',
  ]);
}

function readGuestCart() {
  try {
    const stored = window.localStorage.getItem(storageKey);
    const items = stored ? JSON.parse(stored) : [];
    return Array.isArray(items) ? items : [];
  } catch (error) {
    console.error('Guest cart could not be read:', error);
    return [];
  }
}

function toApiItems(items) {
  return items
    .filter((item) => getProductId(item.product))
    .map((item) => ({
      productId: getProductId(item.product),
      size: item.size || '',
      color: item.color || '',
      quantity: item.quantity,
    }));
}

function mergeCartItems(accountItems, guestItems) {
  const merged = new Map(accountItems.map((item) => [getItemKey(item), { ...item }]));

  guestItems.forEach((guestItem) => {
    const product = guestItem.product;
    if (!product?._id || product.active === false || product.stock < 1) {
      return;
    }
    const key = getItemKey(guestItem);
    const existing = merged.get(key);
    const quantity = (existing?.quantity || 0) + guestItem.quantity;
    merged.set(key, {
      ...guestItem,
      ...existing,
      quantity: Math.min(quantity, product.stock),
    });
  });

  return [...merged.values()];
}

function responseItems(response) {
  const items = response?.data?.data?.cart?.items;
  if (!Array.isArray(items)) {
    throw new Error('The cart response was not valid.');
  }
  return items;
}

export function CartProvider({ children }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = user?._id || user?.id || '';
  const userIdRef = useRef(userId);
  const [items, setItems] = useState(readGuestCart);
  const itemsRef = useRef(items);
  const [isLoading, setIsLoading] = useState(Boolean(userId || isAuthLoading));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);
  const queueRef = useRef(Promise.resolve());
  const noticeTimer = useRef(null);

  const replaceItems = useCallback((nextItems) => {
    itemsRef.current = nextItems;
    setItems(nextItems);
  }, []);

  const showNotice = useCallback((message) => {
    setNotice(message);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 3500);
  }, []);

  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    let active = true;

    if (isAuthLoading) {
      return () => {
        active = false;
      };
    }

    if (!userId) {
      replaceItems([]);
      setError('');
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    setIsLoading(true);
    setError('');
    api.get('/cart')
      .then(async (response) => {
        const accountItems = responseItems(response);
        const guestItems = readGuestCart();
        if (!guestItems.length) {
          return accountItems;
        }

        const mergedItems = mergeCartItems(accountItems, guestItems);
        const saved = await api.put('/cart', { items: toApiItems(mergedItems) });
        window.localStorage.removeItem(storageKey);
        return responseItems(saved);
      })
      .then((loadedItems) => {
        if (active) {
          replaceItems(loadedItems);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.message || requestError.message || 'Your cart could not be loaded.');
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
  }, [isAuthLoading, replaceItems, retry, userId]);

  const enqueueChange = useCallback((change, successMessage) => {
    const operation = queueRef.current.then(async () => {
      const previousItems = itemsRef.current;
      const nextItems = change(previousItems);
      replaceItems(nextItems);
      setError('');
      setIsSaving(true);

      try {
        if (userIdRef.current) {
          const response = await api.put('/cart', { items: toApiItems(nextItems) });
          replaceItems(responseItems(response));
        } else {
          window.localStorage.setItem(storageKey, JSON.stringify(nextItems));
        }
        if (successMessage) {
          showNotice(successMessage);
        }
      } catch (requestError) {
        replaceItems(previousItems);
        throw new Error(
          requestError.response?.data?.message
            || requestError.message
            || 'Your cart could not be updated.',
        );
      } finally {
        setIsSaving(false);
      }
    });

    queueRef.current = operation.catch(() => {});
    return operation;
  }, [replaceItems, showNotice]);

  const addItem = useCallback((product, size = '', color = '') => enqueueChange((currentItems) => {
    const selectedSize = size.trim();
    const selectedColor = color.trim();
    if (product.sizes?.length && !selectedSize) {
      throw new Error('Choose a size before adding this piece.');
    }
    if (product.colors?.length && !selectedColor) {
      throw new Error('Choose a color before adding this piece.');
    }
    if (product.stock < 1 || product.active === false) {
      throw new Error('This piece is currently unavailable.');
    }

    const item = { product, size: selectedSize, color: selectedColor, quantity: 1 };
    const existingIndex = currentItems.findIndex((entry) => getItemKey(entry) === getItemKey(item));
    const existing = currentItems[existingIndex];
    if ((existing?.quantity || 0) + 1 > product.stock) {
      throw new Error(`Only ${product.stock} item${product.stock === 1 ? '' : 's'} available.`);
    }

    if (existingIndex < 0) {
      return [...currentItems, item];
    }
    return currentItems.map((entry, index) => (
      index === existingIndex ? { ...entry, quantity: entry.quantity + 1 } : entry
    ));
  }, `Added ${product.name} to your cart.`), [enqueueChange]);

  const setQuantity = useCallback((key, quantity) => enqueueChange((currentItems) => {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error('Quantity must be at least one.');
    }
    const target = currentItems.find((item) => getItemKey(item) === key);
    if (!target) {
      throw new Error('This cart item is no longer available.');
    }
    const stock = target.product?.stock ?? 0;
    if (quantity > target.quantity && quantity > stock) {
      throw new Error(`Only ${stock} item${stock === 1 ? '' : 's'} available.`);
    }
    return currentItems.map((item) => (
      getItemKey(item) === key ? { ...item, quantity } : item
    ));
  }), [enqueueChange]);

  const removeItem = useCallback((key) => enqueueChange(
    (currentItems) => currentItems.filter((item) => getItemKey(item) !== key),
  ), [enqueueChange]);

  const clearAfterCheckout = useCallback(() => {
    replaceItems([]);
    window.localStorage.removeItem(storageKey);
  }, [replaceItems]);

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = items.reduce(
    (total, item) => total + (Number(item.product?.price) || 0) * item.quantity,
    0,
  );

  return (
    <CartContext.Provider value={{
      items,
      itemCount,
      subtotal,
      shippingFee,
      total: subtotal + shippingFee,
      isLoading,
      isSaving,
      error,
      notice,
      addItem,
      setQuantity,
      removeItem,
      clearAfterCheckout,
      retryLoading: () => setRetry((value) => value + 1),
      getItemKey,
    }}>
      {children}
      {notice && <div className="cart-notice" role="status">{notice}</div>}
    </CartContext.Provider>
  );
}
