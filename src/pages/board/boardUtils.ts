export function regionBadgeClasses(regiao: string): string {
  const token = regiao.trim().split(/\s+/)[0] ?? regiao
  if (token === 'TRT4') return 'bg-[#EAF3ED] text-[#1B4D2E]'
  if (token === 'TRT6') return 'bg-amber-50 text-amber-700'
  if (token === 'TRT1') return 'bg-violet-50 text-violet-700'
  if (token === 'TRT12') return 'bg-[#E6F1FB] text-[#0C447C]'
  return 'bg-[#F4F6F4] text-[#5A6A5E]'
}
