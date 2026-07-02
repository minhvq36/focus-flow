import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useUserPrivate } from '../hooks/use-profile';
import { useProfileUpdate } from '../hooks/use-profile-update';
import { useWallet } from '@/pages/garden/hooks/use-economy';

interface ChangeNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
}

const MAX_FREE_CHANGES = 2;
const CHANGE_COST = 20000;

export default function ChangeNameModal({ isOpen, onClose, currentName }: ChangeNameModalProps) {
  const [name, setName] = useState(currentName);
  const { data: privateData } = useUserPrivate();
  const { data: wallet } = useWallet();
  const { changeNameMutation } = useProfileUpdate();

  useEffect(() => {
    if (isOpen) setName(currentName);
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  const changeCount = privateData?.name_change_count ?? 0;
  const remainingFree = MAX_FREE_CHANGES - changeCount;
  const isFree = remainingFree > 0;
  
  const currentSilver = wallet?.silver_balance ?? 0;
  const hasEnoughMoney = currentSilver >= CHANGE_COST;

  const isNameValid = name.trim().length > 0 && name.trim().length <= 50;
  const isNameChanged = name.trim() !== currentName;
  const canSave = isNameValid && isNameChanged && (isFree || hasEnoughMoney);

  const handleSave = () => {
    if (!canSave) return;
    changeNameMutation.mutate(
      { display_name: name.trim() },
      {
        onSuccess: () => {
          toast.success("Name changed successfully!");
          onClose();
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || "Failed to change name");
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-[400px] rounded-2xl p-6 shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200">
        <h2 className="text-xl font-bold mb-4 text-foreground">Change Name</h2>
        
        {/* Nền input trong suốt, viền mỏng giống Bio, vòng focus indigo */}
        <input 
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          className="w-full px-4 py-3 bg-transparent border border-gray-400/30 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all text-foreground font-bold text-lg"
          autoFocus
        />
        
        {/* Bộ đếm ký tự */}
        <div className="text-right mt-1 text-xs text-muted-foreground">
          {name.length}/50
        </div>
        
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex justify-end gap-3 w-full">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 bg-secondary text-secondary-foreground font-medium rounded-lg hover:opacity-80"
            >
              Cancel
            </button>
            
            {isFree ? (
              <button 
                onClick={handleSave}
                disabled={!canSave || changeNameMutation.isPending}
                className="px-8 py-2.5 rounded-xl bg-foreground text-background font-medium hover:opacity-90 disabled:opacity-50 transition"
              >
                {changeNameMutation.isPending ? 'Saving...' : 'Free'}
              </button>
            ) : (
              // Nút 20,000: Nền đen, icon đưa ra trước
              <button 
                onClick={handleSave}
                disabled={!canSave || changeNameMutation.isPending}
                className="px-6 py-2.5 rounded-xl font-medium bg-foreground text-background hover:opacity-90 disabled:opacity-50 transition flex items-center gap-2"
              >
                {changeNameMutation.isPending ? 'Saving...' : (
                  <>
                    <img src="/coins/silver-single.png" alt="Silver" className="w-[18px] h-[18px]" />
                    20,000
                  </>
                )}
              </button>
            )}
          </div>
          
          {/* Note nhỏ cho lượt free */}
          {isFree && (
            <p className="text-right text-xs text-muted-foreground/70 italic mr-1 mt-1">
              {remainingFree} free change{remainingFree > 1 ? 's' : ''} remaining ({changeCount}/{MAX_FREE_CHANGES})
            </p>
          )}
        </div>
      </div>
    </div>
  );
}