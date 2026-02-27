import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useToast } from "./ToastProvider";

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

export function CartProvider({ children }) {
  // Initialize cart from localStorage directly to avoid race condition

  const loadCart = () => {
    try {
      const raw = localStorage.getItem("cart");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };
  
  const saveCart = (cart) =>
    localStorage.setItem("cart", JSON.stringify(cart));
  
  const [cart, setCart] = useState(loadCart);

  useEffect(() => {
    saveCart(cart);
  }, [cart]);
  

  const addToCart = ({ productId, name, image, variant }) => {

    setCart(prev => {
      const product = prev.find(p => p.productId === productId);
  
      if (!product) {
        return [
          ...prev,
          {
            productId,
            name,
            image,
            variants: [{ ...variant, quantity: 1 }]
          }
        ];
      }
  
      const existingVariant = product.variants.find(
        v => v.sku === variant.sku
      );
  
      if (existingVariant) {
        return prev.map(p =>
          p.productId === productId
            ? {
                ...p,
                variants: p.variants.map(v =>
                  v.sku === variant.sku
                    ? { ...v, quantity: v.quantity + 1 }
                    : v
                )
              }
            : p
        );
      }
  
      return prev.map(p =>
        p.productId === productId
          ? { ...p, variants: [...p.variants, { ...variant, quantity: 1 }] }
          : p
      );
    });
  };

  
  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(p => p.productId !== productId));
  };
  
  
  const normalize = (v) =>
    v === null || v === undefined
      ? null
      : Array.isArray(v)
      ? v[0]
      : v;

  const makeSkuKey = ({ id, color, size }) =>
    [
      id,
      normalize(color?.[0] ?? color),
      normalize(size?.[0] ?? size),
    ].join("|");
      
    const removeVariantFromCart = (sku) => {
      setCart(prev =>
        prev
          .map(p => ({
            ...p,
            variants: p.variants.filter(v => v.sku !== sku)
          }))
          .filter(p => p.variants.length > 0)
      );
    };
    
    
  
    const increment = (sku) => {
      setCart(prev =>
        prev.map(p => ({
          ...p,
          variants: p.variants.map(v => {
            if (v.sku !== sku) return v;
            

            const max = Number(v.stock ?? Infinity);
            return {
              ...v,
              quantity: Math.min(v.quantity + 1, max)
            };
          })
        }))
      );
    };

    const decrement = (sku) => {
      setCart(prev =>
        prev
          .map(p => ({
            ...p,
            variants: p.variants
              .map(v =>
                v.sku === sku
                  ? { ...v, quantity: Math.max(v.quantity - 1, 0) }
                  : v
              )
              .filter(v => v.quantity > 0)
          }))
          .filter(p => p.variants.length > 0)
      );
    };
    


    const updateQuantity = (sku, qty) => {
      const q = Math.max(0, Number(qty));
    
      setCart(prev =>
        prev
          .map(p => ({
            ...p,
            variants: p.variants
              .map(v =>
                v.sku === sku ? { ...v, quantity: q } : v
              )
              .filter(v => v.quantity > 0)
          }))
          .filter(p => p.variants.length > 0)
      );
    };
    
// Get quantity for a product variant
const getQuantity = (sku) => {
  for (const p of cart) {
    const v = p.variants.find(v => v.sku === sku);
    if (v) return v.quantity;
  }
  return 0;
};

const updateVariant = (itemId, newVariant) => {
  setCart(currentCart => 
      currentCart.map(item => 
          item.id === itemId
              ? { 
                  ...item, 
                  selectedVariant: newVariant, 
                  price: newVariant.price
                }
              : item
      )
  );
};


  const clearCart = () => {
    setCart([]);
    localStorage.removeItem("cart");
  };



  return (


    <CartContext.Provider value={{
      cart,
      addToCart,
      increment,
      decrement,
      updateQuantity,
      removeVariantFromCart,
      removeFromCart,
      getQuantity,
      clearCart: () => setCart([])
    }}>
      {children}
    </CartContext.Provider>

  );
}
