// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

import App from './App.tsx';
import   HomePage from './pages/HomePage.tsx'; // Importa a HomePage
import { ChatPage } from './pages/ChatPage.tsx'; // Importa a ChatPage
import './index.css';

// Cria o nosso roteador
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />, // O <App> é o layout principal
    children: [ // E estas são as páginas que serão renderizadas dentro do <Outlet> do App
      {
        index: true, // Esta é a rota padrão ("/")
        element: <HomePage />,
      },
      {
        path: 'chat', // Esta é a rota "/chat"
        element: <ChatPage />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);