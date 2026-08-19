import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads')

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('haven_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const encrypted = formData.get('encrypted') === 'true'
    const iv = formData.get('iv') as string | null
    const encryptedKey = formData.get('encryptedKey') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    await mkdir(UPLOAD_DIR, { recursive: true })

    const ext = file.name.split('.').pop() || 'bin'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const filepath = join(UPLOAD_DIR, filename)

    const bytes = await file.arrayBuffer()

    if (encrypted && iv && encryptedKey) {
      // Store encrypted file with metadata
      const metadata = {
        encrypted: true,
        iv,
        encryptedKey,
        originalName: file.name,
        mimeType: file.type,
      }
      // Save encrypted data
      await writeFile(filepath, Buffer.from(bytes))
      // Save metadata alongside
      await writeFile(filepath + '.meta', JSON.stringify(metadata))

      const fileUrl = `/uploads/${filename}`
      return NextResponse.json({
        url: fileUrl,
        filename: file.name,
        type: getFileType(file.type),
        mimeType: file.type,
        size: file.size,
        encrypted: true,
        iv,
        encryptedKey,
      })
    } else {
      // Unencrypted upload (for backward compatibility)
      await writeFile(filepath, Buffer.from(bytes))

      const fileUrl = `/uploads/${filename}`
      return NextResponse.json({
        url: fileUrl,
        filename: file.name,
        type: getFileType(file.type),
        mimeType: file.type,
        size: file.size,
        encrypted: false,
      })
    }
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

function getFileType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  return 'document'
}
