'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import apiClient from '@/lib/axios';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const response = await apiClient.get('/conversations');
        const conversations = response.data;
        
        if (conversations.length > 0) {
          router.push(`/chat/${conversations[0].id}`);
          return;
        }
      } catch (error: any) {
        // Verificar se é erro de conexão (backend não disponível)
        const isNetworkError = 
          error.code === 'ERR_NETWORK' ||
          error.code === 'ECONNABORTED' ||
          error.message?.includes('Network Error') ||
          (!error.response && error.request);
        
        // Só logar se não for erro de rede esperado
        if (!isNetworkError) {
          console.error('Erro ao carregar conversas do backend:', error);
        }
      }
      
      // Fallback para localStorage
      try {
        const saved = localStorage.getItem('cnpj_conversations');
        if (saved) {
          const convs = JSON.parse(saved);
          if (Array.isArray(convs) && convs.length > 0) {
            router.push(`/chat/${convs[0]}`);
            return;
          }
        }
      } catch (localError) {
        // Ignorar erro silenciosamente
      }
      
      // Se não houver conversas, ir para /chat/new
      router.push('/chat/new');
    };

    loadConversations();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Carregando...</h1>
      </div>
    </div>
  );
}
