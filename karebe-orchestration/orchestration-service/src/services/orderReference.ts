// =============================================================================
// Order Reference Service
// Generates human-friendly order references like #KRB-042
// Supports branch codes, daily sequences, and backward compatibility
// =============================================================================

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

// =============================================================================
// Configuration Interfaces
// =============================================================================

/** Configuration for order reference generation */
export interface OrderReferenceConfig {
  prefix: string;
  minSequence: number;
  maxSequence: number;
  useDayFormat: boolean;
  defaultBranchCode: string;
}

/** Branch configuration with code for order references */
export interface BranchConfig {
  id: string;
  name: string;
  code: string;
  isMain: boolean;
}

export interface OrderReferenceResult {
  reference: string;
  branchCode: string;
  dailySequence: number;
}

export interface OrderReferenceOptions {
  branchId?: string;
  branchCode?: string;
  useDayFormat?: boolean;
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: OrderReferenceConfig = {
  prefix: 'KRB',
  minSequence: 1,
  maxSequence: 999,
  useDayFormat: false,
  defaultBranchCode: 'M',
};

let configCache: OrderReferenceConfig | null = null;
let branchCache: Map<string, BranchConfig> = new Map();
let cacheLoadedAt: number = 0;
const CACHE_TTL_MS = 60000;

// =============================================================================
// Configuration Loading
// =============================================================================

async function loadConfig(): Promise<OrderReferenceConfig> {
  const now = Date.now();
  
  if (configCache && (now - cacheLoadedAt) < CACHE_TTL_MS) {
    return configCache;
  }
  
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', [
        'order_reference_prefix',
        'order_reference_min_sequence', 
        'order_reference_max_sequence',
        'order_reference_use_day_format',
        'order_reference_default_branch_code'
      ]);
    
    if (error || !data) {
      configCache = { ...DEFAULT_CONFIG };
      return configCache;
    }
    
    const settings: Record<string, unknown> = {};
    for (const item of data) {
      try {
        settings[item.key] = typeof item.value === 'string' 
          ? JSON.parse(item.value) 
          : item.value;
      } catch {
        settings[item.key] = item.value;
      }
    }
    
    configCache = {
      prefix: (settings.order_reference_prefix as string) || DEFAULT_CONFIG.prefix,
      minSequence: (settings.order_reference_min_sequence as number) || DEFAULT_CONFIG.minSequence,
      maxSequence: (settings.order_reference_max_sequence as number) || DEFAULT_CONFIG.maxSequence,
      useDayFormat: (settings.order_reference_use_day_format as boolean) || DEFAULT_CONFIG.useDayFormat,
      defaultBranchCode: (settings.order_reference_default_branch_code as string) || DEFAULT_CONFIG.defaultBranchCode,
    };
    
    return configCache;
  } catch (err) {
    logger.warn('Failed to load order reference config, using defaults', { error: err });
    return { ...DEFAULT_CONFIG };
  }
}

async function loadBranchConfigs(): Promise<Map<string, BranchConfig>> {
  const now = Date.now();
  
  if (branchCache.size > 0 && (now - cacheLoadedAt) < CACHE_TTL_MS) {
    return branchCache;
  }
  
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('id, name, is_main');
    
    if (error || !data) {
      return branchCache;
    }
    
    branchCache.clear();
    
    for (const branch of data) {
      const code = branch.name 
        ? branch.name.charAt(0).toUpperCase()
        : 'X';
      
      branchCache.set(branch.id, {
        id: branch.id,
        name: branch.name,
        code: code,
        isMain: branch.is_main === true,
      });
    }
    
    cacheLoadedAt = now;
    return branchCache;
  } catch (err) {
    logger.warn('Failed to load branch configs', { error: err });
    return branchCache;
  }
}

export function clearCache(): void {
  configCache = null;
  branchCache.clear();
  cacheLoadedAt = 0;
}

// =============================================================================
// Branch Code Resolution
// =============================================================================

