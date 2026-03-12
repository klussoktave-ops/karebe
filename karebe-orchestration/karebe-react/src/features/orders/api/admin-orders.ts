// =============================================================================
// Admin Orders API
// Connects to orchestration service for order management
// =============================================================================

const ORCHESTRATION_API_URL = import.meta.env.VITE_ORCHESTRATION_API_URL ? `${import.meta.env.VITE_ORCHESTRATION_API_URL}/api` : 'http://localhost:3001/api';

export type OrderStatus = 
  | 'CART_DRAFT'
  | 'ORDER_SUBMITTED'
  | 'CONFIRMED_BY_MANAGER'
  | 'DELIVERY_REQUEST_STARTED'
  | 'RIDER_CONFIRMED_DIGITAL'
  | 'RIDER_CONFIRMED_MANUAL'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  variant?: string;
}

export interface Order {
  id: string;
  customer_phone: string;
  customer_name?: string;
  delivery_address: string;
  delivery_notes?: string;
  branch_id: string;
  status: OrderStatus;
  items: OrderItem[];
  total_amount: number;
  created_at: string;
  updated_at: string;
  version: number;
  current_rider_id?: string;
  rider_id?: string;
  current_rider_name?: string;
}

export interface OrdersResponse {
  success: boolean;
  data: Order[];
  count: number;
}

export interface OrderResponse {
  success: boolean;
  data: Order;
}

export async function getOrdersByStatus(status: OrderStatus, branchId?: string): Promise<Order[]> {
  try {
    const url = new URL(`${ORCHESTRATION_API_URL}/orders`);
    url.searchParams.append('status', status);
    if (branchId) url.searchParams.append('branch_id', branchId);

    console.log('[AdminOrders] Fetching orders from:', url.toString());
    console.log('[AdminOrders] Current origin:', window.location.origin);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors',
    });
    
    console.log('[AdminOrders] Response status:', response.status);
    console.log('[AdminOrders] Response ok:', response.ok);
    
    // Check for CORS headers
    const corsHeader = response.headers.get('access-control-allow-origin');
    console.log('[AdminOrders] CORS header:', corsHeader);
    
    if (!response.ok) {
      // If the status is not valid (e.g., DELIVERED not in enum), fall back to demo
      console.warn(`[AdminOrders] Failed to fetch orders with status ${status}: ${response.statusText}`);
      return getDemoOrders(status);
    }

    const result: OrdersResponse = await response.json();
    
    if (!result.success) {
      console.warn('[AdminOrders] Failed to fetch orders, using demo data');
      return getDemoOrders(status);
    }

    console.log('[AdminOrders] ✅ Orders loaded successfully:', result.data.length);
    return result.data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[AdminOrders] ❌ Orchestration service unavailable:', errorMessage);
    
    // Check if it's a CORS error
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
      console.error('[AdminOrders] 🔴 Possible CORS error detected!');
      console.error('[AdminOrders] 🔴 API URL:', ORCHESTRATION_API_URL);
      console.error('[AdminOrders] 🔴 Frontend Origin:', window.location.origin);
    }
    
    return getDemoOrders(status);
  }
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  try {
    const response = await fetch(`${ORCHESTRATION_API_URL}/orders/${orderId}`);
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch order: ${response.statusText}`);
    }

    const result: OrderResponse = await response.json();
    
    if (!result.success) {
      throw new Error('Failed to fetch order');
    }

    return result.data;
  } catch (error) {
    console.warn('Orchestration service unavailable');
    return demoOrders.find(o => o.id === orderId) || null;
  }
}

export interface UpdateStatusRequest {
  status: OrderStatus;
  actor_type: 'admin' | 'rider' | 'system' | 'customer' | 'webhook';
  actor_id: string;
  confirmation_method?: 'DIGITAL' | 'MANUAL';
  expected_version?: number;
  notes?: string;
}

export async function updateOrderStatus(
  orderId: string, 
  request: UpdateStatusRequest
): Promise<Order> {
  const response = await fetch(`${ORCHESTRATION_API_URL}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to update order: ${response.statusText}`);
  }

  const result: OrderResponse = await response.json();
  
  if (!result.success) {
    throw new Error('Failed to update order');
  }

  return result.data;
}

export interface AssignRiderRequest {
  rider_id: string;
  admin_id: string;
  notes?: string;
}

export async function assignRider(orderId: string, request: AssignRiderRequest): Promise<Order> {
  const response = await fetch(`${ORCHESTRATION_API_URL}/orders/${orderId}/assign-rider`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to assign rider: ${response.statusText}`);
  }

  const result: OrderResponse = await response.json();
  
  if (!result.success) {
    throw new Error('Failed to assign rider');
  }

  return result.data;
}

