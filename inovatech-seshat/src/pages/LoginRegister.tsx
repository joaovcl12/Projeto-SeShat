import React, { useState } from "react";
// NOVO: Importa hooks do React Router para navegação
import { useNavigate, Link } from "react-router-dom";
import './LoginRegister.css';

// NOVO: A URL da sua API que está online no Render
const API_URL = "https://seshat-api-m30w.onrender.com";

/**
 * Componente de Login e Registro
 */
const LoginRegister: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    // NOVO: Estado para exibir mensagens de erro da API
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        email: "",
        password: "",
        name: "", // Este campo 'name' está no formulário
    });

    // NOVO: Hook para redirecionar o usuário após o login
    const navigate = useNavigate();

    /**
     * Atualiza o estado `form` conforme o usuário digita.
     */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    /**
     * Manipula o envio do formulário, agora com chamadas de API.
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null); // Limpa erros anteriores

        try {
            if (isLogin) {
                // --- LÓGICA DE LOGIN ---
                
                // O backend (OAuth2PasswordRequestForm) espera dados de formulário, não JSON.
                // Por isso, usamos URLSearchParams.
                const formData = new URLSearchParams();
                formData.append('username', form.email); // O backend espera 'username'
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

                const data = await response.json(); // ex: { access_token: "...", token_type: "bearer" }
                
                // SUCESSO! Salva o token no localStorage
                localStorage.setItem('authToken', data.access_token);
                
                // Redireciona o usuário para a página de chat
                navigate('/chat');

            } else {
                // --- LÓGICA DE REGISTRO ---
                
                // O endpoint /register espera JSON.
                // ATENÇÃO: Seu backend (schema UserCreate) só espera "email" e "password".
                // O campo 'name' será ignorado por enquanto, a menos que você atualize o backend.
                
                const response = await fetch(`${API_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: form.email,
                        password: form.password
                        // 'name': form.name // <-- Adicione isso se/quando atualizar o backend
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || "Falha ao registrar. Tente outro email.");
                }
                
                // Sucesso no registro!
                setIsLogin(true); // Muda para a tela de login
                setError("Conta criada com sucesso! Por favor, faça o login."); // Mostra msg de sucesso
            }
        } catch (err: unknown) { // Tratamento de erro seguro
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Ocorreu um erro inesperado.");
            }
        }
    };

    const guestLink = "/chat"; // Rota interna para o chat

    return (
        <main className="general-section">
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

                        {/* NOVO: Bloco para exibir erros da API */}
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
                            {/* ALTERADO: Usa <Link> do React Router para navegação interna */}
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