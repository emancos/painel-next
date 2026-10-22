'use client'

import { useEffect, useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Building2, 
  Users, 
  DoorOpen, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  LogOut, 
  Layers,
  Image as ImageIcon,
  Edit2,
  Trash2,
  UploadCloud,
  Filter,
  X,
  KeyRound,
  Volume2,
  Sliders,
  Sparkles,
  Radio,
  Play,
  Shuffle,
  CheckSquare,
  ListOrdered,
  Briefcase,
  RotateCcw,
  Clock,
  AlertTriangle,
  Globe
} from 'lucide-react'
import { 
  getUnitsList, 
  createUnit, 
  updateUnit,
  getFloorsByUnit, 
  createFloor, 
  updateFloor,
  deleteFloor,
  getRoomsByUnit, 
  createRoom, 
  updateRoom,
  deleteRoom,
  getLocationsWithDetails, 
  createLocation, 
  updateLocation,
  deleteLocation,
  bindAttendantToLocation, 
  getServicesByUnit,
  createService,
  updateService,
  deleteService,
  getUsersList, 
  createUser,
  updateUser,
  deleteUser,
  getUnitSpeechConfig,
  saveUnitSpeechConfig,
  getUnitAttendanceConfig,
  saveUnitAttendanceConfig,
  resetUnitTicketCounter
} from '@/actions/admin'
import { getSessionAction, logoutAction } from '@/actions/auth'
import { speechManager } from '@/lib/speech'
import { buildTicketAnnouncement } from '@/lib/speech-normalizer'
import { AdminThemeToggle } from '@/components/theme/AdminThemeToggle'

