"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// Cart and wishlist live on the device (localStorage). Prices/stock are always re-checked by the server.

export type CartItem = { variantId: string; quantity: number };

type CartCtx = {
  items: CartItem[];
  ready: boolean;
  count: number;
  add: (variantId: string, quantity?: number) => void;
  update: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
};

type WishCtx = { ids: string[]; ready: boolean; has: (id: string) => boolean; toggle: (id: string) => boolean };

const Cart = createContext<CartCtx | null>(null);
const Wish = createContext<WishCtx | null>(null);

const MAX_QTY = 10;

function useStored<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw));
    } catch {}
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        try {
          setValue(e.newValue ? JSON.parse(e.newValue) : fallback);
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value, ready]);
  return [value, setValue, ready] as const;
}

export function StoreProviders({ children }: { children: React.ReactNode }) {
  const [items, setItems, cartReady] = useStored<CartItem[]>("cart:v1", []);
  const [ids, setIds, wishReady] = useStored<string[]>("wishlist:v1", []);

  const add = useCallback(
    (variantId: string, quantity = 1) =>
      setItems((prev) => {
        const found = prev.find((i) => i.variantId === variantId);
        if (found) return prev.map((i) => (i === found ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + quantity) } : i));
        return [...prev, { variantId, quantity: Math.min(MAX_QTY, quantity) }];
      }),
    [setItems],
  );
  const update = useCallback(
    (variantId: string, quantity: number) =>
      setItems((prev) =>
        quantity <= 0
          ? prev.filter((i) => i.variantId !== variantId)
          : prev.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.min(MAX_QTY, quantity) } : i)),
      ),
    [setItems],
  );
  const remove = useCallback((variantId: string) => setItems((prev) => prev.filter((i) => i.variantId !== variantId)), [setItems]);
  const clear = useCallback(() => setItems([]), [setItems]);

  const cart = useMemo<CartCtx>(
    () => ({ items, ready: cartReady, count: items.reduce((n, i) => n + i.quantity, 0), add, update, remove, clear }),
    [items, cartReady, add, update, remove, clear],
  );

  const wish = useMemo<WishCtx>(
    () => ({
      ids,
      ready: wishReady,
      has: (id) => ids.includes(id),
      toggle: (id) => {
        const adding = !ids.includes(id);
        setIds(adding ? [id, ...ids].slice(0, 100) : ids.filter((x) => x !== id));
        return adding;
      },
    }),
    [ids, wishReady, setIds],
  );

  return (
    <Cart.Provider value={cart}>
      <Wish.Provider value={wish}>{children}</Wish.Provider>
    </Cart.Provider>
  );
}

export function useCart() {
  const ctx = useContext(Cart);
  if (!ctx) throw new Error("useCart must be used inside StoreProviders");
  return ctx;
}

export function useWishlist() {
  const ctx = useContext(Wish);
  if (!ctx) throw new Error("useWishlist must be used inside StoreProviders");
  return ctx;
}
