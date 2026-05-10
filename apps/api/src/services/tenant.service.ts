import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { AppError } from '@myorbislocal/shared'

export const updateTenantSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  legalName: z.string().max(200).optional().nullable(),
  timezone: z.string().max(60).optional(),
  publicEmail: z.string().email().optional().nullable(),
  publicPhone: z.string().max(30).optional().nullable(),
  website: z.string().url().optional().nullable(),
})

export const updateBusinessProfileSchema = z.object({
  brandName: z.string().min(1).max(100).optional(),
  logoUrl: z.string().url().optional().nullable(),
  addressLine1: z.string().max(200).optional().nullable(),
  addressLine2: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  fallbackNotificationEmail: z.string().email().optional().nullable(),
})

export async function getTenant(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true, slug: true, displayName: true, legalName: true,
      status: true, timezone: true, registrationEmail: true,
      publicEmail: true, publicPhone: true, website: true,
      createdAt: true, updatedAt: true,
    },
  })
  if (!tenant) throw new AppError('NOT_FOUND', 'Tenant not found', 404)
  return tenant
}

export async function updateTenant(tenantId: string, data: z.infer<typeof updateTenantSchema>) {
  return prisma.tenant.update({
    where: { id: tenantId },
    data,
    select: {
      id: true, slug: true, displayName: true, legalName: true,
      status: true, timezone: true, publicEmail: true, publicPhone: true,
      website: true, updatedAt: true,
    },
  })
}

export async function getBusinessProfile(tenantId: string) {
  const profile = await prisma.businessProfile.findUnique({ where: { tenantId } })
  if (!profile) throw new AppError('NOT_FOUND', 'Business profile not found', 404)
  return profile
}

export async function upsertBusinessProfile(tenantId: string, data: z.infer<typeof updateBusinessProfileSchema>) {
  return prisma.businessProfile.upsert({
    where: { tenantId },
    update: data,
    create: { tenantId, brandName: data.brandName ?? 'My Business', ...data },
  })
}