export async function resolveBranchCode(branchId?: string, explicitCode?: string): Promise<string> {
  if (explicitCode) {
    return explicitCode.toUpperCase();
  }
  
  if (branchId) {
    const branches = await loadBranchConfigs();
    const branch = branches.get(branchId);
    if (branch) {
      return branch.code;
    }
  }
  
  const config = await loadConfig();
  return config.defaultBranchCode;
}

export async function getAllBranchConfigs(): Promise<BranchConfig[]> {
  const branches = await loadBranchConfigs();
  return Array.from(branches.values());
}

// =============================================================================
// Reference Generation
// =============================================================================

function getDayAbbreviation(): string {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return days[new Date().getDay()];
}

function getTodayKey(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export async function generateOrderReference(
  branchId?: string,
  sequence?: number,
  options?: OrderReferenceOptions
): Promise<OrderReferenceResult> {
  const config = await loadConfig();
  
  const branchCode = options?.branchCode 
    ? options.branchCode.toUpperCase()
    : await resolveBranchCode(branchId);
  
  const seq = sequence ?? Math.floor(Math.random() * (config.maxSequence - config.minSequence + 1)) + config.minSequence;
  
  const useDay = options?.useDayFormat ?? config.useDayFormat;
  
  let reference: string;
  
  if (useDay) {
    const day = getDayAbbreviation();
    const branchPart = branchCode !== config.defaultBranchCode ? `-${branchCode}` : '';
    reference = `${config.prefix}-${day}-${String(seq).padStart(3, '0')}${branchPart}`;
  } else {
    const branchPart = branchCode !== config.defaultBranchCode ? `-${branchCode}` : '';
    reference = `${config.prefix}${branchPart}-${String(seq).padStart(3, '0')}`;
  }
  
  return {
    reference,
    branchCode,
    dailySequence: seq,
  };
}

export async function getDailySequence(branchId?: string): Promise<number> {
  const config = await loadConfig();
  const branchCode = await resolveBranchCode(branchId);
  const todayKey = getTodayKey();
  
  try {
    const { data, error } = await supabase
      .from('order_sequences')
      .select('current_sequence')
      .eq('branch_code', branchCode)
      .eq('date_key', todayKey)
      .single();
    
    if (error || !data) {
      const newSequence = config.minSequence;
      
      await supabase
        .from('order_sequences')
        .upsert({
          branch_code: branchCode,
          date_key: todayKey,
          current_sequence: newSequence,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'branch_code,date_key',
        });
      
      return newSequence;
    }
    
    return data.current_sequence;
  } catch (err) {
    logger.warn('Failed to get daily sequence from DB, using fallback', { error: err });
    return Math.floor(Math.random() * (config.maxSequence - config.minSequence + 1)) + config.minSequence;
  }
}

export async function getNextSequence(branchId?: string): Promise<number> {
  const config = await loadConfig();
  const branchCode = await resolveBranchCode(branchId);
  const todayKey = getTodayKey();
  
  try {
    const { data: existing } = await supabase
      .from('order_sequences')
      .select('current_sequence')
      .eq('branch_code', branchCode)
      .eq('date_key', todayKey)
      .single();
    
    const currentSequence = existing?.current_sequence || (config.minSequence - 1);
    let nextSequence = currentSequence + 1;
    
    if (nextSequence > config.maxSequence) {
      logger.warn('Daily sequence limit reached', { branchCode, current: nextSequence, max: config.maxSequence });
      nextSequence = config.minSequence;
    }
    
    await supabase
      .from('order_sequences')
      .upsert({
        branch_code: branchCode,
        date_key: todayKey,
        current_sequence: nextSequence,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'branch_code,date_key',
      });
    
    return nextSequence;
  } catch (err) {
    logger.warn('Failed to increment sequence, using fallback', { error: err });
    return Math.floor(Math.random() * (config.maxSequence - config.minSequence + 1)) + config.minSequence;
  }
}

export async function generateOrderReferenceWithSequence(branchId?: string): Promise<OrderReferenceResult> {
  const nextSeq = await getNextSequence(branchId);
  return generateOrderReference(branchId, nextSeq);
}

export function createFallbackReference(orderId: string): string {
  const config = DEFAULT_CONFIG;
  const suffix = orderId.slice(-6).toUpperCase();
  return `${config.prefix}-${suffix}`;
}

// =============================================================================
// Reference Parsing & Validation
// =============================================================================

export function parseOrderReference(reference: string): {
  prefix: string;
  branchCode?: string;
  sequence?: number;
  dayOfWeek?: string;
} | null {
  const normalized = reference.toUpperCase().trim();
  
  const standardMatch = normalized.match(/^KRB-?([A-Z])?-?(\d{3})$/);
  if (standardMatch) {
    return {
      prefix: 'KRB',
      branchCode: standardMatch[1],
      sequence: parseInt(standardMatch[2], 10),
    };
  }
  
  const dayMatch = normalized.match(/^KRB-([A-Z]{3})(-([A-Z]))?-(\d{3})$/);
  if (dayMatch) {
    return {
      prefix: 'KRB',
      dayOfWeek: dayMatch[1],
      branchCode: dayMatch[3],
      sequence: parseInt(dayMatch[4], 10),
    };
  }
  
  const simpleMatch = normalized.match(/^(\d{3})$/);
  if (simpleMatch) {
    return {
      prefix: 'KRB',
      sequence: parseInt(simpleMatch[1], 10),
    };
  }
  
  return null;
}

export function isValidOrderReference(reference: string): boolean {
  return parseOrderReference(reference) !== null;
}

export function formatOrderDisplay(orderId: string, orderReference?: string | null): string {
  if (orderReference && orderReference.trim().length > 0) {
    return `#${orderReference}`;
  }
  
  return `#${orderId.slice(-6).toUpperCase()}`;
}

// =============================================================================
// Order Lookup by Reference
// =============================================================================

export async function getOrderByReference(reference: string): Promise<string | null> {
  const normalizedRef = reference.toUpperCase().trim();
  
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .eq('order_reference', normalizedRef)
      .single();
    
    if (data) {
      return data.id;
    }
    
    const parsed = parseOrderReference(normalizedRef);
    if (parsed && parsed.sequence) {
      const { data: bySeq } = await supabase
        .from('orders')
        .select('id')
        .like('order_reference', `%${parsed.sequence}%`)
        .limit(1)
        .single();
      
      if (bySeq) {
        return bySeq.id;
      }
    }
    
    const { data: byId } = await supabase
      .from('orders')
      .select('id')
      .ilike('id', `%${reference}%`)
      .limit(1)
      .single();
    
    return byId?.id || null;
  } catch (err) {
    logger.warn('Failed to get order by reference', { reference, error: err });
    return null;
  }
}

