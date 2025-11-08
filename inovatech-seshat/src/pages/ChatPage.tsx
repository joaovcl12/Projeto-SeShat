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
  disabled?: boolean; // NOVO: Flag para desabilitar botões de questões antigas ou respondidas
};
type ChatItem = Message | (Question & { type: 'question' });

// --- Componentes de Ajuda ---

const AiAvatar = () => (<div className={`${styles.avatar} d-flex align-items-center justify-content-center`}><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" className="bi bi-robot" viewBox="0 0 16 16"><path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5ZM3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.58 26.58 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.933.933 0 0 1-.765.935c-.845.147-2.34.346-4.235.346-1.895 0-3.39-.2-4.235-.346A.933.933 0 0 1 3 9.219V8.062Zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a24.767 24.767 0 0 1-1.871-.183.25.25 0 0 0-.068.217l.22.92a.25.25 0 0 0 .217.217c.134.04.27.082.412.126l-.22.92a.25.25 0 0 0 .217.217c.134.04.27.082.412.126l-.22.92a.25.25 0 0 0 .217.217c.134.04.27.082.412.126l-.22.92a.25.25 0 0 0 .217.217c.134.04.27.082.412.126l-.92.22a.25.25 0 0 0 .217-.068l.92-.9a.25.25 0 0 0 .068-.217l-.22-.92a.25.25 0 0 0-.217-.217c-.134-.04-.27-.082-.412.126l-.22-.92a.25.25 0 0 0-.217-.217c-.134-.04-.27-.082-.412.126l-.22-.92a.25.25 0 0 0-.217-.217c-.134-.04-.27-.082-.412.126l-.92-.22a.25.25 0 0 0-.217.068Z" /><path d="M8 1a2.5 2.5 0 0 1 2.5 2.5V4h-5v-.5A2.5 2.5 0 0 1 8 1Zm3.5 3v-.5a3.5 3.5 0 1 0-7 0V4H1v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4h-3.5Z" /></svg></div>);

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

