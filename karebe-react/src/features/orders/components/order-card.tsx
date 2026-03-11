import { 
  Package, 
  ShoppingCart, 
  CheckCircle,
  Truck,
  User,
  Clock,
  Phone,
  MapPin,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  MessageCircle,
  Send,
  Edit2,
  Save,
  X
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Order, OrderStatus } from '../api/admin-orders';

interface Rider {
  id: string;
  name: string;
  phone: string;
  status: string;
  is_active: boolean;
}

interface OrderCardProps {
  order: Order;
  riders: Rider[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  isEditing: boolean;
  editForm: {
    customer_name: string;
    delivery_address: string;
    delivery_notes: string;
  };
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onFormChange: (field: string, value: string) => void;
  actionLoading: boolean;
  onAction: (action: 'confirm' | 'startDelivery' | 'assignRider') => void;
  onCallRider?: (phone: string) => void;
  onWhatsAppRider?: (phone: string, order: Order) => void;
  onSmsRider?: (phone: string, order: Order) => void;
}

// Status configuration with improved color coding for dispatch
// Visual hierarchy: Order ID > Status > Price > Actions
const statusConfig: Record<OrderStatus, { 
  label: string; 
  color: string; 
  bgColor: string;
  borderColor: string;
  dotColor: string; // Colored dot for status badge
  stripColor: string; // Left border color strip for quick scanning
  icon: typeof Package;
  priority: number; // 1 = highest priority for dispatch
}> = {
  CART_DRAFT: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200', dotColor: 'bg-gray-500', stripColor: 'border-l-gray-400', icon: ShoppingCart, priority: 6 },
  ORDER_SUBMITTED: { label: 'New Order', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', dotColor: 'bg-blue-500', stripColor: 'border-l-blue-500', icon: AlertCircle, priority: 1 },
  CONFIRMED_BY_MANAGER: { label: 'Confirmed', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200', dotColor: 'bg-green-500', stripColor: 'border-l-green-500', icon: CheckCircle, priority: 2 },
  DELIVERY_REQUEST_STARTED: { label: 'Pending Call', color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', dotColor: 'bg-orange-500', stripColor: 'border-l-orange-500', icon: Truck, priority: 3 },
  RIDER_CONFIRMED_DIGITAL: { label: 'Rider Assigned', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', dotColor: 'bg-purple-500', stripColor: 'border-l-purple-500', icon: User, priority: 4 },
  RIDER_CONFIRMED_MANUAL: { label: 'Rider Assigned', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', dotColor: 'bg-purple-500', stripColor: 'border-l-purple-500', icon: User, priority: 4 },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', dotColor: 'bg-orange-500', stripColor: 'border-l-orange-500', icon: Truck, priority: 5 },
  DELIVERED: { label: 'Delivered', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', dotColor: 'bg-emerald-500', stripColor: 'border-l-emerald-500', icon: CheckCircle, priority: 7 },
  CANCELLED: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200', dotColor: 'bg-red-500', stripColor: 'border-l-red-500', icon: AlertCircle, priority: 8 },
};

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-KE', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return formatTime(dateString);
}

function getRiderById(riderId: string, ridersList: Rider[]): Rider | undefined {
  return ridersList.find(r => r.id === riderId);
}

function getCallUrl(phone: string): string {
  return `tel:${phone}`;
}

function getWhatsAppUrl(phone: string, order: Order): string {
  const message = `Hello! Order #${order.id.slice(-6)} is ready for delivery.

Customer: ${order.customer_name || 'N/A'}
Address: ${order.delivery_address}
Total: KES ${order.total_amount}

Please confirm delivery.`;
  return `https://wa.me/${phone.replace(/\+/g, '')}?text=${encodeURIComponent(message)}`;
}

function getSmsUrl(phone: string, order: Order): string {
  const message = `Order #${order.id.slice(-6)} - Address: ${order.delivery_address} - Total: KES ${order.total_amount}`;
  return `sms:${phone}?body=${encodeURIComponent(message)}`;
}

export function OrderCard({
  order,
  riders,
  isExpanded,
  onToggleExpand,
  isEditing,
  editForm,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onFormChange,
  actionLoading,
  onAction,
}: OrderCardProps) {
  const status = statusConfig[order.status];
  const StatusIcon = status.icon;
  const rider = order.rider_id ? getRiderById(order.rider_id, riders) : null;
  
  // Determine primary action for this order status
  const getPrimaryAction = () => {
    if (actionLoading) {
      return (
        <Button size="sm" disabled className="opacity-50">
          <span className="w-4 h-4 animate-spin mr-1 inline-block border-2 border-white border-t-transparent rounded-full"></span>
          Loading...
        </Button>
      );
    }

    switch (order.status) {
      case 'ORDER_SUBMITTED':
        return (
          <Button
            size="sm"
            onClick={() => onAction('confirm')}
            className="bg-green-600 hover:bg-green-700 font-medium"
          >
            <CheckCircle className="w-4 h-4 mr-1.5" />
            Confirm
          </Button>
        );
      case 'CONFIRMED_BY_MANAGER':
        return (
          <Button
            size="sm"
            onClick={() => onAction('startDelivery')}
            className="bg-blue-600 hover:bg-blue-700 font-medium"
          >
            <Truck className="w-4 h-4 mr-1.5" />
            Start Delivery
          </Button>
        );
      case 'DELIVERY_REQUEST_STARTED':
        return (
          <Button
            size="sm"
            onClick={() => onAction('assignRider')}
            className="bg-purple-600 hover:bg-purple-700 font-medium"
          >
            <User className="w-4 h-4 mr-1.5" />
            Assign Rider
          </Button>
        );
      default:
        return null;
    }
  };

  // Priority indicator based on order age and status
  const getPriorityIndicator = () => {
    const createdAt = new Date(order.created_at);
    const now = new Date();
    const ageMinutes = Math.floor((now.getTime() - createdAt.getTime()) / 60000);
    
    // High priority: New orders older than 15 minutes
    if (order.status === 'ORDER_SUBMITTED' && ageMinutes > 15) {
      return <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="Urgent" />;
    }
    return null;
  };

  return (
    <Card className={`
      ${isExpanded ? 'ring-2 ring-brand-200' : ''} 
      bg-white 
      rounded-xl 
      shadow-sm 
      border-l-4 
      ${status.stripColor}
      overflow-hidden 
      transition-all 
      hover:shadow-lg 
      hover:scale-[1.01]
    `}>
      <CardContent className="p-0">
        {/* Main Card Content - Horizontal Layout */}
        <div className="flex flex-col sm:flex-row">
          
          {/* LEFT ZONE: Order Identity (Priority 1-2) */}
          <div className="flex items-start gap-3 p-4 sm:w-48 sm:flex-shrink-0 border-b sm:border-b-0 sm:border-r border-gray-100">
            {/* Avatar with Status Color */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${status.bgColor} ${status.borderColor} border`}>
              <StatusIcon className={`w-5 h-5 ${status.color}`} />
            </div>
            
            {/* Order ID & Status - VERTICALLY STACKED */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-800 text-lg tracking-tight">
                  #{order.id.slice(-6)}
                </h3>
                {getPriorityIndicator()}
              </div>
              <Badge 
                variant="outline" 
                className={`${status.bgColor} ${status.color} border ${status.borderColor} text-xs mt-1 font-medium flex items-center gap-1 w-fit`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                {status.label}
              </Badge>
            </div>
          </div>

          {/* CENTER ZONE: Customer & Order Info */}
          <div className="flex-1 p-4 min-w-0">
            {isEditing ? (
              // Edit Mode
              <div className="space-y-3">
                <Input
                  value={editForm.customer_name}
                  onChange={(e) => onFormChange('customer_name', e.target.value)}
                  placeholder="Customer name"
                  className="h-9 text-sm font-medium"
                />
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-brand-500 flex-shrink-0" />
                  <Input
                    value={editForm.delivery_address}
                    onChange={(e) => onFormChange('delivery_address', e.target.value)}
                    placeholder="Delivery address"
                    className="h-9 text-sm flex-1"
                  />
                </div>
                <textarea
                  value={editForm.delivery_notes}
                  onChange={(e) => onFormChange('delivery_notes', e.target.value)}
                  placeholder="Delivery notes (optional)"
                  className="w-full h-16 px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={onSaveEdit}
                    disabled={actionLoading}
                    className="bg-green-600 hover:bg-green-700 h-8"
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onCancelEdit}
                    disabled={actionLoading}
                    className="h-8"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              // Display Mode - GRID LAYOUT FOR SCANABILITY
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                {/* Customer Row */}
                <div className="flex items-center gap-2 min-w-0">
                  <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="font-semibold text-gray-800 truncate">
                    {order.customer_name || 'Unknown'}
                  </span>
                </div>
                
                {/* Phone Row */}
                <div className="flex items-center gap-2 min-w-0">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <a 
                    href={`tel:${order.customer_phone}`} 
                    className="text-gray-700 hover:text-gray-900 hover:underline truncate"
                  >
                    {order.customer_phone}
                  </a>
                </div>
                
                {/* Address Row - Full width on mobile */}
                <div className="flex items-start gap-2 sm:col-span-2 min-w-0">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600 text-sm truncate">
                    {order.delivery_address}
                  </span>
                </div>
                
                {/* Timestamp - Secondary info */}
                <div className="flex items-center gap-2 sm:col-start-2 sm:justify-end">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-gray-500 text-xs">
                    {formatRelativeTime(order.created_at)}
                  </span>
                </div>
              </div>
            )}
            
            {/* Rider Section - CONDITIONAL, INLINE */}
            {rider && (order.status === 'RIDER_CONFIRMED_DIGITAL' || order.status === 'RIDER_CONFIRMED_MANUAL' || order.status === 'OUT_FOR_DELIVERY') && (
              <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-purple-900 text-sm">
                    {rider.name}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-purple-500" />
                  <a 
                    href={`tel:${rider.phone}`}
                    className="text-purple-700 text-sm hover:underline"
                  >
                    {rider.phone}
                  </a>
                </div>
                {/* Quick Actions - Rider Contact */}
                <div className="flex items-center gap-1 ml-auto">
                  <a
                    href={getCallUrl(rider.phone)}
                    className="p-1.5 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
                    title="Call Rider"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={getWhatsAppUrl(rider.phone, order)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                    title="WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={getSmsUrl(rider.phone, order)}
                    className="p-1.5 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                    title="SMS"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT ZONE: Price, Items, Actions */}
          <div className="flex sm:flex-col items-center justify-between sm:justify-start gap-3 p-4 sm:p-4 bg-gray-50 sm:border-l border-gray-100 sm:w-44 flex-shrink-0">
            {/* Price Summary - Now with "Total" context */}
            <div className="text-right">
              <p className="text-xs text-gray-400">Total</p>
              <p className="font-bold text-gray-800 text-lg leading-tight">
                KES {order.total_amount.toLocaleString()}
              </p>
              <p className="text-gray-400 text-xs">
                {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}
              </p>
            </div>
            
            {/* Actions - VERTICALLY STACKED on desktop */}
            <div className="flex items-center gap-2 sm:flex-col sm:gap-2 sm:w-full">
              {getPrimaryAction()}
              
              {/* Secondary Actions Row - Circular buttons */}
              <div className="flex items-center gap-1">
                {!isEditing && (
                  <button
                    onClick={onStartEdit}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                    title="Edit order"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onToggleExpand}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Expanded Details Section */}
        {isExpanded && (
          <div className="p-4 bg-gray-50 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Order Items */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wide">
                  Order Items
                </h4>
                <ul className="space-y-2">
                  {order.items?.map((item, idx) => (
                    <li key={idx} className="flex justify-between items-start text-sm">
                      <span className="text-gray-700">
                        <span className="font-medium">{item.quantity}x</span> {item.product_name}
                        {item.variant && <span className="text-gray-500 ml-1">({item.variant})</span>}
                      </span>
                      <span className="text-gray-900 font-medium ml-4 whitespace-nowrap">
                        KES {(item.quantity * item.unit_price).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between font-semibold">
                  <span className="text-gray-700">Total</span>
                  <span className="text-gray-900">KES {order.total_amount.toLocaleString()}</span>
                </div>
              </div>
              
              {/* Delivery Details */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wide">
                  Delivery Details
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500 text-xs">Customer Phone</p>
                      <a href={`tel:${order.customer_phone}`} className="text-gray-700 hover:underline">
                        {order.customer_phone}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500 text-xs">Delivery Address</p>
                      <p className="text-gray-700">{order.delivery_address}</p>
                    </div>
                  </div>
                  {order.delivery_notes && (
                    <div className="p-2 bg-gray-100 rounded text-xs">
                      <span className="text-gray-500 font-medium">Note: </span>
                      <span className="text-gray-700">{order.delivery_notes}</span>
                    </div>
                  )}
                  {order.current_rider_name && (
                    <div className="flex items-start gap-2">
                      <Truck className="w-4 h-4 mt-0.5 text-purple-400 flex-shrink-0" />
                      <div>
                        <p className="text-gray-500 text-xs">Assigned Rider</p>
                        <p className="text-purple-700 font-medium">{order.current_rider_name}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500 text-xs">Order Time</p>
                      <p className="text-gray-700">{formatTime(order.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}