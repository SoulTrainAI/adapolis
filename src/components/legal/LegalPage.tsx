import type { ReactNode } from 'react';

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-navy px-4 py-10 text-white sm:px-6 lg:px-8">
      <article className="mx-auto max-w-3xl space-y-6 text-slate-300 [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-relaxed [&_ul]:space-y-1">
        <header className="space-y-1">
          <h1 className="text-4xl font-bold text-white">{title}</h1>
          <p className="text-sm text-slate-500">Last updated {updated}</p>
        </header>
        {children}
      </article>
    </div>
  );
}
