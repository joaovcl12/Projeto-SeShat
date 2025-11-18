import { useState, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import './App.css';

const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

function App() {
  const location = useLocation();

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (getAuthToken()) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  }, []);

  const targetPath = isLoggedIn ? "/chat" : "/login";

  const Header = () => (
    <header className="navbar navbar-expand-lg sticky-top header-translucent shadow-sm">
      <nav className="container justify-content-between">

        <Link className="navbar-brand fs-4 fw-bold text-white" to="/">
          Projeto SeShat - <span className="text-white">IAra</span>
        </Link>

        {location.pathname !== '/chat' && (
          <Link
            to={targetPath}
            className="access-btn btn btn-primary fw-bold"
          >
            Acessar Chat
          </Link>
        )}
      </nav>
    </header>
  );

  const Footer = () => (
    <footer className="py-5 mt-auto">
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