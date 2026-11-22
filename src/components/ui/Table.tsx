import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from './Button';

export function TableContainer({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('w-full overflow-x-auto', className)}>{children}</div>;
}

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, totalItems, pageSize, onPageChange }: PaginationProps) {
  if (totalItems === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-line px-5 py-3 text-xs text-slate-500 sm:flex-row">
      <p>
        Mostrando <strong className="font-medium text-slate-700">{from}</strong> a{' '}
        <strong className="font-medium text-slate-700">{to}</strong> de{' '}
        <strong className="font-medium text-slate-700">{totalItems}</strong> registros
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
        >
          Anterior
        </Button>
        <span className="px-2 font-medium text-slate-700">
          {page} / {Math.max(1, totalPages)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
