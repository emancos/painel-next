'use server'

import { db } from '@/lib/db'
import { users, locations, rooms, units } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { getCurrentUser, updateUserSession } from '@/lib/auth'
import { unlink } from 'fs/promises'
import path from 'path'

export interface UserProfileData {
  id: string
  name: string
  email: string
  role: string
  avatarUrl: string | null
  active: boolean
  createdAt: Date
  currentLocationName?: string | null
}

/**
 * Obtém os dados completos do perfil do usuário atualmente autenticado.
 */
export async function getUserProfile(): Promise<
  { success: true; user: UserProfileData } | { success: false; message: string }
> {
  const sessionUser = await getCurrentUser()
  if (!sessionUser) {
    return { success: false, message: 'Usuário não autenticado.' }
  }

  const [dbUser] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      avatarUrl: users.avatarUrl,
      active: users.active,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, sessionUser.id))
    .limit(1)

  if (!dbUser) {
    return { success: false, message: 'Usuário não encontrado no banco de dados.' }
  }

  // Verifica se o usuário está associado a algum guichê ou mesa
  let currentLocationName: string | null = null
  const [userLoc] = await db
    .select({
      name: locations.name,
      number: locations.number,
      roomName: rooms.name,
    })
    .from(locations)
    .leftJoin(rooms, eq(locations.roomId, rooms.id))
    .where(eq(locations.currentUserId, dbUser.id))
    .limit(1)

  if (userLoc) {
    currentLocationName = `${userLoc.name} ${userLoc.number.toString().padStart(2, '0')}${
      userLoc.roomName ? ` (${userLoc.roomName})` : ''
    }`
  }

  return {
    success: true,
    user: {
      ...dbUser,
      currentLocationName,
    },
  }
}

/**
 * Atualiza o nome de exibição do usuário.
 */
export async function updateUserName(newName: string): Promise<
  { success: true; name: string } | { success: false; message: string }
> {
  const sessionUser = await getCurrentUser()
  if (!sessionUser) {
    return { success: false, message: 'Sessão expirada. Faça login novamente.' }
  }

  const trimmedName = newName.trim()
  if (!trimmedName || trimmedName.length < 2) {
    return { success: false, message: 'O nome deve conter pelo menos 2 caracteres.' }
  }
  if (trimmedName.length > 120) {
    return { success: false, message: 'O nome não deve ultrapassar 120 caracteres.' }
  }

  await db
    .update(users)
    .set({ name: trimmedName })
    .where(eq(users.id, sessionUser.id))

  await updateUserSession({ name: trimmedName })

  return { success: true, name: trimmedName }
}

/**
 * Altera a senha do usuário logado validando a senha atual.
 */
export async function changeUserPassword(formData: {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}): Promise<{ success: boolean; message: string }> {
  const sessionUser = await getCurrentUser()
  if (!sessionUser) {
    return { success: false, message: 'Sessão expirada. Faça login novamente.' }
  }

  const { currentPassword, newPassword, confirmPassword } = formData

  if (!currentPassword) {
    return { success: false, message: 'Informe a senha atual.' }
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, message: 'A nova senha deve ter no mínimo 6 caracteres.' }
  }

  if (newPassword !== confirmPassword) {
    return { success: false, message: 'A confirmação de senha não confere.' }
  }

  // Busca senha hash atual do usuário
  const [dbUser] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, sessionUser.id))
    .limit(1)

  if (!dbUser) {
    return { success: false, message: 'Usuário não encontrado.' }
  }

  const isCurrentValid = await bcrypt.compare(currentPassword, dbUser.passwordHash)
  if (!isCurrentValid) {
    return { success: false, message: 'A senha atual informada está incorreta.' }
  }

  // Gera novo hash e atualiza
  const newHash = await bcrypt.hash(newPassword, 10)
  await db
    .update(users)
    .set({ passwordHash: newHash })
    .where(eq(users.id, sessionUser.id))

  return { success: true, message: 'Senha alterada com sucesso!' }
}

/**
 * Remove o avatar do usuário logado (exclui arquivo de public/avatars se local).
 */
export async function removeUserAvatar(): Promise<{ success: boolean; message: string }> {
  const sessionUser = await getCurrentUser()
  if (!sessionUser) {
    return { success: false, message: 'Sessão expirada. Faça login novamente.' }
  }

  const [dbUser] = await db
    .select({ avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, sessionUser.id))
    .limit(1)

  if (dbUser?.avatarUrl) {
    // Se o avatar for um arquivo local na pasta /avatars/
    if (dbUser.avatarUrl.startsWith('/avatars/')) {
      const fileName = dbUser.avatarUrl.replace('/avatars/', '')
      const filePath = path.join(process.cwd(), 'public', 'avatars', fileName)
      try {
        await unlink(filePath)
      } catch {
        // Ignora caso o arquivo já tenha sido removido do disco
      }
    }

    await db
      .update(users)
      .set({ avatarUrl: null })
      .where(eq(users.id, sessionUser.id))

    await updateUserSession({ avatarUrl: null })
  }

  return { success: true, message: 'Foto de perfil removida com sucesso!' }
}
