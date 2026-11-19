'use client';

import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Sanitize URL to prevent XSS (no javascript:, data:, etc.)
function sanitizeUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('#')
  ) {
    return trimmed;
  }
  return null;
}

// Format inline styles: bold, italic, code, links
function renderInline(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  // Tokenize regex for inline markdown:
  // [label](url), `code`, **bold**, *italic*
  const regex = /(\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.slice(lastIndex, match.index));
    }

    const key = `${match.index}-${match[0]}`;

    if (match[2] && match[3]) {
      // Link: [label](url)
      const label = match[2];
      const safeHref = sanitizeUrl(match[3]);
      if (safeHref) {
        elements.push(
          <a
            key={key}
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 dark:text-indigo-400 underline font-semibold hover:text-indigo-500 transition-colors inline-flex items-center gap-0.5"
          >
            {label}
          </a>
        );
      } else {
        elements.push(label);
      }
    } else if (match[4]) {
      // Inline code: `code`
      elements.push(
        <code
          key={key}
          className="px-1.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-white/10 font-mono text-[13px] text-indigo-700 dark:text-indigo-300 font-semibold"
        >
          {match[4]}
        </code>
      );
    } else if (match[5]) {
      // Bold: **bold**
      elements.push(
        <strong key={key} className="font-bold text-slate-900 dark:text-white">
          {match[5]}
        </strong>
      );
    } else if (match[6]) {
      // Italic: *italic*
      elements.push(
        <em key={key} className="italic text-slate-800 dark:text-slate-200">
          {match[6]}
        </em>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return elements.length > 0 ? elements : [text];
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content) return null;

  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Empty line
    if (!line) {
      i++;
      continue;
    }

    // Code block ```lang ... ```
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) {
        i++; // skip closing ```
      }
      nodes.push(
        <div key={`code-${i}`} className="my-2.5 rounded-xl overflow-hidden bg-slate-900 text-slate-100 text-xs font-mono border border-slate-800 shadow-xs">
          {lang && (
            <div className="px-3 py-1 bg-slate-800/80 text-[11px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-700">
              {lang}
            </div>
          )}
          <pre className="p-3 overflow-x-auto leading-relaxed">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      continue;
    }

    // Markdown Table: lines starting and containing |
    if (line.startsWith('|') && line.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerRow = tableLines[0]
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());
        // Check if line 1 is separator (---)
        const isSep = tableLines[1].replace(/[\s|:-]/g, '').length === 0;
        const dataRows = isSep ? tableLines.slice(2) : tableLines.slice(1);

        nodes.push(
          <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  {headerRow.map((cell, colIdx) => (
                    <th key={colIdx} className="px-3 py-2">
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-[#131926]">
                {dataRows.map((rowStr, rowIdx) => {
                  const cells = rowStr
                    .slice(1, -1)
                    .split('|')
                    .map((c) => c.trim());
                  return (
                    <tr key={rowIdx} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      {cells.map((cell, colIdx) => {
                        const isNumeric = /^[\d.,R$+\-% ]+$/.test(cell);
                        return (
                          <td
                            key={colIdx}
                            className={`px-3 py-2 text-slate-800 dark:text-slate-200 ${
                              isNumeric ? 'font-mono' : ''
                            }`}
                          >
                            {renderInline(cell)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // Headings: #, ##, ###
    if (line.startsWith('### ')) {
      nodes.push(
        <h4 key={`h4-${i}`} className="text-sm font-bold text-slate-900 dark:text-white mt-3 mb-1.5 leading-snug">
          {renderInline(line.slice(4))}
        </h4>
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      nodes.push(
        <h3 key={`h3-${i}`} className="text-base font-bold text-slate-900 dark:text-white mt-3.5 mb-1.5 leading-snug">
          {renderInline(line.slice(3))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      nodes.push(
        <h2 key={`h2-${i}`} className="text-lg font-extrabold text-slate-900 dark:text-white mt-4 mb-2 leading-snug">
          {renderInline(line.slice(2))}
        </h2>
      );
      i++;
      continue;
    }

    // Blockquote: > text
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      nodes.push(
        <blockquote
          key={`quote-${i}`}
          className="my-2.5 pl-3.5 border-l-3 border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 py-1.5 pr-2.5 rounded-r-xl text-xs text-slate-700 dark:text-slate-300 italic"
        >
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx}>{renderInline(ql)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Unordered List (- or *)
    if (/^[-*]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="my-2 space-y-1 pl-4 list-disc marker:text-indigo-500 text-sm">
          {listItems.map((item, itemIdx) => (
            <li key={itemIdx} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered List (1., 2.)
    if (/^\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      nodes.push(
        <ol key={`ol-${i}`} className="my-2 space-y-1 pl-4 list-decimal marker:text-indigo-500 font-medium text-sm">
          {listItems.map((item, itemIdx) => (
            <li key={itemIdx} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Standard Paragraph
    nodes.push(
      <p key={`p-${i}`} className="leading-[1.65] text-[15px] my-1 text-slate-800 dark:text-slate-100">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div className={`space-y-1.5 ${className}`}>{nodes}</div>;
}
