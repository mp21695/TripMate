import { z } from 'zod';

export const activityCategorySchema = z.enum([
  'ATTRACTION',
  'FOOD',
  'TRANSIT',
  'LODGING',
  'CUSTOM',
]);

export const proposalAddItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: activityCategorySchema,
  startTime: z.string().min(1, 'startTime is required'),
  endTime: z.string().min(1, 'endTime is required'),
  estimatedCost: z.number().min(0).default(0),
  lat: z.number(),
  lng: z.number(),
  locationName: z.string().min(1, 'locationName is required'),
  notes: z.string().nullable().optional(),
  bookingRef: z.string().nullable().optional(),
  coordsVerified: z.boolean().optional(),
});

export const editableItemFieldsSchema = z.object({
  title: z.string().min(1).optional(),
  category: activityCategorySchema.optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  estimatedCost: z.number().min(0).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  locationName: z.string().optional(),
  notes: z.string().nullable().optional(),
  bookingRef: z.string().nullable().optional(),
});

export const addChangeSchema = z.object({
  type: z.literal('add'),
  dayId: z.string().min(1, 'dayId is required for add change'),
  item: proposalAddItemSchema,
  orderIndex: z.number().int().min(0).optional(),
});

export const moveChangeSchema = z.object({
  type: z.literal('move'),
  itemId: z.string().min(1, 'itemId is required for move change'),
  toDayId: z.string().min(1, 'toDayId is required for move change'),
  orderIndex: z.number().int().min(0, 'orderIndex must be >= 0'),
});

export const updateChangeSchema = z.object({
  type: z.literal('update'),
  itemId: z.string().min(1, 'itemId is required for update change'),
  fields: editableItemFieldsSchema,
});

export const deleteChangeSchema = z.object({
  type: z.literal('delete'),
  itemId: z.string().min(1, 'itemId is required for delete change'),
});

export const changeSchema = z.discriminatedUnion('type', [
  addChangeSchema,
  moveChangeSchema,
  updateChangeSchema,
  deleteChangeSchema,
]);

export const proposalSchema = z.object({
  summary: z.string(),
  changes: z.array(changeSchema).max(20, 'Max 20 changes allowed'),
});

export type ActivityCategory = z.infer<typeof activityCategorySchema>;
export type ProposalAddItem = z.infer<typeof proposalAddItemSchema>;
export type EditableItemFields = z.infer<typeof editableItemFieldsSchema>;
export type AddChange = z.infer<typeof addChangeSchema>;
export type MoveChange = z.infer<typeof moveChangeSchema>;
export type UpdateChange = z.infer<typeof updateChangeSchema>;
export type DeleteChange = z.infer<typeof deleteChangeSchema>;
export type Change = z.infer<typeof changeSchema>;
export type Proposal = z.infer<typeof proposalSchema>;
