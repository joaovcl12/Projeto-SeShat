import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import './LoginRegister.css';

const API_URL = "https://seshat-api-m30w.onrender.com";

const LoginRegister: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        email: "",
        password: "",
        name: "",
    });

    const navigate = useNavigate();
    const location = useLocation();

    React.useEffect(() => {
        const params = new URLSearchParams(location.search);
        const msg = params.get('message');
        if (msg) {
            setError(msg);
        }
    }, [location.search]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            if (isLogin) {
                const formData = new URLSearchParams();
                formData.append('username', form.email);
                formData.append('password', form.password);

                const response = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || "Email ou senha incorretos.");
                }

                const data = await response.json();

                localStorage.setItem('authToken', data.access_token);

                navigate('/chat');

            } else {
                const response = await fetch(`${API_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: form.email,
                        password: form.password
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || "Falha ao registrar. Tente outro email.");
                }

                setIsLogin(true);
                setError("Conta criada com sucesso! Por favor, faça o login.");
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Ocorreu um erro inesperado.");
            }
        }
    };

    const guestLink = "/chat?guest=true";

    return (
        <main className="general-section">
            <header className="login-header text-center py-4" style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 10 }}>
                <Link to="/" className="text-decoration-none text-white-50">
                    <h1 className="fs-3 fw-bold mb-0">
                        IAra | <span className="text-success">Início</span>
                    </h1>
                </Link>
            </header>

            <div className="outer-form-section">
                <div className="form-section">
                    <h2>
                        {isLogin ? "Primeiro vamos acessar sua conta!" : "Registre sua conta!"}
                    </h2>

                    <form onSubmit={handleSubmit} className="form-section">
                        {!isLogin && (
                            <div>
                                <label htmlFor="name">Nome</label>
                                <input id="name" name="name" type="text" onChange={handleChange} value={form.name} required />
                            </div>
                        )}
                        <div>
                            <label htmlFor="email">E-mail</label>
                            <input id="email" name="email" type="email" onChange={handleChange} value={form.email} required />
                        </div>
                        <div>
                            <label htmlFor="password">Senha</label>
                            <input id="password" name="password" type="password" onChange={handleChange} value={form.password} required />
                        </div>

                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}

                        <button type="submit" className="submit-button">
                            {isLogin ? "Entrar" : "Registrar"}
                        </button>
                    </form>

                    <p>
                        {isLogin ? "Ainda não tem uma conta?" : "Já tem uma conta?"}{" "}
                        <button type="button" onClick={() => { setIsLogin(!isLogin); setError(null); }}>
                            {isLogin ? "Crie uma" : "Entrar"}
                        </button>
                        <div className="guest-button-section">
                            <Link to={guestLink} className="guest-button">
                                Entrar como Convidado
                            </Link>
                        </div>
                    </p>
                </div>
            </div>
        </main>
    );
};

export default LoginRegister;