'use client'
export function FormatarNumero(value: string | null | undefined) {
  if (value === null || value === undefined || value === '') return
  
  
  const cleaned = String(value).replace(/\D/g, '').slice(0, 11);

  if (cleaned.length > 10)
    return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");

  if (cleaned.length > 6)
    return cleaned.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3");

  if (cleaned.length > 2)
    return cleaned.replace(/^(\d{2})(\d+)/, "($1) $2");

  return cleaned;
}

export function cleanPhone(value: string) {
  return value.replace(/\D/g, "");
}