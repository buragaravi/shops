import { configureStore } from '@reduxjs/toolkit';
import productReducer from './slices/productSlice';
import comboPackReducer from './slices/comboPackSlice';
import bannerReducer from './slices/bannerSlice';
import categoryReducer from './slices/categorySlice';
import cartReducer from './slices/cartSlice';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    products: productReducer,
    comboPacks: comboPackReducer,
    banners: bannerReducer,
    categories: categoryReducer,
    cart: cartReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
