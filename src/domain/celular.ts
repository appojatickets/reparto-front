/** 56912345678 → «+56 9 1234 5678» (el servidor guarda 569 + 8 dígitos). */
export const formatearCelular = (c: string): string => c.replace(/^56(9)(\d{4})(\d{4})$/, '+56 $1 $2 $3');
