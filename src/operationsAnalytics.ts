import { Employee, MenuItem, Order, OrderItem } from './types';

const MINUTE_MS = 60 * 1000;

export const diffMinutes = (from?: string, to?: string) => {
  if (!from) return 0;
  const start = new Date(from).getTime();
  const end = to ? new Date(to).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.round((end - start) / MINUTE_MS));
};

export const isSameLocalDay = (dateString?: string, baseDate = new Date()) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR') === baseDate.toLocaleDateString('pt-BR');
};

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const getItemDoneAt = (order: Order, item: OrderItem) => {
  if (item.deliveredAt) return item.deliveredAt;
  if (item.readyAt) return item.readyAt;
  if (order.completedAt) return order.completedAt;
  return undefined;
};

export interface ProductOperationStat {
  menuItemId: string;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
  avgMinutes: number | null;
  samples: number;
}

export const buildProductOperationStats = (orders: Order[], menuItems: MenuItem[], onlyToday = true) => {
  const stats = new Map<string, ProductOperationStat & { totalMinutes: number }>();

  orders
    .filter(order => !onlyToday || isSameLocalDay(order.createdAt))
    .forEach(order => {
      order.items.forEach(item => {
        const menuItem = menuItems.find(menu => menu.id === item.menuItemId || normalize(menu.name) === normalize(item.name));
        const key = menuItem?.id || item.menuItemId || normalize(item.name);
        const current = stats.get(key) || {
          menuItemId: key,
          name: menuItem?.name || item.name,
          category: menuItem?.category || 'Outros',
          quantity: 0,
          revenue: 0,
          avgMinutes: null,
          samples: 0,
          totalMinutes: 0
        };

        current.quantity += item.quantity;
        current.revenue += item.price * item.quantity;

        const doneAt = getItemDoneAt(order, item);
        if (doneAt && item.sentAt) {
          current.totalMinutes += diffMinutes(item.sentAt, doneAt);
          current.samples += 1;
          current.avgMinutes = Math.max(1, Math.round(current.totalMinutes / current.samples));
        }

        stats.set(key, current);
      });
    });

  return Array.from(stats.values())
    .map(({ totalMinutes, ...stat }) => stat)
    .sort((a, b) => b.quantity - a.quantity);
};

export const getEtaForMenuItem = (item: MenuItem, orders: Order[]) => {
  const completedItems: number[] = [];

  orders
    .filter(order => isSameLocalDay(order.createdAt))
    .forEach(order => {
      order.items
        .filter(orderItem => orderItem.menuItemId === item.id || normalize(orderItem.name) === normalize(item.name))
        .forEach(orderItem => {
          const doneAt = getItemDoneAt(order, orderItem);
          if (doneAt) completedItems.push(diffMinutes(orderItem.sentAt, doneAt));
        });
    });

  if (completedItems.length === 0) return null;
  return Math.max(1, Math.round(completedItems.reduce((sum, value) => sum + value, 0) / completedItems.length));
};

export const formatEta = (minutes: number | null) => {
  if (!minutes) return 'Sem historico hoje';
  if (minutes < 60) return `Media hoje: ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `Media hoje: ${hours}h${rest ? `${rest}min` : ''}`;
};

export interface SlowOrderItem {
  orderId: string;
  tableNumber: number;
  waiterId: string;
  waiterName: string;
  item: OrderItem;
  minutes: number;
}

export const getSlowOrderItems = (orders: Order[], thresholdMinutes = 20, waiterId?: string) => {
  return orders
    .filter(order => order.status === 'active' && (!waiterId || order.waiterId === waiterId))
    .flatMap(order =>
      order.items
        .filter(item => item.status === 'pending' || item.status === 'preparing')
        .map(item => ({
          orderId: order.id,
          tableNumber: order.tableNumber,
          waiterId: order.waiterId,
          waiterName: order.waiterName,
          item,
          minutes: diffMinutes(item.sentAt)
        }))
    )
    .filter(entry => entry.minutes >= thresholdMinutes)
    .sort((a, b) => b.minutes - a.minutes);
};

export const getPeakHourStats = (orders: Order[], onlyToday = true) => {
  const hours = new Map<number, number>();

  orders
    .filter(order => !onlyToday || isSameLocalDay(order.createdAt))
    .forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      hours.set(hour, (hours.get(hour) || 0) + 1);
    });

  return Array.from(hours.entries())
    .map(([hour, count]) => ({ hour, label: `${String(hour).padStart(2, '0')}:00`, count }))
    .sort((a, b) => a.hour - b.hour);
};

export interface WaiterOperationStat {
  id: string;
  name: string;
  orders: number;
  deliveredItems: number;
  avgTicket: number;
  avgDeliveryMinutes: number | null;
}

export const getWaiterOperationStats = (orders: Order[], employees: Employee[]) => {
  const stats = new Map<string, WaiterOperationStat & { totalTicket: number; totalMinutes: number; samples: number }>();

  employees
    .filter(employee => employee.role === 'waiter')
    .forEach(employee => {
      stats.set(employee.id, {
        id: employee.id,
        name: employee.name,
        orders: 0,
        deliveredItems: 0,
        avgTicket: 0,
        avgDeliveryMinutes: null,
        totalTicket: 0,
        totalMinutes: 0,
        samples: 0
      });
    });

  orders
    .filter(order => isSameLocalDay(order.createdAt))
    .forEach(order => {
      const key = order.waiterId || order.waiterName;
      const current = stats.get(key) || {
        id: key,
        name: order.waiterName,
        orders: 0,
        deliveredItems: 0,
        avgTicket: 0,
        avgDeliveryMinutes: null,
        totalTicket: 0,
        totalMinutes: 0,
        samples: 0
      };

      current.orders += 1;
      current.totalTicket += order.total || order.subtotal || 0;
      current.avgTicket = current.totalTicket / current.orders;

      order.items.forEach(item => {
        if (item.status === 'delivered') current.deliveredItems += item.quantity;
        const doneAt = item.deliveredAt || order.completedAt;
        if (doneAt) {
          current.totalMinutes += diffMinutes(item.sentAt, doneAt);
          current.samples += 1;
          current.avgDeliveryMinutes = Math.max(1, Math.round(current.totalMinutes / current.samples));
        }
      });

      stats.set(key, current);
    });

  return Array.from(stats.values())
    .map(({ totalTicket, totalMinutes, samples, ...stat }) => stat)
    .sort((a, b) => b.orders - a.orders || b.avgTicket - a.avgTicket);
};
