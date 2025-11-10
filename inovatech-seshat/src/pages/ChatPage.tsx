// src/pages/ChatPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ChatPage.module.css';

const API_URL = "https://seshat-api-m30w.onrender.com";

const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// --- Tipos ---
type Message = { id: number; text: string; sender: 'user' | 'ai'; disabled?: boolean; };
type MateriasResponse = { materias_disponiveis: string[]; };
type Question = {
  id: number;
  subject: string;
  text: string;
  options: Record<string, string> | string[];
  source: string | null;
  year: number | null;
  disabled?: boolean;
};
type AnswerCheckResponse = {
  is_correct: boolean;
  correct_answer: string;
  question_id: number;
};
type Topico = {
  id: number;
  nome: string;
  concluido: boolean;
};
type Materia = {
  id: number;
  nome: string;
  topicos: Topico[];
};
type Cronograma = {
  id: number;
  nome: string;
  owner_id: number;
  materias: Materia[];
};
type WeeklyScheduleResponse = { [dia: string]: string; } | { detalhe: string };
type WeeklySchedule = {
  plan: WeeklyScheduleResponse; 
};
type ChatItem = 
  | Message 
  | (Question & { type: 'question' })
  | { type: 'action_menu'; id: number; disabled?: boolean; }
  | (Cronograma & { type: 'schedule' }) 
  | (WeeklySchedule & { type: 'weekly_schedule'; id: number });

// --- Componentes de Ajuda (Completos) ---

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

const QuestionDisplay = ({ question, onAnswerSelect, isLast }: { 
  question: Question; 
  onAnswerSelect: (optionKey: string) => void; 
  isLast: boolean; 
}) => {
  const optionsArray = Array.isArray(question.options)
    ? question.options.map((text, index) => ({ key: String(index), text }))
    : Object.entries(question.options).map(([key, text]) => ({ key, text }));

  const isSubjectSelection = Array.isArray(question.options) && question.subject === "Matérias";
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
              disabled={isAnsweredOrOld}
            >
              {!isSubjectSelection && <strong>{key}:</strong>} {text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const ActionMenu = ({ onActionClick, isLast }: { 
  onActionClick: (action: 'get_questions' | 'edit_schedule' | 'get_weekly_schedule') => void;
  isLast: boolean;
}) => (
  <div className={`${styles.messageBubble} ${styles.ai}`}>
    <AiAvatar />
    <div className={styles.messageContent}>
      <p className="mb-2">O que você gostaria de fazer?</p>
      <div className="d-grid gap-2 mt-3">
        <button className="btn btn-outline-light" onClick={() => onActionClick('get_questions')} disabled={!isLast}>
          Solicitar 10 Questões
        </button>
        <button className="btn btn-outline-light" onClick={() => onActionClick('edit_schedule')} disabled={!isLast}>
          Editar Tópicos do Cronograma
        </button>
        <button className="btn btn-outline-light" onClick={() => onActionClick('get_weekly_schedule')} disabled={!isLast}>
          Gerar Plano Semanal
        </button>
      </div>
    </div>
  </div>
);

const AddTopicForm = ({ materiaId, onAddTopic }: { 
  materiaId: number, 
  onAddTopic: (materiaId: number, topicName: string) => void 
}) => {
  const [topicName, setTopicName] = useState("");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicName.trim()) return;
    onAddTopic(materiaId, topicName);
    setTopicName("");
  };
  return (
    <form onSubmit={handleSubmit} className="d-flex gap-2 mt-2">
      <input 
        type="text" 
        className="form-control form-control-sm" 
        placeholder="Novo tópico (max 3)..." 
        value={topicName}
        onChange={(e) => setTopicName(e.target.value)}
        required
      />
      <button type="submit" className="btn btn-outline-light btn-sm">Add</button>
    </form>
  );
};

const AddSubjectForm = ({ onAddSubject }: { 
  onAddSubject: (subjectName: string) => void 
}) => {
  const [subjectName, setSubjectName] = useState("");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) return;
    onAddSubject(subjectName);
    setSubjectName("");
  };
  return (
    <form onSubmit={handleSubmit} className="d-flex gap-2 mt-3 pt-3 border-top border-white border-opacity-10">
      <input 
        type="text" 
        className="form-control form-control-sm" 
        placeholder="Nova matéria (max 3)..." 
        value={subjectName}
        onChange={(e) => setSubjectName(e.target.value)}
        required
      />
      <button type="submit" className="btn btn-primary btn-sm">Adicionar</button>
    </form>
  );
};

