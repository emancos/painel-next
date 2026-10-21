import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
    }

    // Validação de tipo de arquivo
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Formato inválido. Envie uma imagem PNG, JPEG, WEBP ou SVG.' },
        { status: 400 }
      )
    }

    // Limite de 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'O arquivo não deve ultrapassar 5MB.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Diretório public/logos
    const logosDir = path.join(process.cwd(), 'public', 'logos')
    await mkdir(logosDir, { recursive: true })

    // Nome único do arquivo
    const extension = path.extname(file.name) || '.png'
    const cleanBase = path.basename(file.name, extension).replace(/[^a-zA-Z0-9_-]/g, '_')
    const fileName = `logo_${Date.now()}_${cleanBase}${extension}`
    const filePath = path.join(logosDir, fileName)

    await writeFile(filePath, buffer)

    const publicUrl = `/logos/${fileName}`

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
    })
  } catch (error) {
    console.error('[Upload Logo Error]:', error)
    return NextResponse.json(
      { error: 'Falha ao processar o upload do arquivo.' },
      { status: 500 }
    )
  }
}
