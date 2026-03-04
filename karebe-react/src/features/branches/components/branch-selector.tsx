import { MapPin, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBranches, useBranchActions } from '../hooks/use-branches';
import { useSelectedBranchId } from '../stores/branch-store';

interface BranchSelectorProps {
  className?: string;
}

/**
 * Branch Selector Component
 * 
 * Dropdown for selecting delivery/pickup branch.
 * 
 * @example
 * ```tsx
 * <BranchSelector />
 * ```
 */
export function BranchSelector({ className = '' }: BranchSelectorProps) {
  const { data: branches, isLoading } = useBranches();
  const selectedBranchId = useSelectedBranchId();
  const { selectBranch } = useBranchActions();

  const selectedBranch = branches?.find((b) => b.id === selectedBranchId);

  if (isLoading) {
    return (
      <Button variant="ghost" disabled className={className}>
        <MapPin className="w-4 h-4 mr-2" />
        Loading...
      </Button>
    );
  }

  if (!branches || branches.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={`flex items-center gap-2 ${className}`}>
          <MapPin className="w-4 h-4" />
          <span className="hidden sm:inline">
            {selectedBranch ? selectedBranch.name : 'Select Branch'}
          </span>
          <span className="sm:hidden">
            {selectedBranch ? selectedBranch.name.split(' ')[0] : 'Branch'}
          </span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {branches.map((branch) => (
          <DropdownMenuItem
            key={branch.id}
            onClick={() => selectBranch(branch)}
            className="flex items-start gap-2 py-3"
          >
            <div className="mt-0.5">
              {selectedBranchId === branch.id ? (
                <Check className="w-4 h-4 text-brand-600" />
              ) : (
                <div className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-brand-900">
                {branch.name}
                {branch.isMain && (
                  <span className="ml-2 text-xs text-brand-500">(Main)</span>
                )}
              </p>
              <p className="text-sm text-brand-500">{branch.location}</p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
