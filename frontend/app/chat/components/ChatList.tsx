'use client';

interface Conversation {
  id: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatListProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
}

export default function ChatList({
  conversations,
  currentConversationId,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
}: ChatListProps) {
  const formatDate = (dateString: string) => {
    try {
      // Função para obter apenas a data (ano/mês/dia) no horário de Brasília
      const getBrasiliaDateOnly = (date: Date) => {
        // Usar Intl.DateTimeFormat para obter componentes da data no timezone de Brasília
        const formatter = new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        
        const parts = formatter.formatToParts(date);
        const year = parseInt(parts.find(p => p.type === 'year')?.value || '0', 10);
        const month = parseInt(parts.find(p => p.type === 'month')?.value || '0', 10) - 1; // month é 0-indexed
        const day = parseInt(parts.find(p => p.type === 'day')?.value || '0', 10);
        
        // Criar data no timezone local (mas com os valores de Brasília)
        return new Date(year, month, day);
      };

      const date = new Date(dateString);
      const now = new Date();
      
      // Obter apenas as datas (sem hora) no horário de Brasília
      const dateOnly = getBrasiliaDateOnly(date);
      const nowOnly = getBrasiliaDateOnly(now);
      
      // Calcular diferença em dias
      const diffMs = nowOnly.getTime() - dateOnly.getTime();
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      // Garantir que nunca seja negativo (caso de problemas de timezone)
      const daysAbs = Math.max(0, days);

      if (daysAbs === 0) {
        return 'Hoje';
      } else if (daysAbs === 1) {
        return 'Ontem';
      } else {
        return `${daysAbs} dias atrás`;
      }
    } catch (error) {
      // Em caso de erro, retornar "Hoje" como fallback
      console.error('Erro ao formatar data:', error);
      return 'Hoje';
    }
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={onNewConversation}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nova Conversa
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-gray-500 text-sm text-center">
            Nenhuma conversa ainda
          </div>
        ) : (
          <div className="p-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center justify-between px-4 py-2 rounded-lg mb-1 transition-colors ${
                  currentConversationId === conv.id
                    ? 'bg-blue-100 text-blue-900'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <button
                  onClick={() => onSelectConversation(conv.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="text-sm font-medium truncate">
                    {conv.title || `Conversa ${conv.id.split('_')[1]}`}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatDate(conv.updatedAt)}
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Tem certeza que deseja deletar esta conversa?')) {
                      onDeleteConversation(conv.id);
                    }
                  }}
                  className="ml-2 p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Deletar conversa"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
