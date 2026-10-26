import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import { getCurrentUser, updateUserSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // 1. Valida autenticação
    const sessionUser = await getCurrentUser()
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login para alterar a foto de perfil.' },
        { status: 401 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
    }

    // 2. Validação de formato (PNG, JPEG, JPG, WEBP, SVG)
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Formato inválido. Envie uma imagem nos formatos PNG, JPEG, WEBP ou SVG.' },
        { status: 400 }
      )
    }

    // 3. Limite de tamanho: máximo 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'O tamanho da imagem não deve ultrapassar 5MB.' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // 4. Diretório public/avatars
    const avatarsDir = path.join(process.cwd(), 'public', 'avatars')
    await mkdir(avatarsDir, { recursive: true })

    // 5. Busca usuário atual para remover avatar antigo caso exista no disco
    const [existingDbUser] = await db
      .select({ avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, sessionUser.id))
      .limit(1)

    if (existingDbUser?.avatarUrl && existingDbUser.avatarUrl.startsWith('/avatars/')) {
      const oldFileName = existingDbUser.avatarUrl.replace('/avatars/', '')
      const oldFilePath = path.join(avatarsDir, oldFileName)
      try {
        await unlink(oldFilePath)
      } catch {
        // Ignora caso arquivo anterior não exista
      }
    }

    // 6. Nome único do arquivo baseado no ID do usuário e timestamp
    const extension = path.extname(file.name) || '.png'
    const fileName = `avatar_${sessionUser.id}_${Date.now()}${extension}`
    const filePath = path.join(avatarsDir, fileName)

    await writeFile(filePath, buffer)

    const publicUrl = `/avatars/${fileName}`

    // 7. Atualiza no banco de dados
    await db
      .update(users)
      .set({ avatarUrl: publicUrl })
      .where(eq(users.id, sessionUser.id))

    // 8. Atualiza o cookie de sessão para refletir imediatamente na navbar
    await updateUserSession({ avatarUrl: publicUrl })

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
    })
  } catch (error) {
    console.error('[Upload Avatar Error]:', error)
    return NextResponse.json(
      { error: 'Falha ao processar o upload do avatar.' },
      { status: 500 }
    )
  }
}
