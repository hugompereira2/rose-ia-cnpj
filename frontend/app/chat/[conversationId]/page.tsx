'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import ChatWindow from '../components/ChatWindow';
import ChatList from '../components/ChatList';
import apiClient, { apiUrl } from '@/lib/axios';

interface Conversation {
  id: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

interface PageProps {
  params: Promise<{
    conversationId: string;
  }>;
}

export default function ChatPage({ params }: PageProps) {
  const { conversationId } = use(params);
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    conversationId === 'new' ? null : conversationId,
  );
  const [loading, setLoading] = useState(true);
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null);

  const loadConversations = async () => {
    try {
      const response = await apiClient.get('/conversations');
      setConversations(response.data);
      setBackendAvailable(true);
    } catch (error: any) {
      // Verificar se é erro de conexão (backend não disponível)
      const isNetworkError = 
        error.code === 'ERR_NETWORK' ||
        error.code === 'ECONNABORTED' ||
        error.message?.includes('Network Error') ||
        (!error.response && error.request);
      
      if (isNetworkError) {
        // Backend não disponível - usar fallback sem logar erro
        // (evita poluir o console quando backend não está rodando)
        setBackendAvailable(false);
      } else {
        // Outros erros (4xx, 5xx) devem ser logados
        console.error('Erro ao carregar conversas do backend:', error);
        setBackendAvailable(false);
      }
      
      // Fallback para localStorage se backend não estiver disponível
      try {
        const saved = localStorage.getItem('cnpj_conversations');
        if (saved) {
          const convs = JSON.parse(saved);
          // Converter formato antigo (array de strings) para novo formato
          const conversations = Array.isArray(convs) && convs.length > 0
            ? convs.map((id: string) => ({
                id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }))
            : [];
          setConversations(conversations);
        } else {
          setConversations([]);
        }
      } catch (localError) {
        console.error('Erro ao carregar do localStorage:', localError);
        setConversations([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!loading) {
      // Se for 'new' e houver conversas, redirecionar para a primeira
      if (conversationId === 'new' && conversations.length > 0) {
        setCurrentConversationId(conversations[0].id);
        router.replace(`/chat/${conversations[0].id}`);
      } else if (conversationId === 'new') {
        // Se for 'new' e não houver conversas, não mostrar nenhuma conversa
        setCurrentConversationId(null);
      } else {
        // Se for uma conversa específica, usar ela
        setCurrentConversationId(conversationId);
      }
    }
  }, [conversationId, conversations, loading, router]);

  const handleNewConversation = async () => {
    // Se backend não está disponível, usar localStorage diretamente
    if (backendAvailable === false) {
      const newId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const saved = localStorage.getItem('cnpj_conversations');
      let convs: string[] = [];
      
      if (saved) {
        try {
          convs = JSON.parse(saved);
        } catch (e) {
          convs = [];
        }
      }
      
      const newConvs = [newId, ...convs.filter((id) => id !== newId)];
      localStorage.setItem('cnpj_conversations', JSON.stringify(newConvs));
      
      const newConversation = {
        id: newId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await loadConversations();
      setCurrentConversationId(newId);
      router.push(`/chat/${newId}`);
      return;
    }

    try {
      const response = await apiClient.post('/conversations', {});
      const newConversation = response.data;
      await loadConversations();
      setCurrentConversationId(newConversation.id);
      router.push(`/chat/${newConversation.id}`);
      return;
    } catch (error: any) {
      console.error('Erro ao criar nova conversa no backend:', error);
      setBackendAvailable(false);
      
      // Fallback para localStorage
      const newId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const saved = localStorage.getItem('cnpj_conversations');
      let convs: string[] = [];
      
      if (saved) {
        try {
          convs = JSON.parse(saved);
        } catch (e) {
          convs = [];
        }
      }
      
      const newConvs = [newId, ...convs.filter((id) => id !== newId)];
      localStorage.setItem('cnpj_conversations', JSON.stringify(newConvs));
      
      const newConversation = {
        id: newId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await loadConversations();
      setCurrentConversationId(newId);
      router.push(`/chat/${newId}`);
    }
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
    router.push(`/chat/${id}`);
  };

  const handleDeleteConversation = async (id: string) => {
    // Se backend não está disponível, usar localStorage diretamente
    if (backendAvailable === false) {
      try {
        const saved = localStorage.getItem('cnpj_conversations');
        if (saved) {
          const convs: string[] = JSON.parse(saved);
          const filtered = convs.filter((convId) => convId !== id);
          localStorage.setItem('cnpj_conversations', JSON.stringify(filtered));
          
          // Remover mensagens também
          localStorage.removeItem(`cnpj_messages_${id}`);
          
          await loadConversations();
          
          // Se a conversa deletada era a atual, redirecionar
          if (currentConversationId === id) {
            if (filtered.length > 0) {
              setCurrentConversationId(filtered[0]);
              router.push(`/chat/${filtered[0]}`);
            } else {
              setCurrentConversationId(null);
              router.push('/chat/new');
            }
          }
        }
      } catch (localError) {
        console.error('Erro ao deletar do localStorage:', localError);
      }
      return;
    }

    try {
      await apiClient.delete(`/conversations/${id}`);
      await loadConversations();
      
      // Se a conversa deletada era a atual, redirecionar
      if (currentConversationId === id) {
        const remaining = conversations.filter((c) => c.id !== id);
        if (remaining.length > 0) {
          setCurrentConversationId(remaining[0].id);
          router.push(`/chat/${remaining[0].id}`);
        } else {
          setCurrentConversationId(null);
          router.push('/chat/new');
        }
      }
    } catch (error: any) {
      console.error('Erro ao deletar conversa no backend:', error);
      setBackendAvailable(false);
      
      // Fallback para localStorage
      try {
        const saved = localStorage.getItem('cnpj_conversations');
        if (saved) {
          const convs: string[] = JSON.parse(saved);
          const filtered = convs.filter((convId) => convId !== id);
          localStorage.setItem('cnpj_conversations', JSON.stringify(filtered));
          
          // Remover mensagens também
          localStorage.removeItem(`cnpj_messages_${id}`);
          
          await loadConversations();
          
          // Se a conversa deletada era a atual, redirecionar
          if (currentConversationId === id) {
            if (filtered.length > 0) {
              setCurrentConversationId(filtered[0]);
              router.push(`/chat/${filtered[0]}`);
            } else {
              setCurrentConversationId(null);
              router.push('/chat/new');
            }
          }
        }
      } catch (localError) {
        console.error('Erro ao deletar do localStorage:', localError);
      }
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black">
      <ChatList
        conversations={conversations}
        currentConversationId={currentConversationId}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
      />
      <div className="flex-1 flex flex-col">
        {currentConversationId ? (
          <ChatWindow conversationId={currentConversationId} />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-300 px-4 py-8">
            <div className="text-center max-w-md">
              <h2 className="text-xl font-semibold mb-2">
                🌹 Olá! Eu sou a Rose
              </h2>
              <p className="text-sm mb-2">
                Clique em &quot;Nova Conversa&quot; para começar
              </p>
              {backendAvailable === false && (
                <div className="mt-4 p-3 bg-yellow-950/40 border border-yellow-700/60 rounded-lg text-xs text-yellow-100 max-w-md">
                  <p className="font-semibold mb-1">⚠️ Backend não disponível</p>
                  <p>
                    O sistema está usando armazenamento local. Para funcionalidades completas,
                    certifique-se de que o backend está rodando em {apiUrl}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
