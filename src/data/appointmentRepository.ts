import type { Appointment } from '@/domain/types';
import { AppDatabase } from './db';

/** Ablage der vereinbarten Termine bis zum Rückweg nach Salesforce */
export interface AppointmentRepository {
  add(appointment: Appointment): Promise<void>;
  list(): Promise<Appointment[]>;
  clear(): Promise<void>;
}

export class DexieAppointmentRepository implements AppointmentRepository {
  constructor(private readonly db: AppDatabase = new AppDatabase()) {}

  async add(appointment: Appointment): Promise<void> {
    await this.db.appointments.put(appointment);
  }

  async list(): Promise<Appointment[]> {
    return this.db.appointments.orderBy('createdAt').toArray();
  }

  async clear(): Promise<void> {
    await this.db.appointments.clear();
  }
}

/** Flüchtige Variante für Tests und als Rückfall, wenn IndexedDB nicht verfügbar ist */
export class InMemoryAppointmentRepository implements AppointmentRepository {
  private items: Appointment[] = [];

  async add(appointment: Appointment): Promise<void> {
    this.items = [...this.items.filter((c) => c.id !== appointment.id), appointment];
  }

  async list(): Promise<Appointment[]> {
    return [...this.items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async clear(): Promise<void> {
    this.items = [];
  }
}
