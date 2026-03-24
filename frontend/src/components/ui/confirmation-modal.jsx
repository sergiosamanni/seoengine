import React from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from './dialog';
import { Button } from './button';
import { AlertTriangle, Trash2 } from 'lucide-react';

export const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Sei sicuro?", 
  description = "Questa operazione non può essere annullata.",
  confirmText = "Elimina",
  cancelText = "Annulla",
  variant = "destructive"
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-3xl border-slate-100 p-0 overflow-hidden shadow-2xl">
        <div className="p-8 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-6 border border-red-100/50">
            {variant === "destructive" ? (
              <Trash2 className="w-6 h-6 text-red-500" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            )}
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">{title}</DialogTitle>
          <DialogDescription className="text-slate-500 text-sm mt-2 font-medium">
            {description}
          </DialogDescription>
        </div>
        <DialogFooter className="p-8 pt-4 flex flex-col gap-2 sm:flex-row sm:gap-2 bg-slate-50/50 border-t border-slate-100">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="flex-1 h-12 rounded-xl font-bold uppercase tracking-widest text-[10px] text-slate-400 hover:text-slate-600 border border-slate-200"
          >
            {cancelText}
          </Button>
          <Button 
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 h-12 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg ${variant === 'destructive' ? 'bg-red-500 hover:bg-red-600 shadow-red-100' : 'bg-slate-900 shadow-slate-100'}`}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
