'use client'
export function FormatarNumero(value: string) {
    
  value = value.replace(/\D/g, '').slice(0, 11);

  if (value.length > 10)
    return value.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");

  if (value.length > 6)
    return value.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3");

  if (value.length > 2)
    return value.replace(/^(\d{2})(\d+)/, "($1) $2");

  return value.replace(/^(\d*)$/, "($1");
}

export function cleanPhone(value: string) {
  return value.replace(/\D/g, "");
}