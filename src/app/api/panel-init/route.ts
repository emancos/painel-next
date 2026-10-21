import { NextRequest, NextResponse } from 'next/server'
import { getPanelInitialData } from '@/actions/tickets'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const unitId = searchParams.get('unitId')

  if (!unitId) {
    return NextResponse.json({ error: 'Parâmetro unitId é obrigatório' }, { status: 400 })
  }

  try {
    const data = await getPanelInitialData(unitId)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[API panel-init] Erro ao carregar dados:', error)
    // Retorna fallback limpo para não quebrar o painel se a unidade for nova
    return NextResponse.json({
      unit: { name: 'Unidade de Atendimento', code: 'UNI01' },
      currentTicket: null,
      history: [],
    })
  }
}