const QuestionDisplay = ({ question, onAnswerSelect, isLast }: { // Adicionando isLast aqui
  question: Question;
  onAnswerSelect: (optionKey: string) => void;
  isLast: boolean; // NOVO: indica se a questão é a última (interativa)
}) => {
  // Se for um array (usado para lista de matérias no mobile), mapeamos para { key: index, text: subject }
  const optionsArray = Array.isArray(question.options)
    ? question.options.map((text, index) => ({ key: String(index), text }))
    : Object.entries(question.options).map(([key, text]) => ({ key, text }));

  // Determina se é o menu de seleção inicial (usado para esconder a chave de opção A, B, C...)
  const isSubjectSelection = Array.isArray(question.options) && question.subject === "Matérias";

  // NOVO: Se a questão está marcada como disabled OU não é a última mensagem, desativa os botões
  const isAnsweredOrOld = question.disabled || !isLast;

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
              disabled={isAnsweredOrOld} // APLICANDO DESATIVAÇÃO AQUI
            >
              {/* Só mostra a chave se não for a lista de matérias */}
              {!isSubjectSelection && <strong>{key}:</strong>} {text}
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
  const [isMobileLayout, setIsMobileLayout] = useState(false); // NOVO ESTADO

  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // 1. Efeito para detectar o layout mobile e ajustar a sidebar
  useEffect(() => {
    const checkMobile = () => {
      // Usa 768px como breakpoint padrão para tablets/mobile
      const isMobile = window.matchMedia("(max-width: 768px)").matches;
      setIsMobileLayout(isMobile);
      // Força o sidebar a fechar (ou ser oculto) no mobile, e pode abrir no desktop
      setSidebarOpen(!isMobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);


  // 2. Efeito para buscar as matérias da API e definir a mensagem inicial
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await fetch(`${API_URL}/materias`);
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        const data: MateriasResponse = await response.json();
        const availableSubjects = data.materias_disponiveis || [];
        setSubjectsList(availableSubjects);

        if (availableSubjects.length > 0) {
          if (!isMobileLayout && !activeSubject) {
            // Comportamento Desktop (Barra Lateral): Inicia com a primeira matéria
            const firstSubject = availableSubjects[0];
            setActiveSubject(firstSubject);
            setChatHistory([{ id: 1, text: `Olá! Sou a IAra. Vamos começar com ${firstSubject}. Qual sua dúvida?`, sender: 'ai' }]);
          } else if (isMobileLayout && chatHistory.length === 0) { // NOVO CHECK: Só exibe opções no mobile se o chat estiver vazio
            // Comportamento Mobile (Opções no Chat): Exibe as matérias como botões
            setChatHistory([{
              id: 1,
              subject: "Matérias",
              text: "Olá! Sou a IAra, o que você quer estudar?",
              options: availableSubjects, // Usamos o array de strings como opções
              source: null,
              year: null,
              type: 'question' // Reutilizamos o QuestionDisplay
            }]);
            setActiveSubject(''); // Garante que o input fique desativado
          }
        } else {
          setChatHistory([{ id: 1, text: `Olá! Sou a IAra. Não encontrei matérias disponíveis no momento.`, sender: 'ai' }]);
        }
      } catch (error) {
        console.error("Falha ao buscar matérias:", error);
        setSubjectsList([]);
        setChatHistory([{ id: 1, text: `Olá! Tive um problema para carregar as matérias. Tente recarregar a página.`, sender: 'ai' }]);
      }
    };
    fetchSubjects();
  }, [activeSubject, isMobileLayout, chatHistory.length]); // Adicionamos isMobileLayout e chatHistory.length como dependências

  // Rola para o fim das mensagens
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

  // Função para enviar mensagem de texto (Mantida Inalterada)
  const handleSendMessage = () => {
    if (!inputValue.trim() || !activeSubject) return; // Checa se a matéria está ativa
    const userMessage: Message = { id: Date.now(), text: inputValue, sender: 'user' };
    setChatHistory(prev => [...prev, userMessage]);
    setInputValue('');

    setTimeout(() => {
      const aiResponse: Message = { id: Date.now() + 1, text: `Analisando sua pergunta sobre ${activeSubject}...`, sender: 'ai' };
      setChatHistory(prev => [...prev, aiResponse]);
    }, 1200);
  };

  // Função para exibir a próxima questão (Mantida Inalterada)
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
        { id: Date.now() + 2, text: 'Você terminou todas as questões que eu busquei! Clique na matéria (ou use o menu de opções) para buscar mais.', sender: 'ai' }
      ]);
    }
  };

  // Função para lidar com a seleção de resposta/matéria (UNIFICADA)
  const handleAnswerSelect = (selectedOptionKey: string) => {
    const lastItemIndex = chatHistory.length - 1;
    const lastItem = chatHistory[lastItemIndex];

    // 1. Lógica para Seleção de Matéria (Modo Mobile)
    if ('type' in lastItem && lastItem.type === 'question' && Array.isArray(lastItem.options) && lastItem.subject === "Matérias") {
      const selectedSubject = lastItem.options[parseInt(selectedOptionKey)];

      const userMessage: Message = {
        id: Date.now(),
        text: `Quero estudar: ${selectedSubject}`,
        sender: 'user'
      };

      // NOVO FLUXO:
      // 1. Cria uma cópia imutável do histórico
      const updatedHistory = [...chatHistory];

      // 2. Marca a mensagem inicial de opções como desabilitada (muda o objeto Question no histórico)
      if ('type' in updatedHistory[lastItemIndex]) { // Garantia de tipo
        updatedHistory[lastItemIndex] = { ...lastItem, disabled: true };
      }

      // 3. Adiciona a resposta do usuário logo abaixo
      updatedHistory.push(userMessage);

      // Atualiza o histórico para refletir a escolha desabilitada e a resposta do usuário
      setChatHistory(updatedHistory);

      // Inicia o processo de busca de questões
      handleSubjectClick(selectedSubject);
      return;
    }

    // 2. Lógica para Resposta de Questão (Comportamento Original)
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
      { id: Date.now() + 1, text: `Resposta "${selectedOptionKey}" recebida. Verificando...`, sender: 'ai' }
    ]);

    setTimeout(() => {
      showNextQuestion();
    }, 2000);
  };

  // Função para mudar de matéria
  const handleSubjectClick = async (subject: string) => {
    // Limpa o estado da lista de questões para o novo assunto
    setActiveSubject(subject);
    setQuestionList([]);
    setCurrentQuestionIndex(0);

    // Adiciona a mensagem inicial de busca (usamos o callback prev para garantir que seja adicionada após o userMessage)
    setChatHistory(prev => [
      ...prev,
      { id: Date.now(), text: `Certo! Buscando 10 questões de ${subject}...`, sender: 'ai' }
    ]);

    try {
      const response = await fetch(`${API_URL}/perguntas/${subject}?count=10`);

      if (!response.ok) {
        if (response.status === 404) {
          setChatHistory(prev => [...prev, { id: Date.now() + 1, text: `Desculpe, ainda não tenho questões de ${subject} no banco de dados.`, sender: 'ai' }]);
          return;
        }
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data: Question[] = await response.json();

      if (data.length === 0) {
        setChatHistory(prev => [...prev, { id: Date.now() + 1, text: `Desculpe, não encontrei nenhuma questão de ${subject} no banco de dados.`, sender: 'ai' }]);
        return;
      }

      setQuestionList(data);
      setCurrentQuestionIndex(0);

      // Adiciona as mensagens de sucesso e a primeira questão
      setChatHistory(prev => [
        ...prev,
        { id: Date.now() + 1, text: `Encontrei ${data.length} questões. Vamos começar!`, sender: 'ai' },
        { ...data[0], type: 'question' }
      ]);

    } catch (error) {
      console.error("Erro ao buscar questões:", error);
      setChatHistory(prev => [...prev, { id: Date.now() + 1, text: `Desculpe, tive um problema ao buscar as questões. Tente novamente.`, sender: 'ai' }]);
    }
  };

  return (
    <div className={styles.chatPageContainer}>
      {/* Sidebar é renderizada APENAS se não estiver em layout mobile */}
      {!isMobileLayout && (
        <div className={`${styles.sidebarContainer} ${isSidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
          <Sidebar
            isOpen={isSidebarOpen}
            onToggle={() => setSidebarOpen(!isSidebarOpen)}
            activeSubject={activeSubject}
            onSubjectClick={handleSubjectClick}
            subjects={subjectsList}
          />
        </div>
      )}

      <div className={`${styles.glassPanel} ${styles.chatWindow}`}>
        <main className={styles.messageList}>
          {chatHistory.map((item, index) => {
            // Verifica se é uma Message (com 'sender') ou Question (com 'type')
            if ('sender' in item) {
              return <ChatMessage key={item.id || index} msg={item} />
            } else {
              // Passa a flag isLast para o QuestionDisplay
              const isLastItem = index === chatHistory.length - 1;
              return <QuestionDisplay
                key={item.id || index}
                question={item}
                onAnswerSelect={handleAnswerSelect} // Passamos a função sem a condicional aqui
                isLast={isLastItem} // A lógica de desabilitar o clique está dentro do QuestionDisplay
              />
            }
          })}
          <div ref={messagesEndRef} />
        </main>

        <footer className={styles.inputArea} data-bs-theme="dark">
          <div className={`${styles.inputGroup} d-flex align-items-center`}>
            <input
              type="text"
              className={`${styles.chatInput} form-control`}
              placeholder={activeSubject ? "Digite sua mensagem..." : "Selecione uma matéria para iniciar..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && activeSubject && handleSendMessage()}
              disabled={!activeSubject} // Input desativado até que uma matéria seja selecionada
            />
            <button
              className={`${styles.sendButton} btn p-2`}
              onClick={handleSendMessage}
              disabled={!activeSubject} // Botão desativado até que uma matéria seja selecionada
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" className="bi bi-send-fill" viewBox="0 0 16 16"><path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083l6-15Zm-1.833 1.89L6.637 10.07l-4.99-3.176 14.12-6.393Z" /></svg>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}