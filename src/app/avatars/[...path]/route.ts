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
 * Rota dinâmica para servir fotos e avatares armazenados na pasta public/avatars.
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

    const avatarsDir = path.resolve(process.cwd(), 'public', 'avatars')
    const requestedPath = path.resolve(avatarsDir, ...pathSegments)

    // Proteção rigorosa contra Directory Traversal (../)
    if (!requestedPath.startsWith(avatarsDir)) {
      return new NextResponse('Acesso proibido', { status: 403 })
    }

    if (!existsSync(requestedPath)) {
      return new NextResponse('Avatar não encontrado', { status: 404 })
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
    console.error('[Avatar Stream Error]:', error)
    return new NextResponse('Erro interno ao ler avatar', { status: 500 })
  }
}
