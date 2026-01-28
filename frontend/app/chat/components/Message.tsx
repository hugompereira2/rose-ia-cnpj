'use client';

interface MessageData {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  data?: any;
  timestamp: Date;
}

interface MessageProps {
  message: MessageData;
}

export default function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-2xl rounded-2xl p-4 md:p-5 shadow-lg ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-slate-900/80 text-slate-100 border border-slate-700/80 backdrop-blur-sm'
        }`}
      >
        {isUser ? (
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-200/80 mb-1">
              Você
            </div>
            <div className="font-medium">{message.content}</div>
          </div>
        ) : (
          <div>
            <div className="text-xs uppercase tracking-wide text-pink-300 mb-1">
              Rose
            </div>
            {message.data ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="flex items-center gap-3">
                    {message.data.logo && (
                      <img
                        src={message.data.logo}
                        alt={`Logo ${message.data.razaoSocial || 'empresa'}`}
                        className="w-10 h-10 rounded-lg object-contain bg-slate-800/80 border border-slate-700"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          const currentSrc = img.src;

                          if (currentSrc.includes('google.com/s2/favicons')) {
                            img.style.display = 'none';
                          } else if (message.data.site) {
                            try {
                              const url = new URL(message.data.site);
                              const domain = url.host;
                              const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
                              img.src = googleFaviconUrl;
                            } catch {
                              img.style.display = 'none';
                            }
                          } else {
                            img.style.display = 'none';
                          }
                        }}
                      />
                    )}
                    <div>
                      {message.data.razaoSocial && (
                        <div className="text-base md:text-lg font-semibold text-slate-50">
                          {message.data.razaoSocial}
                        </div>
                      )}
                      {message.data.nomeFantasia && (
                        <div className="text-xs md:text-sm text-slate-400">
                          {message.data.nomeFantasia}
                        </div>
                      )}
                    </div>
                  </div>
                  {message.data.situacao && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/40">
                      {message.data.situacao}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {message.data.cnpj && (
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-wide text-slate-400">
                        CNPJ
                      </div>
                      <div className="font-medium text-slate-100">
                        {message.data.cnpj}
                      </div>
                    </div>
                  )}

                  {message.data.cnae && (
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-wide text-slate-400">
                        CNAE
                      </div>
                      <div className="text-slate-200">
                        {message.data.cnae}
                      </div>
                    </div>
                  )}

                  {message.data.endereco && (
                    <div className="space-y-1 md:col-span-2">
                      <div className="text-xs uppercase tracking-wide text-slate-400">
                        Endereço
                      </div>
                      <div className="text-slate-200">
                        {message.data.endereco}
                      </div>
                    </div>
                  )}

                  {message.data.site && (
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-wide text-slate-400">
                        Site
                      </div>
                      <a
                        href={message.data.site}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 hover:underline break-all"
                      >
                        {message.data.site}
                      </a>
                    </div>
                  )}

                  {message.data.email && (
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-wide text-slate-400">
                        Email
                      </div>
                      <a
                        href={`mailto:${message.data.email}`}
                        className="text-blue-400 hover:text-blue-300 hover:underline break-all"
                      >
                        {message.data.email}
                      </a>
                    </div>
                  )}

                  {message.data.instagram && (
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-wide text-slate-400">
                        Instagram
                      </div>
                      <a
                        href={`https://instagram.com/${message.data.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-400 hover:text-pink-300 hover:underline"
                      >
                        {message.data.instagram}
                      </a>
                    </div>
                  )}
                </div>

                {message.data.fontes && message.data.fontes.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700/80">
                    <div className="text-xs font-semibold text-slate-400 mb-2">
                      Fontes consultadas
                    </div>
                    <ul className="space-y-1 text-xs md:text-sm">
                      {message.data.fontes.map((fonte: string, index: number) => (
                        <li key={index}>
                          <a
                            href={fonte}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-300 hover:text-blue-300 hover:underline break-all"
                          >
                            {fonte}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {message.content && (
                  <div className="mt-2 text-sm text-slate-200">
                    {message.content}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-200">{message.content}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
