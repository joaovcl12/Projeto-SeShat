// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

import App from './App.tsx';
import HomePage from './pages/HomePage.tsx';
import { ChatPage } from './pages/ChatPage.tsx';
import LoginRegister from "./pages/LoginRegister.tsx";
import './index.css';

const router = createBrowserRouter([
  // Rota de Login/Registro (tela cheia, sem o layout principal)
  {
    path: '/login',
    element: <LoginRegister />,
  },
  // Rotas principais do app (com o layout principal <App>)
  {
    path: '/',
    element: <App />, 
    children: [
      {
        index: true, 
        element: <HomePage />,
      },
      {
        path: 'chat',
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