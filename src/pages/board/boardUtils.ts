import type { BoardStatus } from '../../types/board'

export const STATUS_COLORS: Record<BoardStatus, string> = {
  nao_ativo:    '#9AA4A0',
  ativo:        '#1B4D2E',
  analise_1:    '#534AB7',
  analise_2:    '#D85A30',
  padronizacao: '#185FA5',
  entrega:      '#1D9E75',
}

const STATUS_BADGE_CLASSES: Record<BoardStatus, string> = {
  nao_ativo:    'bg-[#9AA4A0]/15 text-[#5A6A5E]',
  ativo:        'bg-[#1B4D2E]/15 text-[#1B4D2E]',
  analise_1:    'bg-[#534AB7]/15 text-[#534AB7]',
  analise_2:    'bg-[#D85A30]/15 text-[#D85A30]',
  padronizacao: 'bg-[#185FA5]/15 text-[#185FA5]',
  entrega:      'bg-[#1D9E75]/15 text-[#1D9E75]',
}

export function statusBadgeClasses(status: BoardStatus): string {
  return STATUS_BADGE_CLASSES[status]
}

export function regionBadgeClasses(regiao: string): string {
  const token = regiao.trim().split(/\s+/)[0] ?? regiao
  if (token === 'TRT4') return 'bg-[#EAF3ED] text-[#1B4D2E]'
  if (token === 'TRT6') return 'bg-amber-50 text-amber-700'
  if (token === 'TRT1') return 'bg-violet-50 text-violet-700'
  if (token === 'TRT12') return 'bg-[#E6F1FB] text-[#0C447C]'
  return 'bg-[#F4F6F4] text-[#5A6A5E]'
}
