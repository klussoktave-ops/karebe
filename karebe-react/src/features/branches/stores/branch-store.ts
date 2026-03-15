import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Branch {
  id: string;
  name: string;
  location: string;
  phone: string;
  lat?: number;
  lng?: number;
  is_main: boolean;
  operating_hours?: {
    open: string;
    close: string;
  };
}

interface BranchState {
  selectedBranchId: string | null;
  selectedBranch: Branch | null;
  
  // Actions
  setSelectedBranch: (branch: Branch | null) => void;
  setSelectedBranchId: (branchId: string | null) => void;
  clearSelection: () => void;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      selectedBranchId: null,
      selectedBranch: null,
      
      setSelectedBranch: (branch) => set({
        selectedBranch: branch,
        selectedBranchId: branch?.id || null,
      }),
      
      setSelectedBranchId: (branchId) => set({
        selectedBranchId: branchId,
        selectedBranch: null, // Will be populated by hook
      }),
      
      clearSelection: () => set({
        selectedBranchId: null,
        selectedBranch: null,
      }),
    }),
    {
      name: 'karebe-branch',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export const useSelectedBranch = () => useBranchStore((state) => state.selectedBranch);
export const useSelectedBranchId = () => useBranchStore((state) => state.selectedBranchId);
