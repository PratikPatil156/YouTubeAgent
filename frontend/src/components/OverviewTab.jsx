import React from 'react';
import { BookOpen, Sparkles } from 'lucide-react';

function parseOverviewMarkdown(rawText) {
  if (!rawText) return '';
  const text = String(rawText).replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const out = [];
  let inTable = false;
  let tableHeaders = [];
  let tableRows = [];
  let inList = false;
  let listType = null;

  const formatInline = (str) => {
    if (!str) return '';
    return str
      .replace(/&(?!amp;|lt;|gt;)/g, '&amp;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/&lt;br\s*\/?&gt;/gi, '<br/>')
      .replace(/<br\s*\/?>/gi, '<br/>');
  };

  const flushTable = () => {
    if (!inTable) return;
    let html = '<div class="table-wrapper"><table>';
    if (tableHeaders.length > 0) {
      html += '<thead><tr>';
      tableHeaders.forEach(h => {
        html += `<th>${formatInline(h)}</th>`;
      });
      html += '</tr></thead>';
    }
    if (tableRows.length > 0) {
      html += '<tbody>';
      tableRows.forEach(row => {
        html += '<tr>';
        row.forEach(cell => {
          html += `<td>${formatInline(cell)}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody>';
    }
    html += '</table></div>';
    out.push(html);
    inTable = false;
    tableHeaders = [];
    tableRows = [];
  };

  const flushList = () => {
    if (!inList) return;
    out.push(`</${listType}>`);
    inList = false;
    listType = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const isTableRow = line.includes('|') && (line.startsWith('|') || line.endsWith('|'));
    const isSeparatorRow = isTableRow && /^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(line);

    if (isTableRow) {
      flushList();
      const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => {
        if ((idx === 0 || idx === arr.length - 1) && c === '') return false;
        return true;
      });

      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
      } else if (isSeparatorRow) {
        continue;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else {
      flushTable();
    }

    if (/^---+$|^___+$|^\*\*\*+$/.test(line)) {
      flushList();
      out.push('<hr/>');
      continue;
    }

    if (line.startsWith('#### ')) {
      flushList();
      out.push(`<h4>${formatInline(line.substring(5))}</h4>`);
      continue;
    }
    if (line.startsWith('### ')) {
      flushList();
      out.push(`<h3>${formatInline(line.substring(4))}</h3>`);
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      out.push(`<h2>${formatInline(line.substring(3))}</h2>`);
      continue;
    }
    if (line.startsWith('# ')) {
      flushList();
      out.push(`<h1>${formatInline(line.substring(2))}</h1>`);
      continue;
    }

    if (line.startsWith('> ')) {
      flushList();
      out.push(`<blockquote>${formatInline(line.substring(2))}</blockquote>`);
      continue;
    }

    if (/^[-*•]\s+/.test(line)) {
      if (!inList || listType !== 'ul') {
        flushList();
        inList = true;
        listType = 'ul';
        out.push('<ul>');
      }
      out.push(`<li>${formatInline(line.replace(/^[-*•]\s+/, ''))}</li>`);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      if (!inList || listType !== 'ol') {
        flushList();
        inList = true;
        listType = 'ol';
        out.push('<ol>');
      }
      out.push(`<li>${formatInline(line.replace(/^\d+\.\s+/, ''))}</li>`);
      continue;
    }

    if (!line) {
      flushList();
      continue;
    }

    flushList();
    out.push(`<p>${formatInline(line)}</p>`);
  }

  flushTable();
  flushList();

  return out.join('\n');
}

export default function OverviewTab({ overview }) {
  if (!overview) {
    return (
      <div className="p-8 text-center text-slate-500">
        No content analysis available. Process a video first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="pb-2 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-red-500" />
          Video Content Breakdown & Summary
        </h2>
        <p className="text-xs text-slate-400">
          वीडियो में क्या सिखाया और पढ़ाया गया है - संपूर्ण विश्लेषण
        </p>
      </div>

      {/* Structured Content Card */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl leading-relaxed text-slate-200 text-sm">
        <div
          className="markdown-content"
          dangerouslySetInnerHTML={{ __html: parseOverviewMarkdown(overview) }}
        />
      </div>

      {/* Info Callout */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-red-950/20 via-slate-900 to-indigo-950/20 border border-red-900/30 text-xs text-slate-300 flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />
        <p>
          आप <strong>"Agent Quiz"</strong> टैब में जाकर इस वीडियो पर आधारित प्रश्नों को हल करके अपनी सीख की जाँच कर सकते हैं!
        </p>
      </div>
    </div>
  );
}
