import { 
  pgTable, 
  uuid, 
  varchar, 
  text, 
  integer, 
  smallint, 
  boolean, 
  timestamp, 
  jsonb, 
  index, 
  uniqueIndex, 
  primaryKey 
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// 1. Unidades de Atendimento (Nome, Subtítulo, Logo/Brasão)
export const units = pgTable('units', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 10 }).notNull().unique(),
  name: varchar('name', { length: 120 }).notNull(),
  subtitle: varchar('subtitle', { length: 255 }), // Subtítulo abaixo do nome da unidade
  logoUrl: text('logo_url'),                       // URL ou Data URI do logotipo / brasão da unidade
  active: boolean('active').default(true).notNull(),
  timezone: varchar('timezone', { length: 50 }).default('America/Sao_Paulo').notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
})

// 2. Andares das Unidades
export const floors = pgTable('floors', {
  id: uuid('id').defaultRandom().primaryKey(),
  unitId: uuid('unit_id').references(() => units.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 60 }).notNull(), // Ex: "Térreo", "1º Andar", "Subsolo"
  number: smallint('number').default(0).notNull(),  // 0 = Térreo, 1 = 1º Andar, etc.
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})

// 3. Salas (vinculadas a Andares na Unidade)
export const rooms = pgTable('rooms', {
  id: uuid('id').defaultRandom().primaryKey(),
  unitId: uuid('unit_id').references(() => units.id, { onDelete: 'cascade' }).notNull(),
  floorId: uuid('floor_id').references(() => floors.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 100 }).notNull(), // Ex: "Sala de Triagem", "Consultório 01"
  number: varchar('number', { length: 20 }),        // Ex: "101", "Sala A"
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})

// 4. Usuários e Permissões (ADMIN, ATTENDANT, TRIAGE)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  email: varchar('email', { length: 120 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 30 }).default('ATTENDANT').notNull(), // ADMIN, MANAGER, ATTENDANT, TRIAGE
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})

// 5. Locais de Chamada (Mesas ou Guichês vinculados a Salas e ao Usuário em Atendimento)
export const locations = pgTable('locations', {
  id: uuid('id').defaultRandom().primaryKey(),
  unitId: uuid('unit_id').references(() => units.id, { onDelete: 'cascade' }).notNull(),
  roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  currentUserId: uuid('current_user_id').references(() => users.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 50 }).notNull(), // Ex: "Guichê", "Mesa"
  number: smallint('number').notNull(),
  active: boolean('active').default(true).notNull()
}, (table) => [
  uniqueIndex('uq_location_unit').on(table.unitId, table.name, table.number)
])

export const userUnits = pgTable('user_units', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  unitId: uuid('unit_id').references(() => units.id, { onDelete: 'cascade' }).notNull()
}, (table) => [
  primaryKey({ columns: [table.userId, table.unitId] })
])

// 6. Serviços
export const services = pgTable('services', {
  id: uuid('id').defaultRandom().primaryKey(),
  unitId: uuid('unit_id').references(() => units.id, { onDelete: 'cascade' }).notNull(),
  roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 100 }).notNull(),
  prefix: varchar('prefix', { length: 3 }).notNull(), // Ex: "A", "P", "CX"
  weight: smallint('weight').default(1).notNull(),
  active: boolean('active').default(true).notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  uniqueIndex('uq_service_prefix_unit').on(table.unitId, table.prefix)
])

// 7. Prioridades de Atendimento
export const priorities = pgTable('priorities', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  name: varchar('name', { length: 60 }).notNull().unique(),
  description: varchar('description', { length: 150 }),
  weight: smallint('weight').default(1).notNull(),
  colorHex: varchar('color_hex', { length: 7 }).default('#06B6D4').notNull(),
  active: boolean('active').default(true).notNull()
})

// 8. Contadores Diários de Senhas (Atômico por Unidade/Serviço)
export const dailyCounters = pgTable('daily_counters', {
  id: uuid('id').defaultRandom().primaryKey(),
  unitId: uuid('unit_id').references(() => units.id, { onDelete: 'cascade' }).notNull(),
  serviceId: uuid('service_id').references(() => services.id, { onDelete: 'cascade' }).notNull(),
  date: varchar('date', { length: 10 }).notNull(), // YYYY-MM-DD
  currentNumber: integer('current_number').default(0).notNull()
}, (table) => [
  uniqueIndex('uq_counter_date').on(table.unitId, table.serviceId, table.date)
])

