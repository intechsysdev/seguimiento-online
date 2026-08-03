/**
 * Reglas tomadas del RegularExpression de RegisterViewModelDto:
 * ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[#$^+=!*()@%&]).{8,}$
 */
export const REGLAS_PASSWORD = [
  "Mínimo 8 caracteres",
  "Al menos una letra minúscula y una mayúscula",
  "Al menos un número",
  "Al menos un símbolo (# $ ^ + = ! * ( ) @ % &)",
];

const PATRON = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[#$^+=!*()@%&]).{8,}$/;

/** Devuelve el mensaje de error, o null si la contraseña es válida. */
export function validarPassword(password: string, confirmacion?: string): string | null {
  if (!PATRON.test(password)) {
    return "La contraseña no cumple los requisitos mínimos.";
  }
  if (confirmacion !== undefined && password !== confirmacion) {
    return "Las contraseñas no coinciden.";
  }
  return null;
}
