'use client';

import { useState, useEffect, useRef } from 'react';
import Message from './Message';
import apiClient from '@/lib/axios';

interface MessageData {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  data?: any;
  timestamp: Date;
}

interface ChatWindowProps {
  conversationId: string;
}

export default function ChatWindow({ conversationId }: ChatWindowProps) {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousConversationId = useRef<string>('');

  useEffect(() => {
    // Se a conversa mudou, limpar mensagens imediatamente
    if (previousConversationId.current !== conversationId) {
      setMessages([]);
      previousConversationId.current = conversationId;
    }

    // Carregar mensagens do backend para esta conversa específica
    const loadMessages = async () => {
      try {
        const response = await apiClient.get(`/logs/messages/${conversationId}`);
        const msgs = Array.isArray(response.data) ? response.data : [];

        const mapped: MessageData[] = msgs.map((msg: any) => {
          const role = msg.role === 'user' ? 'user' : 'assistant';

          // Para mensagens do assistente, tentar usar o campo message/data salvo no metadata
          const metadata = msg.metadata || {};
          const assistantData = metadata.data;

          let content = msg.content as string;
          if (role === 'assistant') {
            if (assistantData?.message && typeof assistantData.message === 'string') {
              content = assistantData.message;
            }
          }

          return {
            id: msg.id,
            role,
            content,
            data: role === 'assistant' ? assistantData : undefined,
            timestamp: new Date(msg.createdAt),
          };
        });

        setMessages(mapped);
      } catch (error) {
        console.error('Erro ao carregar mensagens do backend:', error);
        setMessages([]);
      }
    };

    loadMessages();
  }, [conversationId]);

  useEffect(() => {
    // Scroll para o final quando novas mensagens chegarem
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    setInput('');
    setIsLoading(true);

    // Adicionar mensagem do usuário
    const userMessage: MessageData = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: userInput,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    try {
      // Preparar histórico de conversa (últimas 10 mensagens)
      const conversationHistory = messages
        .slice(-10)
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      const response = await apiClient.post('/agent/chat', {
        message: userInput,
        history: conversationHistory,
        conversationId: conversationId,
      });

      // Se a resposta contém dados estruturados (CNPJ processado)
      if (response.data.cnpj) {
        const assistantMessage: MessageData = {
          id: `msg_${Date.now() + 1}`,
          role: 'assistant',
          content: response.data.message || 'Dados enriquecidos com sucesso pela Rose! 🌹',
          data: response.data,
          timestamp: new Date(),
        };

        const updatedMessages = [...newMessages, assistantMessage];
        setMessages(updatedMessages);
      } else {
        // Resposta de conversação normal
        const assistantMessage: MessageData = {
          id: `msg_${Date.now() + 1}`,
          role: 'assistant',
          content: response.data.message || 'Desculpe, não consegui processar sua mensagem.',
          timestamp: new Date(),
        };

        const updatedMessages = [...newMessages, assistantMessage];
        setMessages(updatedMessages);
      }
    } catch (error: any) {
      let errorMessage = 'Desculpe, ocorreu um erro ao processar sua solicitação.';
      
      // Verificar se é erro de conexão
      const isNetworkError = 
        error.code === 'ERR_NETWORK' ||
        error.code === 'ECONNABORTED' ||
        error.message?.includes('Network Error') ||
        (!error.response && error.request);
      
      if (isNetworkError) {
        // Verificar se o backend está realmente acessível
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        errorMessage = `Não foi possível conectar ao servidor em ${apiUrl}. Verifique se o backend está rodando e acessível.`;
        console.error('Erro de conexão:', error);
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'A requisição demorou muito para responder. Por favor, tente novamente.';
      } else if (error.response?.data?.message) {
        errorMessage = `Erro: ${error.response.data.message}`;
      } else if (error.response?.status) {
        errorMessage = `Erro ${error.response.status}: ${error.response.statusText || 'Erro na requisição'}`;
      } else if (error.message) {
        errorMessage = `Erro: ${error.message}`;
      }

      const errorMsg: MessageData = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
      };

      const updatedMessages = [...newMessages, errorMsg];
      setMessages(updatedMessages);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent text-slate-100">
      <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2 text-slate-100">
                🌹 Olá! Eu sou a Rose
              </h2>
              <p className="text-sm mb-2 text-slate-300">
                Sua assistente especializada em encontrar informações sobre empresas
              </p>
              <p className="text-xs text-slate-500">
                Digite um CNPJ para começar (formato: XX.XXX.XXX/XXXX-XX ou 14 dígitos)
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {messages.map((message) => (
              <Message key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800/80 rounded-lg p-3 md:p-4 max-w-full md:max-w-2xl shadow-lg">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <div className="border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-sm p-4 shrink-0">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Converse com a Rose ou envie um CNPJ para buscar informações 🌹"
            className="flex-1 px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
