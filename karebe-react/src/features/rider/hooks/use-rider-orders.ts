/**
 * Rider hook for fetching and managing orders
 */

import { useState, useEffect, useCallback } from 'react';
import { getRiderOrders, confirmRider, startDelivery, completeDelivery, type RiderOrder } from '../api/get-orders';
import { useAuth } from '@/features/auth/hooks/use-auth';

export function useRiderOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<RiderOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!user?.id) {
      console.warn('[useRiderOrders] No user ID available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[useRiderOrders] Fetching orders for rider:', user.id);
      const response = await getRiderOrders(user.id);
      
      if (response.success) {
        setOrders(response.data);
        console.log('[useRiderOrders] Orders fetched:', response.data.length);
      } else {
        setError('Failed to fetch orders');
      }
    } catch (err) {
      console.error('[useRiderOrders] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleConfirm = async (orderId: string) => {
    if (!user?.id) return;
    
    const result = await confirmRider(orderId, user.id);
    if (result.success) {
      await fetchOrders(); // Refresh orders
    }
    return result;
  };

  const handleStartDelivery = async (orderId: string) => {
    if (!user?.id) return;
    
    const result = await startDelivery(orderId, user.id);
    if (result.success) {
      await fetchOrders(); // Refresh orders
    }
    return result;
  };

  const handleComplete = async (orderId: string) => {
    if (!user?.id) return;
    
    const result = await completeDelivery(orderId, user.id);
    if (result.success) {
      await fetchOrders(); // Refresh orders
    }
    return result;
  };

  // Filter orders by status
  const pendingOrders = orders.filter(o => 
    o.status === 'DELIVERY_REQUEST_STARTED' || o.status === 'RIDER_CONFIRMED_DIGITAL' || o.status === 'RIDER_CONFIRMED_MANUAL'
  );
  
  const activeOrders = orders.filter(o => 
    o.status === 'OUT_FOR_DELIVERY'
  );
  
  const completedOrders = orders.filter(o => 
    o.status === 'DELIVERED'
  );

  return {
    orders,
    pendingOrders,
    activeOrders,
    completedOrders,
    isLoading,
    error,
    refetch: fetchOrders,
    confirmOrder: handleConfirm,
    startDeliveryOrder: handleStartDelivery,
    completeOrder: handleComplete,
  };
}
