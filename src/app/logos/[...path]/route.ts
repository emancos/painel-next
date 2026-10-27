import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
}

/**
 * Rota dinâmica para servir logos e brasões armazenados na pasta public/logos.
 * Essencial para o Next.js em modo standalone (Docker em produção), onde arquivos
 * criados em tempo de execução após o build retornariam 404 pelo roteador estático padrão.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params
    const pathSegments = resolvedParams.path || []

    if (pathSegments.length === 0) {
      return new NextResponse('Arquivo não informado', { status: 404 })
    }

    const logosDir = path.resolve(process.cwd(), 'public', 'logos')
    const requestedPath = path.resolve(logosDir, ...pathSegments)

    // Proteção rigorosa contra Directory Traversal (../)
    if (!requestedPath.startsWith(logosDir)) {
      return new NextResponse('Acesso proibido', { status: 403 })
    }

    if (!existsSync(requestedPath)) {
      return new NextResponse('Logo não encontrado', { status: 404 })
    }

    const fileBuffer = await readFile(requestedPath)
    const ext = path.extname(requestedPath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    })
  } catch (error) {
    console.error('[Logo Stream Error]:', error)
    return new NextResponse('Erro interno ao ler logo', { status: 500 })
  }
}