// 9. Senhas Ativas (Tempo Real - Tabela Principal de Atendimento)
export const tickets = pgTable('tickets', {
  id: uuid('id').defaultRandom().primaryKey(),
  unitId: uuid('unit_id').references(() => units.id).notNull(),
  serviceId: uuid('service_id').references(() => services.id).notNull(),
  priorityId: integer('priority_id').references(() => priorities.id).notNull(),
  locationId: uuid('location_id').references(() => locations.id),
  userId: uuid('user_id').references(() => users.id),
  ticketNumber: integer('ticket_number').notNull(),
  ticketPrefix: varchar('ticket_prefix', { length: 3 }).notNull(),
  formattedTicket: varchar('formatted_ticket', { length: 10 }).notNull(),
  status: varchar('status', { length: 25 }).default('ISSUED').notNull(), // ISSUED, CALLED, IN_PROGRESS, FINISHED, NO_SHOW, CANCELLED
  resolution: varchar('resolution', { length: 20 }),                      // SOLVED, PENDING
  customerName: varchar('customer_name', { length: 120 }),
  customerDoc: varchar('customer_doc', { length: 30 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  calledAt: timestamp('called_at', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  metadata: jsonb('metadata').default({}).notNull()
}, (table) => [
  index('idx_tickets_queue').on(table.unitId, table.serviceId, table.priorityId, table.createdAt)
])

// 10. Histórico Particionado para Relatórios e BI
export const ticketsHistory = pgTable('tickets_history', {
  id: uuid('id').notNull(),
  unitId: uuid('unit_id').notNull(),
  serviceId: uuid('service_id').notNull(),
  priorityId: integer('priority_id').notNull(),
  locationId: uuid('location_id'),
  userId: uuid('user_id'),
  ticketNumber: integer('ticket_number').notNull(),
  ticketPrefix: varchar('ticket_prefix', { length: 3 }).notNull(),
  formattedTicket: varchar('formatted_ticket', { length: 10 }).notNull(),
  status: varchar('status', { length: 25 }).notNull(),
  resolution: varchar('resolution', { length: 20 }),
  customerName: varchar('customer_name', { length: 120 }),
  customerDoc: varchar('customer_doc', { length: 30 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  calledAt: timestamp('called_at', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  waitTimeSeconds: integer('wait_time_seconds'),
  serviceTimeSeconds: integer('service_time_seconds'),
  totalTimeSeconds: integer('total_time_seconds'),
  metadata: jsonb('metadata')
}, (table) => [
  primaryKey({ columns: [table.id, table.createdAt] })
])

// Relações do Drizzle
export const unitsRelations = relations(units, ({ many }) => ({
  floors: many(floors),
  rooms: many(rooms),
  services: many(services),
  locations: many(locations),
  tickets: many(tickets)
}))

export const floorsRelations = relations(floors, ({ one, many }) => ({
  unit: one(units, { fields: [floors.unitId], references: [units.id] }),
  rooms: many(rooms)
}))

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  unit: one(units, { fields: [rooms.unitId], references: [units.id] }),
  floor: one(floors, { fields: [rooms.floorId], references: [floors.id] }),
  locations: many(locations)
}))

export const locationsRelations = relations(locations, ({ one }) => ({
  unit: one(units, { fields: [locations.unitId], references: [units.id] }),
  room: one(rooms, { fields: [locations.roomId], references: [rooms.id] }),
  currentUser: one(users, { fields: [locations.currentUserId], references: [users.id] })
}))

export const servicesRelations = relations(services, ({ one }) => ({
  unit: one(units, { fields: [services.unitId], references: [units.id] }),
  room: one(rooms, { fields: [services.roomId], references: [rooms.id] }),
  user: one(users, { fields: [services.userId], references: [users.id] }),
}))

export const ticketsRelations = relations(tickets, ({ one }) => ({
  unit: one(units, { fields: [tickets.unitId], references: [units.id] }),
  service: one(services, { fields: [tickets.serviceId], references: [services.id] }),
  priority: one(priorities, { fields: [tickets.priorityId], references: [priorities.id] }),
  location: one(locations, { fields: [tickets.locationId], references: [locations.id] }),
  user: one(users, { fields: [tickets.userId], references: [users.id] })
}))