// Demo orders for fallback when orchestration service is unavailable
const demoOrders: Order[] = [
  {
    id: 'demo-001',
    customer_phone: '+254712345678',
    customer_name: 'John Doe',
    delivery_address: '123 Main St, Nairobi',
    branch_id: 'main-branch',
    status: 'ORDER_SUBMITTED',
    items: [
      { product_id: 'p1', product_name: 'Jack Daniels 750ml', quantity: 2, unit_price: 3500 },
    ],
    total_amount: 7000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
  },
  {
    id: 'demo-002',
    customer_phone: '+254723456789',
    customer_name: 'Jane Smith',
    delivery_address: '456 Park Ave, Nairobi',
    branch_id: 'main-branch',
    status: 'CONFIRMED_BY_MANAGER',
    items: [
      { product_id: 'p2', product_name: 'Jameson 1L', quantity: 1, unit_price: 2800 },
      { product_id: 'p3', product_name: 'Hennessy VS 700ml', quantity: 1, unit_price: 6500 },
    ],
    total_amount: 9300,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
    version: 2,
  },
  {
    id: 'demo-003',
    customer_phone: '+254734567890',
    customer_name: 'Mike Johnson',
    delivery_address: '789 Westlands Rd, Nairobi',
    branch_id: 'main-branch',
    status: 'OUT_FOR_DELIVERY',
    items: [
      { product_id: 'p4', product_name: 'Johnnie Walker Black Label 750ml', quantity: 1, unit_price: 4200 },
    ],
    total_amount: 4200,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    version: 3,
    current_rider_id: '550e8400-e29b-41d4-a716-446655440000',
    current_rider_name: 'John Rider',
  },
  {
    id: 'demo-004',
    customer_phone: '+254745678901',
    customer_name: 'Sarah Williams',
    delivery_address: '321 Kilimani Rd, Nairobi',
    branch_id: 'main-branch',
    status: 'DELIVERED',
    items: [
      { product_id: 'p5', product_name: 'Grey Goose 750ml', quantity: 1, unit_price: 5500 },
    ],
    total_amount: 5500,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
    version: 4,
    current_rider_id: '550e8400-e29b-41d4-a716-446655440000',
    current_rider_name: 'John Rider',
  },
];

function getDemoOrders(status: OrderStatus): Order[] {
  return demoOrders.filter(o => o.status === status);
}

// Get all orders (for dashboard)
export async function getAllOrders(): Promise<Order[]> {
  try {
    const statuses: OrderStatus[] = [
      'ORDER_SUBMITTED',
      'CONFIRMED_BY_MANAGER',
      'DELIVERY_REQUEST_STARTED',
      'RIDER_CONFIRMED_DIGITAL',
      'RIDER_CONFIRMED_MANUAL',
      'OUT_FOR_DELIVERY',
    ];
    
    const allOrders = await Promise.all(
      statuses.map(status => getOrdersByStatus(status))
    );
    
    return allOrders.flat().sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } catch (error) {
    return demoOrders;
  }
}

// Get dashboard stats
export async function getDashboardStats(): Promise<{
  totalOrders: number;
  pendingOrders: number;
  outForDelivery: number;
  deliveredToday: number;
}> {
  try {
    const submitted = await getOrdersByStatus('ORDER_SUBMITTED');
    const confirmed = await getOrdersByStatus('CONFIRMED_BY_MANAGER');
    const outForDelivery = await getOrdersByStatus('OUT_FOR_DELIVERY');
    const delivered = await getOrdersByStatus('DELIVERED');
    
    // Filter delivered today
    const today = new Date().toDateString();
    const deliveredToday = delivered.filter(o => 
      new Date(o.updated_at).toDateString() === today
    );
    
    return {
      totalOrders: submitted.length + confirmed.length + outForDelivery.length + delivered.length,
      pendingOrders: submitted.length + confirmed.length,
      outForDelivery: outForDelivery.length,
      deliveredToday: deliveredToday.length,
    };
  } catch (error) {
    // Return demo stats
    return {
      totalOrders: demoOrders.length,
      pendingOrders: demoOrders.filter(o => 
        o.status === 'ORDER_SUBMITTED' || o.status === 'CONFIRMED_BY_MANAGER'
      ).length,
      outForDelivery: demoOrders.filter(o => o.status === 'OUT_FOR_DELIVERY').length,
      deliveredToday: 0,
    };
  }
}
