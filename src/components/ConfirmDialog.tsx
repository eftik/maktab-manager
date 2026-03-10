import { ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

const ConfirmDialog = ({ open, title, message, onConfirm, onCancel, destructive = true }: Props) => {
  const { t } = useLanguage();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-full", destructive ? "bg-destructive/10" : "bg-primary/10")}>
            <AlertTriangle size={20} className={destructive ? "text-destructive" : "text-primary"} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
          </div>
          <button onClick={onCancel}><X size={18} className="text-muted-foreground" /></button>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium text-foreground">{t('cancel')}</button>
          <button onClick={onConfirm} className={cn("flex-1 py-2.5 rounded-xl text-sm font-medium text-white", destructive ? "bg-destructive" : "bg-primary")}>{t('delete')}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
