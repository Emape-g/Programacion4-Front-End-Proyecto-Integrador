interface PaginationProps {
  total: number;
  limit: number;
  offset: number;
  onPageChange: (offset: number) => void;
}

export function Pagination({ total, limit, offset, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Mostrando {offset + 1}–{Math.min(offset + limit, total)} de {total}
      </p>
      <div className="flex gap-1">
        <button
          onClick={() => onPageChange(offset - limit)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
        >
          Anterior
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange((page - 1) * limit)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              page === currentPage
                ? 'bg-[#2a7a8a] border-[#2a7a8a] text-white'
                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(offset + limit)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
