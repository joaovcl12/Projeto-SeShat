// src/pages/ChatPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './ChatPage.module.css';
import iaraImg from '/iara2.png';

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
type AnalysisData = {
  feedback_text: string;
  suggested_topics: string[];
};
type ChatItem =
  | Message
  | (Question & { type: 'question' })
  | { type: 'action_menu'; id: number; disabled?: boolean; }
  | (Cronograma & { type: 'schedule' })
  | (WeeklySchedule & { type: 'weekly_schedule'; id: number })
  | (AnalysisData & { type: 'analysis'; id: number });
// --- Componentes de Ajuda ---
const AiAvatar = () => (
  <div className={`${styles.avatar} d-flex align-items-center justify-content-center overflow-hidden`}>
    <img
      src={iaraImg}
      alt="IAra"
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  </div>
);

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

// ALTERADO: Removemos a IAra daqui, agora ela é um componente separado
// Adicionei onRequestHint na tipagem e nos argumentos
const QuestionDisplay = ({ question, onAnswerSelect }: { // isLast REMOVIDO DA DESESTRUTURAÇÃO
  question: Question;
  onAnswerSelect: (optionKey: string) => void;
}) => {
  const optionsArray = Array.isArray(question.options)
    ? question.options.map((text, index) => ({ key: String(index), text }))
    : Object.entries(question.options).map(([key, text]) => ({ key, text }));

  const isSubjectSelection = Array.isArray(question.options) && question.subject === "Matérias";
  // LINHA CORRIGIDA
  const isAnsweredOrOld = question.disabled; // Apenas desabilitar se a propriedade 'disabled' estiver em true

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

// COMPONENTE ATUALIZADO
const ActionMenu = ({ onActionClick, isLast }: {
  // Adicionado 'analyze_performance' na tipagem
  onActionClick: (action: 'get_questions' | 'edit_schedule' | 'get_weekly_schedule' | 'analyze_performance') => void;
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
        {/* NOVO BOTÃO AQUI */}
        <button className="btn btn-info text-white fw-bold" onClick={() => onActionClick('analyze_performance')} disabled={!isLast}>
          ✨ Analisar meu Desempenho (IA)
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
      {schedule.materias.length === 0 ? (<p className="text-white-50">Seu cronograma está vazio.</p>) : (
        schedule.materias.map(materia => (
          <div key={materia.id} className="mb-3 p-2 rounded" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0">{materia.nome}</h6>
              <button className="btn btn-sm btn-danger py-0 px-1" onClick={() => onDeleteSubject(materia.id)} title="Deletar matéria">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-x-lg" viewBox="0 0 16 16"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z" /></svg>
              </button>
            </div>
            {materia.topicos.length > 0 ? (
              <ul className="list-unstyled ps-3 mt-2">
                {materia.topicos.map(topico => (
                  <li key={topico.id} className="d-flex justify-content-between align-items-center">
                    <span>{topico.concluido ? '✅' : '◻️'} {topico.nome}</span>
                    <button className="btn btn-sm btn-outline-danger py-0 px-1" onClick={() => onDeleteTopic(topico.id)} title="Deletar tópico">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" className="bi bi-x" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" /></svg>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-white-50 ps-3" style={{ fontSize: '0.9rem' }}>- Sem tópicos definidos</p>
            )}
            {materia.topicos.length < 3 ? (
              <AddTopicForm materiaId={materia.id} onAddTopic={onAddTopic} />
            ) : (
              <p className="text-white-50 ps-3" style={{ fontSize: '0.8rem' }}>Limite de 3 tópicos atingido.</p>
            )}
          </div>
        ))
      )}
      {schedule.materias.length < 3 ? (
        <AddSubjectForm onAddSubject={onAddSubject} />
      ) : (
        <p className="text-white-50 mt-3 pt-3 border-top border-white border-opacity-10" style={{ fontSize: '0.8rem' }}>
          Limite de 3 matérias atingido.
        </p>
      )}
    </div>
  </div>
);

const WeeklyScheduleDisplay = ({ schedule }: { schedule: WeeklySchedule & { type: 'weekly_schedule'; id: number } }) => {

  // 1. Verifica se a propriedade 'detalhe' existe na schedule.plan
  if (!schedule.plan || 'detalhe' in schedule.plan) {

    // Neste ponto, o TypeScript sabe que schedule.plan é do tipo { detalhe: string } ou nulo
    const detailPlan = schedule.plan as { detalhe: string } | undefined; // O 'as' aqui é opcional, mas ajuda na clareza.

    return (
      <div className={`${styles.messageBubble} ${styles.ai}`}>
        <AiAvatar />
        <div className={styles.messageContent}>
          <h5 className="text-white mb-3">Plano de Estudos Semanal</h5>
          <p className="text-white-50">
            {detailPlan && 'detalhe' in detailPlan
              ? detailPlan.detalhe // Acesso direto e tipado
              : "Não foi possível gerar seu plano. Adicione matérias e tópicos ao seu cronograma primeiro!"}
          </p>
        </div>
      </div>
    );
  }

  // 2. Se a verificação acima falhou, o TypeScript sabe que schedule.plan é do tipo { [dia: string]: string; }
  const dailyPlan = schedule.plan as { [dia: string]: string; };

  return (
    <div className={`${styles.messageBubble} ${styles.ai}`}>
      <AiAvatar />
      <div className={styles.messageContent}>
        <h5 className="text-white mb-3">Seu Plano de Estudos Semanal</h5>
        <ul className="list-unstyled mb-0">
          {Object.entries(dailyPlan).map(([dia, topico]) => ( // Acesso tipado
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

// NOVO: Componente da Mascote Persistente
const PersistentMascot = ({ activeQuestion, onRequestHint, showHintOffer, onMascotClick, bubbleClass }: {
  activeQuestion: Question | null,
  onRequestHint: (id: number) => void,
  showHintOffer: boolean, // Novo prop
  onMascotClick: () => void // Novo prop
  bubbleClass: string // <--- ADICIONE ESTA LINHA AQUI NA TIPAGEM
}) => {
  const isQuestionActive = activeQuestion && !activeQuestion.disabled;

  return (
    <div className={styles.mascotContainer}>
      {/* Balão de Ajuda Condicional: SÓ MOSTRA SE A QUESTÃO ESTÁ ATIVA E showHintOffer É TRUE */}
      {isQuestionActive && showHintOffer && (
        <div className={`${styles.floatingBubble} ${bubbleClass}`}>
          Precisa de uma ajudinha com essa questão?
          <button
            className={styles.helpBtn}
            onClick={() => activeQuestion && onRequestHint(activeQuestion.id)}
          >
            Sim, preciso de ajuda!!
          </button>
        </div>
      )}

      {/* Imagem da Mascote - Agora com o onClick para forçar a dica */}
      <div className={styles.mascotImageWrapper} onClick={onMascotClick}> {/* <--- ADICIONADO onClick */}
        <img src={iaraImg} alt="IAra" className={styles.mascotImg} />
      </div>
    </div>
  );
};

// NOVO COMPONENTE: Exibe a análise da IA
const AnalysisDisplay = ({ data }: { data: AnalysisData }) => (
  <div className={`${styles.messageBubble} ${styles.ai}`}>
    <AiAvatar />
    <div className={styles.messageContent}>
      <h5 className="text-white mb-3">📊 Análise de Desempenho</h5>
      <p style={{ whiteSpace: 'pre-wrap' }}>{data.feedback_text}</p>

      {data.suggested_topics.length > 0 && (
        <div className="mt-3 pt-3 border-top border-white border-opacity-10">
          <h6 className="fw-bold text-info">Tópicos Sugeridos para Estudo:</h6>
          <ul className="list-unstyled">
            {data.suggested_topics.map((topic, idx) => (
              <li key={idx} className="mb-1">🔹 {topic}</li>
            ))}
          </ul>
          <small className="text-white-50">Adicione estes tópicos ao seu cronograma!</small>
        </div>
      )}
    </div>
  </div>
);

// --- Componente Principal da Página ---
export function ChatPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [activeSubject, setActiveSubject] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatItem[]>([]);
  const [questionList, setQuestionList] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isMobileLayout] = useState(window.innerWidth <= 768);
  // NOVO: Estado para contar as dicas e oferecer níveis progressivos
  const [hintCounts, setHintCounts] = useState<Record<number, number>>({});

  // --- ADICIONE ESTA LINHA AQUI: ---
  const activeQuestion = questionList.length > 0 ? questionList[currentQuestionIndex] : null;
  // ---------------------------------

  const [showHintOffer, setShowHintOffer] = useState(false);

  const [bubbleClass, setBubbleClass] = useState('');

  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // --- FUNÇÃO HELPER PARA TRATAR ERROS 401 ---
  const handleApiError = (error: unknown) => {
    if (error instanceof Error) {
      // Verifica se o erro é do tipo Error antes de acessar a propriedade message
      if (error.message.includes('401') || error.message.toLowerCase().includes('unauthorized')) {
        localStorage.removeItem('authToken');
        navigate('/login?message=Sessão expirada. Faça login novamente.');
        return true;
      }
    }
    return false;
  };

  // Efeito para PROTEGER A ROTA
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isGuest = params.get('guest') === 'true';
    if (!getAuthToken() && !isGuest) {
      navigate('/login?message=Você precisa estar logado para acessar o chat.');
    }
  }, [navigate, location.search]);

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

    const params = new URLSearchParams(location.search);
    const isGuest = params.get('guest') === 'true';
    if (getAuthToken() || isGuest) {
      fetchSubjects();
    }
  }, [isMobileLayout, activeSubject, chatHistory.length, navigate, location.search]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

  useEffect(() => {
    // 1. Reseta a oferta de dica sempre que o índice da questão muda
    setShowHintOffer(false);

    // 2. Verifica se há uma questão ativa (e não respondida)
    if (questionList.length > 0 && currentQuestionIndex < questionList.length) {
      const currentQuestion = questionList[currentQuestionIndex];

      if (currentQuestion && !currentQuestion.disabled) {
        // 3. Inicia o timer de 30 segundos
        const timer = setTimeout(() => {
          setShowHintOffer(true);
        }, 30000); // 30000 ms = 30 segundos

        // 4. Função de limpeza para cancelar o timer se o usuário responder
        return () => clearTimeout(timer);
      }
    }

    return () => { }; // Cleanup vazio se não houver questão ativa
  }, [currentQuestionIndex, questionList.length]); // Depende do índice da questão

  const handleMascotClick = () => {
    if (activeQuestion && !activeQuestion.disabled && !showHintOffer) {
      setShowHintOffer(true);
      setBubbleClass(''); // Garante que não há classe 'fade-out' se estiver aparecendo
    }
  };

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
        { id: Date.now() + 2, text: 'Você terminou todas as questões que eu busquei! O que gostaria de fazer agora?', sender: 'ai' },
        { id: Date.now() + 3, type: 'action_menu' }
      ]);
    }
  };

  const handleAnswerSelect = async (selectedOptionKey: string) => {
    // 1. Lógica do fade-out da mascote (mantida)
    if (showHintOffer) {
      setBubbleClass(styles['fade-out']);
      setTimeout(() => {
        setShowHintOffer(false);
        setBubbleClass('');
      }, 300);
    } else {
      setShowHintOffer(false);
    }

    // 2. Tenta encontrar a questão real que está sendo respondida (usando o ID da questão atual)
    const currentQuestion = questionList[currentQuestionIndex];

    // Encontra o índice da *última* mensagem de question (seja ela a de matéria ou de exame)
    const questionItemIndex = chatHistory.findIndex(item =>
      'type' in item && item.type === 'question' && item.disabled !== true
    );

    if (questionItemIndex === -1) return; // Não há questão ativa.

    const questionItem = chatHistory[questionItemIndex];

    // Lógica para seleção de matéria (sem ID de API)
    if ('type' in questionItem && questionItem.type === 'question' && Array.isArray(questionItem.options) && questionItem.subject === "Matérias") {

      const selectedSubject = questionItem.options[parseInt(selectedOptionKey)];
      const userMessage: Message = { id: Date.now(), text: `Quero estudar: ${selectedSubject}`, sender: 'user' };

      // Desativa a questão de seleção de matéria
      const updatedHistory = [...chatHistory];
      const itemToDisable = { ...questionItem, disabled: true };
      updatedHistory[questionItemIndex] = itemToDisable as ChatItem;
      setChatHistory(updatedHistory);

      // Continua com a troca de matéria
      setChatHistory(prev => [...prev, userMessage]);
      handleSubjectClick(selectedSubject);
      return;
    }


    // --- Lógica para Questão de Exame (com ID) ---
    if (!currentQuestion) return; // Se for uma questão de exame, deve haver currentQuestion.

    // Desativa a questão de exame (é o item encontrado em questionItemIndex)
    const updatedHistory = [...chatHistory];
    const itemToDisable = { ...questionItem, disabled: true };
    updatedHistory[questionItemIndex] = itemToDisable as ChatItem;
    setChatHistory(updatedHistory);


    const answerText = Array.isArray(currentQuestion.options)
      ? currentQuestion.options[parseInt(selectedOptionKey)]
      : currentQuestion.options[selectedOptionKey];
    const userMessage: Message = { id: Date.now(), text: `Minha resposta: ${selectedOptionKey}. ${answerText}`, sender: 'user' };
    setChatHistory(prev => [...prev, userMessage, { id: Date.now() + 1, text: `Resposta "${selectedOptionKey}" recebida. Verificando...`, sender: 'ai' }]);

    const token = getAuthToken();
    if (!token) { setChatHistory(prev => [...prev, { id: Date.now() + 2, text: 'Erro de autenticação. Por favor, faça login para verificar suas respostas.', sender: 'ai' }]); return; }

    try {
      const response = await fetch(`${API_URL}/perguntas/verificar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ question_id: currentQuestion.id, user_answer: selectedOptionKey })
      });
      if (response.status === 401) { handleApiError(new Error('401')); return; }
      if (!response.ok) throw new Error('Falha ao verificar a resposta.');
      const result: AnswerCheckResponse = await response.json();
      let feedbackMessage: Message;
      if (result.is_correct) {
        feedbackMessage = { id: Date.now() + 2, text: 'Parabéns, resposta correta! 🎉', sender: 'ai' };
      } else {
        feedbackMessage = { id: Date.now() + 2, text: `Incorreto. A resposta correta era: ${result.correct_answer}`, sender: 'ai' };
      }
      setChatHistory(prev => [...prev, feedbackMessage]);
      setTimeout(showNextQuestion, 2000);
    } catch (error: unknown) {
      console.error('Erro ao verificar resposta:', error);
      if (error instanceof Error) {
        setChatHistory(prev => [...prev, { id: Date.now() + 2, text: `Desculpe, tive um problema ao verificar sua resposta: ${error.message}`, sender: 'ai' }]);
      } else { setChatHistory(prev => [...prev, { id: Date.now() + 2, text: 'Desculpe, tive um problema desconhecido ao verificar sua resposta.', sender: 'ai' }]); }
    }
  };

  // FUNÇÃO ATUALIZADA: Dicas Progressivas
  const handleRequestHint = async (questionId: number) => {
    const token = getAuthToken();
    if (!token) return;

    // 1. Calcula o próximo nível (1, 2, ou 3)
    const currentLevel = hintCounts[questionId] || 0;
    const nextLevel = Math.min(currentLevel + 1, 3);

    // 2. Atualiza o contador local
    setHintCounts(prev => ({ ...prev, [questionId]: nextLevel }));

    // 3. Mensagens de UI
    setChatHistory(prev => [...prev, { id: Date.now() + 1, text: "Pensando...", sender: 'ai' }]);

    try {
      const response = await fetch(`${API_URL}/ia/dica`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        // 4. Envia o NÍVEL para o backend
        body: JSON.stringify({ question_id: questionId, level: nextLevel })
      });

      if (response.status === 401) { handleApiError(new Error('401')); return; }
      if (!response.ok) throw new Error("Erro ao gerar dica");

      const data = await response.json();

      setChatHistory(prev => [
        ...prev.filter(m => !('text' in m) || m.text !== "Pensando..."),
        // 5. Mostra a dica com o nível
        { id: Date.now() + 2, text: `💡 Dica (${nextLevel}/3): ${data.dica}`, sender: 'ai' }
      ]);

    } catch {
      setChatHistory(prev => [
        ...prev.filter(m => !('text' in m) || m.text !== "Pensando..."),
        { id: Date.now() + 2, text: "Desculpe, não consegui gerar uma dica agora.", sender: 'ai' }
      ]);
    }
  };

  const fetchQuestions = async (subject: string) => {
    setChatHistory(prev => [...prev, { id: Date.now(), text: `Certo! Buscando 10 questões de ${subject}...`, sender: 'ai' }]);
    setQuestionList([]);
    setCurrentQuestionIndex(0);
    try {
      const response = await fetch(`${API_URL}/perguntas/${subject}?count=10`);
      if (!response.ok) {
        if (response.status === 404) { setChatHistory(prev => [...prev, { id: Date.now() + 1, text: `Desculpe, ainda não tenho questões de ${subject} no banco de dados.`, sender: 'ai' }]); return; }
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      const data: Question[] = await response.json();
      if (data.length === 0) { setChatHistory(prev => [...prev, { id: Date.now() + 1, text: `Desculpe, não encontrei nenhuma questão de ${subject} no banco de dados.`, sender: 'ai' }]); return; }
      setQuestionList(data);
      setCurrentQuestionIndex(0);
      setChatHistory(prev => [...prev, { id: Date.now() + 1, text: `Encontrei ${data.length} questões. Vamos começar!`, sender: 'ai' }, { ...data[0], type: 'question' }]);
    } catch (error: unknown) {
      console.error("Erro ao buscar questões:", error);
      if (error instanceof Error) {
        setChatHistory(prev => [...prev, { id: Date.now() + 1, text: `Desculpe, tive um problema ao buscar as questões: ${error.message}`, sender: 'ai' }]);
      } else { setChatHistory(prev => [...prev, { id: Date.now() + 1, text: 'Desculpe, tive um problema desconhecido ao buscar as questões.', sender: 'ai' }]); }
    }
  };

  const refreshSchedule = async (showLoadingMsg: boolean = true) => {
    const token = getAuthToken();
    if (!token) { setChatHistory(prev => [...prev, { id: Date.now(), text: 'Erro de autenticação. Por favor, faça login para editar o cronograma.', sender: 'ai' }]); return; }
    if (showLoadingMsg) { setChatHistory(prev => [...prev, { id: Date.now(), text: 'Buscando seu cronograma...', sender: 'ai' }]); }
    try {
      const response = await fetch(`${API_URL}/cronograma/me`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.status === 401) { handleApiError(new Error('401')); return; }
      if (!response.ok) throw new Error('Não foi possível buscar o cronograma.');
      const cronogramaData: Cronograma = await response.json();
      setChatHistory(prev => [
        ...prev.filter(item =>
          !('type' in item && item.type === 'schedule') &&
          !('sender' in item && item.sender === 'ai' && (item.text === 'Buscando seu cronograma...' || item.text.startsWith('Adicionando') || item.text.startsWith('Deletando')))
        ),
        { ...cronogramaData, type: 'schedule', id: cronogramaData.id }
      ]);
    } catch (error: unknown) {
      console.error('Erro ao buscar cronograma:', error);
      if (error instanceof Error && !error.message.includes('401')) { setChatHistory(prev => [...prev, { id: Date.now() + 1, text: `Desculpe, tive um problema ao atualizar seu cronograma: ${error.message}`, sender: 'ai' }]); }
    }
  };

  const handleAddNewSubject = async (subjectName: string) => {
    if (!subjectName.trim()) return;
    const token = getAuthToken();
    if (!token) { setChatHistory(prev => [...prev, { id: Date.now(), text: 'Erro de autenticação. Por favor, faça login para adicionar matérias.', sender: 'ai' }]); return; }
    setChatHistory(prev => [...prev.filter(item => !('type' in item && item.type === 'schedule')), { id: Date.now(), text: 'Adicionando matéria...', sender: 'ai' }]);
    try {
      const response = await fetch(`${API_URL}/cronograma/materias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ nome: subjectName })
      });
      if (response.status === 401) { handleApiError(new Error('401')); return; }
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.detail || "Falha ao adicionar matéria."); }
      await refreshSchedule(false);
    } catch (error: unknown) {
      if (error instanceof Error && !error.message.includes('401')) { setChatHistory(prev => [...prev, { id: Date.now(), text: `Erro: ${error.message}`, sender: 'ai' }]); }
      await refreshSchedule(false);
    }
  };

  const handleAddNewTopic = async (materiaId: number, topicName: string) => {
    if (!topicName.trim()) return;
    const token = getAuthToken();
    if (!token) { setChatHistory(prev => [...prev, { id: Date.now(), text: 'Erro de autenticação. Por favor, faça login para adicionar tópicos.', sender: 'ai' }]); return; }
    setChatHistory(prev => [...prev.filter(item => !('type' in item && item.type === 'schedule')), { id: Date.now(), text: 'Adicionando tópico...', sender: 'ai' }]);
    try {
      const response = await fetch(`${API_URL}/cronograma/materias/${materiaId}/topicos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ nome: topicName })
      });
      if (response.status === 401) { handleApiError(new Error('401')); return; }
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.detail || "Falha ao adicionar tópico."); }
      await refreshSchedule(false);
    } catch (error: unknown) {
      if (error instanceof Error && !error.message.includes('401')) { setChatHistory(prev => [...prev, { id: Date.now(), text: `Erro: ${error.message}`, sender: 'ai' }]); }
      await refreshSchedule(false);
    }
  };

  const handleDeleteSubject = async (materiaId: number) => {
    if (!window.confirm("Tem certeza que quer deletar esta matéria e todos os seus tópicos?")) return;
    const token = getAuthToken();
    if (!token) { setChatHistory(prev => [...prev, { id: Date.now(), text: 'Erro de autenticação.', sender: 'ai' }]); return; }
    setChatHistory(prev => [...prev.filter(item => !('type' in item && item.type === 'schedule')), { id: Date.now(), text: 'Deletando matéria...', sender: 'ai' }]);
    try {
      const response = await fetch(`${API_URL}/cronograma/materias/${materiaId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.status === 401) { handleApiError(new Error('401')); return; }
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.detail || "Falha ao deletar matéria."); }
      await refreshSchedule(false);
    } catch (error: unknown) {
      if (error instanceof Error && !error.message.includes('401')) { setChatHistory(prev => [...prev, { id: Date.now(), text: `Erro: ${error.message}`, sender: 'ai' }]); }
      await refreshSchedule(false);
    }
  };

  const handleDeleteTopic = async (topicoId: number) => {
    if (!window.confirm("Tem certeza que quer deletar este tópico?")) return;
    const token = getAuthToken();
    if (!token) { setChatHistory(prev => [...prev, { id: Date.now(), text: 'Erro de autenticação.', sender: 'ai' }]); return; }
    setChatHistory(prev => [...prev.filter(item => !('type' in item && item.type === 'schedule')), { id: Date.now(), text: 'Deletando tópico...', sender: 'ai' }]);
    try {
      const response = await fetch(`${API_URL}/cronograma/topicos/${topicoId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.status === 401) { handleApiError(new Error('401')); return; }
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.detail || "Falha ao deletar tópico."); }
      await refreshSchedule(false);
    } catch (error: unknown) {
      if (error instanceof Error && !error.message.includes('401')) { setChatHistory(prev => [...prev, { id: Date.now(), text: `Erro: ${error.message}`, sender: 'ai' }]); }
      await refreshSchedule(false);
    }
  };

  const fetchWeeklySchedule = async () => {
    const token = getAuthToken();
    if (!token) { setChatHistory(prev => [...prev, { id: Date.now(), text: 'Erro de autenticação.', sender: 'ai' }]); return; }
    setChatHistory(prev => [...prev, { id: Date.now(), text: 'Gerando seu plano de estudos semanal...', sender: 'ai' }]);
    try {
      const response = await fetch(`${API_URL}/cronograma/me/semanal`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.status === 401) { handleApiError(new Error('401')); return; }
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.detail || "Falha ao gerar plano."); }

      const weeklyScheduleData: WeeklyScheduleResponse = await response.json();

      setChatHistory(prev => [
        ...prev,
        { plan: weeklyScheduleData, type: 'weekly_schedule', id: Date.now() }
      ]);
    } catch (error: unknown) {
      if (error instanceof Error && !error.message.includes('401')) {
        setChatHistory(prev => [...prev, { id: Date.now(), text: `Erro: ${error.message}`, sender: 'ai' }]);
      }
    }
  };

  // NOVA FUNÇÃO: Buscar análise de desempenho
  const fetchPerformanceAnalysis = async () => {
    const token = getAuthToken();
    if (!token) { setChatHistory(prev => [...prev, { id: Date.now(), text: 'Erro de autenticação.', sender: 'ai' }]); return; }

    setChatHistory(prev => [...prev, { id: Date.now(), text: 'Analisando seu desempenho com IA...', sender: 'ai' }]);

    try {
      const response = await fetch(`${API_URL}/ia/analise-erros`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) { handleApiError(new Error('401')); return; }
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.detail || "Falha na análise."); }

      const analysisData: AnalysisData = await response.json();

      setChatHistory(prev => [
        // Remove a mensagem de "Analisando..."
        ...prev.filter(m => !('text' in m) || m.text !== 'Analisando seu desempenho com IA...'),
        // Adiciona o componente de análise
        { ...analysisData, type: 'analysis', id: Date.now() }
      ]);

    } catch (error: unknown) {
      if (error instanceof Error && !error.message.includes('401')) {
        setChatHistory(prev => [...prev, { id: Date.now(), text: `Erro ao analisar: ${error.message}`, sender: 'ai' }]);
      }
    }
  };

  const handleActionClick = async (action: 'get_questions' | 'edit_schedule' | 'get_weekly_schedule' | 'analyze_performance') => {
    const params = new URLSearchParams(location.search);
    const isGuest = params.get('guest') === 'true';
    const token = getAuthToken();

    if (isGuest && (!token) && (action === 'edit_schedule' || action === 'get_weekly_schedule' || action === 'get_questions')) {
      setChatHistory(prev => [...prev, { id: Date.now(), text: `Esta funcionalidade requer que você esteja conectado a uma conta.`, sender: 'ai' }]);
      return;
    }

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
    if (action === 'analyze_performance') {
      await fetchPerformanceAnalysis();
    }
  };

  const handleSubjectClick = (subject: string) => {
    // 1. Define o que deve ser feito APÓS a animação (ou imediatamente)
    const proceedWithSubjectChange = () => {
      setActiveSubject(subject);
      setChatHistory(prev => [
        // Filtra a ação anterior e adiciona as novas mensagens
        ...prev.filter(item => !('type' in item && (item.type === 'action_menu' || item.type === 'schedule' || item.type === 'weekly_schedule'))),
        { id: Date.now(), text: `Certo! Mudei o foco para ${subject}.`, sender: 'ai' },
        { id: Date.now() + 1, type: 'action_menu' }
      ]);
    };

    // 2. Se a dica estiver visível, inicia a animação
    if (showHintOffer) {
      setBubbleClass(styles['fade-out']);

      // 3. Atraso de 300ms (duração da animação)
      setTimeout(() => {
        // Garante o reset do estado da bolha
        setShowHintOffer(false);
        setBubbleClass('');

        // 4. Executa o restante da lógica após o fade out
        proceedWithSubjectChange();
      }, 300);

      // Sai da função, pois o restante será executado no setTimeout
      return;
    }

    // 5. Se a dica NÃO estiver visível, executa imediatamente
    proceedWithSubjectChange();
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
            if (item.type === 'analysis') {
              return <AnalysisDisplay key={item.id || index} data={item} />
            }
            return null;
          })}
          <div ref={messagesEndRef} />
        </main>

        <PersistentMascot
          activeQuestion={activeQuestion}
          onRequestHint={handleRequestHint}
          showHintOffer={showHintOffer} // <-- NOVO PROP 1 (Estado de visibilidade)
          onMascotClick={handleMascotClick} // <-- NOVO PROP 2 (Função de clique)
          bubbleClass={bubbleClass} // <--- NOVO PROP CONECTADO
        />
      </div>
    </div>
  );
}