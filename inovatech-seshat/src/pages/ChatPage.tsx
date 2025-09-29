// src/pages/ChatPage.tsx

// Importamos os "Hooks" do React que nos dão superpoderes para gerenciar o estado,
// efeitos colaterais e referências a elementos da página.
import { useState, useEffect, useRef } from 'react';
// Importamos nosso arquivo de CSS Module para estilização.
import styles from './ChatPage.module.css';

// --- Tipos e Dados ---

// Usando TypeScript, definimos uma "planta" para nossos objetos de mensagem.
// Isso garante que cada mensagem sempre terá um id, texto e um remetente.
type Message = { id: number; text: string; sender: 'user' | 'ai'; };

// Um array simples com os nomes das matérias para a barra lateral.
const subjects = ['Matemática', 'Português', 'História', 'Redação', 'Física'];

// --- Componentes de Ajuda (definidos dentro deste arquivo por simplicidade) ---

// Componente para renderizar o ícone de avatar da IA.
const AiAvatar = () => ( <div className={`${styles.avatar} d-flex align-items-center justify-content-center`}><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" className="bi bi-robot" viewBox="0 0 16 16"><path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5ZM3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.58 26.58 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.933.933 0 0 1-.765.935c-.845.147-2.34.346-4.235.346-1.895 0-3.39-.2-4.235-.346A.933.933 0 0 1 3 9.219V8.062Zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a24.767 24.767 0 0 1-1.871-.183.25.25 0 0 0-.068.217l.22.92a.25.25 0 0 0 .217.217c.134.04.27.082.412.126l.22.92a.25.25 0 0 0 .217.217c.134.04.27.082.412.126l.22.92a.25.25 0 0 0 .217.217c.134.04.27.082.412.126l.22.92a.25.25 0 0 0 .217.217c.134.04.27.082.412.126l.92.22a.25.25 0 0 0 .217-.068l.92-.9a.25.25 0 0 0 .068-.217l-.22-.92a.25.25 0 0 0-.217-.217c-.134-.04-.27-.082-.412-.126l-.22-.92a.25.25 0 0 0-.217-.217c-.134-.04-.27-.082-.412-.126l-.22-.92a.25.25 0 0 0-.217-.217c-.134-.04-.27-.082-.412-.126l-.92-.22a.25.25 0 0 0-.217.068Z"/><path d="M8 1a2.5 2.5 0 0 1 2.5 2.5V4h-5v-.5A2.5 2.5 0 0 1 8 1Zm3.5 3v-.5a3.5 3.5 0 1 0-7 0V4H1v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4h-3.5Z"/></svg></div>);

// O componente da Barra Lateral (Sidebar).
// Ele recebe "props" (propriedades) do componente pai (ChatPage) para funcionar:
// - isOpen: um booleano (true/false) que diz se ela deve estar aberta.
// - onToggle: uma função para ser chamada quando o botão de recolher/expandir for clicado.
// - activeSubject: a string da matéria atualmente selecionada.
// - onSubjectClick: uma função para ser chamada quando uma matéria da lista for clicada.
const Sidebar = ({ isOpen, onToggle, activeSubject, onSubjectClick }: { isOpen: boolean, onToggle: () => void, activeSubject: string, onSubjectClick: (subject: string) => void }) => (
  <div className={styles.glassPanel}>
    <div className={styles.sidebarHeader}>
      {/* O título "Matérias" só é renderizado se a sidebar estiver aberta (isOpen for true). */}
      {isOpen && <h2 className="fs-5 fw-bold text-white mb-0">Matérias</h2>}
      {/* O botão de recolher/expandir. Ao ser clicado, chama a função 'onToggle' que veio do pai. */}
      <button className={styles.toggleButton} onClick={onToggle}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-layout-sidebar-inset" viewBox="0 0 16 16"><path d="M14 2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h12zM2 1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2z"/><path d="M3 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4z"/></svg>
      </button>
    </div>
    {/* A lista de matérias só é renderizada se a sidebar estiver aberta. */}
    {isOpen && (
      <ul className={styles.sidebarList}>
        {/* Usamos .map() para criar um item de lista <li> para cada matéria no nosso array 'subjects'. */}
        {subjects.map((subject) => (
          // O item da lista agora é clicável e destaca-se se for a matéria ativa.
          <li 
            key={subject} // A 'key' é um identificador único para o React.
            // A classe '.active' é aplicada dinamicamente se a matéria da vez for a mesma que está no estado 'activeSubject'.ki
            className={`${styles.subjectItem} ${subject === activeSubject ? styles.active : ''} text-white-50`}
            // Ao clicar, chama a função 'onSubjectClick' que veio do pai, passando o nome da matéria clicada.
            onClick={() => onSubjectClick(subject)}
          >
            {subject}
          </li>
        ))}
      </ul>
    )}
  </div>
);

