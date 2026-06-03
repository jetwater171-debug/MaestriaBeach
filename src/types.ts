export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  imageUrl?: string;
  isAvailable: boolean;
  isPromotion: boolean;
  promotionalPrice?: number;
}

export interface Employee {
  id: string;
  name: string;
  role: 'waiter' | 'kitchen' | 'cashier';
  pin: string; // Senha numérica de 4 dígitos para login rápido no celular
}

export interface StoreInfo {
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  tablesCount: number;
  serviceChargePercent: number; // ex: 10%
}

export type OrderItemStatus = 'pending' | 'preparing' | 'ready' | 'delivered';

export interface OrderItem {
  id: string; // Identificador único do item no pedido (para pratos repetidos com observações diferentes)
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  observations?: string;
  status: OrderItemStatus;
  sentAt: string;
}

export type OrderStatus = 'active' | 'completed' | 'canceled';

export interface Order {
  id: string;
  tableNumber: number;
  waiterId: string;
  waiterName: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
  completedAt?: string;
  paymentMethod?: 'pix' | 'card' | 'cash';
  subtotal: number;
  serviceCharge: number;
  discount: number;
  total: number;
}

export type TableStatus = 'available' | 'occupied' | 'waiting_bill';

export interface Table {
  number: number;
  status: TableStatus;
  activeOrderId?: string;
}

export interface DailySale {
  id: string;
  date: string;
  totalSales: number;
  orderCount: number;
  byPaymentMethod: {
    pix: number;
    card: number;
    cash: number;
  };
}
