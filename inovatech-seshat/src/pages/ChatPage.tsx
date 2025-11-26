import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './ChatPage.module.css';
import iaraImg from '/iara.png';

const API_URL = "https://seshat-api-m30w.onrender.com";

const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// TIPOS
// ---
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

// FUNÇÃO HELPER PARA CHAMADAS DE API
// ---
async function apiCall<T>(
  url: string,
  method: string = 'GET',
  body?: object,
  token: string | null = getAuthToken()
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    localStorage.removeItem('authToken');
    throw new Error('401: Unauthorized'); // Para ser pego no handleApiError
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: `Erro HTTP: ${response.status}` }));
    throw new Error(errorData.detail || `Erro HTTP: ${response.status}`);
  }

  if (response.status === 204) { // No Content
    return {} as T;
  }

  return response.json() as Promise<T>;
}

// COMPONENTES
// ---
const AiAvatar = React.memo(() => (
  <div className={`${styles.avatar} d-flex align-items-center justify-content-center overflow-hidden`}>
    <img
      src={iaraImg}
      alt="IAra"
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  </div>
));

const Sidebar = React.memo(({ isOpen, onToggle, activeSubject, onSubjectClick, subjects, isBusy }: {
  isOpen: boolean;
  onToggle: () => void;
  activeSubject: string;
  onSubjectClick: (subject: string) => void;
  subjects: string[];
  isBusy: boolean;
}) => (
  <div className={styles.glassPanel}>
    <div className={styles.sidebarHeader}>
      {isOpen && <h2 className="fs-5 fw-bold text-white mb-0">Matérias</h2>}
      <button className={styles.toggleButton} onClick={onToggle} aria-label={isOpen ? 'Fechar Sidebar' : 'Abrir Sidebar'}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-layout-sidebar-inset" viewBox="0 0 16 16"><path d="M14 2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h12zM2 1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2z" /><path d="M3 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4z" /></svg>
      </button>
    </div>
    {isOpen ? (
      <ul className={styles.sidebarList}>
        {subjects.map((subject) => (
          <li key={subject} className={`${styles.subjectItem} ${subject === activeSubject ? styles.active : ''} ${isBusy ? styles.disabled : ''} text-white-50`}
            onClick={() => !isBusy && onSubjectClick(subject)}
          >
            {subject}
          </li>
        ))}
        {subjects.length === 0 && <li className="text-white-50 p-3">Carregando matérias...</li>}
      </ul>
    ) : (
      <ul className={styles.sidebarList} style={{ paddingTop: '2rem' }}>
        {subjects.map((subject) => (
          <li key={subject + '-icon'} title={subject} className={`${styles.subjectItem} ${subject === activeSubject ? styles.active : ''} ${isBusy ? styles.disabled : ''} justify-content-center`}
            onClick={() => !isBusy && onSubjectClick(subject)}>
            <span className='fs-5'>{subject.charAt(0)}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
));

const ChatMessage = ({ msg }: { msg: Message }) => (
  <div className={`${styles.messageBubble} ${styles[msg.sender]}`}>
    {msg.sender === 'ai' && <AiAvatar />}
    <div className={styles.messageContent}>
      <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{msg.text}</p>
    </div>
  </div>
);

const QuestionDisplay = ({ question, onAnswerSelect, isBusy }: {
  question: Question;
  onAnswerSelect: (optionKey: string) => void;
  isBusy: boolean;
}) => {
  const optionsArray = Array.isArray(question.options)
    ? question.options.map((text, index) => ({ key: String(index), text }))
    : Object.entries(question.options).map(([key, text]) => ({ key, text }));

  const isSubjectSelection = Array.isArray(question.options) && question.subject === "Matérias";
  const isAnsweredOrOld = question.disabled || isBusy;

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
        <button className="btn btn-info text-white fw-bold" onClick={() => onActionClick('analyze_performance')} disabled={!isLast}>
          Analisar meu Desempenho
        </button>
      </div>
    </div>
  </div>
);


const AddTopicForm = React.memo(({ materiaId, onAddTopic }: {
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
      <button type="submit" className="btn btn-outline-light btn-sm" aria-label="Adicionar Tópico">Add</button>
    </form>
  );
});

const AddSubjectForm = React.memo(({ onAddSubject }: {
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
      <button type="submit" className="btn btn-primary btn-sm" aria-label="Adicionar Matéria">Adicionar</button>
    </form>
  );
});

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
      <h5 className="text-white mb-3">✏️ {schedule.nome}</h5>
      {schedule.materias.length === 0 ? (<p className="text-white-50">Seu cronograma está vazio.</p>) : (
        schedule.materias.map(materia => (
          <div key={materia.id} className="mb-3 p-2 rounded" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0">{materia.nome}</h6>
              <button className="btn btn-sm btn-danger py-0 px-1" onClick={() => onDeleteSubject(materia.id)} title="Deletar matéria" aria-label={`Deletar matéria ${materia.nome}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-x-lg" viewBox="0 0 16 16"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z" /></svg>
              </button>
            </div>
            {materia.topicos.length > 0 ? (
              <ul className="list-unstyled ps-3 mt-2">
                {materia.topicos.map(topico => (
                  <li key={topico.id} className="d-flex justify-content-between align-items-center">
                    <span>{topico.concluido ? '✅' : '◻️'} {topico.nome}</span>
                    <button className="btn btn-sm btn-outline-danger py-0 px-1" onClick={() => onDeleteTopic(topico.id)} title="Deletar tópico" aria-label={`Deletar tópico ${topico.nome}`}>
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
  if (!schedule.plan || 'detalhe' in schedule.plan) {

    const detailPlan = schedule.plan as { detalhe: string } | undefined;

    return (
      <div className={`${styles.messageBubble} ${styles.ai}`}>
        <AiAvatar />
        <div className={styles.messageContent}>
          <h5 className="text-white mb-3">📅 Plano de Estudos Semanal</h5>
          <p className="text-white-50">
            {detailPlan && 'detalhe' in detailPlan
              ? detailPlan.detalhe
              : "Não foi possível gerar seu plano. Adicione matérias e tópicos ao seu cronograma primeiro!"}
          </p>
        </div>
      </div>
    );
  }

  const dailyPlan = schedule.plan as { [dia: string]: string; };

  return (
    <div className={`${styles.messageBubble} ${styles.ai}`}>
      <AiAvatar />
      <div className={styles.messageContent}>
        <h5 className="text-white mb-3">📅 Seu Plano de Estudos Semanal</h5>
        <ul className="list-unstyled mb-0">
          {Object.entries(dailyPlan).map(([dia, topico]) => (
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

const PersistentMascot = React.memo(React.forwardRef<HTMLDivElement, {
  activeQuestion: Question | null,
  onRequestHint: (id: number) => void,
  showHintOffer: boolean,
  onMascotClick: () => void,
  bubbleClass: string
}>(({ activeQuestion, onRequestHint, showHintOffer, onMascotClick, bubbleClass }, ref) => {
  const isQuestionActive = activeQuestion && !activeQuestion.disabled;

  return (
    <div ref={ref} className={styles.mascotContainer}>
      {isQuestionActive && showHintOffer && (
        <div className={`${styles.floatingBubble} ${bubbleClass}`}>
          Precisa de uma ajudinha com essa questão?
          <button
            className={styles.helpBtn}
            onClick={() => activeQuestion && onRequestHint(activeQuestion.id)}
            aria-label="Sim, preciso de ajuda com a questão"
          >
            Sim, preciso de ajuda!!
          </button>
        </div>
      )}

      <div className={styles.mascotImageWrapper} onClick={onMascotClick} role="button" tabIndex={0} aria-label="Mascote IAra para dicas">
        <img src={iaraImg} alt="IAra" className={styles.mascotImg} />
      </div>
    </div>
  );
}));

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

// COMPONENTE PRINCIPAL
// ---
export function ChatPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [activeSubject, setActiveSubject] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatItem[]>([]);
  const [questionList, setQuestionList] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isMobileLayout] = useState(window.innerWidth <= 768);
  const [hintCounts, setHintCounts] = useState<Record<number, number>>({});
  const activeQuestion = questionList.length > 0 ? questionList[currentQuestionIndex] : null;
  const [showHintOffer, setShowHintOffer] = useState(false);
  const [bubbleClass, setBubbleClass] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const mascotRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleApiError = useCallback((error: unknown): boolean => {
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.toLowerCase().includes('unauthorized')) {
        localStorage.removeItem('authToken');
        navigate('/login?message=Sessão expirada. Faça login novamente.');
        return true;
      }
    }
    return false;
  }, [navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isGuest = params.get('guest') === 'true';
    if (!getAuthToken() && !isGuest) {
      navigate('/login?message=Você precisa estar logado para acessar o chat.');
    }
  }, [navigate, location.search]);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const data = await apiCall<MateriasResponse>(`${API_URL}/materias`);
        const availableSubjects = data.materias_disponiveis || [];
        setSubjectsList(availableSubjects);

        if (availableSubjects.length > 0 && chatHistory.length === 0) {
          if (!isMobileLayout) {
            const firstSubject = availableSubjects[0];
            setActiveSubject(firstSubject);
            setChatHistory([{ id: Date.now(), text: `Olá! Sou a IAra. Vamos começar com ${firstSubject}. O que gostaria de fazer?`, sender: 'ai' }, { id: Date.now() + 1, type: 'action_menu' }]);
          } else {
            setChatHistory([{
              id: Date.now(),
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
          setChatHistory([{ id: Date.now(), text: `Olá! Sou a IAra. Não encontrei matérias disponíveis no momento.`, sender: 'ai' }]);
        }
      } catch (error: unknown) {
        console.error("Falha ao buscar matérias:", error);
        if (!handleApiError(error)) {
          setSubjectsList([]);
          if (chatHistory.length === 0) {
            setChatHistory([{ id: Date.now(), text: `Olá! Tive um problema para carregar as matérias. Tente recarregar a página.`, sender: 'ai' }]);
          }
        }
      }
    };

    const params = new URLSearchParams(location.search);
    const isGuest = params.get('guest') === 'true';
    if (getAuthToken() || isGuest) {
      fetchSubjects();
    }
  }, [isMobileLayout, chatHistory.length, handleApiError, location.search]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

  useEffect(() => {
    setShowHintOffer(false);
    if (activeQuestion && !activeQuestion.disabled) {
      const timer = setTimeout(() => {
        setShowHintOffer(true);
      }, 30000);
      return () => clearTimeout(timer);
    }
    return () => { };
  }, [activeQuestion]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showHintOffer &&
        mascotRef.current &&
        !mascotRef.current.contains(event.target as Node)
      ) {
        setBubbleClass(styles['fade-out']);
        setTimeout(() => {
          setShowHintOffer(false);
          setBubbleClass('');
        }, 300);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => { document.removeEventListener("mousedown", handleClickOutside); };
  }, [showHintOffer]);

  const handleMascotClick = useCallback(() => {
    if (!activeQuestion || activeQuestion.disabled) {
      return;
    }

    if (showHintOffer) {
      setBubbleClass(styles['fade-out']);
      setTimeout(() => {
        setShowHintOffer(false);
        setBubbleClass('');
      }, 300);
    } else {
      setShowHintOffer(true);
      setBubbleClass('');
    }
  }, [activeQuestion, showHintOffer]);

  const showNextQuestion = useCallback(() => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < questionList.length) {
      setCurrentQuestionIndex(nextIndex);
      setChatHistory(prev => [
        ...prev,
        { ...questionList[nextIndex], type: 'question', id: questionList[nextIndex].id }
      ]);
    } else {
      setQuestionList([]);
      setCurrentQuestionIndex(0);
      setChatHistory(prev => [
        ...prev,
        { id: Date.now() + 2, text: 'Você terminou todas as questões que eu busquei! O que gostaria de fazer agora?', sender: 'ai' },
        { id: Date.now() + 3, type: 'action_menu' }
      ]);
    }
  }, [currentQuestionIndex, questionList]);

  const handleSubjectClick = useCallback((subject: string) => {
    const proceedWithSubjectChange = () => {
      setQuestionList([]);
      setCurrentQuestionIndex(0);

      setChatHistory(prevHistory => {
        const historyCopy = [...prevHistory];
        let lastActiveQuestionIndex = -1;

        for (let i = historyCopy.length - 1; i >= 0; i--) {
          const item = historyCopy[i];
          if ('type' in item && item.type === 'question' && item.disabled !== true) {
            lastActiveQuestionIndex = i;
            break;
          }
        }

        if (lastActiveQuestionIndex !== -1) {
          const itemToDisable = historyCopy[lastActiveQuestionIndex];
          historyCopy[lastActiveQuestionIndex] = { ...itemToDisable, disabled: true } as ChatItem;
        }

        const cleanHistory = historyCopy.filter(item =>
          !('type' in item && (item.type === 'action_menu' || item.type === 'schedule' || item.type === 'weekly_schedule' || item.type === 'analysis'))
        );

        return [
          ...cleanHistory,
          { id: Date.now(), text: `Certo! Mudei o foco para ${subject}.`, sender: 'ai' },
          { id: Date.now() + 1, type: 'action_menu' }
        ];
      });

      setActiveSubject(subject);
    };

    if (showHintOffer) {
      setBubbleClass(styles['fade-out']);
      setTimeout(() => {
        setShowHintOffer(false);
        setBubbleClass('');
        proceedWithSubjectChange();
      }, 300);
      return;
    }
    proceedWithSubjectChange();
  }, [showHintOffer]);

  const handleAnswerSelect = async (selectedOptionKey: string) => {
    if (showHintOffer) {
      setBubbleClass(styles['fade-out']);
      setTimeout(() => {
        setShowHintOffer(false);
        setBubbleClass('');
      }, 300);
    } else {
      setShowHintOffer(false);
    }

    const currentQuestion = questionList[currentQuestionIndex];
    const questionItemIndex = chatHistory.findIndex(item =>
      'type' in item && item.type === 'question' && item.disabled !== true
    );

    if (questionItemIndex === -1) return;
    const questionItem = chatHistory[questionItemIndex];


    if ('type' in questionItem && questionItem.type === 'question' && Array.isArray(questionItem.options) && questionItem.subject === "Matérias") {
      const selectedSubject = questionItem.options[parseInt(selectedOptionKey)];
      const userMessage: Message = { id: Date.now(), text: `Quero estudar: ${selectedSubject}`, sender: 'user' };

      const updatedHistory = [...chatHistory];
      updatedHistory[questionItemIndex] = { ...questionItem, disabled: true } as ChatItem;
      setChatHistory(updatedHistory);
      setChatHistory(prev => [...prev, userMessage]);
      handleSubjectClick(selectedSubject);
      return;
    }

    if (!currentQuestion) return;

    const updatedHistory = [...chatHistory];
    updatedHistory[questionItemIndex] = { ...questionItem, disabled: true } as ChatItem;
    setChatHistory(updatedHistory);

    const answerText = Array.isArray(currentQuestion.options)
      ? currentQuestion.options[parseInt(selectedOptionKey)]
      : currentQuestion.options[selectedOptionKey];
    const userMessage: Message = { id: Date.now(), text: `Minha resposta: ${selectedOptionKey}. ${answerText}`, sender: 'user' };
    setChatHistory(prev => [...prev, userMessage, { id: Date.now() + 1, text: `Resposta "${selectedOptionKey}" recebida. Verificando...`, sender: 'ai' }]);

    try {
      setIsBusy(true);
      const result = await apiCall<AnswerCheckResponse>(`${API_URL}/perguntas/verificar`, 'POST', { question_id: currentQuestion.id, user_answer: selectedOptionKey });
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
      if (!handleApiError(error)) {
        const errorMessage = error instanceof Error ? error.message : 'problema desconhecido ao verificar sua resposta.';
        setChatHistory(prev => [...prev, { id: Date.now() + 2, text: `Desculpe, tive um problema ao verificar sua resposta: ${errorMessage}`, sender: 'ai' }]);
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleRequestHint = async (questionId: number) => {
    setIsBusy(true);

    const currentLevel = hintCounts[questionId] || 0;
    const nextLevel = Math.min(currentLevel + 1, 3);

    setHintCounts(prev => ({ ...prev, [questionId]: nextLevel }));

    setChatHistory(prev => [...prev, { id: Date.now() + 1, text: "Pensando...", sender: 'ai' }]);

    try {
      const data = await apiCall<{ dica: string }>(`${API_URL}/ia/dica`, 'POST', { question_id: questionId, level: nextLevel });

      setChatHistory(prev => [
        ...prev.filter(m => !('text' in m) || m.text !== "Pensando..."),
        { id: Date.now() + 2, text: `${data.dica}`, sender: 'ai' }
      ]);
    } catch (error: unknown) {
      if (!handleApiError(error)) {
        setChatHistory(prev => [
          ...prev.filter(m => !('text' in m) || m.text !== "Pensando..."),
          { id: Date.now() + 2, text: "Desculpe, não consegui gerar uma dica agora.", sender: 'ai' }
        ]);
      }
    } finally {
      setIsBusy(false);
    }
  };

  const fetchQuestions = async (subject: string) => {
    setIsBusy(true)
    setChatHistory(prev => [...prev, { id: Date.now(), text: `Certo! Buscando 10 questões de ${subject}...`, sender: 'ai' }]);
    setQuestionList([]);
    setCurrentQuestionIndex(0);
    try {
      const data = await apiCall<Question[]>(`${API_URL}/perguntas/${subject}?count=10`);
      if (data.length === 0) {
        setChatHistory(prev => [...prev, { id: Date.now() + 1, text: `Desculpe, não encontrei nenhuma questão de ${subject} no banco de dados.`, sender: 'ai' }]);
        return;
      }
      setQuestionList(data);
      setCurrentQuestionIndex(0);
      setChatHistory(prev => [...prev, { id: Date.now() + 1, text: `Encontrei ${data.length} questões. Vamos começar!`, sender: 'ai' }, { ...data[0], type: 'question', id: data[0].id }]);
    } catch (error: unknown) {
      console.error("Erro ao buscar questões:", error);
      if (!handleApiError(error)) {
        const errorMessage = error instanceof Error ? error.message : 'problema desconhecido ao buscar as questões.';
        setChatHistory(prev => [...prev, { id: Date.now() + 1, text: `Desculpe, tive um problema ao buscar as questões: ${errorMessage}`, sender: 'ai' }]);
      }
    } finally {
      setIsBusy(false);
    }
  };

  const refreshSchedule = async (showLoadingMsg: boolean = true) => {
    setIsBusy(true);
    if (showLoadingMsg) { setChatHistory(prev => [...prev, { id: Date.now(), text: 'Buscando seu cronograma...', sender: 'ai' }]); }
    try {
      const cronogramaData = await apiCall<Cronograma>(`${API_URL}/cronograma/me`);
      setChatHistory(prev => [
        ...prev.filter(item =>
          !('type' in item && item.type === 'schedule') &&
          !('sender' in item && item.sender === 'ai' && (item.text === 'Buscando seu cronograma...' || item.text.startsWith('Adicionando') || item.text.startsWith('Deletando')))
        ),
        { ...cronogramaData, type: 'schedule', id: cronogramaData.id }
      ]);
    } catch (error: unknown) {
      console.error('Erro ao buscar cronograma:', error);
      if (!handleApiError(error)) {
        const errorMessage = error instanceof Error ? error.message : 'problema desconhecido ao atualizar seu cronograma.';
        setChatHistory(prev => [...prev, { id: Date.now() + 1, text: `Desculpe, tive um problema ao atualizar seu cronograma: ${errorMessage}`, sender: 'ai' }]);
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleAddNewSubject = async (subjectName: string) => {
    setIsBusy(true);
    if (!subjectName.trim()) return;
    setChatHistory(prev => [...prev.filter(item => !('type' in item && item.type === 'schedule')), { id: Date.now(), text: 'Adicionando matéria...', sender: 'ai' }]);
    try {
      await apiCall(`${API_URL}/cronograma/materias`, 'POST', { nome: subjectName });
      await refreshSchedule(false);
    } catch (error: unknown) {
      if (!handleApiError(error)) {
        const errorMessage = error instanceof Error ? error.message : 'problema desconhecido ao adicionar matéria.';
        setChatHistory(prev => [...prev, { id: Date.now(), text: `Erro: ${errorMessage}`, sender: 'ai' }]);
      }
      await refreshSchedule(false);
    } finally {
      setIsBusy(false);
    }
  };

  const handleAddNewTopic = async (materiaId: number, topicName: string) => {
    setIsBusy(true);
    if (!topicName.trim()) return;
    setChatHistory(prev => [...prev.filter(item => !('type' in item && item.type === 'schedule')), { id: Date.now(), text: 'Adicionando tópico...', sender: 'ai' }]);
    try {
      await apiCall(`${API_URL}/cronograma/materias/${materiaId}/topicos`, 'POST', { nome: topicName });
      await refreshSchedule(false);
    } catch (error: unknown) {
      if (!handleApiError(error)) {
        const errorMessage = error instanceof Error ? error.message : 'problema desconhecido ao adicionar tópico.';
        setChatHistory(prev => [...prev, { id: Date.now(), text: `Erro: ${errorMessage}`, sender: 'ai' }]);
      }
      await refreshSchedule(false);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteSubject = async (materiaId: number) => {
    setIsBusy(true);
    if (!window.confirm("Tem certeza que quer deletar esta matéria e todos os seus tópicos?")) return;
    setChatHistory(prev => [...prev.filter(item => !('type' in item && item.type === 'schedule')), { id: Date.now(), text: 'Deletando matéria...', sender: 'ai' }]);
    try {
      await apiCall(`${API_URL}/cronograma/materias/${materiaId}`, 'DELETE');
      await refreshSchedule(false);
    } catch (error: unknown) {
      if (!handleApiError(error)) {
        const errorMessage = error instanceof Error ? error.message : 'problema desconhecido ao deletar matéria.';
        setChatHistory(prev => [...prev, { id: Date.now(), text: `Erro: ${errorMessage}`, sender: 'ai' }]);
      }
      await refreshSchedule(false);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteTopic = async (topicoId: number) => {
    setIsBusy(true);
    if (!window.confirm("Tem certeza que quer deletar este tópico?")) return;
    setChatHistory(prev => [...prev.filter(item => !('type' in item && item.type === 'schedule')), { id: Date.now(), text: 'Deletando tópico...', sender: 'ai' }]);
    try {
      await apiCall(`${API_URL}/cronograma/topicos/${topicoId}`, 'DELETE');
      await refreshSchedule(false);
    } catch (error: unknown) {
      if (!handleApiError(error)) {
        const errorMessage = error instanceof Error ? error.message : 'problema desconhecido ao deletar tópico.';
        setChatHistory(prev => [...prev, { id: Date.now(), text: `Erro: ${errorMessage}`, sender: 'ai' }]);
      }
      await refreshSchedule(false);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchWeeklySchedule = async () => {
    setIsBusy(true);
    setChatHistory(prev => [...prev, { id: Date.now(), text: 'Gerando seu plano de estudos semanal...', sender: 'ai' }]);
    try {
      const weeklyScheduleData = await apiCall<WeeklyScheduleResponse>(`${API_URL}/cronograma/me/semanal`);
      setChatHistory(prev => [
        ...prev,
        { plan: weeklyScheduleData, type: 'weekly_schedule', id: Date.now() }
      ]);
    } catch (error: unknown) {
      if (!handleApiError(error)) {
        const errorMessage = error instanceof Error ? error.message : 'problema desconhecido ao gerar plano.';
        setChatHistory(prev => [...prev, { id: Date.now(), text: `Erro: ${errorMessage}`, sender: 'ai' }]);
      }
    } finally {
      setIsBusy(false);
    }
  };

  const fetchPerformanceAnalysis = async () => {
    setIsBusy(true);
    setChatHistory(prev => [...prev, { id: Date.now(), text: 'Certo, vou analisar seu desempenho...', sender: 'ai' }]);
    try {
      const analysisData = await apiCall<AnalysisData>(`${API_URL}/ia/analise-erros`);
      setChatHistory(prev => [
        ...prev.filter(m => !('text' in m) || m.text !== 'Certo, vou analisar seu desempenho...'),
        { ...analysisData, type: 'analysis', id: Date.now() }
      ]);
    } catch (error: unknown) {
      if (!handleApiError(error)) {
        const errorMessage = error instanceof Error ? error.message : 'problema desconhecido ao analisar desempenho.';
        setChatHistory(prev => [...prev, { id: Date.now(), text: `Erro ao analisar: ${errorMessage}`, sender: 'ai' }]);
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleActionClick = useCallback(async (action: 'get_questions' | 'edit_schedule' | 'get_weekly_schedule' | 'analyze_performance') => {
    const params = new URLSearchParams(location.search);
    const isGuest = params.get('guest') === 'true';
    const token = getAuthToken();

    if (isGuest && (!token) && (action === 'edit_schedule' || action === 'get_weekly_schedule' || action === 'get_questions' || action === 'analyze_performance')) {
      setChatHistory(prev => [...prev, { id: Date.now(), text: `Esta funcionalidade requer que você esteja conectado a uma conta.`, sender: 'ai' }]);
      return;
    }

    setChatHistory(prevHistory => {
      const lastItemIndex = prevHistory.length - 1;
      const lastItem = prevHistory[lastItemIndex];
      if (lastItem && 'type' in lastItem && lastItem.type === 'action_menu') {
        const updatedHistory = [...prevHistory];
        updatedHistory[lastItemIndex] = { ...lastItem, disabled: true } as ChatItem;
        return updatedHistory;
      }
      return prevHistory;
    });

    if (action === 'get_questions') {
      if (activeSubject) {
        fetchQuestions(activeSubject);
      } else {
        setChatHistory(prev => [...prev, { id: Date.now(), text: 'Por favor, selecione uma matéria para começar a responder questões.', sender: 'ai' }]);
      }
    }
    if (action === 'edit_schedule') { await refreshSchedule(); }
    if (action === 'get_weekly_schedule') { await fetchWeeklySchedule(); }
    if (action === 'analyze_performance') { await fetchPerformanceAnalysis(); }
  }, [activeSubject, location.search]);

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
            isBusy={isBusy}
          />
        </div>
      )}

      <div className={`${styles.glassPanel} ${styles.chatWindow}`}>
        <main className={styles.messageList}>
          {chatHistory.map((item, index) => {
            const isLastItem = index === chatHistory.length - 1;
            const key = item.id ? item.id : index;

            if ('sender' in item) {
              return <ChatMessage key={key} msg={item} />
            }
            if (item.type === 'question') {
              return <QuestionDisplay
                key={key}
                question={item}
                onAnswerSelect={handleAnswerSelect}
                isBusy={isBusy}
              />
            }
            if (item.type === 'action_menu') {
              return <ActionMenu
                key={key}
                onActionClick={handleActionClick}
                isLast={isLastItem}
              />
            }
            if (item.type === 'schedule') {
              return <ScheduleDisplay
                key={key}
                schedule={item}
                onAddSubject={handleAddNewSubject}
                onAddTopic={handleAddNewTopic}
                onDeleteSubject={handleDeleteSubject}
                onDeleteTopic={handleDeleteTopic}
              />
            }
            if (item.type === 'weekly_schedule') {
              return <WeeklyScheduleDisplay key={key} schedule={item} />
            }
            if (item.type === 'analysis') {
              return <AnalysisDisplay key={key} data={item} />
            }
            return null;
          })}
          <div ref={messagesEndRef} />
        </main>

        <PersistentMascot
          activeQuestion={activeQuestion}
          onRequestHint={handleRequestHint}
          showHintOffer={showHintOffer}
          onMascotClick={handleMascotClick}
          bubbleClass={bubbleClass}
          ref={mascotRef}
        />
      </div>
    </div>
  );
}