// Componente para renderizar uma única bolha de mensagem.
const ChatMessage = ({ msg }: { msg: Message }) => ( <div className={`${styles.messageBubble} ${styles[msg.sender]}`}>{msg.sender === 'ai' && <AiAvatar />}<div className={styles.messageContent}>{msg.text}</div></div>);

// --- Componente Principal da Página ---
export function ChatPage() {
  // Criamos o estado que controla se a sidebar está aberta ou fechada. Começa como 'true' (aberta).
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  // Criamos o estado para guardar qual matéria está selecionada. Começa com 'Matemática'.
  const [activeSubject, setActiveSubject] = useState('Matemática');

  // Estado que guarda o array com todas as mensagens da conversa.
  const [messages, setMessages] = useState<Message[]>([{ id: 1, text: `Olá! Sou a IAra. Vamos começar com ${activeSubject}. Qual sua dúvida?`, sender: 'ai' }]);
  // Estado que guarda o valor atual do campo de input.
  const [inputValue, setInputValue] = useState('');
  // Uma "referência" a um elemento da página. Usaremos para rolar o chat para a última mensagem.
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // Este "Hook de Efeito" executa a função de rolar a tela para baixo
  // TODA VEZ que o array de 'messages' for atualizado.
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Função para enviar uma mensagem.
  const handleSendMessage = () => {
    if (!inputValue.trim()) return; // Não faz nada se a mensagem estiver vazia.
    const userMessage: Message = { id: Date.now(), text: inputValue, sender: 'user' };
    setMessages(prev => [...prev, userMessage]); // Adiciona a mensagem do usuário ao array.
    setInputValue(''); // Limpa o input.

    // Simula a resposta da IA depois de 1.2 segundos.
    setTimeout(() => {
      // A resposta da IA agora inclui a matéria ativa para dar mais contexto.
      const aiResponse: Message = { id: Date.now() + 1, text: `Analisando sua pergunta sobre ${activeSubject}...`, sender: 'ai' };
      setMessages(prev => [...prev, userMessage, aiResponse]);
    }, 1200);
  };

  // Função chamada quando uma matéria da sidebar é clicada.
  const handleSubjectClick = (subject: string) => {
    // Atualiza o estado da matéria ativa.
    setActiveSubject(subject);
    // Limpa o chat e adiciona uma nova mensagem de boas-vindas da IA.
    setMessages([
      { id: Date.now(), text: `Certo! Vamos focar em ${subject}. Qual é a sua primeira dúvida?`, sender: 'ai' }
    ]);
  };

  // JSX que renderiza a página.
  return (
    <div className={styles.chatPageContainer}>
      {/* A largura do container da sidebar muda dinamicamente com base no estado 'isSidebarOpen'. */}
      <div className={`${styles.sidebarContainer} ${isSidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
        {/* Passamos os estados e as funções como "props" para o componente Sidebar. */}
        <Sidebar 
          isOpen={isSidebarOpen} 
          onToggle={() => setSidebarOpen(!isSidebarOpen)}
          activeSubject={activeSubject}
          onSubjectClick={handleSubjectClick}
        />
      </div>
      
      {/* Container da Janela do Chat */}
      <div className={`${styles.glassPanel} ${styles.chatWindow}`}>
        <main className={styles.messageList}>
          {/* Mapeia o array de mensagens para renderizar cada uma delas. */}
          {messages.map(msg => <ChatMessage key={msg.id} msg={msg} />)}
          {/* Div invisível no final que serve como âncora para a rolagem automática. */}
          <div ref={messagesEndRef} />
        </main>
        
        {/* Rodapé com a área de input. */}
        <footer className={styles.inputArea} data-bs-theme="dark">
          <div className={`${styles.inputGroup} d-flex align-items-center`}>
            <input type="text" className={`${styles.chatInput} form-control`} placeholder="Digite sua mensagem..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}/>
            <button className={`${styles.sendButton} btn p-2`} onClick={handleSendMessage}><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" className="bi bi-send-fill" viewBox="0 0 16 16"><path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083l6-15Zm-1.833 1.89L6.637 10.07l-4.99-3.176 14.12-6.393Z"/></svg></button>
          </div>
        </footer>
      </div>
    </div>
  );
}