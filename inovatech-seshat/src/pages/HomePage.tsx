// src/pages/HomePage.tsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../App.css';

const API_URL = "https://seshat-api-m30w.onrender.com";

const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

export function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const warmUpApi = async () => {
      try {
        await fetch(API_URL, {
          method: 'GET',
          mode: 'cors',
          headers: { 'Accept': 'application/json' }
        });
      } catch { //catch
      }
    };

    warmUpApi();
  }, []);

  useEffect(() => {
    if (getAuthToken()) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  }, []);

  const targetPath = isLoggedIn ? "/chat" : "/login";

  return (
    <>
      <main className="hero-section text-center">
        <div className="container hero-content-wrapper d-flex flex-column flex-md-row align-items-center justify-content-center">

          <img
            src='/iara2.png'
            alt='Mascote Iara'
            className='iara-img'
          />

          <div className="text-content" style={{ position: 'relative', zIndex: 1 }}>
            <h1 className="display-3 fw-bolder gradient-text fade-in-up text-md-start">
              Revolucione seus Estudos com Inteligência Artificial
            </h1>
            <p className="lead text-white-50 my-4 mx-auto mx-md-0 fade-in-up text-md-start" style={{ maxWidth: '700px', animationDelay: '0.2s' }}>
              A IAra é sua mentora de estudos particular, projetada para impulsionar sua aprovação nos vestibulares e concursos mais importantes da Região Norte.
            </p>
            <div className="mt-5 fade-in-up text-md-start" style={{ animationDelay: '0.4s' }}>
              <Link
                to={targetPath}
                className="btn btn-success btn-lg fw-bold px-5 py-3 rounded-pill shadow"
              >
                Vamos começar!
              </Link>
            </div>
          </div>
        </div>
      </main>

      <section className="container py-5 mt-5">
        <h2 className="text-center fw-bolder display-5 mb-5 text-white">
          Ferramentas para sua Aprovação
        </h2>
        <div className="row g-4">
          <div className="col-md-4">
            <div className="card feature-card h-100 p-3 text-white">
              <div className="card-body">
                <h3 className="card-title fs-4 fw-bold mb-3">Base de Conhecimento Focada</h3>
                <p className="card-text text-white-50">Conteúdo prático com base nas provas do ENEM, PSC e SIS.</p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card feature-card h-100 p-3 text-white">
              <div className="card-body">
                <h3 className="card-title fs-4 fw-bold mb-3">Mestre da Redação</h3>
                <p className="card-text text-white-50">Acesse modelos, discuta temas e receba dicas para sua redação.</p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card feature-card h-100 p-3 text-white">
              <div className="card-body">
                <h3 className="card-title fs-4 fw-bold mb-3">Acessibilidade Total</h3>
                <p className="card-text text-white-50">Estude no seu ritmo, de onde estiver, através do seu computador ou celular.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default HomePage;