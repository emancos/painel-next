import { db } from '@/lib/db'
import { units } from '@/lib/db/schema'
import { eq, sql, and } from 'drizzle-orm'
import { DEFAULT_FAVICON } from './favicon'

/**
 * Busca a URL do brasão/logo da unidade no banco de dados para ser usado como favicon no SSR / layout.
 * Se nenhuma unidade específica for informada, utiliza o primeiro logo de unidade disponível.
 * Caso não haja nenhum cadastrado, retorna DEFAULT_FAVICON (/favicon.svg).
 */
export async function getSystemFavicon(unitId?: string): Promise<string> {
  try {
    if (unitId) {
      const [unit] = await db
        .select({ logoUrl: units.logoUrl })
        .from(units)
        .where(and(eq(units.id, unitId), sql`${units.logoUrl} IS NOT NULL AND ${units.logoUrl} != ''`))
        .limit(1)

      if (unit?.logoUrl && unit.logoUrl.trim()) {
        return unit.logoUrl.trim()
      }
    }

    const [defaultUnit] = await db
      .select({ logoUrl: units.logoUrl })
      .from(units)
      .where(sql`${units.logoUrl} IS NOT NULL AND ${units.logoUrl} != ''`)
      .limit(1)

    if (defaultUnit?.logoUrl && defaultUnit.logoUrl.trim()) {
      return defaultUnit.logoUrl.trim()
    }
  } catch (err) {
    console.error('[getSystemFavicon Error]:', err)
  }

  return DEFAULT_FAVICON
}
