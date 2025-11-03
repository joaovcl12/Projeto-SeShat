// src/pages/ChatPage.tsx
import { useState, useEffect, useRef } from 'react';
import styles from './ChatPage.module.css';

const API_URL = "https://seshat-api-m30w.onrender.com";

// --- Tipos ---
type Message = { id: number; text: string; sender: 'user' | 'ai'; };
type MateriasResponse = {
  materias_disponiveis: string[];
};
type Question = {
  id: number;
  subject: string;
  text: string;
  options: Record<string, string> | string[];
  source: string | null;
  year: number | null;
};
type ChatItem = Message | (Question & { type: 'question' });

// --- Componentes de Ajuda ---

const AiAvatar = () => ( <div className={`${styles.avatar} d-flex align-items-center justify-content-center`}><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" className="bi bi-robot" viewBox="0 0 16 16"><path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5ZM3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.58 26.58 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.933.933 0 0 1-.765.935c-.845.147-2.34.346-4.235.346-1.895 0-3.39-.2-4.235-.346A.933.933 0 0 1 3 9.219V8.062Zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a24.767 24.767 0 0 1-1.871-.183.25.25 0 0 0-.068.217l.22.92a.25.25 0 0 0 .217.217c.134.04.27.082.412.126l.22.92a.25.25 0 0 0 .217.217c.134.04.27.082.412.126l.22.92a.25.25 0 0 0 .217.217c.134.04.27.082.412.126l.22.92a.25.25 0 0 0 .217.217c.134.04.27.082.412.126l.92.22a.25.25 0 0 0 .217-.068l.92-.9a.25.25 0 0 0 .068-.217l-.22-.92a.25.25 0 0 0-.217-.217c-.134-.04-.27-.082-.412.126l-.22-.92a.25.25 0 0 0-.217-.217c-.134-.04-.27-.082-.412.126l-.22-.92a.25.25 0 0 0-.217-.217c-.134-.04-.27-.082-.412.126l-.92-.22a.25.25 0 0 0-.217.068Z"/><path d="M8 1a2.5 2.5 0 0 1 2.5 2.5V4h-5v-.5A2.5 2.5 0 0 1 8 1Zm3.5 3v-.5a3.5 3.5 0 1 0-7 0V4H1v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4h-3.5Z"/></svg></div>);

const Sidebar = ({ isOpen, onToggle, activeSubject, onSubjectClick, subjects }: {
  isOpen: boolean;
  onToggle: () => void;
  activeSubject: string;
  onSubjectClick: (subject: string) => void;
  subjects: string[];
}) => (
  <div className={styles.glassPanel}>
    <div className={styles.sidebarHeader}>
      {isOpen && <h2 className="fs-5 fw-bold text-white mb-0">Matérias</h2>}
      <button className={styles.toggleButton} onClick={onToggle}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-layout-sidebar-inset" viewBox="0 0 16 16"><path d="M14 2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h12zM2 1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2z" /><path d="M3 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4z" /></svg>
      </button>
    </div>
    {isOpen && (
      <ul className={styles.sidebarList}>
        {subjects.map((subject) => (
          <li key={subject} className={`${styles.subjectItem} ${subject === activeSubject ? styles.active : ''} text-white-50`} onClick={() => onSubjectClick(subject)}>
            {subject}
          </li>
        ))}
        {subjects.length === 0 && <li className="text-white-50 p-3">Carregando matérias...</li>}
      </ul>
    )}
     {!isOpen && (
       <ul className={styles.sidebarList} style={{ paddingTop: '2rem' }}>
         {subjects.map((subject) => (
           <li key={subject + '-icon'} title={subject} className={`${styles.subjectItem} ${subject === activeSubject ? styles.active : ''} justify-content-center`} onClick={() => onSubjectClick(subject)}>
             <span className='fs-5'>{subject.charAt(0)}</span>
           </li>
         ))}
       </ul>
     )}
  </div>
);

const ChatMessage = ({ msg }: { msg: Message }) => (
  <div className={`${styles.messageBubble} ${styles[msg.sender]}`}>
    {msg.sender === 'ai' && <AiAvatar />}
    <div className={styles.messageContent}>
      <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{msg.text}</p>
    </div>
  </div>
);

