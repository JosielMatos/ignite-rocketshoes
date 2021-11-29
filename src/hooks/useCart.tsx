import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps) {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const isProductInCart = cart.find(product => product.id === productId);
      const {data: product} = await api.get<Product>(`products/${productId}`)
      const {data: stock} = await api.get<Stock>(`stock/${productId}`)
      
      if (!isProductInCart) {
        if (!stock.amount) {
          toast.error('Quantidade solicitada fora de estoque')
        } else {
          setCart([...cart, {...product, amount: 1}])
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, {...product, amount: 1}]))
          toast('Item adicionado!')
        }
      } else {
        if (stock.amount > isProductInCart.amount) {
          const updatedCart = cart.map(product => product.id === productId ? {
            ...product,
            amount: Number(product.amount) + 1
          } : product);

          setCart(updatedCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
          toast('Item adicionado')
        } else {
          toast.error('Quantidade solicitada fora de estoque')
        }
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      if (!cart.find(product => product.id === productId)) {
        toast.error('Erro na remoção do produto');
        return;
      };

      const updatedCart = cart.filter(product => product.id !== productId);

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (!amount) {
        return;
      }

      const {data} = await api.get(`stock/${productId}`);
      const stock = amount <= data.amount

      if (!stock) {
        toast.error('Quantidade solicitada fora de estoque')
        return;
      }

      const updatedCart = cart.map(product => product.id === productId ? {
        ...product,
        amount: amount
      }: product)

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
