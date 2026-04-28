import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PaginationControls = ({ currentPage, totalPages, maxVisible = 5, onPageChange, paginationMeta }) => {
  const getPages = () => {
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  if (totalPages <= 1 && (!paginationMeta || !paginationMeta.total)) return null;

  const { total, page, limit } = paginationMeta || {};
  const start = total > 0 ? ((currentPage - 1) * (limit || 10)) + 1 : 0;
  const end = total > 0 ? Math.min(currentPage * (limit || 10), total) : 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6">
      {paginationMeta?.total > 0 && (
        <span className="text-xs text-textSec">
          Showing {start}–{end} of {total}
        </span>
      )}
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg hover:bg-surface disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-text-secondary" />
          </button>

          {getPages().map(page => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`w-10 h-10 rounded-lg font-medium transition-all ${
                currentPage === page 
                  ? 'bg-primary text-background shadow-luxury' 
                  : 'text-text-secondary hover:bg-surface'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg hover:bg-surface disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-text-secondary" />
          </button>
        </div>
      )}
    </div>
  );
};

export default PaginationControls;