const QuestionDisplay = ({ question, onAnswerSelect }: {
  question: Question;
  onAnswerSelect: (optionKey: string) => void; 
}) => {
  const optionsArray = Array.isArray(question.options)
    ? question.options.map((text, index) => ({ key: String(index), text }))
    : Object.entries(question.options).map(([key, text]) => ({ key, text }));

  return (
    <div className={`${styles.messageBubble} ${styles.ai}`}>
      <AiAvatar />
      <div className={styles.messageContent}>
        {(question.source || question.year) && (
          <small className="d-block text-white-50 mb-2">
            {question.source} {question.year}
          </small>
        )}
        <p style={{ whiteSpace: 'pre-wrap' }}>{question.text}</p>
        <div className="d-grid gap-2 mt-3">
          {optionsArray.map(({ key, text }) => (
            <button 
              key={key} 
              className="btn btn-outline-light text-start"
              onClick={() => onAnswerSelect(key)}
            >
              <strong>{key}:</strong> {text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Componente Principal da Página ---
export function ChatPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [activeSubject, setActiveSubject] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [questionList, setQuestionList] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // Busca as matérias da API
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await fetch(`${API_URL}/materias`);
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        const data: MateriasResponse = await response.json();
        const availableSubjects = data.materias_disponiveis || [];
        setSubjectsList(availableSubjects);

        if (availableSubjects.length > 0 && !activeSubject) {
             const firstSubject = availableSubjects[0];
             setActiveSubject(firstSubject);
             setChatHistory([{ id: 1, text: `Olá! Sou a IAra. Vamos começar com ${firstSubject}. Qual sua dúvida?`, sender: 'ai' }]);
         } else if (availableSubjects.length === 0) {
              setChatHistory([{ id: 1, text: `Olá! Sou a IAra. Não encontrei matérias disponíveis no momento.`, sender: 'ai' }]);
         }
      } catch (error) {
        console.error("Falha ao buscar matérias:", error);
        setSubjectsList([]);
        setChatHistory([{ id: 1, text: `Olá! Tive um problema para carregar as matérias. Tente recarregar a página.`, sender: 'ai' }]);
      }
    };
    fetchSubjects();
  }, [activeSubject]); 

  // Rola para o fim das mensagens
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

  // Função para enviar mensagem de texto
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    const userMessage: Message = { id: Date.now(), text: inputValue, sender: 'user' };
    setChatHistory(prev => [...prev, userMessage]);
    setInputValue('');

    setTimeout(() => {
      const aiResponse: Message = { id: Date.now() + 1, text: `Analisando sua pergunta sobre ${activeSubject}...`, sender: 'ai' };
      setChatHistory(prev => [...prev, aiResponse]); 
    }, 1200);
  };

  // Função para exibir a próxima questão
  const showNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < questionList.length) {
      setCurrentQuestionIndex(nextIndex);
      setChatHistory(prev => [
        ...prev,
        { ...questionList[nextIndex], type: 'question' }
      ]);
    } else {
      setChatHistory(prev => [
        ...prev,
        { id: Date.now()+2, text: 'Você terminou todas as questões que eu busquei! Clique na matéria novamente para buscar mais.', sender: 'ai' }
      ]);
    }
  };

  // Função para lidar com a seleção de resposta
  const handleAnswerSelect = (selectedOptionKey: string) => {
    const currentQuestion = questionList[currentQuestionIndex];
    const answerText = Array.isArray(currentQuestion.options) 
        ? currentQuestion.options[parseInt(selectedOptionKey)] 
        : currentQuestion.options[selectedOptionKey];

    const userMessage: Message = { 
      id: Date.now(), 
      text: `Minha resposta: ${selectedOptionKey}. ${answerText}`, 
      sender: 'user' 
    };

    setChatHistory(prev => [
        ...prev, 
        userMessage,
        { id: Date.now()+1, text: `Resposta "${selectedOptionKey}" recebida. Verificando...`, sender: 'ai' }
    ]);
    
    setTimeout(() => {
      showNextQuestion();
    }, 2000);
  };

  // Função para mudar de matéria
  const handleSubjectClick = async (subject: string) => {
    setActiveSubject(subject);
    setChatHistory([
      { id: Date.now(), text: `Certo! Buscando 10 questões de ${subject}...`, sender: 'ai' }
    ]);
    setQuestionList([]);
    setCurrentQuestionIndex(0);

    try {
      const response = await fetch(`${API_URL}/perguntas/${subject}?count=10`);

      if (!response.ok) {
        if (response.status === 404) {
          setChatHistory(prev => [...prev, { id: Date.now()+1, text: `Desculpe, ainda não tenho questões de ${subject} no banco de dados.`, sender: 'ai' }]);
          return;
        }
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data: Question[] = await response.json();

      if (data.length === 0) {
         setChatHistory(prev => [...prev, { id: Date.now()+1, text: `Desculpe, não encontrei nenhuma questão de ${subject} no banco de dados.`, sender: 'ai' }]);
         return;
      }

      setQuestionList(data);
      setCurrentQuestionIndex(0);

      setChatHistory(prev => [
        ...prev,
        { id: Date.now()+1, text: `Encontrei ${data.length} questões. Vamos começar!`, sender: 'ai' },
        { ...data[0], type: 'question' }
      ]);

    } catch (error) {
      console.error("Erro ao buscar questões:", error);
      setChatHistory(prev => [...prev, { id: Date.now()+1, text: `Desculpe, tive um problema ao buscar as questões. Tente novamente.`, sender: 'ai' }]);
    }
  };

  return (
    <div className={styles.chatPageContainer}>
      <div className={`${styles.sidebarContainer} ${isSidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
        <Sidebar
          isOpen={isSidebarOpen}
          onToggle={() => setSidebarOpen(!isSidebarOpen)}
          activeSubject={activeSubject}
          onSubjectClick={handleSubjectClick}
          subjects={subjectsList}
        />
      </div>

      <div className={`${styles.glassPanel} ${styles.chatWindow}`}>
        <main className={styles.messageList}>
          {/* --- CORREÇÃO APLICADA AQUI --- */}
          {/* Mudamos o 'if' para checar por 'sender', que é uma propriedade
              que só existe no tipo 'Message'. Isso resolve a ambiguidade
              para o TypeScript. */}
          {chatHistory.map(item => {
            if ('sender' in item) {
              // Se tem 'sender', o TypeScript sabe que é uma 'Message'
              return <ChatMessage key={item.id} msg={item} />
            } else {
              // Senão, ele sabe que é uma 'Question'
              return <QuestionDisplay key={item.id} question={item} onAnswerSelect={handleAnswerSelect} />
            }
          })}
          {/* --- FIM DA CORREÇÃO --- */}
          <div ref={messagesEndRef} />
        </main>

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