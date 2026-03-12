import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getBranches, getBranchById } from '../api/get-branches';
import { useBranchStore, useSelectedBranchId } from '../stores/branch-store';
import type { Branch } from '../stores/branch-store';

export const branchKeys = {
  all: ['branches'] as const,
  list: () => [...branchKeys.all, 'list'] as const,
  detail: (id: string) => [...branchKeys.all, 'detail', id] as const,
};

export function useBranches() {
  const setSelectedBranch = useBranchStore((state) => state.setSelectedBranch);
  const selectedBranchId = useSelectedBranchId();

  const query = useQuery({
    queryKey: branchKeys.list(),
    queryFn: getBranches,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // Auto-select main branch if none selected
  useEffect(() => {
    if (query.data && !selectedBranchId) {
      const mainBranch = query.data.find((b) => b.isMain);
      if (mainBranch) {
        setSelectedBranch(mainBranch);
      }
    }
  }, [query.data, selectedBranchId, setSelectedBranch]);

  return query;
}

export function useBranch(id: string) {
  return useQuery({
    queryKey: branchKeys.detail(id),
    queryFn: () => getBranchById(id),
    enabled: !!id,
  });
}

export function useSelectedBranchQuery() {
  const selectedBranchId = useSelectedBranchId();
  return useBranch(selectedBranchId || '');
}

export function useBranchActions() {
  const queryClient = useQueryClient();
  const { setSelectedBranch, clearSelection } = useBranchStore();

  const selectBranch = (branch: Branch) => {
    setSelectedBranch(branch);
  };

  const selectBranchById = async (branchId: string) => {
    const branch = await queryClient.fetchQuery({
      queryKey: branchKeys.detail(branchId),
      queryFn: () => getBranchById(branchId),
    });
    if (branch) {
      setSelectedBranch(branch);
    }
  };

  return {
    selectBranch,
    selectBranchById,
    clearSelection,
  };
}
