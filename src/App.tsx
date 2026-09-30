import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowDown, ArrowUp, BookOpen, Check, GraduationCap, MessageCircle, Plus, Sparkles } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; content: string };

const prompts = [
  { icon: '✳', color: 'sun', text: '¿Por qué existen las estaciones?', subject: 'Ciencias Naturales' },
  { icon: '÷', color: 'blue', text: 'Ayudame a entender las fracciones', subject: 'Matemática' },
  { icon: '❝', color: 'gold', text: '¿Qué es un mito?', subject: 'Lengua y Literatura' },
  { icon: '⌁', color: 'green', text: '¿Qué son los microorganismos?', subject: 'Ciencias Naturales' },
];

function BrandMark({ small = false }: { small?: boolean }) {
  return <div className={`brand-mark ${small ? 'brand-mark-small' : ''}`} aria-label="Instituto Grilli">
    <span className="brand-monogram">G</span><span className="brand-rule" />
    <span className="brand-name">INSTITUTO<br />GRILLI</span>
  </div>;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<number | null>(null);
  const [showScroll, setShowScroll] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const box = listRef.current;
    if (!box) return;
    box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
    setShowScroll(false);
  }, [messages, loading]);

  const submit = async (event?: FormEvent, suggested?: string) => {
    event?.preventDefault();
    const question = (suggested ?? input).trim();
    if (!question || loading) return;
    const next: Message[] = [...messages, { role: 'user', content: question }];
    setMessages(next);
    setInput('');
    setError('');
    setLoading(true);
    const controller = new AbortController();
    requestRef.current = controller;
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    try {
      const response = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.slice(-12) }), signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'request_failed');
      setMessages([...next, { role: 'assistant', content: data.answer }]);
    } catch {
      if (!controller.signal.aborted) setError('No pude responder en este momento. Intentá nuevamente en unos segundos.');
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
        textareaRef.current?.focus();
      }
    }
  };

  const newConversation = () => {
    requestRef.current?.abort(); requestRef.current = null;
    setMessages([]); setInput(''); setError(''); setLoading(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(() => textareaRef.current?.focus(), 250);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void submit(); }
  };

  const copyAnswer = async (content: string, index: number) => {
    await navigator.clipboard.writeText(content);
    setCopied(index); window.setTimeout(() => setCopied(null), 1400);
  };

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand-link" href="#inicio" onClick={newConversation}><BrandMark small /><span className="brand-divider" /><span className="product-name">Grilli <b>IA</b></span></a>
      <div className="topbar-right"><span className="campus-label"><span className="live-dot" /> MONTE GRANDE</span>
        {messages.length > 0 && <button className="new-chat" onClick={newConversation}><Plus size={16} strokeWidth={2.3} /><span>Nueva conversación</span></button>}
      </div>
    </header>

    <main className={`main-area ${messages.length ? 'has-chat' : 'is-home'}`} id="inicio">
      {messages.length === 0 ? <section className="welcome" aria-labelledby="welcome-title">
        <div className="welcome-kicker"><span className="kicker-line" /> UN ESPACIO PARA APRENDER <span className="kicker-line" /></div>
        <div className="hero-icon"><div className="hero-icon-inner"><BookOpen size={28} strokeWidth={1.6} /></div><span className="spark spark-one">✦</span><span className="spark spark-two">✳</span></div>
        <h1 id="welcome-title">Hola, ¿qué te gustaría <em>aprender?</em></h1>
        <p className="welcome-copy">Soy <strong>Grilli IA</strong>, tu asistente para aprender.<br className="desktop-break" /> Preguntame lo que necesites sobre tus materias.</p>
        <div className="suggestions" aria-label="Ideas para empezar">{prompts.map((prompt) => <button className="suggestion" key={prompt.text} onClick={() => void submit(undefined, prompt.text)}>
          <span className={`suggestion-icon ${prompt.color}`}>{prompt.icon}</span><span className="suggestion-text"><small>{prompt.subject}</small><span>{prompt.text}</span></span><ArrowUp className="suggestion-arrow" size={15} />
        </button>)}</div>
        <div className="welcome-note"><Sparkles size={13} /> Un buen lugar para empezar es una pregunta</div>
      </section> : <section className="conversation" aria-label="Conversación">
        <div className="conversation-heading"><span className="conversation-tag"><MessageCircle size={13} /> CONVERSACIÓN</span><span className="conversation-divider" /><span className="message-count">{messages.filter((m) => m.role === 'user').length} {messages.filter((m) => m.role === 'user').length === 1 ? 'pregunta' : 'preguntas'}</span></div>
        <div className="message-list" ref={listRef} onScroll={(event) => { const el = event.currentTarget; setShowScroll(el.scrollHeight - el.scrollTop - el.clientHeight > 80); }}>
          {messages.map((message, index) => <article className={`message-row ${message.role}`} key={`${index}-${message.role}`}>
            {message.role === 'assistant' && <div className="assistant-avatar"><span>G</span></div>}
            <div className="message-content-wrap">
              <div className="message-label">{message.role === 'user' ? 'Vos' : 'Grilli IA'}{message.role === 'assistant' && <span className="verified"><Check size={9} /></span>}</div>
              <div className={`message-content ${message.role}`}>
                {message.role === 'assistant' ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown> : message.content}
              </div>
              {message.role === 'assistant' && <button className="copy-button" onClick={() => void copyAnswer(message.content, index)}>{copied === index ? <><Check size={12} /> Copiado</> : 'Copiar respuesta'}</button>}
            </div>
            {message.role === 'user' && <div className="user-avatar">T</div>}
          </article>)}
          {loading && <article className="message-row assistant"><div className="assistant-avatar"><span>G</span></div><div className="message-content-wrap"><div className="message-label">Grilli IA<span className="verified"><Check size={9} /></span></div><div className="thinking"><span className="thinking-orbit"><i /><i /><i /></span><span>Estoy pensando<span className="thinking-dots">...</span></span></div></div></article>}
          {error && <div className="error-message" role="alert"><span>!</span>{error}<button onClick={() => void submit()}>Reintentar</button></div>}
        </div>
        {showScroll && <button className="scroll-bottom" onClick={() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })} aria-label="Ir al final"><ArrowDown size={17} /></button>}
      </section>}
    </main>

    <footer className={`composer-dock ${messages.length ? 'chat-dock' : ''}`}>
      <form className="composer" onSubmit={(event) => void submit(event)}>
        <textarea ref={textareaRef} value={input} onChange={(event) => { setInput(event.target.value); event.target.style.height = 'auto'; event.target.style.height = `${Math.min(event.target.scrollHeight, 160)}px`; }} onKeyDown={onKeyDown} placeholder="Escribí tu pregunta..." rows={1} maxLength={4000} aria-label="Escribí tu pregunta" disabled={loading} />
        <div className="composer-bottom"><span className="composer-hint"><span className="hint-key">↵</span> para enviar <span className="hint-separator">·</span> <span className="hint-key">⇧ ↵</span> nueva línea</span>
          <button type="submit" className="send-button" disabled={!input.trim() || loading} aria-label="Enviar pregunta"><ArrowUp size={18} strokeWidth={2.7} /></button>
        </div>
      </form>
      <p className="disclaimer"><GraduationCap size={14} /> Grilli IA es un asistente educativo. <span>Verificá siempre la información con tus materiales de clase.</span></p>
    </footer>

    <div className="corner-seal" aria-hidden="true"><span>IG</span><i /></div>
  </div>;
}
