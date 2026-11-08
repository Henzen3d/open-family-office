import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <span className="inline-block px-3 py-1 bg-amber-500/10 text-amber-400 text-xs font-mono rounded-full mb-4">
          Erro 404
        </span>
        <h1 className="text-3xl font-bold tracking-tight mb-2 text-white">
          Página Não Encontrada
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          O recurso solicitado não existe ou ainda não foi publicado no OpenFamilyOffice.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition"
        >
          Voltar ao Assistente
        </Link>
      </div>
    </main>
  );
}
