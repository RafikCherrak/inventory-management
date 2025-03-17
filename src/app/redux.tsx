"use client";

import { useEffect, useRef, useState } from "react";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import {
  TypedUseSelectorHook,
  useDispatch,
  useSelector,
  Provider,
} from "react-redux";
import globalReducer from "@/app/state";
import { api } from "@/app/state/api";
import { setupListeners } from "@reduxjs/toolkit/query";

import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import { PersistGate } from "redux-persist/integration/react";
import createWebStorage from "redux-persist/lib/storage/createWebStorage";

/* Fonction pour éviter d'accéder au localStorage pendant le SSR */
const createNoopStorage = () => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    getItem(_key: any) {
      return Promise.resolve<string | null>(null);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setItem(_key: any, value: any) {
      return Promise.resolve(value);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    removeItem(_key: any) {
      return Promise.resolve();
    },
  };
};

/* Hook pour gérer le stockage de manière sécurisée */
const useStorage = () => {
  const [storage, setStorage] = useState(createNoopStorage());

  useEffect(() => {
    setStorage(createWebStorage("local"));
  }, []);

  return storage;
};

/* Redux Persist Configuration */
const rootReducer = combineReducers({
  global: globalReducer,
  [api.reducerPath]: api.reducer,
});

/* Redux Provider avec gestion du stockage */
export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const storage = useStorage();

  const persistConfig = {
    key: "root",
    storage,
    whitelist: ["global"],
  };

  const persistedReducer = persistReducer(persistConfig, rootReducer);
  const storeRef = useRef<ReturnType<typeof configureStore> | null>(null);

  if (!storeRef.current) {
    storeRef.current = configureStore({
      reducer: persistedReducer,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: {
            ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
          },
        }).concat(api.middleware),
    });
    setupListeners(storeRef.current.dispatch);
  }

  const persistor = persistStore(storeRef.current);

  return (
    <Provider store={storeRef.current}>
      <PersistGate loading={null} persistor={persistor}>
        {children}
      </PersistGate>
    </Provider>
  );
}

/* Hooks Redux */
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = ReturnType<typeof configureStore>["dispatch"];
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
