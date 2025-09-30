// src/pages/HomePage.tsx

// Importamos o componente 'Link' do React Router.
// Ele nos permite criar links de navegação que trocam de página sem recarregar o site inteiro.
import { Link } from 'react-router-dom';
// Importamos nosso CSS customizado para aplicar os estilos que o Bootstrap não cobre.
// O '../' é necessário para "subir" um nível de pasta, de 'pages' para 'src'.
import '../App.css';

// Este é um "helper component" (componente de ajuda) que só usamos nesta página.
// Ele cria o círculo azul estilizado para envolver os ícones na seção de funcionalidades.
const FeatureIcon = ({ children }: { children: React.ReactNode }) => (
  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
    {children}
  </div>
);

// Este é o componente principal da Homepage.
export function HomePage() {
  return (
    // Usamos um Fragmento (<>) para agrupar os elementos sem adicionar uma div extra.
    <>
      {/* O <header> foi removido daqui porque agora ele vive no layout principal (App.tsx) */}

      {/* Seção Principal (Hero) com as nossas classes customizadas de estilo e animação. */}
      <main className="hero-section text-center">
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <h1 className="display-3 fw-bolder gradient-text fade-in-up">
            Revolucione Seus Estudos com Inteligêncial
          </h1>
          <p className="lead text-white-50 my-4 mx-auto fade-in-up" style={{ maxWidth: '700px', animationDelay: '0.2s' }}>
            A IAra é sua mentora de estudos particular, projetada para impulsionar sua aprovação nos vestibulares e concursos mais importantes da Região Norte.
          </p>
          <div className="mt-5 fade-in-up" style={{ animationDelay: '0.4s' }}>
            {/* O componente Link do React Router usa a propriedade 'to' para definir o destino. */}
            <Link
              to="/chat" 
              className="btn btn-success btn-lg fw-bold px-5 py-3 rounded-pill shadow"
            >
              Começar a Estudar Agora
            </Link>
          </div>
        </div>
      </main>

      {/* Seção de Funcionalidades */}
      <section className="container py-5 mt-5">
        <h2 className="text-center fw-bolder display-5 mb-5 text-white">
          Ferramentas para sua Aprovação
        </h2>
        {/* Sistema de Grid do Bootstrap: 'row' cria uma linha, 'g-4' adiciona espaçamento (gap). */}
        <div className="row g-4">
          {/* Cada 'col-md-4' cria uma coluna que ocupa 1/3 da largura em telas médias ou maiores. */}
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

      {/* O <footer> também foi removido daqui porque agora vive no App.tsx */}
    </>
  );
}

// Usamos 'export default' para que este componente possa ser importado facilmente no 'main.tsx'.
export default HomePage;