export async function getOrderReferenceConfig(): Promise<OrderReferenceConfig> {
  return loadConfig();
}

export async function updateOrderReferenceConfig(
  updates: Partial<OrderReferenceConfig>
): Promise<OrderReferenceConfig> {
  try {
    const settings = [];
    
    if (updates.prefix !== undefined) {
      settings.push({ key: 'order_reference_prefix', value: JSON.stringify(updates.prefix) });
    }
    if (updates.minSequence !== undefined) {
      settings.push({ key: 'order_reference_min_sequence', value: JSON.stringify(updates.minSequence) });
    }
    if (updates.maxSequence !== undefined) {
      settings.push({ key: 'order_reference_max_sequence', value: JSON.stringify(updates.maxSequence) });
    }
    if (updates.useDayFormat !== undefined) {
      settings.push({ key: 'order_reference_use_day_format', value: JSON.stringify(updates.useDayFormat) });
    }
    if (updates.defaultBranchCode !== undefined) {
      settings.push({ key: 'order_reference_default_branch_code', value: JSON.stringify(updates.defaultBranchCode) });
    }
    
    if (settings.length > 0) {
      await supabase
        .from('app_settings')
        .upsert(settings, { onConflict: 'key' });
    }
    
    clearCache();
    return loadConfig();
  } catch (err) {
    logger.error('Failed to update order reference config', { error: err, updates });
    throw err;
  }
}
