import React, { useState } from "react";
import './LoginRegister.css';

/**
 * Componente de Login e Registro
 * --------------------------------
 * Exibe um formulário com duas variações:
 *  - Login (usuário existente)
 *  - Registro (criação de nova conta)
 * 
 * Inclui também um botão "Entrar como Convidado" que leva a um link externo
 * ou a uma rota interna da aplicação.
 */
const LoginRegister: React.FC = () => {
    // Define se o modo atual é Login (true) ou Registro (false)
    const [isLogin, setIsLogin] = useState(true);

    // Estado com os dados do formulário
    const [form, setForm] = useState({
        email: "",
        password: "",
        name: "",
    });

    /**
     * Atualiza o estado `form` conforme o usuário digita nos campos.
     */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    /**
     * Manipula o envio do formulário.
     * Substitua os console.log() pela chamada à sua API.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isLogin) {
            console.log("Login data:", form);
            // TODO: chamada de API de login
        } else {
            console.log("Register data:", form);
            // TODO: chamada de API de registro
        }
    };

    /**
     * Link para o modo "convidado".
     * Pode ser alterado para uma rota interna (ex: /home)
     * ou um link externo.
     */
    const guestLink = "/chat"; // <-- altere conforme necessário

    return (
        // Container principal: centraliza o card na tela
        <main className="general-section">
            <div className="outer-form-section">
                <div className="form-section">
                    {/* Título principal */}
                    <h2>
                        {isLogin ? "Primeiro, vamos acessar sua conta!" : "Criar Conta"}
                    </h2>

                    {/* Formulário controlado */}
                    <form onSubmit={handleSubmit} className="form-section">
                        {/* Campo de nome só aparece no modo de registro */}
                        {!isLogin && (
                            <div>
                                <label htmlFor="name">
                                    Nome
                                </label>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    onChange={handleChange}
                                    value={form.name}
                                    required
                                />
                            </div>
                        )}

                        {/* Campo de e-mail */}
                        <div>
                            <label htmlFor="email">
                                E-mail
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                onChange={handleChange}
                                value={form.email}
                                required
                            />
                        </div>

                        {/* Campo de senha */}
                        <div>
                            <label htmlFor="password">
                                Senha
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                onChange={handleChange}
                                value={form.password}
                                required
                            />
                        </div>

                        {/* Botão principal (Login ou Registro) */}
                        <button
                            type="submit"
                            className="submit-button"
                        >
                            {isLogin ? "Entrar" : "Registrar"}
                        </button>
                    </form>


                    {/* Alternar entre Login e Registro */}
                    <p>
                        {isLogin ? "Ainda não tem uma conta?" : "Já tem uma conta?"}{" "}
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                        >
                            {isLogin ? "Crie uma" : "Entrar"}
                        </button>
                        {/* Botão para entrar como convidado */}
                        <div className="guest-button-section">
                            <a
                                href={guestLink}
                                className="guest-button"
                            >
                                Entrar como Convidado
                            </a>
                        </div>
                    </p>
                </div>
            </div>
        </main>
    );
};

export default LoginRegister;