export default function AdminPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'UNITS' | 'STRUCTURE' | 'LOCATIONS' | 'SERVICES' | 'USERS' | 'SPEECH' | 'ATTENDANCE'>('UNITS')
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Dados carregados
  const [units, setUnits] = useState<any[]>([])
  const [selectedUnitId, setSelectedUnitId] = useState<string>('')
  const [floors, setFloors] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [usersList, setUsersList] = useState<any[]>([])

  // 6. Configurações de Voz (Edge-TTS) e Simulador
  const [speechVoice, setSpeechVoice] = useState('pt-BR-FranciscaNeural')
  const [speechRate, setSpeechRate] = useState('+0%')
  const [speechPitch, setSpeechPitch] = useState('+0Hz')
  const [speechCallPrefix, setSpeechCallPrefix] = useState('Senha')
  const [speechCallSuffix, setSpeechCallSuffix] = useState('Favor comparecer')
  const [speechPauseDuration, setSpeechPauseDuration] = useState('300ms')
  const [speechIncludeCustomerName, setSpeechIncludeCustomerName] = useState(true)
  const [speechLgpdMode, setSpeechLgpdMode] = useState(false)

  // Testes do Simulador
  const [simName, setSimName] = useState('MARIA DA SILVA SANTOS')
  const [simPrefix, setSimPrefix] = useState('SG')
  const [simNumber, setSimNumber] = useState(1)
  const [simLocName, setSimLocName] = useState('Guichê')
  const [simLocNumber, setSimLocNumber] = useState(3)
  const [simPreviewText, setSimPreviewText] = useState<string | null>(null)
  const [isSimCalling, setIsSimCalling] = useState(false)

  // 7. Configurações de Ordem de Atendimento, Regras de Fila & Reset de Senhas
  const [attendanceOrderMode, setAttendanceOrderMode] = useState<'PRIORITY' | 'INTERLEAVED'>('PRIORITY')
  const [allowManualQueueSelection, setAllowManualQueueSelection] = useState<boolean>(true)
  const [autoResetEnabled, setAutoResetEnabled] = useState<boolean>(true)
  const [autoResetTime, setAutoResetTime] = useState<string>('00:00')
  const [autoResetClearQueue, setAutoResetClearQueue] = useState<boolean>(false)
  const [lastManualResetAt, setLastManualResetAt] = useState<string | null>(null)
  const [isResettingTickets, setIsResettingTickets] = useState<boolean>(false)
  const [manualResetClearQueue, setManualResetClearQueue] = useState<boolean>(true)

  // Filtro de Sala para Mesas/Guichês
  const [locationRoomFilter, setLocationRoomFilter] = useState<string>('ALL')

  // 1. Formulário Unidade
  const [unitCode, setUnitCode] = useState('')
  const [unitName, setUnitName] = useState('')
  const [unitSubtitle, setUnitSubtitle] = useState('')
  const [unitLogoUrl, setUnitLogoUrl] = useState('')
  const [unitTimezone, setUnitTimezone] = useState('America/Sao_Paulo')
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 2. Formulário Andar
  const [floorName, setFloorName] = useState('')
  const [floorNumber, setFloorNumber] = useState(0)
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null)

  // 3. Formulário Sala
  const [roomName, setRoomName] = useState('')
  const [roomNumber, setRoomNumber] = useState('')
  const [roomFloorId, setRoomFloorId] = useState('')
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null)

  // 4. Formulário Mesa/Guichê
  const [locationType, setLocationType] = useState('Guichê')
  const [locationNumber, setLocationNumber] = useState(1)
  const [locationRoomId, setLocationRoomId] = useState('')
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null)

  // 5. Formulário Usuário
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [userRole, setUserRole] = useState<'ADMIN' | 'ATTENDANT' | 'TRIAGE'>('ATTENDANT')
  const [editingUserId, setEditingUserId] = useState<string | null>(null)

  // 6. Formulário Serviços & Atribuições (Sala ou Usuário)
  const [servicesList, setServicesList] = useState<any[]>([])
  const [serviceName, setServiceName] = useState('')
  const [servicePrefix, setServicePrefix] = useState('')
  const [serviceWeight, setServiceWeight] = useState(1)
  const [serviceAssignmentType, setServiceAssignmentType] = useState<'GLOBAL' | 'ROOM' | 'USER'>('GLOBAL')
  const [serviceRoomId, setServiceRoomId] = useState('')
  const [serviceUserId, setServiceUserId] = useState('')
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)

  // Carrega sessão e valida permissão exclusiva de ADMIN
  useEffect(() => {
    getSessionAction().then((u) => {
      if (!u) {
        router.push('/login?redirect=/admin')
      } else if (u.role !== 'ADMIN') {
        router.push(u.role === 'TRIAGE' ? '/triagem' : '/atendimento')
      } else {
        setCurrentUser(u)
      }
    })

    loadAllData()
  }, [])

  const loadAllData = async () => {
    const [uList, uUsers] = await Promise.all([getUnitsList(), getUsersList()])
    setUnits(uList)
    setUsersList(uUsers)

    if (uList.length > 0) {
      const activeId = selectedUnitId || uList[0].id
      setSelectedUnitId(activeId)
      loadUnitStructure(activeId)
    }
  }

  const loadUnitStructure = async (unitId: string) => {
    const [fList, rList, lList, sList, speechCfg, attendanceCfg] = await Promise.all([
      getFloorsByUnit(unitId),
      getRoomsByUnit(unitId),
      getLocationsWithDetails(unitId),
      getServicesByUnit(unitId),
      getUnitSpeechConfig(unitId),
      getUnitAttendanceConfig(unitId),
    ])
    setFloors(fList)
    setRooms(rList)
    setLocations(lList)
    setServicesList(sList)
    if (speechCfg) {
      const v = speechCfg.voice === 'pt-BR-ThalitaNeural' ? 'pt-BR-ThalitaMultilingualNeural' : (speechCfg.voice || 'pt-BR-FranciscaNeural')
      setSpeechVoice(v)
      setSpeechRate(speechCfg.rate || '+0%')
      setSpeechPitch(speechCfg.pitch || '+0Hz')
      setSpeechCallPrefix(speechCfg.callPrefix || 'Senha')
      setSpeechCallSuffix(speechCfg.callSuffix || 'Favor comparecer')
      setSpeechPauseDuration(speechCfg.pauseDuration || '300ms')
      setSpeechIncludeCustomerName(speechCfg.includeCustomerName ?? true)
      setSpeechLgpdMode(speechCfg.lgpdMode ?? false)
    }
    if (attendanceCfg) {
      setAttendanceOrderMode(attendanceCfg.defaultOrderMode)
      setAllowManualQueueSelection(attendanceCfg.allowManualQueueSelection)
      setAutoResetEnabled(attendanceCfg.autoResetEnabled ?? true)
      setAutoResetTime(attendanceCfg.autoResetTime || '00:00')
      setAutoResetClearQueue(attendanceCfg.autoResetClearQueue ?? false)
      setLastManualResetAt(attendanceCfg.lastManualResetAt || null)
    }
  }

  const handleUnitSelect = (id: string) => {
    setSelectedUnitId(id)
    loadUnitStructure(id)
  }

  // SERVIÇOS: Criar, Editar e Deletar
  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUnitId) return
    startTransition(async () => {
      try {
        const assignedRoomId = serviceAssignmentType === 'ROOM' ? (serviceRoomId || null) : null
        const assignedUserId = serviceAssignmentType === 'USER' ? (serviceUserId || null) : null

        if (editingServiceId) {
          await updateService(editingServiceId, {
            name: serviceName,
            prefix: servicePrefix,
            weight: serviceWeight,
            roomId: assignedRoomId,
            userId: assignedUserId,
          })
          setFeedback({ type: 'success', message: 'Serviço atualizado com sucesso!' })
        } else {
          await createService({
            unitId: selectedUnitId,
            name: serviceName,
            prefix: servicePrefix,
            weight: serviceWeight,
            roomId: assignedRoomId,
            userId: assignedUserId,
          })
          setFeedback({ type: 'success', message: 'Novo serviço cadastrado com sucesso!' })
        }

        setServiceName('')
        setServicePrefix('')
        setServiceWeight(1)
        setServiceAssignmentType('GLOBAL')
        setServiceRoomId('')
        setServiceUserId('')
        setEditingServiceId(null)
        loadUnitStructure(selectedUnitId)
      } catch (err) {
        setFeedback({ type: 'error', message: (err as Error).message })
      }
    })
  }

  const handleEditService = (s: any) => {
    setEditingServiceId(s.id)
    setServiceName(s.name)
    setServicePrefix(s.prefix)
    setServiceWeight(s.weight || 1)
    if (s.roomId) {
      setServiceAssignmentType('ROOM')
      setServiceRoomId(s.roomId)
      setServiceUserId('')
    } else if (s.userId) {
      setServiceAssignmentType('USER')
      setServiceUserId(s.userId)
      setServiceRoomId('')
    } else {
      setServiceAssignmentType('GLOBAL')
      setServiceRoomId('')
      setServiceUserId('')
    }
    setActiveTab('SERVICES')
  }

  const handleDeleteService = (id: string, name: string) => {
    if (!confirm(`Deseja realmente remover o serviço "${name}"?`)) return
    startTransition(async () => {
      try {
        await deleteService(id)
        setFeedback({ type: 'success', message: `Serviço "${name}" removido com sucesso!` })
        loadUnitStructure(selectedUnitId)
      } catch (err) {
        setFeedback({ type: 'error', message: (err as Error).message })
      }
    })
  }

  // 7. SALVAR CONFIGURAÇÃO DE ORDEM, FILA E RESET DE SENHAS
  const handleSaveAttendanceConfig = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUnitId) return
    startTransition(async () => {
      try {
        await saveUnitAttendanceConfig(selectedUnitId, {
          defaultOrderMode: attendanceOrderMode,
          allowManualQueueSelection,
          autoResetEnabled,
          autoResetTime,
          autoResetClearQueue,
        })
        setFeedback({
          type: 'success',
          message: 'Configurações de ordem de atendimento e regras da fila salvas com sucesso para a unidade!',
        })
        loadUnitStructure(selectedUnitId)
      } catch (err) {
        setFeedback({ type: 'error', message: (err as Error).message })
      }
    })
  }

  // RESET MANUAL IMEDIATO DE SENHAS
  const handleResetTicketCounter = () => {
    if (!selectedUnitId) return
    const msg = manualResetClearQueue
      ? 'Deseja realmente resetar os contadores de senhas para iniciar do 001 e arquivar as senhas que estão aguardando na fila de hoje?'
      : 'Deseja realmente resetar os contadores de senhas para iniciar do 001? (As senhas já emitidas na fila serão mantidas)'

    if (!confirm(msg)) return

    startTransition(async () => {
      setIsResettingTickets(true)
      try {
        const res = await resetUnitTicketCounter({
          unitId: selectedUnitId,
          clearWaitingQueue: manualResetClearQueue,
        })

        setLastManualResetAt(res.resetAt)
        setFeedback({
          type: 'success',
          message: `Numeração de senhas resetada com sucesso! A próxima senha começará em 001.${res.clearedCount > 0 ? ` (${res.clearedCount} senhas que estavam aguardando na fila foram arquivadas)` : ''}`,
        })
        loadUnitStructure(selectedUnitId)
      } catch (err) {
        setFeedback({ type: 'error', message: (err as Error).message })
      } finally {
        setIsResettingTickets(false)
      }
    })
  }

  // 6. CONFIGURAÇÃO DE VOZ E SIMULADOR
  const handleSaveSpeechConfig = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUnitId) return
    startTransition(async () => {
      try {
        await saveUnitSpeechConfig(selectedUnitId, {
          voice: speechVoice,
          rate: speechRate,
          pitch: speechPitch,
          callPrefix: speechCallPrefix,
          callSuffix: speechCallSuffix,
          pauseDuration: speechPauseDuration,
          includeCustomerName: speechIncludeCustomerName,
          lgpdMode: speechLgpdMode,
        })
        setFeedback({
          type: 'success',
          message: 'Configurações de fala e sintetizador neural salvas com sucesso para a unidade!',
        })
      } catch (err) {
        setFeedback({ type: 'error', message: (err as Error).message })
      }
    })
  }

  const handleTestSpeech = async () => {
    speechManager.unlockAudio()
    setIsSimCalling(true)
    try {
      const announcement = buildTicketAnnouncement(
        {
          ticketPrefix: simPrefix,
          ticketNumber: simNumber,
          formattedTicket: `${simPrefix}${simNumber.toString().padStart(3, '0')}`,
          locationName: simLocName,
          locationNumber: simLocNumber,
          customerName: simName,
          priorityName: simPrefix === 'SP' ? 'Prioritário' : 'Normal',
        },
        {
          voice: speechVoice,
          rate: speechRate,
          pitch: speechPitch,
          callPrefix: speechCallPrefix,
          callSuffix: speechCallSuffix,
          pauseDuration: speechPauseDuration,
          includeCustomerName: speechIncludeCustomerName,
          lgpdMode: speechLgpdMode,
        }
      )
      setSimPreviewText(announcement.plainText)
      speechManager.enqueue({
        text: announcement.plainText,
        ssml: announcement.ssml,
        voice: speechVoice,
        rate: speechRate,
        pitch: speechPitch,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setTimeout(() => setIsSimCalling(false), 2000)
    }
  }

  // UPLOAD DO BRASÃO/LOGO PARA public/logos
  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingLogo(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload-logo', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (res.ok && data.url) {
        setUnitLogoUrl(data.url)
        setFeedback({ type: 'success', message: 'Logo enviada e salva em public/logos com sucesso!' })
      } else {
        setFeedback({ type: 'error', message: data.error || 'Falha no upload do logo.' })
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erro ao fazer upload da imagem.' })
    } finally {
      setIsUploadingLogo(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // 1. SALVAR UNIDADE
  const handleSaveUnit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      try {
        if (editingUnitId) {
          await updateUnit(editingUnitId, {
            name: unitName,
            subtitle: unitSubtitle,
            logoUrl: unitLogoUrl,
            timezone: unitTimezone,
          })
          setFeedback({ type: 'success', message: 'Unidade atualizada com sucesso!' })
        } else {
          await createUnit({
            code: unitCode,
            name: unitName,
            subtitle: unitSubtitle,
            logoUrl: unitLogoUrl,
            timezone: unitTimezone,
          })
          setFeedback({ type: 'success', message: 'Nova unidade cadastrada com sucesso!' })
        }
        setUnitCode('')
        setUnitName('')
        setUnitSubtitle('')
        setUnitLogoUrl('')
        setUnitTimezone('America/Sao_Paulo')
        setEditingUnitId(null)
        loadAllData()
      } catch (err) {
        setFeedback({ type: 'error', message: (err as Error).message })
      }
    })
  }

  const handleEditUnit = (u: any) => {
    setEditingUnitId(u.id)
    setUnitCode(u.code)
    setUnitName(u.name)
    setUnitSubtitle(u.subtitle || '')
    setUnitLogoUrl(u.logoUrl || '')
    setUnitTimezone(u.timezone || 'America/Sao_Paulo')
    setActiveTab('UNITS')
  }

  // 2. ANDARES: Criar, Editar e Deletar
  const handleSaveFloor = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUnitId) return
    startTransition(async () => {
      try {
        if (editingFloorId) {
          await updateFloor(editingFloorId, { name: floorName, number: floorNumber })
          setFeedback({ type: 'success', message: 'Andar atualizado com sucesso!' })
        } else {
          await createFloor({ unitId: selectedUnitId, name: floorName, number: floorNumber })
          setFeedback({ type: 'success', message: 'Andar cadastrado com sucesso!' })
        }
        setFloorName('')
        setFloorNumber(0)
        setEditingFloorId(null)
        loadUnitStructure(selectedUnitId)
      } catch (err) {
        setFeedback({ type: 'error', message: (err as Error).message })
      }
    })
  }

  const handleEditFloor = (f: any) => {
    setEditingFloorId(f.id)
    setFloorName(f.name)
    setFloorNumber(f.number)
  }

  const handleDeleteFloor = (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir o andar "${name}"? As salas vinculadas passarão a ficar sem andar.`)) return
    startTransition(async () => {
      try {
        await deleteFloor(id)
        setFeedback({ type: 'success', message: `Andar "${name}" removido com sucesso!` })
        loadUnitStructure(selectedUnitId)
      } catch (err) {
        setFeedback({ type: 'error', message: (err as Error).message })
      }
    })
  }

  // 3. SALAS: Criar, Editar e Deletar
  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUnitId) return
    startTransition(async () => {
      try {
        if (editingRoomId) {
          await updateRoom(editingRoomId, {
            name: roomName,
            number: roomNumber || undefined,
            floorId: roomFloorId || undefined,
          })
          setFeedback({ type: 'success', message: 'Sala atualizada com sucesso!' })
        } else {
          await createRoom({
            unitId: selectedUnitId,
            floorId: roomFloorId || undefined,
            name: roomName,
            number: roomNumber || undefined,
          })
          setFeedback({ type: 'success', message: 'Sala cadastrada com sucesso!' })
        }
        setRoomName('')
        setRoomNumber('')
        setRoomFloorId('')
        setEditingRoomId(null)
        loadUnitStructure(selectedUnitId)
      } catch (err) {
        setFeedback({ type: 'error', message: (err as Error).message })
      }
    })
  }

  const handleEditRoom = (r: any) => {
    setEditingRoomId(r.id)
    setRoomName(r.name)
    setRoomNumber(r.number || '')
    setRoomFloorId(r.floorId || '')
  }

  const handleDeleteRoom = (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir a sala "${name}"? Os guichês/mesas vinculados perderão a associação.`)) return
    startTransition(async () => {
      try {
        await deleteRoom(id)
        setFeedback({ type: 'success', message: `Sala "${name}" removida com sucesso!` })
        loadUnitStructure(selectedUnitId)
      } catch (err) {
        setFeedback({ type: 'error', message: (err as Error).message })
      }
    })
  }

  // 4. MESAS / GUICHÊS: Criar, Editar, Deletar e Vincular
  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUnitId) return
    startTransition(async () => {
      try {
        if (editingLocationId) {
          await updateLocation(editingLocationId, {
            name: locationType,
            number: locationNumber,
            roomId: locationRoomId || undefined,
          })
          setFeedback({ type: 'success', message: `${locationType} atualizado com sucesso!` })
        } else {
          await createLocation({
            unitId: selectedUnitId,
            roomId: locationRoomId || undefined,
            name: locationType,
            number: locationNumber,
          })
          setFeedback({ type: 'success', message: `${locationType} cadastrado com sucesso!` })
        }
        setEditingLocationId(null)
        setLocationNumber((prev) => prev + 1)
        loadUnitStructure(selectedUnitId)
      } catch (err) {
        setFeedback({ type: 'error', message: (err as Error).message })
      }
    })
  }

  const handleEditLocation = (loc: any) => {
    setEditingLocationId(loc.id)
    setLocationType(loc.name)
    setLocationNumber(loc.number)
    setLocationRoomId(loc.roomId || '')
  }

  const handleDeleteLocation = (id: string, label: string) => {
    if (!confirm(`Deseja realmente excluir o posto "${label}"?`)) return
    startTransition(async () => {
      try {
        await deleteLocation(id)
        setFeedback({ type: 'success', message: `Posto "${label}" removido com sucesso!` })
        loadUnitStructure(selectedUnitId)
      } catch (err) {
        setFeedback({ type: 'error', message: (err as Error).message })
      }
    })
  }

  const handleBindUser = (locationId: string, userId: string) => {
    startTransition(async () => {
      try {
        await bindAttendantToLocation(locationId, userId ? userId : null)
        setFeedback({ type: 'success', message: 'Vínculo do atendente atualizado!' })
        loadUnitStructure(selectedUnitId)
      } catch (err) {
        setFeedback({ type: 'error', message: (err as Error).message })
      }
    })
  }

  // 5. USUÁRIOS: Criar, Editar e Deletar
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      try {
        if (editingUserId) {
          await updateUser(editingUserId, {
            name: userName,
            email: userEmail,
            role: userRole,
            password: userPassword || undefined,
          })
          setFeedback({ type: 'success', message: 'Usuário atualizado com sucesso!' })
        } else {
          if (!userPassword) {
            setFeedback({ type: 'error', message: 'A senha é obrigatória para novo usuário.' })
            return
          }
          await createUser({
            name: userName,
            email: userEmail,
            password: userPassword,
            role: userRole,
          })
          setFeedback({ type: 'success', message: 'Novo usuário cadastrado com sucesso!' })
        }
        setUserName('')
        setUserEmail('')
        setUserPassword('')
        setEditingUserId(null)
        loadAllData()
      } catch (err) {
        setFeedback({ type: 'error', message: (err as Error).message })
      }
    })
  }

  const handleEditUser = (u: any) => {
    setEditingUserId(u.id)
    setUserName(u.name)
    setUserEmail(u.email)
    setUserRole(u.role)
    setUserPassword('')
    setActiveTab('USERS')
  }

  const handleDeleteUser = (id: string, name: string) => {
    if (currentUser?.id === id) {
      alert('Você não pode excluir o seu próprio usuário logado.')
      return
    }
    if (!confirm(`Deseja realmente remover o usuário "${name}" do sistema?`)) return
    startTransition(async () => {
      try {
        await deleteUser(id)
        setFeedback({ type: 'success', message: `Usuário "${name}" removido com sucesso!` })
        loadAllData()
      } catch (err) {
        setFeedback({ type: 'error', message: (err as Error).message })
      }
    })
  }

  const handleLogout = async () => {
    await logoutAction()
    router.push('/login')
  }

  // Filtragem de locais pela sala selecionada
  const filteredLocations = locationRoomFilter === 'ALL'
    ? locations
    : locations.filter((loc) => loc.roomId === locationRoomFilter)

  const selectedUnit = units.find((u) => u.id === selectedUnitId)

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col p-6 md:p-8 admin-page-container transition-colors duration-200 relative overflow-hidden">
      {/* Luzes de Fundo Ambientais */}
      <div className="mesh-orb-cyan -top-24 -left-24 w-96 h-96 opacity-40 dark:opacity-30 pointer-events-none" />
      <div className="mesh-orb-indigo top-1/2 -right-24 w-[450px] h-[450px] opacity-35 dark:opacity-20 pointer-events-none" />
      <div className="mesh-orb-emerald -bottom-24 left-1/3 w-96 h-96 opacity-30 dark:opacity-20 pointer-events-none" />

      {/* Header do Painel de Administração */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800 gap-4 z-10">
        <div className="flex items-center space-x-4">
          <Link
            href="/"
            className="h-11 w-11 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-all flex items-center justify-center shrink-0 shadow-xs hover:scale-105"
            title="Voltar ao Hub"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Painel de Administração{' '}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 font-bold shadow-xs">
                Gestão Global
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Unidades, Brasões, Andares, Salas, Mesas/Guichês, Usuários e Voz Neural
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0 flex-wrap gap-y-2">
          {/* Unidade Selecionada no Header */}
          {selectedUnit && (
            <div className="hidden lg:flex items-center h-11 space-x-3 px-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-800 shadow-xs">
              {selectedUnit.logoUrl ? (
                <img
                  src={selectedUnit.logoUrl}
                  alt="Brasão"
                  className="w-7 h-7 object-contain rounded-lg bg-white/10 p-0.5 border border-slate-300 dark:border-slate-700/60"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 font-bold flex items-center justify-center text-xs">
                  {selectedUnit.code?.slice(0, 2) || 'UN'}
                </div>
              )}
              <div className="text-left leading-tight">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">{selectedUnit.name}</span>
                  <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 bg-slate-200/60 dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-800">
                    {selectedUnit.code}
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block max-w-[150px] truncate">{selectedUnit.subtitle || 'Unidade'}</span>
                  <span className="text-[10px] text-cyan-700 dark:text-cyan-300 font-mono flex items-center gap-1 bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/25">
                    <Globe className="w-2.5 h-2.5" />
                    {selectedUnit.timezone || 'America/Sao_Paulo'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Alternador de Tema Claro / Escuro (Admin) */}
          <AdminThemeToggle />

          {/* Administrador Logado */}
          {currentUser && (
            <div className="flex items-center h-11 space-x-3 bg-slate-100 dark:bg-slate-900/80 px-3.5 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-xs">
              <div className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left leading-tight">
                <span className="text-xs font-bold text-slate-900 dark:text-white block truncate max-w-[120px]">{currentUser.name}</span>
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">{currentUser.role}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors ml-1"
                title="Sair do Sistema"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Alerta de Feedback */}
      {feedback && (
        <div
          className={`mt-4 p-4 rounded-2xl border text-xs font-bold flex items-center justify-between animate-fade-in shadow-xs z-10 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/35 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs hover:underline">Fechar</button>
        </div>
      )}

      {/* Navegação por Abas com Estilo Elevado */}
      <div className="flex items-center space-x-2 my-6 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto z-10">
        <button
          onClick={() => setActiveTab('UNITS')}
          className={`h-11 flex items-center space-x-2 px-4 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
            activeTab === 'UNITS'
              ? 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 btn-boom'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-300 dark:hover:border-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>1. Unidades & Brasão</span>
        </button>

        <button
          onClick={() => setActiveTab('STRUCTURE')}
          className={`h-11 flex items-center space-x-2 px-4 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
            activeTab === 'STRUCTURE'
              ? 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 btn-boom'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-300 dark:hover:border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>2. Andares & Salas</span>
        </button>

        <button
          onClick={() => setActiveTab('LOCATIONS')}
          className={`h-11 flex items-center space-x-2 px-4 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
            activeTab === 'LOCATIONS'
              ? 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 btn-boom'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-300 dark:hover:border-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>3. Mesas & Guichês</span>
        </button>

        <button
          onClick={() => setActiveTab('SERVICES')}
          className={`h-11 flex items-center space-x-2 px-4 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
            activeTab === 'SERVICES'
              ? 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 btn-boom'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-300 dark:hover:border-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>4. Serviços & Atribuições</span>
        </button>

        <button
          onClick={() => setActiveTab('USERS')}
          className={`h-11 flex items-center space-x-2 px-4 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
            activeTab === 'USERS'
              ? 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 btn-boom'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-300 dark:hover:border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>5. Usuários & Acessos</span>
        </button>

        <button
          onClick={() => setActiveTab('SPEECH')}
          className={`h-11 flex items-center space-x-2 px-4 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
            activeTab === 'SPEECH'
              ? 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 btn-boom'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-300 dark:hover:border-slate-800'
          }`}
        >
          <Volume2 className="w-4 h-4" />
          <span>6. Voz Neural (Edge-TTS)</span>
        </button>

        <button
          onClick={() => setActiveTab('ATTENDANCE')}
          className={`h-11 flex items-center space-x-2 px-4 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
            activeTab === 'ATTENDANCE'
              ? 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 btn-boom'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-300 dark:hover:border-slate-800'
          }`}
        >
          <Shuffle className="w-4 h-4" />
          <span>7. Ordem de Atendimento & Fila</span>
        </button>
      </div>

      {/* ========================================================
          ABA 1: UNIDADES (NOME, SUBTÍTULO, UPLOAD / URL DE LOGO)
         ======================================================== */}
      {activeTab === 'UNITS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-400" />
              <span>{editingUnitId ? 'Editar Unidade' : 'Cadastrar Nova Unidade'}</span>
            </h3>

            <form onSubmit={handleSaveUnit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Código da Unidade (Ex: MATRIZ, POSTO01)
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingUnitId}
                  value={unitCode}
                  onChange={(e) => setUnitCode(e.target.value.toUpperCase())}
                  placeholder="MATRIZ"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-bold focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Nome da Unidade
                </label>
                <input
                  type="text"
                  required
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  placeholder="Ex: Unidade Central Matriz"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Subtítulo abaixo do Nome da Unidade
                </label>
                <input
                  type="text"
                  value={unitSubtitle}
                  onChange={(e) => setUnitSubtitle(e.target.value)}
                  placeholder="Ex: Centro de Atendimento Integrado ao Cidadão"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* FUSO HORÁRIO OFICIAL DA UNIDADE (TIMEZONE) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <span>Fuso Horário Oficial da Unidade (Timezone)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone
                        if (localTz) {
                          setUnitTimezone(localTz)
                          setFeedback({ type: 'success', message: `Fuso horário detectado: ${localTz}` })
                        }
                      } catch (err) {}
                    }}
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-bold"
                    title="Detectar fuso deste navegador"
                  >
                    <span>Detectar Fuso Deste Dispositivo</span>
                  </button>
                </div>

                <select
                  value={unitTimezone}
                  onChange={(e) => setUnitTimezone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium text-xs focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <optgroup label="Brasil (Fusos Oficiais)">
                    <option value="America/Sao_Paulo">America/Sao_Paulo (Brasília, SP, RJ, Sul, Nordeste - UTC-3)</option>
                    <option value="America/Manaus">America/Manaus (Amazonas, Rondônia, Roraima - UTC-4)</option>
                    <option value="America/Cuiaba">America/Cuiaba (Mato Grosso - UTC-4)</option>
                    <option value="America/Rio_Branco">America/Rio_Branco (Acre - UTC-5)</option>
                    <option value="America/Noronha">America/Noronha (Fernando de Noronha - UTC-2)</option>
                  </optgroup>
                  <optgroup label="Portugal & Europa">
                    <option value="Europe/Lisbon">Europe/Lisbon (Portugal Continental, Lisboa, Porto - UTC+0 / WET)</option>
                    <option value="Atlantic/Madeira">Atlantic/Madeira (Ilha da Madeira - UTC+0)</option>
                    <option value="Atlantic/Azores">Atlantic/Azores (Açores - UTC-1)</option>
                    <option value="Europe/Madrid">Europe/Madrid (Espanha / Madri - UTC+1)</option>
                    <option value="Europe/London">Europe/London (Reino Unido / Londres - UTC+0)</option>
                    <option value="Europe/Paris">Europe/Paris (França / Paris - UTC+1)</option>
                  </optgroup>
                  <optgroup label="África Lusófona">
                    <option value="Africa/Luanda">Africa/Luanda (Angola - UTC+1 / WAT)</option>
                    <option value="Africa/Maputo">Africa/Maputo (Moçambique - UTC+2 / CAT)</option>
                    <option value="Atlantic/Cape_Verde">Atlantic/Cape_Verde (Cabo Verde - UTC-1)</option>
                    <option value="Africa/Bissau">Africa/Bissau (Guiné-Bissau - UTC+0)</option>
                    <option value="Africa/Sao_Tome">Africa/Sao_Tome (São Tomé e Príncipe - UTC+0)</option>
                  </optgroup>
                  <optgroup label="Américas & Internacional">
                    <option value="America/New_York">America/New_York (EUA Leste, Nova York, Flórida - UTC-5)</option>
                    <option value="America/Chicago">America/Chicago (EUA Central - UTC-6)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (EUA Pacífico, Califórnia - UTC-8)</option>
                    <option value="America/Buenos_Aires">America/Buenos_Aires (Argentina / Buenos Aires - UTC-3)</option>
                    <option value="America/Montevideo">America/Montevideo (Uruguai / Montevidéu - UTC-3)</option>
                    <option value="America/Santiago">America/Santiago (Chile / Santiago - UTC-4 / UTC-3)</option>
                    <option value="UTC">UTC (Coordinated Universal Time - UTC+0)</option>
                  </optgroup>
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Define a hora oficial da TV, a virada de expediente (reset de senhas) e os relatórios diários desta unidade.
                </span>
              </div>

              {/* UPLOAD / URL DE LOGO/BRASÃO */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Logo / Brasão da Unidade (Arquivo ou URL)
                </label>

                {/* Input de Arquivo */}
                <div className="flex items-center space-x-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileUpload}
                    className="hidden"
                    id="logo-file-input"
                  />
                  <label
                    htmlFor="logo-file-input"
                    className={`flex-1 py-3 px-4 rounded-xl border border-dashed border-cyan-500/50 bg-cyan-950/20 hover:bg-cyan-950/40 text-cyan-300 font-semibold text-xs flex items-center justify-center space-x-2 cursor-pointer transition-colors ${
                      isUploadingLogo ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <UploadCloud className="w-4 h-4 text-cyan-400" />
                    <span>{isUploadingLogo ? 'Salvando na pasta public/logos...' : 'Escolher Arquivo do Computador'}</span>
                  </label>
                </div>

                {/* Input de URL alternativo */}
                <div className="relative">
                  <ImageIcon className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
                  <input
                    type="text"
                    value={unitLogoUrl}
                    onChange={(e) => setUnitLogoUrl(e.target.value)}
                    placeholder="Ou cole a URL da imagem (ex: /logos/meu_brasao.png ou https://...)"
                    className="w-full pl-11 pr-8 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
                  />
                  {unitLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setUnitLogoUrl('')}
                      className="absolute right-3 top-3 text-slate-400 hover:text-white"
                      title="Remover logo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Prévia do Brasão */}
                {unitLogoUrl && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center space-x-3">
                    <img
                      src={unitLogoUrl}
                      alt="Prévia do Brasão"
                      className="w-12 h-12 object-contain rounded-lg bg-white/5 border border-white/10 p-1"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                    <div className="text-xs">
                      <span className="font-bold text-white block">Pré-visualização do Brasão</span>
                      <span className="text-[11px] text-cyan-400 font-mono truncate max-w-[240px] block">
                        {unitLogoUrl}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/25 btn-boom"
                >
                  {editingUnitId ? 'Salvar Alterações' : 'Cadastrar Unidade'}
                </button>
                {editingUnitId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUnitId(null)
                      setUnitCode('')
                      setUnitName('')
                      setUnitSubtitle('')
                      setUnitLogoUrl('')
                      setUnitTimezone('America/Sao_Paulo')
                    }}
                    className="px-4 py-3.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Lista de Unidades */}
          <div className="lg:col-span-7 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col">
            <h3 className="text-lg font-bold text-white mb-4">Unidades Registradas no Sistema</h3>
            <div className="space-y-3 overflow-y-auto">
              {units.map((u) => (
                <div
                  key={u.id}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                    selectedUnitId === u.id
                      ? 'border-cyan-500/60 bg-cyan-950/20'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {u.logoUrl ? (
                      <img src={u.logoUrl} alt="Logo" className="w-12 h-12 object-contain rounded-xl bg-white/5 border border-white/10 p-1" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-800 text-cyan-400 flex items-center justify-center font-bold">
                        {u.code.slice(0, 2)}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-base">{u.name}</span>
                        <span className="font-mono text-xs text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {u.code}
                        </span>
                      </div>
                      {u.subtitle && (
                        <p className="text-xs text-slate-400 mt-0.5">{u.subtitle}</p>
                      )}
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-cyan-300 border border-slate-800 font-mono flex items-center gap-1">
                          <Globe className="w-2.5 h-2.5" />
                          {u.timezone || 'America/Sao_Paulo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleUnitSelect(u.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                        selectedUnitId === u.id
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      {selectedUnitId === u.id ? 'Selecionada' : 'Selecionar'}
                    </button>
                    <button
                      onClick={() => handleEditUnit(u)}
                      className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                      title="Editar Unidade"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          ABA 2: ANDARES & SALAS (EDIÇÃO E REMOÇÃO COMPLETAS)
         ======================================================== */}
      {activeTab === 'STRUCTURE' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Formulários de Andar e Sala */}
          <div className="lg:col-span-5 space-y-6">
            {/* Form Andar */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-base font-bold text-white mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cyan-400" />
                  <span>{editingFloorId ? 'Editar Andar' : 'Cadastrar Andar'}</span>
                </span>
                {editingFloorId && (
                  <button
                    onClick={() => {
                      setEditingFloorId(null)
                      setFloorName('')
                      setFloorNumber(0)
                    }}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                )}
              </h3>

              <form onSubmit={handleSaveFloor} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Nome do Andar
                  </label>
                  <input
                    type="text"
                    required
                    value={floorName}
                    onChange={(e) => setFloorName(e.target.value)}
                    placeholder="Ex: 2º Andar, Térreo"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Número de Ordenação (0 = Térreo, 1 = 1º Andar...)
                  </label>
                  <input
                    type="number"
                    required
                    value={floorNumber}
                    onChange={(e) => setFloorNumber(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/25 btn-boom"
                >
                  {editingFloorId ? 'Salvar Andar' : 'Cadastrar Andar'}
                </button>
              </form>
            </div>

            {/* Form Sala */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-base font-bold text-white mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <DoorOpen className="w-5 h-5 text-emerald-400" />
                  <span>{editingRoomId ? 'Editar Sala' : 'Cadastrar Sala'}</span>
                </span>
                {editingRoomId && (
                  <button
                    onClick={() => {
                      setEditingRoomId(null)
                      setRoomName('')
                      setRoomNumber('')
                      setRoomFloorId('')
                    }}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                )}
              </h3>

              <form onSubmit={handleSaveRoom} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Andar Pertencente
                  </label>
                  <select
                    value={roomFloorId}
                    onChange={(e) => setRoomFloorId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Sem Andar Definido</option>
                    {floors.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} (Ordem: {f.number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Nome da Sala
                  </label>
                  <input
                    type="text"
                    required
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Ex: Consultório 01, Sala de Triagem"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Número / Identificador da Sala
                  </label>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="Ex: 101 ou Sala B"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/25 btn-boom"
                >
                  {editingRoomId ? 'Salvar Sala' : 'Cadastrar Sala'}
                </button>
              </form>
            </div>
          </div>

          {/* Listagem com Botões de Editar e Excluir */}
          <div className="lg:col-span-7 space-y-6">
            {/* Lista de Andares */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-base font-bold text-white mb-3 flex items-center justify-between">
                <span>Andares Registrados ({floors.length})</span>
              </h3>
              <div className="space-y-2">
                {floors.map((f) => (
                  <div key={f.id} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-sm">{f.name}</span>
                      <span className="text-xs text-slate-400 ml-2 font-mono">(Ordem: {f.number})</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleEditFloor(f)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-300"
                        title="Editar Andar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteFloor(f.id, f.name)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-rose-400"
                        title="Excluir Andar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lista de Salas */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-base font-bold text-white mb-3 flex items-center justify-between">
                <span>Salas da Unidade ({rooms.length})</span>
              </h3>
              <div className="space-y-3">
                {rooms.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">Nenhuma sala cadastrada.</p>
                ) : (
                  rooms.map((r) => (
                    <div key={r.id} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-base">{r.name}</span>
                          {r.number && (
                            <span className="font-mono text-xs text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              Nº {r.number}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                          <Layers className="w-3.5 h-3.5 text-slate-500" />
                          <span>Andar: {r.floorName || 'Térreo / Geral'}</span>
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditRoom(r)}
                          className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-cyan-300"
                          title="Editar Sala"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(r.id, r.name)}
                          className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-rose-400"
                          title="Excluir Sala"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          ABA 3: MESAS & GUICHÊS (FILTRO POR SALA, EDIÇÃO E EXCLUSÃO)
         ======================================================== */}
      {activeTab === 'LOCATIONS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Formulário de Criação/Edição */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-cyan-400" />
                <span>{editingLocationId ? 'Editar Mesa / Guichê' : 'Cadastrar Mesa ou Guichê'}</span>
              </span>
              {editingLocationId && (
                <button
                  onClick={() => {
                    setEditingLocationId(null)
                    setLocationType('Guichê')
                    setLocationNumber(1)
                    setLocationRoomId('')
                  }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
              )}
            </h3>

            <form onSubmit={handleSaveLocation} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Sala de Localização
                </label>
                <select
                  value={locationRoomId}
                  onChange={(e) => {
                    setLocationRoomId(e.target.value)
                    if (e.target.value) {
                      setLocationRoomFilter(e.target.value) // Sincroniza filtro
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Sem Sala Específica</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.floorName || 'Geral'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Tipo de Posto
                  </label>
                  <select
                    value={locationType}
                    onChange={(e) => setLocationType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Guichê">Guichê</option>
                    <option value="Mesa">Mesa</option>
                    <option value="Consultório">Consultório</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Número do Posto
                  </label>
                  <input
                    type="number"
                    required
                    value={locationNumber}
                    onChange={(e) => setLocationNumber(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/25 btn-boom"
              >
                {editingLocationId ? 'Salvar Alterações' : 'Cadastrar Posto'}
              </button>
            </form>
          </div>

          {/* Listagem com Filtro Dinâmico por Sala */}
          <div className="lg:col-span-7 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-800 gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">Mesas e Guichês na Unidade</h3>
                <p className="text-xs text-slate-400">
                  Exibindo {filteredLocations.length} postos
                </p>
              </div>

              {/* FILTRO POR SALA DE LOCALIZAÇÃO */}
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-cyan-400 shrink-0" />
                <select
                  value={locationRoomFilter}
                  onChange={(e) => setLocationRoomFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">Todas as Salas</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[550px]">
              {filteredLocations.length === 0 ? (
                <div className="text-center p-8 text-slate-500 space-y-1">
                  <p className="text-sm">Nenhum guichê ou mesa encontrado para esta sala.</p>
                  <button onClick={() => setLocationRoomFilter('ALL')} className="text-xs text-cyan-400 hover:underline">
                    Ver todas as salas
                  </button>
                </div>
              ) : (
                filteredLocations.map((loc) => (
                  <div key={loc.id} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-lg text-white">
                          {loc.name} {loc.number.toString().padStart(2, '0')}
                        </span>
                        {loc.roomName && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                            {loc.roomName}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 mt-1 block">
                        Operador: {loc.currentUserName ? <strong className="text-cyan-400">{loc.currentUserName}</strong> : <span className="text-slate-500">Nenhum</span>}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <select
                        value={loc.currentUserId || ''}
                        onChange={(e) => handleBindUser(loc.id, e.target.value)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="">Vincular Atendente...</option>
                        {usersList.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role})
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleEditLocation(loc)}
                        className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-cyan-300"
                        title="Editar Posto"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteLocation(loc.id, `${loc.name} ${loc.number}`)}
                        className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-rose-400"
                        title="Excluir Posto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          ABA 4: SERVIÇOS & ATRIBUIÇÕES (SALA / SETOR OU USUÁRIO)
         ======================================================== */}
      {activeTab === 'SERVICES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Formulário de Criação/Edição de Serviço */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-cyan-400" />
                <span>{editingServiceId ? 'Editar Serviço' : 'Cadastrar Novo Serviço'}</span>
              </span>
              {editingServiceId && (
                <button
                  onClick={() => {
                    setEditingServiceId(null)
                    setServiceName('')
                    setServicePrefix('')
                    setServiceWeight(1)
                    setServiceAssignmentType('GLOBAL')
                    setServiceRoomId('')
                    setServiceUserId('')
                  }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
              )}
            </h3>

            <form onSubmit={handleSaveService} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Nome do Serviço
                </label>
                <input
                  type="text"
                  required
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Ex: Emissão de RG / Carteira de Identidade"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Prefixo da Senha
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={servicePrefix}
                    onChange={(e) => setServicePrefix(e.target.value.toUpperCase())}
                    placeholder="Ex: RG, SEG"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-bold uppercase focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Até 4 letras maiúsculas</span>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Peso na Fila (1 a 5)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    required
                    value={serviceWeight}
                    onChange={(e) => setServiceWeight(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">1 = normal, 5 = prioritário</span>
                </div>
              </div>

              {/* VINCULAÇÃO DO SERVIÇO */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-cyan-400 block">
                  Disponibilidade & Vinculação
                </label>

                <div className="space-y-2">
                  <label className="flex items-center space-x-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-slate-700">
                    <input
                      type="radio"
                      name="serviceAssignment"
                      checked={serviceAssignmentType === 'GLOBAL'}
                      onChange={() => setServiceAssignmentType('GLOBAL')}
                      className="text-cyan-500 focus:ring-cyan-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">Global (Toda a Unidade)</span>
                      <span className="text-[11px] text-slate-400">Disponível para qualquer atendente da unidade</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-slate-700">
                    <input
                      type="radio"
                      name="serviceAssignment"
                      checked={serviceAssignmentType === 'ROOM'}
                      onChange={() => setServiceAssignmentType('ROOM')}
                      className="text-cyan-500 focus:ring-cyan-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">Vinculado a uma Sala / Setor</span>
                      <span className="text-[11px] text-slate-400">Disponível para todos os atendentes desta sala</span>
                    </div>
                  </label>

                  {serviceAssignmentType === 'ROOM' && (
                    <div className="pl-6 pt-1 animate-fade-in">
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Selecione a Sala / Setor
                      </label>
                      <select
                        required={serviceAssignmentType === 'ROOM'}
                        value={serviceRoomId}
                        onChange={(e) => setServiceRoomId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="">Selecione uma sala...</option>
                        {rooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} {r.floorName ? `(${r.floorName})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <label className="flex items-center space-x-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-slate-700">
                    <input
                      type="radio"
                      name="serviceAssignment"
                      checked={serviceAssignmentType === 'USER'}
                      onChange={() => setServiceAssignmentType('USER')}
                      className="text-cyan-500 focus:ring-cyan-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">Vinculado a um Usuário Específico</span>
                      <span className="text-[11px] text-slate-400">Disponível exclusivamente para este operador</span>
                    </div>
                  </label>

                  {serviceAssignmentType === 'USER' && (
                    <div className="pl-6 pt-1 animate-fade-in">
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Selecione o Usuário
                      </label>
                      <select
                        required={serviceAssignmentType === 'USER'}
                        value={serviceUserId}
                        onChange={(e) => setServiceUserId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="">Selecione um usuário...</option>
                        {usersList.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.email} - {u.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/25 btn-boom"
              >
                {editingServiceId ? 'Salvar Alterações' : 'Cadastrar Serviço'}
              </button>
            </form>
          </div>

          {/* Listagem de Serviços */}
          <div className="lg:col-span-7 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Serviços Cadastrados</h3>
                <p className="text-xs text-slate-400">
                  Gerenciamento de serviços e atribuições da unidade ({servicesList.length} cadastrados)
                </p>
              </div>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[550px]">
              {servicesList.length === 0 ? (
                <div className="text-center p-8 text-slate-500">
                  <p className="text-sm">Nenhum serviço cadastrado para esta unidade.</p>
                </div>
              ) : (
                servicesList.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-sm px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {s.prefix}
                        </span>
                        <span className="font-bold text-base text-white">{s.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          (Peso {s.weight || 1})
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {s.roomName ? (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                            <DoorOpen className="w-3 h-3" />
                            Sala: {s.roomName}
                          </span>
                        ) : s.userName ? (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Usuário: {s.userName}
                          </span>
                        ) : (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Global (Toda a Unidade)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditService(s)}
                        className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-cyan-300"
                        title="Editar Serviço"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteService(s.id, s.name)}
                        className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-rose-400"
                        title="Excluir Serviço"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          ABA 5: USUÁRIOS (EDIÇÃO, REDEFINIÇÃO DE SENHA E EXCLUSÃO)
         ======================================================== */}
      {activeTab === 'USERS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Formulário de Criação/Edição de Usuário */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <span>{editingUserId ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}</span>
              </span>
              {editingUserId && (
                <button
                  onClick={() => {
                    setEditingUserId(null)
                    setUserName('')
                    setUserEmail('')
                    setUserPassword('')
                  }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
              )}
            </h3>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Ex: Carlos Oliveira"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  E-mail de Acesso
                </label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="carlos.oliveira@orgao.gov.br"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  {editingUserId ? 'Nova Senha (Deixe em branco para manter a atual)' : 'Senha de Acesso'}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
                  <input
                    type="password"
                    required={!editingUserId}
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Perfil de Acesso
                </label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium focus:outline-none focus:border-cyan-500"
                >
                  <option value="ATTENDANT">Atendente de Guichê / Mesa</option>
                  <option value="TRIAGE">Operador de Triagem / Recepção</option>
                  <option value="ADMIN">Administrador Geral do Sistema</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/25 btn-boom"
              >
                {editingUserId ? 'Salvar Usuário' : 'Cadastrar Usuário'}
              </button>
            </form>
          </div>

          {/* Listagem de Usuários */}
          <div className="lg:col-span-7 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col">
            <h3 className="text-lg font-bold text-white mb-4">Usuários Cadastrados no Sistema ({usersList.length})</h3>
            <div className="space-y-3 overflow-y-auto max-h-[550px]">
              {usersList.map((u) => (
                <div key={u.id} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-cyan-400 flex items-center justify-center font-bold">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-white text-sm block">{u.name}</span>
                      <span className="text-xs text-slate-400">{u.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                        u.role === 'ADMIN'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {u.role}
                    </span>

                    <button
                      onClick={() => handleEditUser(u)}
                      className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-cyan-300"
                      title="Editar Usuário"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteUser(u.id, u.name)}
                      disabled={currentUser?.id === u.id}
                      className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-rose-400 disabled:opacity-30 disabled:pointer-events-none"
                      title={currentUser?.id === u.id ? 'Você está logado nesta conta' : 'Excluir Usuário'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          ABA 5: CONFIGURAÇÕES DE VOZ (EDGE-TTS) & SIMULADOR
         ======================================================== */}
      {activeTab === 'SPEECH' && (
        <div className="space-y-6">
          {/* Seletor de Unidade e Descrição */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <Volume2 className="w-6 h-6 text-cyan-400" />
                <h3 className="text-xl font-bold text-white">
                  Configurações e Naturalização da Fala (Microsoft Edge-TTS)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Personalize a voz neural, velocidade, tom, prefixo de chamada e regras de privacidade LGPD para a unidade.
              </p>
            </div>

            <div className="flex items-center space-x-3 bg-slate-950 px-4 py-2.5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Unidade:</span>
              <select
                value={selectedUnitId}
                onChange={(e) => handleUnitSelect(e.target.value)}
                className="bg-transparent text-cyan-300 text-xs font-bold focus:outline-none"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Coluna Esquerda: Formulário de Configuração da Fala */}
            <form onSubmit={handleSaveSpeechConfig} className="lg:col-span-7 space-y-6">
              {/* Bloco 1: Seleção de Voz */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                    1. Voz Neural da Síntese (Microsoft Edge-TTS)
                  </label>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">
                    Alta Fidelidade Microsoft Neural
                  </span>
                </div>

                <select
                  value={speechVoice}
                  onChange={(e) => setSpeechVoice(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium focus:outline-none focus:border-cyan-500"
                >
                  <optgroup label="Português do Brasil (pt-BR)">
                    <option value="pt-BR-FranciscaNeural">Francisca Neural (Feminina • Padrão e Suave • Recomendada)</option>
                    <option value="pt-BR-AntonioNeural">Antonio Neural (Masculina • Formal e Clara • Recomendada)</option>
                    <option value="pt-BR-ThalitaMultilingualNeural">Thalita Multilingual Neural (Feminina • Jovem e Expressiva)</option>
                  </optgroup>
                  <optgroup label="Português de Portugal (pt-PT)">
                    <option value="pt-PT-RaquelNeural">Raquel Neural (Feminina • Clara e Natural)</option>
                  </optgroup>
                </select>
              </div>

              {/* Bloco 2: Cadência, Velocidade e Tom */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  2. Ajustes de Cadência, Velocidade e Tom
                </label>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Velocidade / Rate */}
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block mb-1">
                      Velocidade da Fala
                    </span>
                    <select
                      value={speechRate}
                      onChange={(e) => setSpeechRate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="-20%">-20% (Muito Lenta)</option>
                      <option value="-10%">-10% (Lenta)</option>
                      <option value="+0%">+0% (Padrão Natural)</option>
                      <option value="+10%">+10% (Rápida)</option>
                      <option value="+20%">+20% (Muito Rápida)</option>
                    </select>
                  </div>

                  {/* Tom / Pitch */}
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block mb-1">
                      Tom da Voz (Pitch)
                    </span>
                    <select
                      value={speechPitch}
                      onChange={(e) => setSpeechPitch(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="-20Hz">-20Hz (Grave)</option>
                      <option value="-10Hz">-10Hz (Grave Suave)</option>
                      <option value="+0Hz">+0Hz (Tom Natural)</option>
                      <option value="+10Hz">+10Hz (Agudo Suave)</option>
                      <option value="+20Hz">+20Hz (Agudo)</option>
                    </select>
                  </div>

                  {/* Pausa */}
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block mb-1">
                      Pausa Senha ➔ Local
                    </span>
                    <select
                      value={speechPauseDuration}
                      onChange={(e) => setSpeechPauseDuration(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="150ms">150ms (Breve)</option>
                      <option value="300ms">300ms (Padrão)</option>
                      <option value="450ms">450ms (Moderada)</option>
                      <option value="600ms">600ms (Longa)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Bloco 3: Padrão de Frase (Prefixo e Sufixo) */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  3. Padrão de Frase e Vocabulário
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block mb-1">
                      Prefixo de Chamada
                    </span>
                    <input
                      type="text"
                      value={speechCallPrefix}
                      onChange={(e) => setSpeechCallPrefix(e.target.value)}
                      placeholder="Ex: Senha, Atenção: Senha, Chamando senha"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium"
                    />
                    <div className="flex gap-1.5 mt-2">
                      {['Senha', 'Atenção: Senha', 'Chamando senha'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setSpeechCallPrefix(p)}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-slate-400 block mb-1">
                      Sufixo / Encaminhamento
                    </span>
                    <input
                      type="text"
                      value={speechCallSuffix}
                      onChange={(e) => setSpeechCallSuffix(e.target.value)}
                      placeholder="Ex: Favor comparecer, Dirija-se, Por gentileza"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium"
                    />
                    <div className="flex gap-1.5 mt-2">
                      {['Favor comparecer', 'Dirija-se', 'Por gentileza, dirija-se'].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSpeechCallSuffix(s)}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloco 4: Privacidade e LGPD */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  4. Privacidade do Cidadão e Regras LGPD
                </label>

                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={speechIncludeCustomerName}
                      onChange={(e) => setSpeechIncludeCustomerName(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-0 bg-slate-900 border-slate-700"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Pronunciar o Nome do Cidadão na Chamada
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Quando ativo, fala o nome cadastrado no totem de triagem antes da senha.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={speechLgpdMode}
                      onChange={(e) => setSpeechLgpdMode(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-0 bg-slate-900 border-slate-700"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Modo LGPD: Anonimizar com Inicial do Sobrenome
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Proteção de dados: &quot;Maria da Silva Santos&quot; será pronunciado como &quot;Maria S.&quot;.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Botão Salvar Configurações */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/25 active:scale-[0.99] btn-boom"
              >
                Salvar Configurações de Voz da Unidade
              </button>
            </form>

            {/* Coluna Direita: Simulador ao Vivo da Fala */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  <h4 className="text-base font-bold text-white">
                    Simulador da Naturalização da Fala
                  </h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Teste em tempo real como o mecanismo de síntese fonética inteligente pronunciará as senhas no painel da TV.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Nome do Cidadão para Teste
                    </label>
                    <input
                      type="text"
                      value={simName}
                      onChange={(e) => setSimName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Prefixo
                      </label>
                      <input
                        type="text"
                        value={simPrefix}
                        onChange={(e) => setSimPrefix(e.target.value.toUpperCase())}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Número
                      </label>
                      <input
                        type="number"
                        value={simNumber}
                        onChange={(e) => setSimNumber(Number(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Posto / Local
                      </label>
                      <select
                        value={simLocName}
                        onChange={(e) => setSimLocName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Guichê">Guichê</option>
                        <option value="Mesa">Mesa</option>
                        <option value="Consultório">Consultório</option>
                        <option value="Sala">Sala</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Número do Posto
                      </label>
                      <input
                        type="number"
                        value={simLocNumber}
                        onChange={(e) => setSimLocNumber(Number(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Prévia da Fala Calculada */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">
                    Texto Naturalizado Resultante:
                  </span>
                  <p className="text-xs text-slate-300 font-medium italic">
                    &quot;{
                      buildTicketAnnouncement(
                        {
                          ticketPrefix: simPrefix,
                          ticketNumber: simNumber,
                          formattedTicket: `${simPrefix}${simNumber.toString().padStart(3, '0')}`,
                          locationName: simLocName,
                          locationNumber: simLocNumber,
                          customerName: simName,
                          priorityName: simPrefix === 'SP' ? 'Prioritário' : 'Normal',
                        },
                        {
                          voice: speechVoice,
                          rate: speechRate,
                          pitch: speechPitch,
                          callPrefix: speechCallPrefix,
                          callSuffix: speechCallSuffix,
                          pauseDuration: speechPauseDuration,
                          includeCustomerName: speechIncludeCustomerName,
                          lgpdMode: speechLgpdMode,
                        }
                      ).plainText
                    }&quot;
                  </p>
                </div>

                {/* Botão Ouvir Chamada com Chime + Edge-TTS */}
                <button
                  type="button"
                  onClick={handleTestSpeech}
                  disabled={isSimCalling}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-md shadow-cyan-500/25 active:scale-[0.99] disabled:opacity-50 btn-boom"
                >
                  <Volume2 className="w-5 h-5" />
                  <span>{isSimCalling ? 'Reproduzindo Áudio...' : 'Ouvir Chamada com Chime + Voz'}</span>
                </button>
              </div>

              {/* Informações Técnicas do Motor de Síntese */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-2">
                <span className="font-bold text-slate-300 block">Como funciona a reprodução:</span>
                <p>1. Quando um guichê chama a senha, o servidor gera o anúncio com as regras desta unidade.</p>
                <p>2. O evento é transmitido instantaneamente para a TV via Redis SSE.</p>
                <p>3. O painel toca o sino/chime e sintetiza a fala com a entonação configurada.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          ABA 6: ORDEM DE ATENDIMENTO & REGRAS DE FILA
         ======================================================== */}
      {activeTab === 'ATTENDANCE' && (
        <div className="space-y-6">
          {/* Seletor de Unidade */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Shuffle className="w-5 h-5 text-cyan-400" />
                <span>Ordem de Atendimento & Regras da Fila</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure se os atendentes chamam por prioridade máxima, intercalado (1:1:1) ou chamada avulsa na Fila de Espera.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Unidade:</span>
              <select
                value={selectedUnitId}
                onChange={(e) => handleUnitSelect(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-cyan-300 font-bold text-xs focus:outline-none focus:border-cyan-500"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Coluna Esquerda: Formulário de Configuração (7 Colunas) */}
            <div className="lg:col-span-7 space-y-6">
              <form onSubmit={handleSaveAttendanceConfig} className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
                {/* 1. Modo de Ordenação Padrão */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <ListOrdered className="w-4 h-4 text-cyan-400" />
                      <span>1. Modo de Chamada Padrão da Fila</span>
                    </label>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                      Ordem Geral
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Opção Prioridade Estrita */}
                    <div
                      onClick={() => setAttendanceOrderMode('PRIORITY')}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        attendanceOrderMode === 'PRIORITY'
                          ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                            attendanceOrderMode === 'PRIORITY' ? 'border-cyan-400 bg-cyan-400' : 'border-slate-600'
                          }`}>
                            {attendanceOrderMode === 'PRIORITY' && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                          </span>
                          Prioridade Estrita
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          Padrão Legal
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                        Senhas de maior prioridade são sempre atendidas primeiro. A fila convencional aguarda o término das prioritárias.
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold">
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">1º Urgência</span>
                        <span className="text-slate-600">➔</span>
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">2º Prioritário</span>
                        <span className="text-slate-600">➔</span>
                        <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300">3º Normal</span>
                      </div>
                    </div>

                    {/* Opção Intercalada 1:1:1 */}
                    <div
                      onClick={() => setAttendanceOrderMode('INTERLEAVED')}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        attendanceOrderMode === 'INTERLEAVED'
                          ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-500/10 ring-1 ring-amber-500'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                            attendanceOrderMode === 'INTERLEAVED' ? 'border-amber-400 bg-amber-400' : 'border-slate-600'
                          }`}>
                            {attendanceOrderMode === 'INTERLEAVED' && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                          </span>
                          Intercalado (1:1:1)
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                          Ciclo Dinâmico
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                        Alterna sequencialmente entre as categorias para não reter o fluxo convencional em dias de alto afluxo.
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold">
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">1 Urg.</span>
                        <span className="text-slate-600">➔</span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">1 Prior.</span>
                        <span className="text-slate-600">➔</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">1 Norm.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Permissões de Operação do Atendente */}
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span>2. Permissões Concedidas aos Atendentes no Guichê</span>
                  </label>

                  {/* Permissão: Chamada Avulsa de Qualquer Senha da Fila de Espera */}
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-white block">
                        Permitir ao atendente chamar qualquer senha avulsa da &quot;FILA DE ESPERA&quot;
                      </span>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Habilita o botão &quot;Chamar&quot; ao lado de cada ficha na lista lateral de espera no painel do operador (<code className="text-cyan-400 font-mono text-[10px]">/atendimento</code>). Permite que o atendente atenda qualquer cidadão fora da ordem padrão (ex: retorno de exame, dúvida rápida ou direcionamento).
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={allowManualQueueSelection}
                        onChange={(e) => setAllowManualQueueSelection(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                </div>

                {/* 3. Reset Automático de Numeração por Horário Configurado */}
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span>3. Reset Automático da Numeração de Senhas</span>
                    </label>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                      Virada do Expediente
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-white block">
                          Resetar números de senhas automaticamente todos os dias
                        </span>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Ao atingir o horário definido, o sistema inicia um novo ciclo com contagem a partir de <strong className="text-cyan-400 font-mono">001</strong> para todos os serviços.
                        </p>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                        <input
                          type="checkbox"
                          checked={autoResetEnabled}
                          onChange={(e) => setAutoResetEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                      </label>
                    </div>

                    {autoResetEnabled && (
                      <div className="space-y-3 pt-3 border-t border-slate-800/80 animate-fade-in">
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Horário de Reset Automático (Início da Contagem do 001)
                          </label>
                          <div className="flex items-center space-x-3">
                            <input
                              type="time"
                              value={autoResetTime}
                              onChange={(e) => setAutoResetTime(e.target.value)}
                              className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 font-mono font-bold text-sm focus:outline-none focus:border-cyan-500"
                            />
                            <span className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
                              <Globe className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Fuso da unidade: <strong className="text-cyan-300 font-mono">{selectedUnit?.timezone || 'America/Sao_Paulo'}</strong></span>
                            </span>
                          </div>
                        </div>

                        {/* Atalhos Rápidos de Horário */}
                        <div className="flex items-center gap-2 flex-wrap pt-1">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Atalhos:</span>
                          <button
                            type="button"
                            onClick={() => setAutoResetTime('00:00')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              autoResetTime === '00:00'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            00:00 (Meia-noite)
                          </button>
                          <button
                            type="button"
                            onClick={() => setAutoResetTime('06:00')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              autoResetTime === '06:00'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            06:00 (Abertura Matutina)
                          </button>
                          <button
                            type="button"
                            onClick={() => setAutoResetTime('07:00')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              autoResetTime === '07:00'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            07:00 (Início do Expediente)
                          </button>
                          <button
                            type="button"
                            onClick={() => setAutoResetTime('08:00')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              autoResetTime === '08:00'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            08:00 (Comercial)
                          </button>
                        </div>

                        <div className="pt-2">
                          <label className="flex items-center space-x-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={autoResetClearQueue}
                              onChange={(e) => setAutoResetClearQueue(e.target.checked)}
                              className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 bg-slate-900 border-slate-700"
                            />
                            <span className="text-xs text-slate-300">
                              Ao virar o horário, também arquivar senhas emitidas que não foram atendidas no dia anterior
                            </span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botão de Salvar Regras */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/25 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center space-x-2 btn-boom"
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span>{isPending ? 'Salvando Configurações...' : 'Salvar Regras de Atendimento da Unidade'}</span>
                  </button>
                </div>
              </form>

              {/* 4. Card de Reset Manual Imediato de Senhas (Reiniciar do 001 Agora) */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-amber-500/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <RotateCcw className="w-5 h-5 text-amber-400" />
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                      Reset Manual Imediato de Senhas
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                    Ação Imediata
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Zere a numeração de todos os serviços da unidade imediatamente para que a próxima ficha emitida seja <strong className="text-amber-400 font-mono">001</strong>. Útil para troca de turnos, eventos extraordinários ou reinício da fila durante o expediente.
                </p>

                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={manualResetClearQueue}
                      onChange={(e) => setManualResetClearQueue(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Também arquivar e limpar as senhas que estão aguardando na fila de hoje
                      </span>
                      <span className="text-[11px] text-slate-400">
                        (Recomendado) Evita duplicidade de senhas com o mesmo número na fila de espera.
                      </span>
                    </div>
                  </label>
                </div>

                {lastManualResetAt && (
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      Último reset manual executado em: <strong className="text-slate-300">{new Date(lastManualResetAt).toLocaleString('pt-BR')}</strong>
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleResetTicketCounter}
                  disabled={isPending || isResettingTickets}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:to-red-400 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-md shadow-orange-500/25 active:scale-[0.99] disabled:opacity-50 btn-boom"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{isResettingTickets ? 'Resetando Contadores...' : 'Resetar Numeração Agora (Iniciar do 001)'}</span>
                </button>
              </div>
            </div>

            {/* Coluna Direita: Simulação e Resumo Visual (5 Colunas) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Card de Simulação do Fluxo */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Simulação da Sequência de Chamadas
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    attendanceOrderMode === 'PRIORITY' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {attendanceOrderMode === 'PRIORITY' ? 'Modo Prioridade' : 'Modo Intercalado'}
                  </span>
                </div>

                <p className="text-xs text-slate-400">
                  Veja abaixo como o sistema selecionará as senhas automaticamente a cada clique em &quot;Chamar Próxima Senha&quot;:
                </p>

                {attendanceOrderMode === 'PRIORITY' ? (
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl bg-slate-950 border border-rose-500/40 flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-xs font-mono font-bold text-rose-400">1º</span>
                        <span className="font-mono font-bold text-sm text-white">SP001</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">Urgência (80+/PCD)</span>
                      </div>
                      <span className="text-[11px] text-slate-400">Prioridade 3</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-rose-500/40 flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-xs font-mono font-bold text-rose-400">2º</span>
                        <span className="font-mono font-bold text-sm text-white">SP002</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">Urgência (80+/PCD)</span>
                      </div>
                      <span className="text-[11px] text-slate-400">Prioridade 3</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/40 flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-xs font-mono font-bold text-amber-400">3º</span>
                        <span className="font-mono font-bold text-sm text-white">PR001</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">Prioritário Geral</span>
                      </div>
                      <span className="text-[11px] text-slate-400">Prioridade 2</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-between opacity-80">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-xs font-mono font-bold text-slate-400">4º</span>
                        <span className="font-mono font-bold text-sm text-white">SG001</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">Convencional</span>
                      </div>
                      <span className="text-[11px] text-slate-400">Prioridade 1</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl bg-slate-950 border border-rose-500/40 flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-xs font-mono font-bold text-rose-400">1º</span>
                        <span className="font-mono font-bold text-sm text-white">SP001</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">1 Urgência (80+)</span>
                      </div>
                      <span className="text-[10px] text-rose-400 font-mono">Ciclo 1</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/40 flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-xs font-mono font-bold text-amber-400">2º</span>
                        <span className="font-mono font-bold text-sm text-white">PR001</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">1 Prioritário</span>
                      </div>
                      <span className="text-[10px] text-amber-400 font-mono">Ciclo 1</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/40 flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-xs font-mono font-bold text-cyan-400">3º</span>
                        <span className="font-mono font-bold text-sm text-white">SG001</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">1 Convencional</span>
                      </div>
                      <span className="text-[10px] text-cyan-400 font-mono">Ciclo 1</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-rose-500/40 flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-xs font-mono font-bold text-rose-400">4º</span>
                        <span className="font-mono font-bold text-sm text-white">SP002</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">1 Urgência (Reinicia)</span>
                      </div>
                      <span className="text-[10px] text-rose-400 font-mono">Ciclo 2</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Resumo da Política Operacional */}
              <div className="p-6 rounded-3xl bg-slate-950/70 border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Resumo das Regras Ativas da Unidade:
                </span>
                <ul className="space-y-2 text-xs text-slate-400">
                  <li className="flex items-center justify-between">
                    <span>Modo de Chamada Ativo:</span>
                    <strong className="text-white">
                      {attendanceOrderMode === 'PRIORITY' ? 'Prioridade Estrita' : 'Intercalado (1:1:1)'}
                    </strong>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Definição no Guichê do Atendente:</span>
                    <strong className="text-cyan-400">
                      Fixo (Apenas Leitura no Guichê)
                    </strong>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Chamada avulsa na Fila de Espera:</span>
                    <strong className={allowManualQueueSelection ? 'text-emerald-400' : 'text-slate-500'}>
                      {allowManualQueueSelection ? 'Sim (Habilitado)' : 'Não (Bloqueado)'}
                    </strong>
                  </li>
                  <li className="flex items-center justify-between border-t border-slate-800/80 pt-2">
                    <span>Reset Automático:</span>
                    <strong className={autoResetEnabled ? 'text-cyan-400 font-mono' : 'text-slate-500'}>
                      {autoResetEnabled ? `Diário às ${autoResetTime}` : 'Desativado'}
                    </strong>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Reinício da Numeração:</span>
                    <strong className="text-white font-mono">
                      Inicia sempre do 001
                    </strong>
                  </li>
                  {lastManualResetAt && (
                    <li className="flex items-center justify-between">
                      <span>Último Reset Manual:</span>
                      <strong className="text-amber-400 text-[11px]">
                        {new Date(lastManualResetAt).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                      </strong>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
