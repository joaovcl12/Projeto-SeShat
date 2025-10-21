// src/App.tsx

// 1. Agora também importamos o 'Link' junto com 'Outlet' e 'useLocation'
import { Outlet, useLocation, Link } from 'react-router-dom';
import './App.css';

function App() {
  // A lógica do 'location' que já tínhamos continua aqui
  const location = useLocation();

  // O componente Header agora será um pouco mais inteligente
  const Header = () => (
    <header className="navbar navbar-expand-lg sticky-top header-translucent shadow-sm">
      <nav className="container justify-content-between">
        {/* 2. Trocamos a tag 'a' pelo componente 'Link' do React Router.
            A propriedade 'href' vira 'to'. */}
        <Link className="navbar-brand fs-4 fw-bold text-white" to="/">
          Projeto SeShat - <span className="text-white">IAra</span>
        </Link>

        {/* 3. Adicionamos a mesma condição do rodapé aqui:
            O botão SÓ será renderizado SE o caminho da URL (location.pathname)
            for DIFERENTE de '/chat'.
        */}
        {location.pathname !== '/chat' && (
          <Link to="/chat" className="access-btn btn btn-primary fw-bold">
            Acessar Chat
          </Link>
        )}
      </nav>
    </header>
  );

  // O componente Footer permanece o mesmo
  const Footer = () => (
    <footer className="py-5 mt-auto border-top border-white border-opacity-10">
      <div className="container text-center text-white-50">
        <p>&copy; {new Date().getFullYear()} Projeto SeShat.</p>
      </div>
    </footer>
  );

  return (
    <div className="d-flex flex-column" style={{ minHeight: '100vh' }}>
      <Header />
      <Outlet />
      {location.pathname !== '/chat' && <Footer />}
    </div>
  );
}

export default App;