// Componente para exibir o "Armário" de Cronograma (interativo)
const ScheduleDisplay = ({ schedule, onAddSubject, onAddTopic, onDeleteSubject, onDeleteTopic }: { 
  schedule: Cronograma;
  onAddSubject: (subjectName: string) => void;
  onAddTopic: (materiaId: number, topicName: string) => void;
  onDeleteSubject: (materiaId: number) => void;
  onDeleteTopic: (topicoId: number) => void;
}) => (
  <div className={`${styles.messageBubble} ${styles.ai}`}>
    <AiAvatar />
    <div className={styles.messageContent}>
      <h5 className="text-white mb-3">{schedule.nome}</h5>
      {schedule.materias.length === 0 ? ( <p className="text-white-50">Seu cronograma está vazio.</p> ) : (
        schedule.materias.map(materia => (
          <div key={materia.id} className="mb-3 p-2 rounded" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0">{materia.nome}</h6>
              <button className="btn btn-sm btn-danger py-0 px-1" onClick={() => onDeleteSubject(materia.id)} title="Deletar matéria">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-x-lg" viewBox="0 0 16 16"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/></svg>
              </button>
            </div>
            {materia.topicos.length > 0 ? (
              <ul className="list-unstyled ps-3 mt-2">
                {materia.topicos.map(topico => (
                  <li key={topico.id} className="d-flex justify-content-between align-items-center">
                    <span>{topico.concluido ? '✅' : '◻️'} {topico.nome}</span>
                    <button className="btn btn-sm btn-outline-danger py-0 px-1" onClick={() => onDeleteTopic(topico.id)} title="Deletar tópico">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" className="bi bi-x" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-white-50 ps-3" style={{fontSize: '0.9rem'}}>- Sem tópicos definidos</p>
            )}
            {materia.topicos.length < 3 ? (
              <AddTopicForm materiaId={materia.id} onAddTopic={onAddTopic} />
            ) : (
              <p className="text-white-50 ps-3" style={{fontSize: '0.8rem'}}>Limite de 3 tópicos atingido.</p>
            )}
          </div>
        ))
      )}
      {schedule.materias.length < 3 ? (
        <AddSubjectForm onAddSubject={onAddSubject} />
      ) : (
        <p className="text-white-50 mt-3 pt-3 border-top border-white border-opacity-10" style={{fontSize: '0.8rem'}}>
          Limite de 3 matérias atingido.
        </p>
      )}
    </div>
  </div>
);

// Componente para exibir o Cronograma Semanal (a Tabela)
const WeeklyScheduleDisplay = ({ schedule }: { schedule: WeeklySchedule & { type: 'weekly_schedule'; id: number } }) => {
  
  if (!schedule.plan || 'detalhe' in schedule.plan) {
    return (
      <div className={`${styles.messageBubble} ${styles.ai}`}>
        <AiAvatar />
        <div className={styles.messageContent}>
          <h5 className="text-white mb-3">Plano de Estudos Semanal</h5>
          <p className="text-white-50">Não foi possível gerar seu plano. Adicione matérias e tópicos ao seu cronograma primeiro!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.messageBubble} ${styles.ai}`}>
      <AiAvatar />
      <div className={styles.messageContent}>
        <h5 className="text-white mb-3">Seu Plano de Estudos Semanal</h5>
        <ul className="list-unstyled mb-0">
          {Object.entries(schedule.plan).map(([dia, topico]) => (
            <li key={dia} className="mb-1">
              <div className="d-flex">
                <strong style={{ width: '120px', flexShrink: 0 }}>{dia}:</strong>
                <span>{topico}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};


// --- Componente Principal da Página ---
export function ChatPage() {
  // CORRIGIDO: Removida a função 'setIsMobileLayout' não utilizada
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [activeSubject, setActiveSubject] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [questionList, setQuestionList] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isMobileLayout] = useState(window.innerWidth <= 768);

  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const navigate = useNavigate();

  // Efeito para PROTEGER A ROTA
  useEffect(() => {
    if (!getAuthToken()) {
      navigate('/login?message=Você precisa estar logado para acessar o chat.');
    }
  }, [navigate]);

  // Efeito para buscar as matérias da API
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await fetch(`${API_URL}/materias`);
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        const data: MateriasResponse = await response.json();
        const availableSubjects = data.materias_disponiveis || [];
        setSubjectsList(availableSubjects);

        if (availableSubjects.length > 0) {
          if (!isMobileLayout && !activeSubject && chatHistory.length === 0) {
             const firstSubject = availableSubjects[0];
             setActiveSubject(firstSubject);
             setChatHistory([{ id: 1, text: `Olá! Sou a IAra. Vamos começar com ${firstSubject}. O que gostaria de fazer?`, sender: 'ai' }, { id: 2, type: 'action_menu' }]);
         } else if (isMobileLayout && chatHistory.length === 0) { 
            setChatHistory([{
              id: 1,
              subject: "Matérias",
              text: "Olá! Sou a IAra, o que você quer estudar?",
              options: availableSubjects,
              source: null,
              year: null,
              type: 'question' 
            }]);
            setActiveSubject('');
          }
        } else if (chatHistory.length === 0) {
          setChatHistory([{ id: 1, text: `Olá! Sou a IAra. Não encontrei matérias disponíveis no momento.`, sender: 'ai' }]);
        }
      } catch (error: unknown) {
        console.error("Falha ao buscar matérias:", error);
        setSubjectsList([]);
        if (chatHistory.length === 0) {
          setChatHistory([{ id: 1, text: `Olá! Tive um problema para carregar as matérias. Tente recarregar a página.`, sender: 'ai' }]);
        }
      }
    };
    
    if (getAuthToken()) {
      fetchSubjects();
    }
  }, [isMobileLayout, activeSubject, chatHistory.length, navigate]);

  // Rola para o fim das mensagens
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

  // Função para enviar mensagem de texto
  const handleSendMessage = () => {
    if (!inputValue.trim() || !activeSubject) return; 
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
        { id: Date.now()+2, text: 'Você terminou todas as questões que eu busquei! O que gostaria de fazer agora?', sender: 'ai' },
        { id: Date.now()+3, type: 'action_menu' }
      ]);
    }
  };

  // Função para lidar com a seleção de resposta (Verificação de API)
  const handleAnswerSelect = async (selectedOptionKey: string) => {
    const lastItemIndex = chatHistory.length - 1;
    // CORRIGIDO: de 'let' para 'const'
    const lastItem = chatHistory[lastItemIndex]; 
    if (!lastItem || (!('type' in lastItem) && !('sender' in lastItem))) return;

    const updatedHistory = [...chatHistory];
    const itemToDisable = { ...lastItem, disabled: true };
    updatedHistory[lastItemIndex] = itemToDisable as ChatItem;
    setChatHistory(updatedHistory);
    // lastItem = itemToDisable; // Removido, pois 'lastItem' agora é const
    
    // 1. Lógica para Seleção de Matéria (Modo Mobile)
    if ('type' in lastItem && lastItem.type === 'question' && Array.isArray(lastItem.options) && lastItem.subject === "Matérias") {
      const selectedSubject = lastItem.options[parseInt(selectedOptionKey)];
      const userMessage: Message = { id: Date.now(), text: `Quero estudar: ${selectedSubject}`, sender: 'user' };
      setChatHistory(prev => [...prev, userMessage]);
      handleSubjectClick(selectedSubject);
      return;
    }

    // 2. Lógica para Resposta de Questão (Verificação)
    const currentQuestion = questionList[currentQuestionIndex];
    if (!currentQuestion) return; 

    const answerText = Array.isArray(currentQuestion.options) 
        ? currentQuestion.options[parseInt(selectedOptionKey)] 
        : currentQuestion.options[selectedOptionKey];
    const userMessage: Message = { id: Date.now(), text: `Minha resposta: ${selectedOptionKey}. ${answerText}`, sender: 'user' };
    setChatHistory(prev => [ ...prev, userMessage, { id: Date.now()+1, text: `Resposta "${selectedOptionKey}" recebida. Verificando...`, sender: 'ai' } ]);
    
    const token = getAuthToken();
    if (!token) { setChatHistory(prev => [...prev, { id: Date.now()+2, text: 'Erro de autenticação. Por favor, faça login para verificar suas respostas.', sender: 'ai' }]); return; }

    try {
      const response = await fetch(`${API_URL}/perguntas/verificar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ question_id: currentQuestion.id, user_answer: selectedOptionKey })
      });
      if (!response.ok) throw new Error('Falha ao verificar a resposta.');
      const result: AnswerCheckResponse = await response.json();
      let feedbackMessage: Message;
      if (result.is_correct) {
        feedbackMessage = { id: Date.now()+2, text: 'Parabéns, resposta correta! 🎉', sender: 'ai' };
      } else {
        feedbackMessage = { id: Date.now()+2, text: `Incorreto. A resposta correta era: ${result.correct_answer}`, sender: 'ai' };
      }
      setChatHistory(prev => [...prev, feedbackMessage]);
      setTimeout(showNextQuestion, 2000); 
    } catch (error: unknown) {
      console.error('Erro ao verificar resposta:', error);
      if (error instanceof Error) { setChatHistory(prev => [...prev, { id: Date.now()+2, text: `Desculpe, tive um problema ao verificar sua resposta: ${error.message}`, sender: 'ai' }]);
      } else { setChatHistory(prev => [...prev, { id: Date.now()+2, text: 'Desculpe, tive um problema desconhecido ao verificar sua resposta.', sender: 'ai' }]);}
    }
  };

  // Função para buscar as questões da API
  const fetchQuestions = async (subject: string) => {
    setChatHistory(prev => [ ...prev, { id: Date.now(), text: `Certo! Buscando 10 questões de ${subject}...`, sender: 'ai' } ]);
    setQuestionList([]);
    setCurrentQuestionIndex(0);
    try {
      const response = await fetch(`${API_URL}/perguntas/${subject}?count=10`);
      if (!response.ok) {
        if (response.status === 404) { setChatHistory(prev => [...prev, { id: Date.now()+1, text: `Desculpe, ainda não tenho questões de ${subject} no banco de dados.`, sender: 'ai' }]); return; }
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      const data: Question[] = await response.json();
      if (data.length === 0) { setChatHistory(prev => [...prev, { id: Date.now()+1, text: `Desculpe, não encontrei nenhuma questão de ${subject} no banco de dados.`, sender: 'ai' }]); return; }
      setQuestionList(data);
      setCurrentQuestionIndex(0);
      setChatHistory(prev => [ ...prev, { id: Date.now()+1, text: `Encontrei ${data.length} questões. Vamos começar!`, sender: 'ai' }, { ...data[0], type: 'question' } ]);
    } catch (error: unknown) {
      console.error("Erro ao buscar questões:", error);
      if (error instanceof Error) { setChatHistory(prev => [...prev, { id: Date.now()+1, text: `Desculpe, tive um problema ao buscar as questões: ${error.message}`, sender: 'ai' }]);
      } else { setChatHistory(prev => [...prev, { id: Date.now()+1, text: 'Desculpe, tive um problema desconhecido ao buscar as questões.', sender: 'ai' }]);}
    }
  };

  // Função para ATUALIZAR a exibição do cronograma
  const refreshSchedule = async (showLoadingMsg: boolean = true) => {
    const token = getAuthToken();
    if (!token) { setChatHistory(prev => [...prev, { id: Date.now(), text: 'Erro de autenticação. Por favor, faça login.', sender: 'ai' }]); return; }
    if (showLoadingMsg) { setChatHistory(prev => [...prev, { id: Date.now(), text: 'Buscando seu cronograma...', sender: 'ai' }]); }
    try {
      const response = await fetch(`${API_URL}/cronograma/me`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Não foi possível buscar o cronograma.');
      const cronogramaData: Cronograma = await response.json();
      setChatHistory(prev => [
        ...prev.filter(item => 
          !('type' in item && item.type === 'schedule') &&
          !(item.sender === 'ai' && (item.text === 'Buscando seu cronograma...' || item.text.startsWith('Adicionando') || item.text.startsWith('Deletando')))
        ),
        { ...cronogramaData, type: 'schedule', id: cronogramaData.id }
      ]);
    } catch (error: unknown) {
       console.error('Erro ao buscar cronograma:', error);
       if (error instanceof Error) { setChatHistory(prev => [...prev, { id: Date.now()+1, text: `Desculpe, tive um problema ao atualizar seu cronograma: ${error.message}`, sender: 'ai' }]);
       } else { setChatHistory(prev => [...prev, { id: Date.now()+1, text: 'Desculpe, tive um problema desconhecido ao atualizar seu cronograma.', sender: 'ai' }]);}
    }
  };

  // Função para ADICIONAR UMA MATÉRIA
  const handleAddNewSubject = async (subjectName: string) => {
    if (!subjectName.trim()) return;
    const token = getAuthToken();
    if (!token) { setChatHistory(prev => [...prev, { id: Date.now(), text: 'Erro de autenticação. Por favor, faça login.', sender: 'ai' }]); return; }
    setChatHistory(prev => [...prev.filter(item => !('type'in item && item.type === 'schedule')), { id: Date.now(), text: 'Adicionando matéria...', sender: 'ai' }]);
    try {
      const response = await fetch(`${API_URL}/cronograma/materias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ nome: subjectName })
      });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.detail || "Falha ao adicionar matéria."); }
      await refreshSchedule(false);
    } catch (error: unknown) {
      if (error instanceof Error) { setChatHistory(prev => [...prev, { id: Date.now(), text: `Erro: ${error.message}`, sender: 'ai' }]);
      } else { setChatHistory(prev => [...prev, { id: Date.now(), text: 'Erro desconhecido ao adicionar matéria.', sender: 'ai' }]);}
      await refreshSchedule(false);
    }
  };

  // Função para ADICIONAR UM TÓPICO
  const handleAddNewTopic = async (materiaId: number, topicName: string) => {
    if (!topicName.trim()) return;
    const token = getAuthToken();
    if (!token) { setChatHistory(prev => [...prev, { id: Date.now(), text: 'Erro de autenticação. Por favor, faça login.', sender: 'ai' }]); return; }
    setChatHistory(prev => [...prev.filter(item => !('type'in item && item.type === 'schedule')), { id: Date.now(), text: 'Adicionando tópico...', sender: 'ai' }]);
    try {
      const response = await fetch(`${API_URL}/cronograma/materias/${materiaId}/topicos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ nome: topicName })
      });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.detail || "Falha ao adicionar tópico."); }
      await refreshSchedule(false);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setChatHistory(prev => [...prev, { id: Date.now(), text: `Erro: ${error.message}`, sender: 'ai' }]);
      } else {
        // CORRIGIDO: O erro de digitação 'Date.Não()' estava aqui.
        setChatHistory(prev => [...prev, { id: Date.now(), text: 'Erro desconhecido ao adicionar tópico.', sender: 'ai' }]);
      }
      await refreshSchedule(false);
    }
  };
  
  // Função para DELETAR UMA MATÉRIA
  const handleDeleteSubject = async (materiaId: number) => {
    if (!window.confirm("Tem certeza que quer deletar esta matéria e todos os seus tópicos?")) return;
    const token = getAuthToken();
    if (!token) { setChatHistory(prev => [...prev, { id: Date.now(), text: 'Erro de autenticação.', sender: 'ai' }]); return; }
    setChatHistory(prev => [...prev.filter(item => !('type'in item && item.type === 'schedule')), { id: Date.now(), text: 'Deletando matéria...', sender: 'ai' }]);
    try {
      const response = await fetch(`${API_URL}/cronograma/materias/${materiaId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.detail || "Falha ao deletar matéria."); }
      await refreshSchedule(false);
    } catch (error: unknown) {
       if (error instanceof Error) { setChatHistory(prev => [...prev, { id: Date.now(), text: `Erro: ${error.message}`, sender: 'ai' }]);
       } else { setChatHistory(prev => [...prev, { id: Date.now(), text: 'Erro desconhecido ao deletar matéria.', sender: 'ai' }]);}
       await refreshSchedule(false);
    }
  };

  // Função para DELETAR UM TÓPICO
  const handleDeleteTopic = async (topicoId: number) => {
    if (!window.confirm("Tem certeza que quer deletar este tópico?")) return;
    const token = getAuthToken();
    if (!token) { setChatHistory(prev => [...prev, { id: Date.now(), text: 'Erro de autenticação.', sender: 'ai' }]); return; }
    setChatHistory(prev => [...prev.filter(item => !('type'in item && item.type === 'schedule')), { id: Date.now(), text: 'Deletando tópico...', sender: 'ai' }]);
    try {
      const response = await fetch(`${API_URL}/cronograma/topicos/${topicoId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.detail || "Falha ao deletar tópico."); }
      await refreshSchedule(false);
    } catch (error: unknown) {
       if (error instanceof Error) { setChatHistory(prev => [...prev, { id: Date.now(), text: `Erro: ${error.message}`, sender: 'ai' }]);
       } else { setChatHistory(prev => [...prev, { id: Date.now(), text: 'Erro desconhecido ao deletar tópico.', sender: 'ai' }]);}
       await refreshSchedule(false);
    }
  };
  
  // Função para buscar o PLANO SEMANAL
  const fetchWeeklySchedule = async () => {
    const token = getAuthToken();
    if (!token) { setChatHistory(prev => [...prev, { id: Date.now(), text: 'Erro de autenticação.', sender: 'ai' }]); return; }
    setChatHistory(prev => [...prev, { id: Date.now(), text: 'Gerando seu plano de estudos semanal...', sender: 'ai' }]);
    try {
      const response = await fetch(`${API_URL}/cronograma/me/semanal`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.detail || "Falha ao gerar plano."); }
      
      const weeklyScheduleData: WeeklyScheduleResponse = await response.json();
      
      setChatHistory(prev => [
        ...prev,
        { plan: weeklyScheduleData, type: 'weekly_schedule', id: Date.now() }
      ]);
    } catch (error: unknown) {
       if (error instanceof Error) {
          setChatHistory(prev => [...prev, { id: Date.now(), text: `Erro: ${error.message}`, sender: 'ai' }]);
       } else {
          setChatHistory(prev => [...prev, { id: Date.now(), text: 'Erro desconhecido ao gerar plano.', sender: 'ai' }]);
       }
    }
  };

  // Lógica de clique nas ações do menu
  const handleActionClick = async (action: 'get_questions' | 'edit_schedule' | 'get_weekly_schedule') => {
    // CORRIGIDO: de 'let' para 'const'
    const lastItemIndex = chatHistory.length - 1;
    const lastItem = chatHistory[lastItemIndex];
    if (lastItem && 'type' in lastItem && lastItem.type === 'action_menu') {
      const updatedHistory = [...chatHistory];
      const itemToDisable = { ...lastItem, disabled: true };
      updatedHistory[lastItemIndex] = itemToDisable as ChatItem;
      setChatHistory(updatedHistory);
    }

    if (action === 'get_questions') {
      fetchQuestions(activeSubject);
    }
    if (action === 'edit_schedule') { 
      await refreshSchedule();
    }
    if (action === 'get_weekly_schedule') {
      await fetchWeeklySchedule();
    }
  };

  // Função para mudar de matéria
  const handleSubjectClick = (subject: string) => {
    setActiveSubject(subject);
    setChatHistory(prev => [ 
      ...prev,
      { id: Date.now(), text: `Certo! Mudei o foco para ${subject}.`, sender: 'ai' },
      { id: Date.now() + 1, type: 'action_menu' } 
    ]);
  };

  return (
    <div className={styles.chatPageContainer}>
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
            const isLastItem = index === chatHistory.length - 1;
            
            if ('sender' in item) {
              return <ChatMessage key={item.id || index} msg={item} />
            } 
            if (item.type === 'question') {
              return <QuestionDisplay 
                        key={item.id || index} 
                        question={item} 
                        onAnswerSelect={handleAnswerSelect} 
                        isLast={isLastItem}
                     />
            }
            if (item.type === 'action_menu') {
              return <ActionMenu 
                        key={item.id || index} 
                        onActionClick={handleActionClick} 
                        isLast={isLastItem} 
                     />
            }
            if (item.type === 'schedule') {
              return <ScheduleDisplay 
                        key={item.id || index} 
                        schedule={item} 
                        onAddSubject={handleAddNewSubject}
                        onAddTopic={handleAddNewTopic}
                        onDeleteSubject={handleDeleteSubject}
                        onDeleteTopic={handleDeleteTopic}
                     />
            }
            if (item.type === 'weekly_schedule') {
              return <WeeklyScheduleDisplay key={item.id || index} schedule={item} />
            }
            return null;
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
              disabled={!activeSubject}
            />
            <button
              className={`${styles.sendButton} btn p-2`}
              onClick={handleSendMessage}
              disabled={!activeSubject} // Corrigido 'activeD'
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" className="bi bi-send-fill" viewBox="0 0 16 16"><path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083l6-15Zm-1.833 1.89L6.637 10.07l-4.99-3.176 14.12-6.393Z" /></svg>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}