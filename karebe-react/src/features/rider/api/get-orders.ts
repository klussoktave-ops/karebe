import { orchestrationApiBase } from '@/lib/orchestration-api';

/**
 * Rider API - Get orders assigned to rider
 */

export interface RiderOrder {
  id: string;
  order_number: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_notes?: string;
  branch_id: string;
  rider_id?: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface GetRiderOrdersResponse {
  success: boolean;
  data: RiderOrder[];
}

/**
 * Fetch orders assigned to a rider
 */
export async function getRiderOrders(riderId: string, status?: string): Promise<GetRiderOrdersResponse> {
  try {
    const params = new URLSearchParams();
    if (status) {
      params.append('status', status);
    }
    
    const baseUrl = orchestrationApiBase;
    const url = `${baseUrl}/riders/${riderId}/orders${params.toString() ? '?' + params.toString() : ''}`;
    console.log('[RiderAPI] Fetching orders from:', url);
    
    const response = await fetch(url);
    console.log('[RiderAPI] Response status:', response.status, response.statusText);
    
    // Debug: Get raw text first to see what's being returned
    const rawText = await response.text();
    console.log('[RiderAPI] Raw response:', rawText.substring(0, 500));
    
    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      console.error('[RiderAPI] JSON parse failed:', parseError);
      throw new Error(`Server returned ${response.status}: ${rawText.substring(0, 100)}`);
    }
    
    console.log('[RiderAPI] Orders response:', data);
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || `Failed to fetch orders (${response.status})`);
    }
    
    return data;
  } catch (error) {
    console.error('[RiderAPI] Error fetching orders:', error);
    return {
      success: false,
      data: [],
    };
  }
}

/**
 * Confirm rider for an order (digital confirmation)
 */
export async function confirmRider(orderId: string, riderId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const baseUrl = orchestrationApiBase;
    const response = await fetch(`${baseUrl}/orders/${orderId}/confirm-rider`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        actor_id: riderId, 
        actor_type: 'rider',
        confirmation_method: 'DIGITAL',
      }),
    });
    
    const data = await response.json();
    console.log('[RiderAPI] Confirm rider response:', data);
    
    return data;
  } catch (error) {
    console.error('[RiderAPI] Error confirming rider:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to confirm',
    };
  }
}

/**
 * Start delivery (mark as picked up / out for delivery)
 */
export async function startDelivery(orderId: string, riderId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const baseUrl = orchestrationApiBase;
    const response = await fetch(`${baseUrl}/orders/${orderId}/start-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ actor_id: riderId, actor_type: 'rider' }),
    });
    
    const data = await response.json();
    console.log('[RiderAPI] Start delivery response:', data);
    
    return data;
  } catch (error) {
    console.error('[RiderAPI] Error starting delivery:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to start delivery',
    };
  }
}

/**
 * Complete delivery (mark as delivered)
 */
export async function completeDelivery(orderId: string, riderId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const baseUrl = orchestrationApiBase;
    const response = await fetch(`${baseUrl}/orders/${orderId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ actor_id: riderId, actor_type: 'rider' }),
    });
    
    const data = await response.json();
    console.log('[RiderAPI] Complete delivery response:', data);
    
    return data;
  } catch (error) {
    console.error('[RiderAPI] Error completing delivery:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to complete delivery',
    };
  }
}
