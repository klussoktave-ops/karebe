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
  X,
  PhoneCall,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Order, OrderStatus } from '../api/admin-orders';
import { formatOrderDisplay, getOrderUrgency, isPendingCall } from '../utils/order-display';

interface Rider {
  id: string;
  name: string;
  phone: string;
  status: string;
  is_active: boolean;
}

export type OrderCardAction = 'confirm' | 'startDelivery' | 'assignRider' | 'sendOut' | 'confirmDelivery' | 'cancel' | 'delete';

interface OrderCardProps {
  order: Order;
  riders: Rider[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  isEditing: boolean;
  editForm: {
    customer_name: string;
    customer_phone?: string;
    delivery_address: string;
    delivery_notes: string;
  };
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onFormChange: (field: string, value: string) => void;
  actionLoading: boolean;
  onAction: (action: OrderCardAction) => void;
  onCallRider?: (phone: string) => void;
  onWhatsAppRider?: (phone: string, order: Order) => void;
  onSmsRider?: (phone: string, order: Order) => void;
}

// Status configuration with improved color coding for dispatch
// Visual hierarchy: Order ID > Status > Price > Actions
// Now includes workflow-based statuses for shop owner clarity
// Export for use in other components
export const statusConfig: Record<OrderStatus, { 
  label: string; 
  color: string; 
  bgColor: string;
  borderColor: string;
  dotColor: string;
  stripColor: string;
  icon: typeof Package;
  emoji: string;
  priority: number;
  // Workflow properties
  actionLabel?: string;  // What action to show on button
  actionVariant?: 'default' | 'success' | 'warning' | 'danger' | 'primary';
}> = {
  CART_DRAFT: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200', dotColor: 'bg-gray-500', stripColor: 'border-l-gray-400', icon: ShoppingCart, emoji: '⚪', priority: 6 },
  ORDER_SUBMITTED: { label: 'New Order', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', dotColor: 'bg-blue-500', stripColor: 'border-l-blue-500', icon: AlertCircle, emoji: '📥', priority: 1, actionLabel: 'Confirm Order', actionVariant: 'success' },
  CONFIRMED_BY_MANAGER: { label: 'Confirmed', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200', dotColor: 'bg-green-500', stripColor: 'border-l-green-500', icon: CheckCircle, emoji: '✅', priority: 2, actionLabel: 'Start Preparing', actionVariant: 'primary' },
  DELIVERY_REQUEST_STARTED: { label: 'Ready', color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', dotColor: 'bg-orange-500', stripColor: 'border-l-orange-500', icon: Truck, emoji: '📦', priority: 3, actionLabel: 'Assign Rider', actionVariant: 'primary' },
  RIDER_CONFIRMED_DIGITAL: { label: 'Rider Assigned', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', dotColor: 'bg-purple-500', stripColor: 'border-l-purple-500', icon: User, emoji: '🏍️', priority: 4, actionLabel: 'Send Out', actionVariant: 'primary' },
  RIDER_CONFIRMED_MANUAL: { label: 'Rider Assigned', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', dotColor: 'bg-purple-500', stripColor: 'border-l-purple-500', icon: User, emoji: '🏍️', priority: 4, actionLabel: 'Send Out', actionVariant: 'primary' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'text-cyan-700', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-200', dotColor: 'bg-cyan-500', stripColor: 'border-l-cyan-500', icon: Truck, emoji: '🚴', priority: 5, actionLabel: 'Confirm Delivered', actionVariant: 'success' },
  DELIVERED: { label: 'Delivered', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', dotColor: 'bg-emerald-500', stripColor: 'border-l-emerald-500', icon: CheckCircle, emoji: '✅', priority: 7 },
  CANCELLED: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200', dotColor: 'bg-red-500', stripColor: 'border-l-red-500', icon: AlertCircle, emoji: '❌', priority: 8 },
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

function getCustomerDisplayName(order: Order): string {
  if (order.customer_name && order.customer_name.trim().length > 0) {
    return order.customer_name;
  }
  return 'Guest Customer';
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
  const isNameMissing = !order.customer_name || order.customer_name.trim().length === 0;
  const isPhoneMissing = isPendingCall(order.customer_phone);
  const isAddressMissing = isPendingCall(order.delivery_address);
  const needsDetails = isNameMissing || isPhoneMissing || isAddressMissing;
  const attentionLabel = needsDetails ? 'Complete order details' : status.label;
  
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
          <div className="flex gap-2">
            {/* Call Customer Button - Primary for new orders */}
            <Button
              size="sm"
              variant="outline"
              className="border-green-500 text-green-700 hover:bg-green-50 w-full sm:w-auto"
              onClick={() => window.location.href = `tel:${order.customer_phone}`}
            >
              <PhoneCall className="w-4 h-4 mr-1.5" />
              Call
            </Button>
            <Button
              size="sm"
              onClick={() => onAction('confirm')}
              className="bg-green-600 hover:bg-green-700 font-medium w-full sm:w-auto"
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Confirm
            </Button>
          </div>
        );
      case 'CONFIRMED_BY_MANAGER':
        return (
          <Button
            size="sm"
            onClick={() => onAction('startDelivery')}
            className="bg-blue-600 hover:bg-blue-700 font-medium w-full sm:w-auto justify-center"
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
            className="bg-purple-600 hover:bg-purple-700 font-medium w-full sm:w-auto justify-center"
          >
            <User className="w-4 h-4 mr-1.5" />
            Assign Rider
          </Button>
        );
      case 'RIDER_CONFIRMED_DIGITAL':
      case 'RIDER_CONFIRMED_MANUAL':
        return (
          <Button
            size="sm"
            onClick={() => onAction('sendOut')}
            className="bg-cyan-600 hover:bg-cyan-700 font-medium w-full sm:w-auto justify-center"
          >
            <Truck className="w-4 h-4 mr-1.5" />
            Send Out
          </Button>
        );
      case 'OUT_FOR_DELIVERY':
        return (
          <Button
            size="sm"
            onClick={() => onAction('confirmDelivery')}
            className="bg-emerald-600 hover:bg-emerald-700 font-medium w-full sm:w-auto justify-center"
          >
            <CheckCircle className="w-4 h-4 mr-1.5" />
            Confirm Delivered
          </Button>
        );
      default:
        return null;
    }
  };

  // Get secondary actions (Cancel, etc.) - only show for active orders
  const getSecondaryActions = () => {
    const isActiveOrder = !['CART_DRAFT', 'DELIVERED', 'CANCELLED'].includes(order.status);
    
    if (!isActiveOrder || actionLoading) return null;

    return (
      <div className="flex items-center gap-1 mt-2">
        <Button
          size="sm"
          variant="ghost"
          className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs py-1 h-7"
          onClick={() => {
            if (confirm('Are you sure you want to cancel this order?')) {
              onAction('cancel');
            }
          }}
        >
          <X className="w-3 h-3 mr-1" />
          Cancel Order
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs py-1 h-7"
          onClick={() => {
            if (confirm('⚠️ Delete this order?\n\nThis will SOFT-DELETE the order. It can be restored later from the deleted items section.\n\nSet confirm: true to proceed.')) {
              onAction('delete');
            }
          }}
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Delete
        </Button>
      </div>
    );
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
      border
      border-slate-200/70
      border-l-4 
      ${status.stripColor}
      overflow-hidden 
      transition-all 
      hover:shadow-md
    `}>
      <CardContent className="p-0">
        {/* Main Card Content - Mobile First */}
        <div className="flex flex-col">

          {/* HEADER */}
          <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-100">
            <div className="flex items-start gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status.bgColor} ${status.borderColor} border`}>
                <StatusIcon className={`w-5.5 h-5.5 ${status.color}`} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-lg tracking-tight">
                    {formatOrderDisplay(order.id, order.order_reference)}
                  </h3>
                  {getPriorityIndicator()}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatRelativeTime(order.created_at)}</span>
                </div>
                <Badge 
                  variant="outline" 
                  className={`${status.bgColor} ${status.color} border ${status.borderColor} text-[11px] mt-2 font-semibold flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full uppercase tracking-wide`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                  <span>{status.emoji}</span>
                  {status.label}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Total</p>
              <p className="font-bold text-slate-900 text-xl leading-tight tracking-tight">
                KES {order.total_amount.toLocaleString()}
              </p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 text-xs ring-1 ring-slate-200 mt-1">
                {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          </div>

          {/* BODY */}
          <div className="p-4 space-y-4">
            {isEditing ? (
              <div className="space-y-3">
                <Input
                  value={editForm.customer_name}
                  onChange={(e) => onFormChange('customer_name', e.target.value)}
                  placeholder="Customer name"
                  className="h-9 text-sm font-medium"
                />
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-brand-500 flex-shrink-0" />
                  <Input
                    value={editForm.customer_phone || ''}
                    onChange={(e) => onFormChange('customer_phone', e.target.value)}
                    placeholder="Phone number (from call logs)"
                    className="h-9 text-sm flex-1"
                  />
                </div>
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
              <>
                <div className="flex items-center gap-2 text-amber-700 text-sm font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  {attentionLabel}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="font-semibold text-slate-800 truncate">
                      {getCustomerDisplayName(order)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {isPhoneMissing ? (
                      <button
                        type="button"
                        onClick={onStartEdit}
                        className="text-slate-600 hover:text-slate-900 underline decoration-dotted"
                      >
                        Add phone
                      </button>
                    ) : (
                      <a 
                        href={`tel:${order.customer_phone}`} 
                        className="text-slate-700 hover:text-slate-900 hover:underline"
                      >
                        <Phone className="w-4 h-4 text-slate-400 inline mr-1" />
                        {order.customer_phone}
                      </a>
                    )}
                    {isNameMissing && (
                      <button
                        type="button"
                        onClick={onStartEdit}
                        className="text-slate-600 hover:text-slate-900 underline decoration-dotted"
                      >
                        Add name
                      </button>
                    )}
                    {isAddressMissing && (
                      <button
                        type="button"
                        onClick={onStartEdit}
                        className="text-slate-600 hover:text-slate-900 underline decoration-dotted"
                      >
                        Add location
                      </button>
                    )}
                  </div>
                </div>

                {rider && (order.status === 'RIDER_CONFIRMED_DIGITAL' || order.status === 'RIDER_CONFIRMED_MANUAL' || order.status === 'OUT_FOR_DELIVERY') && (
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-800">
                      {rider.name}
                    </span>
                    <button
                      type="button"
                      onClick={onToggleExpand}
                      className="text-slate-600 hover:text-slate-900 underline decoration-dotted ml-auto"
                    >
                      Details
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ACTIONS */}
          <div className="p-4 pt-0 flex items-center gap-2 flex-wrap">
            {getPrimaryAction()}
            {getSecondaryActions()}
            <div className="flex items-center gap-1 ml-auto">
              {!isEditing && (
                <button
                  onClick={onStartEdit}
                  className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                  title="Edit order"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onToggleExpand}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
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
                      {isPendingCall(order.customer_phone) ? (
                        <div className="flex flex-col">
                          <span className="text-amber-600 font-medium">Awaiting Call</span>
                          <button 
                            type="button"
                            onClick={onStartEdit}
                            className="text-xs text-blue-600 hover:underline text-left"
                          >
                            Add phone details
                          </button>
                        </div>
                      ) : (
                        <a href={`tel:${order.customer_phone}`} className="text-gray-700 hover:underline">
                          {order.customer_phone}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500 text-xs">Delivery Address</p>
                      {isPendingCall(order.delivery_address) ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-amber-600 font-medium">Awaiting address</span>
                          <button 
                            type="button"
                            onClick={onStartEdit}
                            className="text-xs text-blue-600 hover:underline text-left"
                          >
                            Add delivery location
                          </button>
                        </div>
                      ) : (
                        <p className="text-gray-700">{order.delivery_address}</p>
                      )}
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
